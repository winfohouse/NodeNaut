import { db } from '$shared/services/db';
import { FlowPilotRegistry } from '$shared/framework/Registry';
import type { ExecutionContext, NodeResult } from '$shared/framework/NodePlugin';
import { Messenger } from '$shared/api/messenger';
import { MessageType } from '$shared/constants/messages';
import { ResilientTabSender } from './ResilientTabSender';
import { SandboxService } from './SandboxService';
import { VaultService } from '$shared/services/vault';

export class ExecutionHub {
  private static instance: ExecutionHub;
  private activeSessions = new Map<string, any>();
  private registry = FlowPilotRegistry.getInstance();

  private constructor() {
    // Initial discovery
    FlowPilotRegistry.discoverPlugins();
  }

  static getInstance(): ExecutionHub {
    if (!ExecutionHub.instance) {
      ExecutionHub.instance = new ExecutionHub();
    }
    return ExecutionHub.instance;
  }

  async runNode(sessionId: string, nodeId: string): Promise<void> {
    const session = await db.execution_sessions.get(sessionId);
    if (!session || session.status === 'PAUSED') return;

    const workflow = await db.workflows.get(session.workflow_id);
    if (!workflow) return;

    const nodeData = workflow.graph?.nodes.find((n: any) => n.id === nodeId);
    if (!nodeData) return;

    const plugin = this.registry.getPlugin(nodeData.type);
    if (!plugin) {
      console.error(`[ExecutionHub] No plugin found for type: ${nodeData.type}`);
      return;
    }

    const context = await this.createContext(session, nodeData);
    
    try {
      if (plugin.onInit) await plugin.onInit(context);
      
      const result = await plugin.execute(context);
      
      if (result.success) {
        await this.handleSuccess(session, nodeData, result);
      } else {
        await this.handleError(session, nodeData, result, plugin, context);
      }
    } catch (e: any) {
      await this.handleError(session, nodeData, { success: false, error: { code: 'CRASH', message: e.message } }, plugin, context);
    }
  }

  private async createContext(session: any, nodeData: any): Promise<ExecutionContext> {
    const rowData = session.variables || {}; // Logic for batch data row selection goes here

    return {
      node: {
        id: nodeData.id,
        state: nodeData.state || {},
        tabId: session.tab_id
      },
      services: {
        dom: {
          // Future: scoped DOM utils based on permissions
        },
        messenger: Messenger,
        vault: VaultService,
        sandbox: SandboxService.getInstance()
      },
      vars: {
        get: async (key) => rowData[key],
        set: async (key, val) => {
          rowData[key] = val;
          await db.execution_sessions.update(session.id, { variables: rowData });
        },
        resolve: async (str) => {
          // Future: use existing processExpression logic
          return str; 
        }
      },
      logger: {
        info: (m, d) => console.log(`[Node:${nodeData.id}] ${m}`, d),
        warn: (m, d) => console.warn(`[Node:${nodeData.id}] ${m}`, d),
        error: (m, d) => console.error(`[Node:${nodeData.id}] ${m}`, d)
      },
      runtime: {
        pause: () => db.execution_sessions.update(session.id, { status: 'PAUSED' }),
        stop: () => db.execution_sessions.delete(session.id),
        next: (port) => { /* Logical jump logic */ }
      }
    };
  }

  private async handleSuccess(session: any, nodeData: any, result: NodeResult) {
    const workflow = await db.workflows.get(session.workflow_id);
    const edges = workflow?.graph?.edges || [];
    const outgoing = edges.filter((e: any) => e.sourceNodeId === nodeData.id);

    let nextNodeId: string | undefined;
    
    if (result.nextPort) {
      const edge = outgoing.find((e: any) => e.type === result.nextPort);
      nextNodeId = edge?.targetNodeId;
    } else {
      nextNodeId = outgoing[0]?.targetNodeId;
    }

    if (nextNodeId) {
      session.current_node_id = nextNodeId;
      await db.execution_sessions.put(session);
      this.runNode(session.id, nextNodeId);
    } else {
      // Workflow Complete
      await db.execution_sessions.delete(session.id);
    }
  }

  private async handleError(session: any, nodeData: any, result: any, plugin: any, context: any) {
    if (plugin.recover) {
      const recovered = await plugin.recover(result.error, context);
      if (recovered) return; // Handler already resumed or handled
    }
    
    // Default error handling: Log and stop
    console.error(`[ExecutionHub] Node ${nodeData.id} failed:`, result.error);
    await db.execution_sessions.update(session.id, { status: 'FAILED' });
  }
}
