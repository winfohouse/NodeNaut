import { db, type WorkflowContext } from '$shared/services/db';
import { Messenger, type ExtResponse } from '$shared/api/messenger';
import { MessageType } from '$shared/constants/messages';
import { VaultService } from '$shared/services/vault';
import { ResilientTabSender } from './ResilientTabSender';
import { SandboxService } from './SandboxService';
import { ConditionEngine } from '$shared/utils/ConditionEngine';
import { FlowPilotRegistry } from '$framework/Registry';
import type { NodePlugin, ExecutionContext, NodeResult, MessengerService, DiscoveryServiceCapability } from '$framework/NodePlugin';

interface ExecutionSession {
  id: string;
  workflowId: string;
  tabId: number;
  currentBatchData: any[] | null;
  currentRowIndex: number;
  retryCount: number;
  isProcessing: boolean;
  isWaiting: boolean;
  stepCount: number;
}

export class WorkflowRunner {
  private static instance: WorkflowRunner;
  private sessions: Map<string, ExecutionSession> = new Map();
  private MAX_RETRIES = 3;
  private sandboxService = SandboxService.getInstance();
  private registry = FlowPilotRegistry.getInstance();

  private constructor() {
    this.rehydrate();
  }

  public updateActiveSessionsTableData(tableId: string, index: number, rowData: any) {
    for (const session of this.sessions.values()) {
      db.workflows.get(session.workflowId).then(wf => {
        if (wf?.settings?.table_id === tableId && session.currentBatchData) {
          if (session.currentBatchData[index]) {
            session.currentBatchData[index] = {
              ...session.currentBatchData[index],
              ...rowData
            };
          }
        }
      }).catch(() => {});
    }
  }

