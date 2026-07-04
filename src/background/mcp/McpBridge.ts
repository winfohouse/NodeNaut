import { db } from '$shared/services/db';
import { WorkflowRunner } from '../core/WorkflowRunner';
import { FlowPilotRegistry } from '$framework/Registry';
import { TabCoordinator } from '../core/TabCoordinator';
import { ResilientTabSender } from '../core/ResilientTabSender';
import { MessageType } from '$shared/constants/messages';

interface McpRequest {
  id: string;
  method: string;
  params: Record<string, any>;
}

export class McpBridge {
  private static instance: McpBridge | null = null;

  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private heartbeatInterval: any = null;
  private isDestroyed = false;
  private reconnectDelay = 5000;
  private silent = true;

  static getInstance(): McpBridge {
    if (!McpBridge.instance) {
      McpBridge.instance = new McpBridge();
    }
    return McpBridge.instance;
  }

  start() {
    this.isDestroyed = false;
    this.connect();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private connect() {
    if (this.isDestroyed) return;
    try {
      this.ws = new WebSocket('ws://127.0.0.1:7865');

      this.ws.onopen = () => {
        console.log('[MCP Bridge] ✓ Connected to MCP server');
        this.send({ type: 'register_extension' });
        this.silent = false;
        this.broadcastStatus(true);

        // Periodically ping server to keep service worker and connection alive
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          this.send({ type: 'ping' });
        }, 15000);
      };

      this.ws.onmessage = async (event: MessageEvent) => {
        let msgId: string | undefined;
        let methodStr = 'unknown';
        try {
          const raw = typeof event.data === 'string' ? event.data : await (event.data as Blob).text();
          const msg: McpRequest = JSON.parse(raw);
          
          if (msg.type === 'pong') {
            return;
          }

          // Skip non-request messages (server acknowledgments, status updates, etc.)
          if (!msg.method || !msg.id) {
            return;
          }

          msgId = msg.id;
          methodStr = msg.method;

          // Broadcast incoming request event to extension UI
          chrome.runtime.sendMessage({
            type: 'MCP_LOG_EVENT',
            payload: { id: msg.id, method: msg.method, params: msg.params, direction: 'in', timestamp: Date.now() }
          }).catch(() => {});

          const result = await this.dispatch(msg.method, msg.params || {});
          this.send({ id: msg.id, result });

          // Broadcast success response event
          chrome.runtime.sendMessage({
            type: 'MCP_LOG_EVENT',
            payload: { id: msg.id, method: msg.method, status: 'success', result, direction: 'out', timestamp: Date.now() }
          }).catch(() => {});

        } catch (error: any) {
          if (msgId) {
            this.send({ id: msgId, error: error.message || 'Unknown error' });
            
            // Broadcast error response event
            chrome.runtime.sendMessage({
              type: 'MCP_LOG_EVENT',
              payload: { id: msgId, method: methodStr, status: 'error', error: error.message || 'Unknown error', direction: 'out', timestamp: Date.now() }
            }).catch(() => {});
          }
        }
      };

      this.ws.onclose = () => {
        if (!this.silent) console.warn('[MCP Bridge] Disconnected');
        this.ws = null;
        clearInterval(this.heartbeatInterval);
        this.broadcastStatus(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => { /* will trigger onclose */ };
    } catch (e) {
      clearInterval(this.heartbeatInterval);
      this.broadcastStatus(false);
      this.scheduleReconnect();
    }
  }

  private broadcastStatus(connected: boolean) {
    chrome.runtime.sendMessage({
      type: 'MCP_CONNECTION_STATUS',
      payload: { connected }
    }).catch(() => {});
  }

  private scheduleReconnect() {
    if (this.isDestroyed) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public sendLog(level: 'info' | 'warn' | 'error', args: any[]) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg); } catch (e) { return String(arg); }
        }
        return String(arg);
      }).join(' ');
      
      this.send({
        type: 'service_worker_log',
        payload: { level, message }
      });
    }
  }

  destroy() {
    this.isDestroyed = true;
    clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }

  async testDispatch(method: string, params: Record<string, any>): Promise<any> {
    const registry = FlowPilotRegistry.getInstance();
    const plugin = registry.getPlugin(method);
    if (!plugin) {
      throw new Error(`Unknown node plugin type: ${method}`);
    }

    let tabId = 0;
    try {
      tabId = await this.getActiveTabId();
    } catch (e) {
      if (method !== 'SPAWN') {
        throw e;
      }
    }

    // Create a mock ExecutionContext
    const context: any = {
      node: {
        id: 'test-node-' + Date.now(),
        state: params,
        tabId
      },
      services: {
        dom: {},
        messenger: {
          sendToTab: async (tid: number, type: string, payload: any) => {
            return await ResilientTabSender.send(tid, type, payload);
          }
        },
        vault: {
          getSecret: async () => ''
        },
        sandbox: {
          execute: async () => ''
        },
        picker: {},
        runner: {}
      },
      vars: {
        get: async () => undefined,
        resolve: async (val: any) => {
          if (typeof val === 'string') {
            return val;
          }
          return val;
        }
      },
      logger: {
        info: (msg: string, data?: any) => console.log(`[Plugin Test: ${method}] INFO: ${msg}`, data || ''),
        warn: (msg: string, data?: any) => console.warn(`[Plugin Test: ${method}] WARN: ${msg}`, data || ''),
        error: (msg: string, data?: any) => console.error(`[Plugin Test: ${method}] ERROR: ${msg}`, data || '')
      }
    };

    return await plugin.execute(context);
  }

  // ========== COMMAND DISPATCHER ==========
  private async dispatch(method: string, params: Record<string, any>): Promise<any> {
    const result = await this.innerDispatch(method, params);
    const mutatingMethods = [
      'create_flow', 'update_flow', 'delete_flow',
      'add_node', 'update_node', 'remove_node',
      'connect_nodes', 'disconnect_nodes',
      'create_table', 'modify_table', 'delete_table',
      'set_global', 'delete_global', 'register_bundle'
    ];
    if (mutatingMethods.includes(method)) {
      chrome.runtime.sendMessage({ type: 'DB_MODIFIED' }).catch(() => {});
    }
    return result;
  }

  private async innerDispatch(method: string, params: Record<string, any>): Promise<any> {
    switch (method) {
      case 'TEST_MCP_ROUTE':
        return await this.testDispatch(params.method, params.params || {});

      case 'SPAWN':
      case 'CLOSE_TAB':
      case 'NAVIGATE':
      case 'CLICK':
      case 'TYPE':
      case 'WAIT':
      case 'WAIT_STABILITY':
      case 'INTERACT':
        return await this.testDispatch(method, params);
      // Workflow CRUD
      case 'list_flows': return this.listFlows();
      case 'get_flow': return this.getFlow(params.flowId);
      case 'create_flow': return this.createFlow(params);
      case 'update_flow': return this.updateFlow(params);
      case 'delete_flow': return this.deleteFlow(params.flowId);
      // Execution
      case 'execute_flow': return this.executeFlow(params.flowId);
      case 'stop_flow': return this.stopFlow(params.sessionId);
      case 'pause_flow': return this.pauseFlow(params.sessionId);
      case 'resume_flow': return this.resumeFlow(params.sessionId);
      case 'get_execution_status': return this.getExecutionStatus();
      // Dynamic Nodes
      case 'list_node_types': return this.listNodeTypes();
      case 'add_node': return this.addNode(params);
      case 'update_node': return this.updateNode(params);
      case 'remove_node': return this.removeNode(params);
      case 'connect_nodes': return this.connectNodes(params);
      case 'disconnect_nodes': return this.disconnectNodes(params);
      // Tables
      case 'list_tables': return this.listTables();
      case 'get_table': return this.getTable(params.tableId);
      case 'create_table': return this.createTable(params);
      case 'modify_table': return this.modifyTable(params);
      case 'delete_table': return this.deleteTable(params.tableId);
      // Globals
      case 'list_globals': return this.listGlobals();
      case 'get_global': return this.getGlobal(params.slug);
      case 'set_global': return this.setGlobal(params);
      case 'delete_global': return this.deleteGlobal(params.slug);
      // Browser
      case 'scan_page': return this.scanPage();
      case 'run_js': return this.runJs(params.code);
      case 'take_screenshot': return this.takeScreenshot();
      case 'get_text': return this.getElementText(params.selector);
      case 'list_tabs': return this.listTabs();
      case 'search_history': return this.searchHistory(params);
      case 'list_extensions': return this.listExtensions();
      // Logs
      case 'get_logs': return this.getLogs(params);
      case 'clear_logs': return this.clearLogs(params);
      case 'get_mcp_tools': return this.getMcpTools();
      case 'register_bundle': return this.registerBundle(params);
      case 'list_bundles': return this.listBundles();
      case 'get_bundle': return this.getBundle(params.bundleId);
      case 'call_mcp_tool': return this.dispatch(params.name, params.arguments || {});
      default:
        // Dynamically try to execute as a registered node plugin
        // This makes ALL node types (including custom/addon nodes) available
        try {
          return await this.testDispatch(method, params);
        } catch (pluginErr: any) {
          throw new Error(`Unknown MCP method: ${method}. Plugin fallback failed: ${pluginErr.message}`);
        }
    }
  }

  // ========== WORKFLOW CRUD ==========
  private async listFlows() {
    const workflows = await db.workflows.toArray();
    return workflows.map(w => ({
      id: w.id, name: w.name,
      nodeCount: w.graph?.nodes?.length || 0,
      edgeCount: w.graph?.edges?.length || 0,
      isEncrypted: w.is_encrypted || false,
      settings: w.settings,
      createdAt: w.created_at, updatedAt: w.updated_at
    }));
  }

  private async getFlow(flowId: string) {
    const workflow = await db.workflows.get(flowId);
    if (!workflow) throw new Error(`Workflow not found: ${flowId}`);
    if (workflow.is_encrypted) throw new Error('Cannot read encrypted workflow via MCP');
    return {
      id: workflow.id, name: workflow.name,
      graph: workflow.graph || { nodes: [], edges: [] },
      settings: workflow.settings,
      createdAt: workflow.created_at, updatedAt: workflow.updated_at
    };
  }

  private async createFlow(params: { id?: string; name: string; description?: string }) {
    console.log("createFlow params received in McpBridge:", params);
    const id = params.id || crypto.randomUUID();
    const startNodeId = 'start-node';
    const now = Date.now();
    
    // Clean up any existing workflow with the same ID (to support clean re-creation/updates)
    await db.workflows.delete(id);
    
    await db.workflows.add({
      id, name: params.name, version: 1,
      graph: {
        nodes: [{ id: startNodeId, type: 'START', state: {}, metadata: { label: 'Start' }, position: { x: 250, y: 50 }, isRoot: true }],
        edges: []
      },
      settings: { description: params.description || '' },
      created_at: now, updated_at: now
    });
    return { id, name: params.name, startNodeId };
  }

  private async updateFlow(params: { flowId: string; name?: string; graph?: any; settings?: any }) {
    const workflow = await db.workflows.get(params.flowId);
    if (!workflow) throw new Error(`Workflow not found: ${params.flowId}`);
    const updates: any = { updated_at: Date.now() };
    if (params.name) updates.name = params.name;
    if (params.graph) updates.graph = params.graph;
    if (params.settings) updates.settings = { ...workflow.settings, ...params.settings };
    await db.workflows.update(params.flowId, updates);
    return { success: true };
  }

  private async deleteFlow(flowId: string) {
    await db.workflows.delete(flowId);
    return { success: true };
  }

  // ========== EXECUTION ==========
  private async executeFlow(flowId: string) {
    const runner = WorkflowRunner.getInstance();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab?.id;
    if (tabId) TabCoordinator.getInstance().registerTab(tabId, 'PRIMARY', tab.url || '');
    return await runner.start(flowId, { tabId });
  }

  private async stopFlow(sessionId?: string) {
    return await WorkflowRunner.getInstance().stop(sessionId);
  }

  private async pauseFlow(sessionId?: string) {
    return await WorkflowRunner.getInstance().pause(sessionId);
  }

  private async resumeFlow(sessionId?: string) {
    return await WorkflowRunner.getInstance().resume(sessionId);
  }

  private async getExecutionStatus() {
    const sessions = await db.execution_sessions.toArray();
    return sessions.map(s => ({
      sessionId: s.id, workflowId: s.workflow_id, status: s.status,
      currentNodeId: s.current_node_id, variables: s.variables,
      error: s.error, lastUpdated: s.last_updated
    }));
  }

  // ========== DYNAMIC NODE OPERATIONS ==========
  private async listNodeTypes() {
    const registry = FlowPilotRegistry.getInstance();
    const manifests = registry.getAllManifests();
    console.log('[MCP Bridge] listNodeTypes manifests count:', manifests.length, 'Registry instance manifests size:', (registry as any).manifests?.size);
    return manifests.map(m => ({
      type: m.type, label: m.label, description: m.description || '',
      category: m.category, icon: m.icon, ports: m.ports,
      permissions: m.permissions, initialState: m.initialState || {}
    }));
  }

  private async addNode(params: { flowId: string; nodeType: string; state?: Record<string, any>; position?: { x: number; y: number }; label?: string }) {
    const workflow = await db.workflows.get(params.flowId);
    if (!workflow) throw new Error(`Workflow not found: ${params.flowId}`);
    if (!workflow.graph) workflow.graph = { nodes: [], edges: [] };

    const manifest = FlowPilotRegistry.getInstance().getManifest(params.nodeType);
    if (!manifest) throw new Error(`Unknown node type: ${params.nodeType}. Use list_node_types to see available types.`);

    const nodeId = crypto.randomUUID();
    const lastNode = workflow.graph.nodes[workflow.graph.nodes.length - 1];
    const position = params.position || {
      x: lastNode?.position?.x || 250,
      y: (lastNode?.position?.y || 0) + 150
    };

    workflow.graph.nodes.push({
      id: nodeId, type: params.nodeType,
      state: { ...(manifest.initialState || {}), ...(params.state || {}) },
      metadata: { label: params.label || manifest.label },
      position, isRoot: false
    });

    await db.workflows.update(params.flowId, { graph: workflow.graph, updated_at: Date.now() });
    return { nodeId, type: params.nodeType, label: params.label || manifest.label, position };
  }

  private async updateNode(params: { flowId: string; nodeId: string; state?: Record<string, any>; label?: string }) {
    const workflow = await db.workflows.get(params.flowId);
    if (!workflow?.graph) throw new Error(`Workflow not found: ${params.flowId}`);
    const node = workflow.graph.nodes.find((n: any) => n.id === params.nodeId);
    if (!node) throw new Error(`Node not found: ${params.nodeId}`);
    if (params.state) node.state = { ...node.state, ...params.state };
    if (params.label) node.metadata = { ...node.metadata, label: params.label };
    await db.workflows.update(params.flowId, { graph: workflow.graph, updated_at: Date.now() });
    return { success: true, nodeId: params.nodeId };
  }

  private async removeNode(params: { flowId: string; nodeId: string }) {
    const workflow = await db.workflows.get(params.flowId);
    if (!workflow?.graph) throw new Error(`Workflow not found: ${params.flowId}`);
    workflow.graph.nodes = workflow.graph.nodes.filter((n: any) => n.id !== params.nodeId);
    workflow.graph.edges = workflow.graph.edges.filter((e: any) => e.sourceNodeId !== params.nodeId && e.targetNodeId !== params.nodeId);
    await db.workflows.update(params.flowId, { graph: workflow.graph, updated_at: Date.now() });
    return { success: true };
  }

  private async connectNodes(params: { flowId: string; sourceNodeId: string; targetNodeId: string; sourcePort?: string }) {
    const workflow = await db.workflows.get(params.flowId);
    if (!workflow?.graph) throw new Error(`Workflow not found: ${params.flowId}`);
    const edgeId = crypto.randomUUID();
    const edge: any = { 
      id: edgeId, 
      sourceNodeId: params.sourceNodeId, 
      targetNodeId: params.targetNodeId,
      type: params.sourcePort || 'success',
      mode: 'MAIN'
    };
    workflow.graph.edges.push(edge);
    await db.workflows.update(params.flowId, { graph: workflow.graph, updated_at: Date.now() });
    return { edgeId, success: true };
  }

  // ========== DATA TABLES ==========
  private async listTables() {
    const tables = await db.data_tables.toArray();
    return tables.map(t => ({ id: t.id, name: t.name, headers: t.headers, rowCount: t.rows?.length || 0, createdAt: t.created_at }));
  }

  private async getTable(tableId: string) {
    const table = await db.data_tables.get(tableId);
    if (!table) throw new Error(`Table not found: ${tableId}`);
    return table;
  }

  private async createTable(params: { name: string; headers: string[]; rows?: Record<string, any>[] }) {
    const id = crypto.randomUUID();
    await db.data_tables.add({ id, name: params.name, headers: params.headers, rows: params.rows || [], created_at: Date.now() });
    return { id, name: params.name };
  }

  private async modifyTable(params: { tableId: string; action: string; rowIndex?: number; rowData?: Record<string, any> }) {
    const table = await db.data_tables.get(params.tableId);
    if (!table) throw new Error(`Table not found: ${params.tableId}`);
    switch (params.action) {
      case 'add': table.rows.push(params.rowData || {}); break;
      case 'update': if (params.rowIndex !== undefined && table.rows[params.rowIndex]) table.rows[params.rowIndex] = { ...table.rows[params.rowIndex], ...params.rowData }; break;
      case 'delete': if (params.rowIndex !== undefined) table.rows.splice(params.rowIndex, 1); break;
      default: throw new Error(`Unknown table action: ${params.action}`);
    }
    await db.data_tables.update(params.tableId, { rows: table.rows });
    return { success: true, rowCount: table.rows.length };
  }

  // ========== GLOBAL VARIABLES ==========
  private async listGlobals() {
    const globals = await db.global_tables.toArray();
    return globals.map(g => ({ id: g.id, name: g.name, slug: g.slug, type: g.type, isSecure: g.is_secure, metadata: g.metadata, createdAt: g.created_at }));
  }

  private async getGlobal(slug: string) {
    const table = await db.global_tables.where('slug').equals(slug).first();
    if (!table) throw new Error(`Global table not found: ${slug}`);
    if (table.is_secure) throw new Error(`Cannot read secure global '${slug}' via MCP - vault access required`);
    if (table.type === 'VARIABLES') {
      return { slug: table.slug, name: table.name, type: table.type, data: table.data };
    } else {
      const linkedTable = await db.data_tables.get(table.data.tableId);
      return { slug: table.slug, name: table.name, type: table.type, data: linkedTable?.rows || [], headers: linkedTable?.headers || [] };
    }
  }

  private async setGlobal(params: { slug: string; data: Record<string, any>; name?: string; createIfMissing?: boolean }) {
    let table = await db.global_tables.where('slug').equals(params.slug).first();
    if (!table) {
      if (params.createIfMissing === false) throw new Error(`Global table not found: ${params.slug}`);
      const id = crypto.randomUUID();
      await db.global_tables.add({
        id, name: params.name || params.slug, slug: params.slug,
        type: 'VARIABLES', data: params.data,
        metadata: { keys: Object.keys(params.data) },
        is_secure: false, created_at: Date.now()
      });
      return { success: true, created: true, id };
    }
    if (table.is_secure) throw new Error(`Cannot write to secure global '${params.slug}' via MCP`);
    const updated = { ...table.data, ...params.data };
    await db.global_tables.update(table.id, { data: updated, metadata: { ...table.metadata, keys: Object.keys(updated) } });
    return { success: true, created: false };
  }

  // ========== BROWSER & PAGE ==========
  private async getActiveTabId(): Promise<number> {
    let tabId = TabCoordinator.getInstance().getPrimaryTabId();
    if (!tabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = tab?.id ?? null;
    }
    if (!tabId) throw new Error('No active tab found');
    return tabId;
  }

  private async scanPage() {
    const tabId = await this.getActiveTabId();
    const result = await ResilientTabSender.send(tabId, MessageType.DOM_SCAN, {});
    return result.data || result;
  }

  private async runJs(code: string) {
    const tabId = await this.getActiveTabId();
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: (codeStr) => {
          try {
            return eval(codeStr);
          } catch (e: any) {
            return { __error: e.message };
          }
        },
        args: [code]
      });
      const res = results?.[0]?.result;
      if (res && typeof res === 'object' && '__error' in res) {
        throw new Error((res as any).__error);
      }
      return res;
    } catch (err: any) {
      console.warn('[FlowPilot] Scripting API failed, falling back to tab sender:', err.message);
      const result = await ResilientTabSender.send(tabId, MessageType.DOM_EVAL, { code });
      return result.data !== undefined ? result.data : result;
    }
  }

  private async takeScreenshot() {
    const tabId = await this.getActiveTabId();
    const tab = await chrome.tabs.get(tabId);
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    return { screenshot: dataUrl, format: 'png', tabId, url: tab.url };
  }

  private async getElementText(selector: string) {
    const tabId = await this.getActiveTabId();
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: (sel) => {
          const el = document.querySelector(sel);
          return el ? el.innerText || el.textContent : null;
        },
        args: [selector]
      });
      return results?.[0]?.result ?? null;
    } catch (err: any) {
      console.warn('[FlowPilot] getElementText scripting failed:', err.message);
      return this.runJs(`document.querySelector("${selector.replace(/"/g, '\\"')}")?.innerText`);
    }
  }

  private async listTabs() {
    const tabs = await chrome.tabs.query({});
    return tabs.map(t => ({
      id: t.id,
      title: t.title,
      url: t.url,
      active: t.active,
      status: t.status,
      favIconUrl: t.favIconUrl
    }));
  }

  private async searchHistory(params: { text: string; maxResults?: number }) {
    return await chrome.history.search({
      text: params.text,
      maxResults: params.maxResults || 20
    });
  }

  private async listExtensions() {
    const list = await chrome.management.getAll();
    return list.map(e => ({
      id: e.id,
      name: e.name,
      enabled: e.enabled,
      type: e.type,
      version: e.version,
      description: e.description
    }));
  }

  // ========== LOGS ==========
  private async getLogs(params: {
    workflowId?: string;
    status?: string;
    limit?: number;
    offset?: number;
    startTime?: number;
    endTime?: number;
    query?: string;
  }) {
    let logs = await db.execution_logs.orderBy('timestamp').reverse().toArray();
    if (params.workflowId) {
      logs = logs.filter(l => l.workflow_id === params.workflowId);
    }
    if (params.status) {
      logs = logs.filter(l => l.status === params.status);
    }
    if (params.startTime !== undefined) {
      logs = logs.filter(l => l.timestamp >= params.startTime!);
    }
    if (params.endTime !== undefined) {
      logs = logs.filter(l => l.timestamp <= params.endTime!);
    }
    if (params.query) {
      const q = params.query.toLowerCase();
      logs = logs.filter(l => 
        (l.message && l.message.toLowerCase().includes(q)) || 
        (l.details && JSON.stringify(l.details).toLowerCase().includes(q))
      );
    }
    const offset = params.offset || 0;
    const limit = params.limit || 50;
    return logs.slice(offset, offset + limit);
  }

  private async clearLogs(params: { workflowId?: string }) {
    if (params.workflowId) {
      await db.execution_logs.where('workflow_id').equals(params.workflowId).delete();
    } else {
      await db.execution_logs.clear();
    }
    return { success: true };
  }

  // ========== ADDITIONAL ORCHESTRATION TOOLS ==========
  private async disconnectNodes(params: { flowId: string; sourceNodeId: string; targetNodeId: string; sourcePort?: string }) {
    const workflow = await db.workflows.get(params.flowId);
    if (!workflow || !workflow.graph) throw new Error(`Workflow not found: ${params.flowId}`);

    const initialLength = workflow.graph.edges?.length || 0;
    workflow.graph.edges = (workflow.graph.edges || []).filter((edge: any) => {
      const matchSource = edge.sourceNodeId === params.sourceNodeId;
      const matchTarget = edge.targetNodeId === params.targetNodeId;
      const matchPort = params.sourcePort === undefined || edge.type === params.sourcePort || edge.sourcePort === params.sourcePort;
      return !(matchSource && matchTarget && matchPort);
    });

    if (workflow.graph.edges.length === initialLength) {
      return { success: false, message: 'No matching edge found to disconnect' };
    }

    await db.workflows.update(params.flowId, {
      graph: workflow.graph,
      updated_at: Date.now()
    });
    return { success: true };
  }

  private async deleteTable(tableId: string) {
    const table = await db.data_tables.get(tableId);
    if (!table) throw new Error(`Table not found: ${tableId}`);
    await db.data_tables.delete(tableId);
    return { success: true };
  }

  private async deleteGlobal(slug: string) {
    const globalTable = await db.global_tables.where('slug').equals(slug).first();
    if (!globalTable) throw new Error(`Global table not found: ${slug}`);
    await db.global_tables.delete(globalTable.id);
    return { success: true };
  }

  private async registerBundle(params: {
    id: string;
    name: string;
    description: string;
    outputs?: string[];
    inputs?: any[];
  }) {
    const stored = await chrome.storage.local.get('node_bundles');
    const bundles = stored.node_bundles || [];
    const manifest = {
      id: params.id,
      name: params.name,
      description: params.description,
      outputs: params.outputs || ['success', 'failure'],
      inputs: params.inputs || [],
      enabled: true
    };
    const updated = bundles.filter((b: any) => b.id !== params.id).concat(manifest);
    await chrome.storage.local.set({ node_bundles: updated });
    await FlowPilotRegistry.discoverPlugins();
    return { success: true };
  }

  private async listBundles() {
    const stored = await chrome.storage.local.get('node_bundles');
    return stored.node_bundles || [];
  }

  private async getBundle(bundleId: string) {
    const stored = await chrome.storage.local.get('node_bundles');
    const bundles = stored.node_bundles || [];
    const bundle = bundles.find((b: any) => b.id === bundleId);
    if (!bundle) throw new Error(`Bundle not found: ${bundleId}`);
    return bundle;
  }

  // ========== DYNAMIC MCP TOOLS DISCOVERY ==========
  private getMcpTools() {
    return [
      {
        name: 'list_flows',
        description: 'List all workflows stored in FlowPilot database. Returns workflow metadata such as ID, name, nodeCount, edgeCount, encrypted status, settings, created time, and updated time.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_flow',
        description: 'Retrieve the complete graph (nodes, edges, and settings) of a specific workflow by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            flowId: { type: 'string', description: 'The unique UUID of the workflow to fetch' }
          },
          required: ['flowId']
        }
      },
      {
        name: 'create_flow',
        description: 'Create a new workflow with a starting START node.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the new workflow' },
            description: { type: 'string', description: 'Optional description for the workflow settings' }
          },
          required: ['name']
        }
      },
      {
        name: 'update_flow',
        description: 'Update a workflow\'s name, graph structure, or settings.',
        inputSchema: {
          type: 'object',
          properties: {
            flowId: { type: 'string', description: 'The unique UUID of the workflow to update' },
            name: { type: 'string', description: 'New name for the workflow' },
            graph: { type: 'object', description: 'New graph object containing { nodes: Array, edges: Array }' },
            settings: { type: 'object', description: 'New settings object to merge' }
          },
          required: ['flowId']
        }
      },
      {
        name: 'delete_flow',
        description: 'Delete a workflow permanently by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            flowId: { type: 'string', description: 'The unique UUID of the workflow to delete' }
          },
          required: ['flowId']
        }
      },
      {
        name: 'execute_flow',
        description: 'Starts executing a workflow in the active browser tab. Emits logs and records a run session.',
        inputSchema: {
          type: 'object',
          properties: {
            flowId: { type: 'string', description: 'The unique UUID of the workflow to run' }
          },
          required: ['flowId']
        }
      },
      {
        name: 'stop_flow',
        description: 'Stops an active workflow execution session.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Optional execution session UUID. If omitted, stops the first active running session.' }
          }
        }
      },
      {
        name: 'pause_flow',
        description: 'Pauses an active workflow execution session.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Optional session UUID. If omitted, pauses the first active running session.' }
          }
        }
      },
      {
        name: 'resume_flow',
        description: 'Resumes a paused workflow execution session.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Optional session UUID. If omitted, resumes the first active paused session.' }
          }
        }
      },
      {
        name: 'get_execution_status',
        description: 'Get the current state of all active execution sessions (running, paused, waiting).',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'list_node_types',
        description: 'Dynamically list all registered node types available in FlowPilot. This includes core, browser, logic, developer, human, and custom addon/bundle nodes. AI should use this to understand what node types are available and what their initialState schemas look like.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'add_node',
        description: 'Add a node of any type (e.g. NAVIGATE, CLICK, TYPE, INTERACT, SCRIPT, IF_BRANCH, Wait) to a workflow graph.',
        inputSchema: {
          type: 'object',
          properties: {
            flowId: { type: 'string', description: 'The unique UUID of the workflow' },
            nodeType: { type: 'string', description: 'The node type (must be one from list_node_types, e.g. NAVIGATE, CLICK, TYPE, INTERACT, SCRIPT, IF_BRANCH, WAIT)' },
            state: { type: 'object', description: 'Node configuration state. If omitted, uses the node\'s default manifest initialState.' },
            position: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' }
              },
              description: 'Canvas coordinates. If omitted, places the node below the last node.'
            },
            label: { type: 'string', description: 'Custom display label for the node' }
          },
          required: ['flowId', 'nodeType']
        }
      },
      {
        name: 'update_node',
        description: 'Update a node\'s configuration state or label within a workflow.',
        inputSchema: {
          type: 'object',
          properties: {
            flowId: { type: 'string', description: 'The unique UUID of the workflow' },
            nodeId: { type: 'string', description: 'The node instance UUID inside the workflow graph' },
            state: { type: 'object', description: 'Parameters to merge into the node\'s configuration state' },
            label: { type: 'string', description: 'New display label for the node' }
          },
          required: ['flowId', 'nodeId']
        }
      },
      {
        name: 'remove_node',
        description: 'Remove a node and delete all edges connected to it from a workflow graph.',
        inputSchema: {
          type: 'object',
          properties: {
            flowId: { type: 'string', description: 'The unique UUID of the workflow' },
            nodeId: { type: 'string', description: 'The node instance UUID to remove' }
          },
          required: ['flowId', 'nodeId']
        }
      },
      {
        name: 'connect_nodes',
        description: 'Create an execution path edge between a source node and target node in a workflow.',
        inputSchema: {
          type: 'object',
          properties: {
            flowId: { type: 'string', description: 'The unique UUID of the workflow' },
            sourceNodeId: { type: 'string', description: 'The source node instance UUID' },
            targetNodeId: { type: 'string', description: 'The target node instance UUID' },
            sourcePort: { type: 'string', description: 'The output port to connect from. Defaults to "success". (Use "true" or "false" for IF_BRANCH nodes)' }
          },
          required: ['flowId', 'sourceNodeId', 'targetNodeId']
        }
      },
      {
        name: 'disconnect_nodes',
        description: 'Remove an execution path edge between a source node and target node in a workflow, breaking their connection.',
        inputSchema: {
          type: 'object',
          properties: {
            flowId: { type: 'string', description: 'The unique UUID of the workflow' },
            sourceNodeId: { type: 'string', description: 'The source node instance UUID' },
            targetNodeId: { type: 'string', description: 'The target node instance UUID' },
            sourcePort: { type: 'string', description: 'The specific output port to disconnect. If omitted, all connections between the two nodes are removed.' }
          },
          required: ['flowId', 'sourceNodeId', 'targetNodeId']
        }
      },
      {
        name: 'list_tables',
        description: 'List all user data tables (datasets) stored in FlowPilot.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_table',
        description: 'Fetch all rows, headers, and metadata for a specific data table by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The unique UUID of the data table' }
          },
          required: ['tableId']
        }
      },
      {
        name: 'create_table',
        description: 'Create a new data table/dataset with defined headers and optional initial rows.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the new dataset' },
            headers: { type: 'array', items: { type: 'string' }, description: 'List of column names for the table' },
            rows: { type: 'array', items: { type: 'object' }, description: 'Initial rows to populate' }
          },
          required: ['name', 'headers']
        }
      },
      {
        name: 'modify_table',
        description: 'Add, update, or delete rows in a data table.',
        inputSchema: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The unique UUID of the table to modify' },
            action: { type: 'string', enum: ['add', 'update', 'delete'], description: 'Action to perform' },
            rowIndex: { type: 'number', description: 'The index of the row to update or delete (0-indexed)' },
            rowData: { type: 'object', description: 'The row columns data key-value object (required for add and update)' }
          },
          required: ['tableId', 'action']
        }
      },
      {
        name: 'delete_table',
        description: 'Delete a data table permanently by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            tableId: { type: 'string', description: 'The unique UUID of the data table to delete' }
          },
          required: ['tableId']
        }
      },
      {
        name: 'list_globals',
        description: 'List all global variables tables and datasets configured in FlowPilot.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_global',
        description: 'Get variables or rows stored in a global table by its slug.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'The identifier slug of the global table' }
          },
          required: ['slug']
        }
      },
      {
        name: 'set_global',
        description: 'Create or update variables under a global variables table.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'The slug of the global table to modify' },
            data: { type: 'object', description: 'Key-value pairs to set or merge' },
            name: { type: 'string', description: 'Optional name if a new global table is created' },
            createIfMissing: { type: 'boolean', description: 'Whether to create the global if it doesn\'t exist. Defaults to true.' }
          },
          required: ['slug', 'data']
        }
      },
      {
        name: 'delete_global',
        description: 'Delete a global variable table permanently by its slug.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'The slug of the global variable table to delete' }
          },
          required: ['slug']
        }
      },
      {
        name: 'scan_page',
        description: 'Scans the active browser tab and returns structured, AI-readable DOM data. This includes forms, inputs, interactive buttons, anchors, and candidates metadata. AI should use this to discover selectors and interactive components on the active web page.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'run_js',
        description: 'Execute JavaScript code in the main context of the active browser tab. Returns the evaluation result (string, number, boolean, array, or object) in real-time. Example: To extract state use an IIFE: "(() => { const btn = document.querySelector(\\"button\\"); return { text: btn?.innerText, disabled: btn?.disabled }; })()"',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'JavaScript code string to evaluate. Return a value or object to receive it in the tool response.' }
          },
          required: ['code']
        }
      },
      {
        name: 'take_screenshot',
        description: 'Capture a visible screenshot of the active browser tab. Returns page URL, tabId, and the screenshot as a base64 PNG data URL.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_text',
        description: 'Retrieve the visible text content of an element in the active tab by its CSS selector. Useful for scraping text safely without CSP issues.',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector of the target element (e.g. "h1", "div.ai-overview")' }
          },
          required: ['selector']
        }
      },
      {
        name: 'get_logs',
        description: 'Read execution audit logs with advanced filtering, time ranges, and text query search.',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string', description: 'Filter logs by workflow ID' },
            status: { type: 'string', enum: ['SUCCESS', 'ERROR', 'PENDING', 'RUNNING'], description: 'Filter logs by execution step status' },
            limit: { type: 'number', description: 'Max logs to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            startTime: { type: 'number', description: 'Filter logs starting from this epoch timestamp in milliseconds' },
            endTime: { type: 'number', description: 'Filter logs ending at this epoch timestamp in milliseconds' },
            query: { type: 'string', description: 'Search query string matching log message or details' }
          }
        }
      },
      {
        name: 'clear_logs',
        description: 'Clear all execution logs, or logs for a specific workflow.',
        inputSchema: {
          type: 'object',
          properties: {
            workflowId: { type: 'string', description: 'Filter to clear logs only for this specific workflow ID. Clears all if omitted.' }
          }
        }
      },
      {
        name: 'SPAWN',
        description: 'Launch/spawn a new browser window or tab. Optionally specify starting URL, viewport dimensions, or custom User Agent.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Starting URL to navigate to' },
            viewportWidth: { type: 'number', description: 'Viewport width in pixels (e.g. 1280)' },
            viewportHeight: { type: 'number', description: 'Viewport height in pixels (e.g. 720)' },
            userAgent: { type: 'string', description: 'Custom User Agent string' }
          }
        }
      },
      {
        name: 'CLOSE_TAB',
        description: 'Close the active browser tab.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'NAVIGATE',
        description: 'Navigate the active browser tab to a specified URL.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Target URL (e.g. "https://google.com")' }
          },
          required: ['url']
        }
      },
      {
        name: 'CLICK',
        description: 'Click on an element in the active browser tab identified by a CSS selector or XPath.',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS or XPath selector of the element to click' }
          },
          required: ['selector']
        }
      },
      {
        name: 'TYPE',
        description: 'Type text into an input field in the active browser tab.',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS or XPath selector of the target input element' },
            text: { type: 'string', description: 'The text to type' },
            clearFirst: { type: 'boolean', description: 'Whether to clear the input field first. Defaults to true.' },
            delay: { type: 'number', description: 'Delay in milliseconds between keystrokes' }
          },
          required: ['selector', 'text']
        }
      },
      {
        name: 'WAIT',
        description: 'Pause execution for a specific duration in milliseconds.',
        inputSchema: {
          type: 'object',
          properties: {
            duration: { type: 'number', description: 'Duration to wait in milliseconds' }
          },
          required: ['duration']
        }
      },
      {
        name: 'WAIT_STABILITY',
        description: 'Wait until the page becomes stable (no layout changes or DOM mutations).',
        inputSchema: {
          type: 'object',
          properties: {
            timeout: { type: 'number', description: 'Max timeout to wait in milliseconds. Defaults to 10000.' },
            stabilityTime: { type: 'number', description: 'Consecutive milliseconds of quietness required. Defaults to 500.' }
          }
        }
      },
      {
        name: 'INTERACT',
        description: 'Perform direct browser element interactions like focus, hover, or select.',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS or XPath selector of the element' },
            action: { type: 'string', enum: ['focus', 'blur', 'hover', 'select'], description: 'The interaction action to perform' }
          },
          required: ['selector', 'action']
        }
      },
      {
        name: 'list_tabs',
        description: 'List all open browser tabs with their IDs, titles, URLs, and active status.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'search_history',
        description: 'Search Chrome browsing history for matches against a text query.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Query text to search history for' },
            maxResults: { type: 'number', description: 'Maximum history matches to return (default: 20)' }
          },
          required: ['text']
        }
      },
      {
        name: 'list_extensions',
        description: 'List all installed browser extensions with their IDs, names, version, enabled status, and descriptions.',
        inputSchema: { type: 'object', properties: {} }
      }
    ];
  }
}