  static getInstance(): WorkflowRunner {
    if (!WorkflowRunner.instance) {
      WorkflowRunner.instance = new WorkflowRunner();
    }
    return WorkflowRunner.instance;
  }
  private async createExecutionContext(sessionId: string, node: any, rowData: any): Promise<ExecutionContext<any>> {
    const session = this.sessions.get(sessionId);
    let tabId = session?.tabId;
    if (!tabId) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id ?? 0;
      } catch (e) {
        tabId = 0;
      }
    }
    
    let tableId: string | undefined;
    if (session) {
      try {
        const rawWorkflow = await db.workflows.get(session.workflowId);
        if (rawWorkflow) {
          const { settings } = await this.resolveWorkflowData(rawWorkflow);
          tableId = settings?.table_id;
        }
      } catch (err) {}
    }
    
    return {
      node: {
        id: node.id,
        state: node.state || {},
        tabId,
        tableId,
        rowIndex: session?.currentRowIndex
      },
      services: {
        dom: {}, 
        messenger: {
          send: (type, payload) => Messenger.send(type as any, payload),
          sendToTab: (tabId, type, payload) => ResilientTabSender.send(tabId, type as any, payload)
        } as MessengerService,
        vault: VaultService,
        sandbox: this.sandboxService,
        picker: {
          start: async () => ({}) as any,
          scan: async () => []
        } as DiscoveryServiceCapability,
        runner: this
      },
      vars: {
        get: async (key) => key === 'all' ? rowData : rowData[key],
        set: async (key, value) => { rowData[key] = value; },
        resolve: (str) => this.processExpression(str, rowData)
      },
      logger: {
        info: (msg, data) => console.log(`[Node:${node.type}] ${msg}`, data),
        warn: (msg, data) => console.warn(`[Node:${node.type}] ${msg}`, data),
        error: (msg, data) => console.error(`[Node:${node.type}] ${msg}`, data)
      },
      runtime: {
        pause: () => session ? this.pause(sessionId) : Promise.resolve(),
        stop: () => session ? this.stop(sessionId) : Promise.resolve(),
        next: (port) => {} // Handled by engine
      }
    };
  }

  private async rehydrate() {
    try {
      const contexts = await db.execution_sessions.toArray();
      for (const context of contexts) {
        if (context.status === 'RUNNING' || context.status === 'WAITING') {
          const session: ExecutionSession = {
            id: context.id,
            workflowId: context.workflow_id,
            tabId: context.tab_id,
            currentBatchData: null,
            currentRowIndex: 0,
            retryCount: 0,
            isProcessing: false,
            isWaiting: context.status === 'WAITING',
            stepCount: context.current_step_index || 0
          };
          this.sessions.set(session.id, session);
          setTimeout(() => this.executeNextStep(session.id), 1500);
        }
      }
    } catch (e) {
      console.error('[WorkflowRunner] Rehydration failed:', e);
    }
  }

  async start(workflowId: string, options: { 
    tabId?: number; 
    parentSessionId?: string; 
    rowData?: any; 
    startNodeId?: string;
    inheritedStepCount?: number;
    inheritedRowIndex?: number;
  } = {}): Promise<ExtResponse> {
    const workflow = await db.workflows.get(workflowId);
    if (!workflow) return { success: false, error: { code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' } };

    let targetTabId = options.tabId;
    if (!targetTabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      targetTabId = tab?.id;
    }

    if (!targetTabId) return { success: false, error: { code: 'NO_TAB', message: 'No active tab found' } };

    const sessionId = crypto.randomUUID();
    
    let startNodeId = options.startNodeId;
    if (!startNodeId && workflow.graph?.nodes?.length) {
      const rootNode = workflow.graph.nodes.find(n => n.isRoot) || workflow.graph.nodes[0];
      startNodeId = rootNode.id;
    } else if (!startNodeId && workflow.actions?.length) {
      startNodeId = workflow.actions[0].id;
    }
    
    const context: WorkflowContext = {
      id: sessionId,
      workflow_id: workflowId,
      tab_id: targetTabId,
      current_node_id: startNodeId,
      current_step_index: options.inheritedStepCount || 0,
      status: 'RUNNING',
      variables: {},
      last_updated: Date.now(),
      parent_session_id: options.parentSessionId
    };

    let batchData = null;
    let rowIndex = options.inheritedRowIndex || 0;

    if (workflow.settings?.is_bundle) {
      batchData = [workflow.settings.test_props || {}];
    } else if (options.rowData) {
      batchData = [options.rowData];
    } else if (workflow.settings?.table_id) {
      const table = await db.data_tables.get(workflow.settings.table_id);
      if (table) batchData = table.rows;
    }

    const session: ExecutionSession = {
      id: sessionId,
      workflowId,
      tabId: targetTabId,
      currentBatchData: batchData,
      currentRowIndex: rowIndex,
      retryCount: 0,
      isProcessing: false,
      isWaiting: false,
      stepCount: options.inheritedStepCount || 0
    };

    this.sessions.set(sessionId, session);
    await db.execution_sessions.put(context);
    
    await this.log(workflowId, 'RUNNING', `Workflow Started [Session: ${sessionId.slice(0,8)}]`, { sessionId });
    await this.notifyHUDFull(sessionId, { 
      message: 'Sequence Initialized', 
      status: 'RUNNING', 
      progress: 0,
      totalSteps: workflow.graph?.nodes?.length || workflow.actions?.length || 0,
      currentStep: 1,
      currentNodeId: startNodeId
    });
    
    this.executeNextStep(sessionId);
    return { success: true, data: { sessionId } };
  }

  private async notifyHUDFull(sessionId: string, state: Partial<any>) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    chrome.runtime.sendMessage({ type: 'HUD_UPDATE', payload: { ...state, sessionId } }).catch(() => {});

    const tabId = session.tabId;
    if (tabId) {
      const context = await db.execution_sessions.get(sessionId);
      if (!state.status) state.status = context?.status || 'IDLE';
      
      if (state.progress === undefined && context) {
        const workflow = await db.workflows.get(context.workflow_id);
        const stepsPerRow = (workflow?.graph?.nodes?.length || workflow?.actions?.length || 0);
        state.totalSteps = stepsPerRow;
        state.currentStep = (session.stepCount + 1);
        state.currentNodeId = context.current_node_id;
        
        if (session.currentBatchData) {
          state.currentRow = session.currentRowIndex + 1;
          state.totalRows = session.currentBatchData.length;
          const totalGlobalSteps = state.totalRows * stepsPerRow;
          const completedGlobalSteps = (session.currentRowIndex * stepsPerRow) + state.currentStep;
          state.progress = (completedGlobalSteps / (totalGlobalSteps || 1)) * 100;
        } else {
          state.progress = (state.currentStep / (stepsPerRow || 1)) * 100;
        }
      }

      await ResilientTabSender.send(tabId, 'HUD_UPDATE' as any, { ...state, sessionId });
    }
  }

  async pause(sessionId?: string) {
    const targetId = sessionId || Array.from(this.sessions.keys())[0];
    const session = this.sessions.get(targetId);
    if (session) {
      const context = await db.execution_sessions.get(targetId);
      if (context) {
        context.status = 'PAUSED';
        await db.execution_sessions.put(context);
        await this.log(context.workflow_id, 'PENDING', 'Session Paused');
        await this.notifyHUDFull(targetId, { message: 'Paused by User', status: 'PAUSED' });
      }
    }
    return { success: true };
  }

  async resume(sessionId?: string) {
    const targetId = sessionId || Array.from(this.sessions.keys())[0];
    const session = this.sessions.get(targetId);
    if (session) {
      const context = await db.execution_sessions.get(targetId);
      if (context && context.status === 'PAUSED') {
        context.status = 'RUNNING';
        await db.execution_sessions.put(context);
        await this.log(context.workflow_id, 'RUNNING', 'Session Resumed');
        await this.notifyHUDFull(targetId, { message: 'Resuming...', status: 'RUNNING' });
        this.executeNextStep(targetId);
      }
    }
    return { success: true };
  }

  async step(sessionId?: string) {
    const targetId = sessionId || Array.from(this.sessions.keys())[0];
    const session = this.sessions.get(targetId);
    if (session) {
      const context = await db.execution_sessions.get(targetId);
      if (context && context.status === 'PAUSED') {
        context.status = 'RUNNING';
        await db.execution_sessions.put(context);
        (session as any).stepMode = true;
        this.executeNextStep(targetId);
      }
    }
    return { success: true };
  }

  async stop(sessionId?: string): Promise<ExtResponse> {
    const targetId = sessionId || Array.from(this.sessions.keys())[0];
    const session = this.sessions.get(targetId);
    if (session) {
      await db.execution_sessions.delete(targetId);
      await this.notifyHUDFull(targetId, { message: 'Session Terminated', status: 'IDLE' });
      this.sessions.delete(targetId);
    } else if (!sessionId) {
      await db.execution_sessions.clear();
      this.sessions.clear();
    }
    return { success: true };
  }

  async handleVaultUnlocked(): Promise<void> {
    await this.rehydrate();
  }

  async resolvePreview(expression: string, tableId?: string): Promise<string> {
    let rowData = {};
    if (tableId) {
      const table = await db.data_tables.get(tableId);
      if (table && table.rows?.length > 0) {
        rowData = table.rows[0];
      }
    }
    return await this.processExpression(expression, rowData);
  }

  public async executeSingleNode(node: any, rowData: any, sessionId: string): Promise<NodeResult> {
    const plugin = this.registry.getPlugin(node.type);
    if (plugin) {
      const execCtx = await this.createExecutionContext(sessionId, node, rowData);
      return await plugin.execute(execCtx);
    } else {
      return await this.legacyExecute(sessionId, node, rowData);
    }
  }

  private async executeNextStep(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session || session.isProcessing || session.isWaiting) return;
    
    const context = await db.execution_sessions.get(sessionId);
    if (!context || context.status === 'PAUSED') return;

    session.isProcessing = true;

    try {
      const rawWorkflow = await db.workflows.get(context.workflow_id);
      if (!rawWorkflow) throw new Error('Workflow not found');

      // 1. Critical Decryption Check
      const { graph, settings, success, error } = await this.resolveWorkflowData(rawWorkflow);
      
      if (!success) {
        await this.log(context.workflow_id, 'PENDING', `Vault Locked: ${error}`);
        await this.notifyHUDFull(sessionId, { 
          message: 'Vault Locked - Please provide Master Key', 
          status: 'PAUSED' 
        });
        await this.pause(sessionId);
        return;
      }

      let currentAction;
      if (graph && graph.nodes.length > 0) {
        currentAction = graph.nodes.find((n: any) => n.id === context.current_node_id);
      } else if (rawWorkflow.actions) {
        currentAction = rawWorkflow.actions[context.current_step_index || 0];
      }

      if (!currentAction) {
        if (session.currentBatchData && session.currentRowIndex < session.currentBatchData.length - 1) {
          session.currentRowIndex++;
          context.current_step_index = 0;
          if (graph?.nodes?.length) {
            const rootNode = graph.nodes.find((n: any) => n.isRoot) || graph.nodes[0];
            context.current_node_id = rootNode.id;
          }
          session.retryCount = 0;
          session.stepCount = 0;
          await db.execution_sessions.put(context);
          session.isProcessing = false;
          this.executeNextStep(sessionId);
          return;
        } else {
          await this.completeWorkflow(sessionId, 'SUCCESS', 'Completed');
          return;
        }
      }

      const rowData = session.currentBatchData ? session.currentBatchData[session.currentRowIndex] : {};
      const plugin = this.registry.getPlugin(currentAction.type);

      await this.notifyHUDFull(sessionId, { 
        message: `Executing: ${currentAction.metadata?.label || currentAction.type}`,
        status: 'RUNNING'
      });

      let stepResult: NodeResult;

      if (plugin) {
        const execCtx = await this.createExecutionContext(sessionId, currentAction, rowData);
        stepResult = await plugin.execute(execCtx);
      } else {
        // Fallback for legacy actions or unregistered types
        console.warn(`[Kernel] No plugin found for type: ${currentAction.type}. Using legacy fallback.`);
        stepResult = await this.legacyExecute(sessionId, currentAction, rowData);
      }

      if (stepResult.success) {
        // Persist dataset changes in real-time if rowData was modified
        if (session.currentBatchData && settings?.table_id) {
          await db.data_tables.update(settings.table_id, { rows: session.currentBatchData });
        }
        context.last_updated = Date.now();
        session.stepCount++;
        context.current_step_index = session.stepCount; 
        session.retryCount = 0;
        session.isProcessing = false;

        if (graph && graph.edges) {
          const outgoingEdges = graph.edges.filter((e: any) => e.sourceNodeId === currentAction.id);
          
          if (outgoingEdges.length === 0) {
            context.current_node_id = undefined;
          } else {
            let nextNodeId: string | undefined;
            const targetPort = stepResult.nextPort || 'success';
            const possibleEdges = outgoingEdges.filter((e: any) => e.type === targetPort);

            if (possibleEdges.length === 0) {
              context.current_node_id = undefined;
            } else {
              const mainEdge = possibleEdges.find((e: any) => e.mode === 'MAIN') || possibleEdges[0];
              nextNodeId = mainEdge.targetNodeId;

              const parallels = possibleEdges.filter((e: any) => e.id !== mainEdge.id);
              for (const edge of parallels) {
                await this.spawnParallelBranch(
                  context.workflow_id, 
                  edge.targetNodeId, 
                  sessionId, 
                  rowData, 
                  edge.mode || 'CLONE'
                );
              }
              context.current_node_id = nextNodeId;
            }
          }
        } else {
          if (context.current_step_index !== undefined) context.current_step_index++;
        }

        await db.execution_sessions.put(context);
        
        if ((session as any).stepMode) {
          (session as any).stepMode = false;
          await this.pause(sessionId);
        } else {
          setTimeout(() => this.executeNextStep(sessionId), 500);
        }
      } else {
        await this.handleError(context, currentAction, stepResult, plugin, sessionId);
      }
    } catch (e: any) {
      await this.completeWorkflow(sessionId, 'FAILED', e.message);
    } finally {
      session.isProcessing = false;
    }
  }

  private async resolveWorkflowData(workflow: any): Promise<{ graph: any, settings: any, success: boolean, error?: string }> {
    if (!workflow.is_encrypted) {
      return { graph: workflow.graph, settings: workflow.settings, success: true };
    }

    try {
      const state = await VaultService.getState();
      if (state !== 'UNLOCKED') {
        return { graph: null, settings: null, success: false, error: 'Vault is locked' };
      }

      const decrypted = await VaultService.decrypt(workflow.encrypted_blob);
      const data = JSON.parse(decrypted);
      return { graph: data.graph, settings: data.settings, success: true };
    } catch (e: any) {
      return { graph: null, settings: null, success: false, error: e.message };
    }
  }

  private async spawnParallelBranch(workflowId: string, startNodeId: string, parentSessionId: string, rowData: any, mode: 'CLONE' | 'FRESH' = 'CLONE') {
    let tab: chrome.tabs.Tab | undefined;
    const parentSession = this.sessions.get(parentSessionId);
    const workflow = await db.workflows.get(workflowId);

    // Resolve technical workflow state to peek at node type
    const { graph } = await this.resolveWorkflowData(workflow);
    const targetNode = graph?.nodes?.find((n: any) => n.id === startNodeId);
    const isNavigation = targetNode?.type === 'NAVIGATE';
    const targetUrl = isNavigation ? await this.processExpression(targetNode.state?.url || targetNode.url || '', rowData) : null;

    if (mode === 'CLONE' && parentSession?.tabId) {
      if (isNavigation && targetUrl) {
        // INTELLIGENT: If branch starts with navigation, don't duplicate; just create at target
        tab = await chrome.tabs.create({ url: targetUrl, active: false });
      } else {
        // CLONE: Duplicate to preserve exact DOM state, cookies, and scroll position
        try {
          tab = await chrome.tabs.duplicate(parentSession.tabId);
        } catch (e) {
          tab = await chrome.tabs.create({ url: 'about:blank', active: false });
        }
      }
    } else {
      // FRESH: Start in a clean background tab
      const finalUrl = isNavigation && targetUrl ? targetUrl : 'about:blank';
      tab = await chrome.tabs.create({ url: finalUrl, active: false });
    }

    if (tab?.id) {
      // CONTEXT INHERITANCE: Pass parent progress to keep HUD/Logs continuous
      await this.start(workflowId, { 
        tabId: tab.id, 
        parentSessionId, 
        startNodeId, 
        rowData,
        inheritedStepCount: parentSession?.stepCount || 0,
        inheritedRowIndex: parentSession?.currentRowIndex || 0
      });
    }
  }

  private async handleWaitUntil(sessionId: string, expression: string | undefined, rowData: any) {
    const session = this.sessions.get(sessionId)!;
    session.isWaiting = true;
    
    const context = await db.execution_sessions.get(sessionId);
    if (context) {
      context.status = 'WAITING';
      await db.execution_sessions.put(context);
    }

    const check = async () => {
      if (!this.sessions.has(sessionId)) return;
      const currentContext = await db.execution_sessions.get(sessionId);
      if (!currentContext || currentContext.status === 'PAUSED') return;

      const evalResult = await this.sandboxService.execute({
        code: `return (${expression})`,
        data: rowData
      });

      if (evalResult.success && evalResult.data === true) {
        session.isWaiting = false;
        currentContext.status = 'RUNNING';
        
        const workflow = await db.workflows.get(currentContext.workflow_id);
        if (workflow?.graph && workflow.graph.edges) {
          const outgoingEdges = workflow.graph.edges.filter(e => e.sourceNodeId === currentContext.current_node_id);
          if (outgoingEdges.length === 0) {
            currentContext.current_node_id = undefined;
          } else {
            currentContext.current_node_id = outgoingEdges[0].targetNodeId;
            for (let i = 1; i < outgoingEdges.length; i++) {
              await this.spawnParallelBranch(currentContext.workflow_id, outgoingEdges[i].targetNodeId, sessionId, rowData);
            }
          }
        } else if (currentContext.current_step_index !== undefined) {
           currentContext.current_step_index++;
        }

        session.stepCount++;
        await db.execution_sessions.put(currentContext);
        this.executeNextStep(sessionId);
      } else {
        await this.notifyHUDFull(sessionId, { message: 'Waiting for condition...', status: 'WAITING' });
        setTimeout(check, 1000);
      }
    };

    check();
  }

  private async handleCloseTab(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session?.tabId) {
      await chrome.tabs.remove(session.tabId);
      return { success: true };
    }
    return { success: false, error: { message: 'No active tab to close' } };
  }

  private async handleSpawn(parentSessionId: string, action: any) {
    const { url, spawnWorkflowId } = action;
    const tab = await chrome.tabs.create({ url, active: false });
    if (tab.id) {
      this.start(spawnWorkflowId, { tabId: tab.id, parentSessionId });
      return { success: true };
    }
    return { success: false, error: { message: 'Failed to create tab' } };
  }

  private async handleNavigation(tabId: number, url: string | undefined): Promise<any> {
    if (!url) return { success: false };
    await chrome.tabs.update(tabId, { url });
    return new Promise(r => {
      const l = (id: number, info: any) => {
        if (id === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(l);
          setTimeout(() => r({ success: true }), 1000);
        }
      };
      chrome.tabs.onUpdated.addListener(l);
    });
  }

  private async resolveVariables(action: any, data: any): Promise<any> {
    const resolved = { ...action };
    if (resolved.value) resolved.value = await this.processExpression(resolved.value, data);
    if (resolved.selector) resolved.selector = await this.processExpression(resolved.selector, data);
    if (resolved.url) resolved.url = await this.processExpression(resolved.url, data);
    
    if (resolved.metadata?.conditionModel?.customCode) {
      // Create a deep copy of metadata to avoid mutating the original workflow
      resolved.metadata = JSON.parse(JSON.stringify(resolved.metadata));
      resolved.metadata.conditionModel.customCode = await this.processExpression(resolved.metadata.conditionModel.customCode, data);
    }
    
    return resolved;
  }

  private async processExpression(str: string, data: any): Promise<string> {
    let result = str;

    const globalMatches = Array.from(str.matchAll(/\{\{GLOBAL\.([^}]+)\}\}/g));
    if (globalMatches.length > 0) {
      const globalTables = await db.global_tables.toArray();

      for (const match of globalMatches) {
        const fullPath = match[1];
        const dotParts = fullPath.split('.');
        const slugWithIndex = dotParts[0];
        const field = dotParts[1];

        // Parse slug and optional index: slug[index]
        const indexMatch = slugWithIndex.match(/^(.+?)\[(\d+)\]$/);
        const slug = indexMatch ? indexMatch[1] : slugWithIndex;
        const index = indexMatch ? parseInt(indexMatch[2]) : 0;

        const table = globalTables.find(t => t.slug === slug);
        if (!table) continue;

        let tableData = table.data;
        if (table.is_secure) {
          try {
            const decrypted = await VaultService.decrypt(table.data.blob);
            tableData = JSON.parse(decrypted);
          } catch (e) { continue; }
        }

        let resolvedValue: any;
        if (table.type === 'VARIABLES') {
          resolvedValue = tableData[field];
        } else if (table.type === 'DATASET' && tableData.tableId) {
          const actualTable = await db.data_tables.get(tableData.tableId);
          if (actualTable && actualTable.rows?.[index]) {
            resolvedValue = actualTable.rows[index][field];
          }
        }

        result = result.replace(match[0], resolvedValue !== undefined ? String(resolvedValue) : match[0]);
      }
    }

    result = result.replace(/\{\{.*?\}\}|\{([^}]+)\}/g, (match, k) => {
      if (match.startsWith('{{')) return match;
      const val = k.split('.').reduce((obj: any, key: string) => obj?.[key], data);
      return val !== undefined ? String(val) : match;
    });

    return result;
  }

  private async completeWorkflow(sessionId: string, status: 'SUCCESS' | 'FAILED', message: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      await this.log(session.workflowId, status as any, message);
      await this.notifyHUDFull(sessionId, { 
        message, 
        status: status === 'SUCCESS' ? 'SUCCESS' : 'ERROR', 
        error: status === 'FAILED' ? message : undefined,
        progress: 100 
      });

      if (status === 'FAILED') {
        await db.execution_sessions.update(sessionId, { 
          status: 'FAILED',
          error: message,
          last_updated: Date.now()
        });
      } else {
        await db.execution_sessions.delete(sessionId);
      }
      
      this.sessions.delete(sessionId);
    }
  }

  private async log(workflowId: string, status: 'SUCCESS' | 'ERROR' | 'PENDING' | 'RUNNING', message: string, details?: any) {
    await db.execution_logs.add({ workflow_id: workflowId, status, message, details, timestamp: Date.now() });
  }

  private async handleError(context: WorkflowContext, nodeData: any, result: NodeResult, plugin: NodePlugin | undefined, sessionId: string) {
    if (plugin?.recover) {
      const execCtx = await this.createExecutionContext(sessionId, nodeData, {});
      const recovered = await plugin.recover(result.error!, execCtx);
      if (recovered) return;
    }
    
    if (this.sessions.get(sessionId)!.retryCount < this.MAX_RETRIES) {
      this.sessions.get(sessionId)!.retryCount++;
      this.sessions.get(sessionId)!.isProcessing = false;
      setTimeout(() => this.executeNextStep(sessionId), 1000 * this.sessions.get(sessionId)!.retryCount);
    } else {
      await this.completeWorkflow(sessionId, 'FAILED', result.error?.message || 'Step failed');
    }
  }

  private async legacyExecute(sessionId: string, action: any, rowData: any): Promise<NodeResult> {
    const session = this.sessions.get(sessionId)!;
    
    switch (action.type) {
      case 'NAVIGATE':
        const url = await this.processExpression(action.state?.url || action.url || '', rowData);
        await this.handleNavigation(session.tabId, url);
        return { success: true };
      case 'CLOSE_TAB':
        await this.handleCloseTab(sessionId);
        return { success: true };
      default:
        return { success: false, error: { code: 'NOT_IMPLEMENTED', message: `No handler for ${action.type}` } };
    }
  }
}
