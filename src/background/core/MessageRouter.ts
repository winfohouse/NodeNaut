import { MessageType } from '$shared/constants/messages';
import { WorkflowRunner } from './WorkflowRunner';
import { Messenger, type ExtRequest, type ExtResponse } from '$shared/api/messenger';
import { db } from '$shared/services/db';
import { TabCoordinator } from './TabCoordinator';
import { VaultService } from '$shared/services/vault';
import { ResilientTabSender } from './ResilientTabSender';

import { SandboxService } from './SandboxService';

export class MessageRouter {
  private workflowRunner = WorkflowRunner.getInstance();
  private tabCoordinator = TabCoordinator.getInstance();
  private sandboxService = SandboxService.getInstance();

  init() {
    chrome.runtime.onMessage.addListener((request: ExtRequest, sender, sendResponse) => {
      // Bridge commands from Sandbox to Content Script
      if ((request as any).type?.startsWith('FP_') && (request as any).type?.endsWith('_REQ')) {
        this.handleSandboxRequest(request as any, sender);
        return false; 
      }

      this.handleMessage(request, sender)
        .then(sendResponse)
        .catch((error) => {
          console.error('Router handle error:', error);
          sendResponse({
            success: false,
            error: { code: 'ROUTER_ERROR', message: error.message }
          });
        });
      return true;
    });
  }

  private async handleSandboxRequest(message: any, sender: chrome.runtime.MessageSender) {
    const { type, callId } = message;
    let tabId = this.tabCoordinator.getPrimaryTabId();
    
    if (!tabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = tab?.id ?? null;
      if (tabId) {
        this.tabCoordinator.registerTab(tabId, 'PRIMARY', tab.url);
      }
    }

    if (!tabId) {
      console.error('[FlowPilot] Sandbox bridge failed: No primary tab registered');
      return;
    }

    console.log(`[FlowPilot] Bridging Sandbox Req: ${type}`);

    // Standard Mapping for common commands to avoid massive switch
    const commandMap: Record<string, { type: MessageType, payloadMapper: (m: any) => any }> = {
      'FP_CLICK_REQ': { type: MessageType.DOM_CLICK, payloadMapper: (m) => ({ selector: m.selector }) },
      'FP_FILL_REQ': { type: MessageType.DOM_FILL, payloadMapper: (m) => ({ selector: m.selector, value: m.value }) },
      'FP_WAIT_FOR_REQ': { type: MessageType.DOM_HIGHLIGHT, payloadMapper: (m) => ({ selector: m.selector }) },
      'FP_SCAN_REQ': { type: MessageType.DOM_SCAN, payloadMapper: () => ({}) }
    };

    const mapping = commandMap[type];
    if (mapping) {
      const response = await this.forwardWithRetry({ 
        id: crypto.randomUUID(),
        type: mapping.type, 
        payload: mapping.payloadMapper(message) 
      });
      chrome.runtime.sendMessage({ type: type.replace('_REQ', '_RES'), callId, data: response.data || response.success });
      return;
    }

    switch (type) {
      case 'FP_ALERT_REQ': 
        await chrome.scripting.executeScript({ target: { tabId }, func: (m) => alert(m), args: [message.message], world: 'MAIN' });
        chrome.runtime.sendMessage({ type: 'FP_ALERT_RES', callId, data: true });
        return;
      case 'FP_TABLE_REQ':
        const tableRes = await this.handleTableAction(message);
        chrome.runtime.sendMessage({ type: 'FP_TABLE_RES', callId, data: tableRes.data || tableRes.success });
        return;
      case 'FP_GLOBAL_REQ':
        const globalRes = await this.handleGlobalAction(message);
        chrome.runtime.sendMessage({ type: 'FP_GLOBAL_RES', callId, data: globalRes.data || globalRes.success });
        return;
    }
  }

  private handleMessage = async (request: ExtRequest, sender: chrome.runtime.MessageSender): Promise<ExtResponse> => {
    switch (request.type) {
      case MessageType.WORKFLOW_START:
        let workflowTabId = request.payload.tabId;
        if (!workflowTabId) {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          workflowTabId = activeTab?.id;
        }
        if (workflowTabId) {
          this.tabCoordinator.registerTab(workflowTabId, 'PRIMARY', '');
        }
        return await this.workflowRunner.start(request.payload.workflowId, { tabId: workflowTabId });
      
      case MessageType.WORKFLOW_STOP:
        return await this.workflowRunner.stop(request.payload?.sessionId);

      case MessageType.WORKFLOW_PAUSE:
        return await this.workflowRunner.pause(request.payload?.sessionId);

      case MessageType.WORKFLOW_RESUME:
        return await this.workflowRunner.resume(request.payload?.sessionId);

      case MessageType.WORKFLOW_STEP:
        return await this.workflowRunner.step(request.payload?.sessionId);

      case 'RESOLVE_EXPRESSION' as any:
        const resolved = await this.workflowRunner.resolvePreview(request.payload.expression, request.payload.tableId);
        return { success: true, data: resolved };

      case MessageType.DOM_SCAN:
      case MessageType.DOM_FILL:
      case MessageType.DOM_CLICK:
      case MessageType.DOM_INTERACT:
      case MessageType.DOM_SCRIPT:
      case MessageType.DOM_HIGHLIGHT:
      case MessageType.DOM_EVAL:
      case MessageType.DOM_GET_SPEC:
      case MessageType.RECORDER_START:
      case MessageType.RECORDER_STOP:
      case MessageType.PICKER_START:
      case MessageType.PICKER_STOP:
        if (request.type === MessageType.DOM_SCRIPT) {
          return await this.sandboxService.execute(request.payload);
        }
        return await this.forwardWithRetry(request);
      
      case MessageType.NAVIGATE:
        const targetTabId = request.payload.tabId || this.tabCoordinator.getPrimaryTabId();
        if (targetTabId) {
          await chrome.tabs.update(targetTabId, { url: request.payload.url });
          return { success: true };
        }
        return { success: false, error: { code: 'NO_TAB', message: 'No target tab for navigation' } };

      case MessageType.DOM_WAIT_STABILITY:
        return await this.forwardWithRetry(request);

      case MessageType.PICKER_SELECT:
        // Broadcast stop picking to all frames in the active tab to clean up overlays/listeners
        try {
          let tabId: number | null = this.tabCoordinator.getPrimaryTabId();
          if (tabId === null) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            tabId = tab?.id ?? null;
          }
          if (tabId !== null) {
            chrome.tabs.sendMessage(tabId, { type: MessageType.PICKER_STOP, payload: {} }).catch(() => {});
          }
        } catch (e) {}
        // Handled directly by sidepanel listeners, do not echo
        return { success: true };

      case 'GLOBAL_ACTION' as any:
        return await this.handleGlobalAction(request.payload);

      case 'TABLE_ACTION' as any:
        return await this.handleTableAction(request.payload);

      case MessageType.VAULT_UNLOCKED:
        await this.workflowRunner.handleVaultUnlocked();
        return { success: true };

      case MessageType.RECORDER_EVENT:
        return await this.handleRecorderEvent(request.payload);

      case MessageType.SPA_NAVIGATED:
        // Automatically capture navigation during recording if an active recording exists
        const activeContext = await db.execution_sessions.toCollection().first();
        if (activeContext && (request.payload as any).url) {
          await this.handleRecorderEvent({
            workflowId: activeContext.workflow_id,
            action: {
              id: crypto.randomUUID(),
              type: 'NAVIGATE',
              url: (request.payload as any).url,
              timestamp: (request.payload as any).timestamp || Date.now()
            }
          });
        }
        return { success: true };

      default:
        return { success: false, error: { code: 'UNKNOWN_TYPE', message: `Type ${request.type} not handled` } };
    }
  }

  private async forwardWithRetry(request: ExtRequest): Promise<ExtResponse> {
    let tabId: number | null = this.tabCoordinator.getPrimaryTabId();
    if (tabId === null) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = tab?.id ?? null;
    }
    if (tabId === null) return { success: false, error: { code: 'NO_TAB', message: 'No target tab found' } };

    return await ResilientTabSender.send(tabId, request.type, request.payload);
  }

  private async prepareScriptData(payload: any): Promise<any> {
    const { tableId } = payload;
    
    // Fetch Global Samples (Row 0) for direct property access
    const globalTables = await db.global_tables.toArray(); 
    const gConfig = [];
    for (const t of globalTables) {
      let sample = {};
      try {
        let tData = t.data;
        if (t.is_secure) tData = JSON.parse(await VaultService.decrypt(t.data.blob));
        if (t.type === 'VARIABLES') sample = tData;
        else {
          const ds = await db.data_tables.get(tData.tableId);
          sample = ds?.rows?.[0] || {};
        }
      } catch (e) {}
      gConfig.push({ slug: t.slug, sample, type: t.type });
    }

    let tableHeaders: string[] = [];
    if (tableId) {
      const table = await db.data_tables.get(tableId);
      if (table) tableHeaders = table.headers;
    }

    return { gConfig, tableHeaders };
  }

  private async handleGlobalAction(payload: any): Promise<ExtResponse> {
    const { action, slug, index, rowData } = payload;
    try {
      const table = await db.global_tables.where('slug').equals(slug).first();
      if (!table) throw new Error(`Global table ${slug} not found`);

      let data = table.data;
      if (table.is_secure) data = JSON.parse(await VaultService.decrypt(table.data.blob));

      if (table.type === 'VARIABLES') {
        switch (action) {
          case 'getAll': return { success: true, data: [data] };
          case 'add':
          case 'update':
            // Variables update: Handle cases where rowData is missing but index is an object (shorthand)
            const payloadData = (rowData === undefined && typeof index === 'object' && index !== null) ? index : rowData;
            const updated = { ...data, ...payloadData };
            
            // Strip out any helper methods that might have leaked from the sandbox
            ['getAll', 'add', 'update', 'delete', 'forEach', 'find'].forEach(k => delete (updated as any)[k]);

            const toStore = table.is_secure ? { blob: await VaultService.encrypt(JSON.stringify(updated)) } : updated;
            await db.global_tables.update(table.id, { data: toStore });
            return { success: true };
        }
      } else {
        const actualTable = await db.data_tables.get(data.tableId);
        if (!actualTable) throw new Error('Dataset not found');
        switch (action) {
          case 'getAll': return { success: true, data: actualTable.rows };
          case 'add': actualTable.rows.push(rowData); break;
          case 'update': if(actualTable.rows[index]) actualTable.rows[index] = { ...actualTable.rows[index], ...rowData }; break;
          case 'delete': actualTable.rows.splice(index, 1); break;
        }
        await db.data_tables.update(data.tableId, { rows: actualTable.rows });
        return { success: true };
      }
      return { success: false };
    } catch (error: any) { return { success: false, error: { code: 'GLOBAL_ACTION_ERROR', message: error.message } }; }
  }

  private async handleTableAction(payload: any): Promise<ExtResponse> {
    const { action, tableId, index, rowData } = payload;
    if (!tableId) return { success: false, error: { code: 'MISSING_TABLE_ID', message: 'Table ID is required' } };
    try {
      const table = await db.data_tables.get(tableId);
      if (!table) return { success: false, error: { code: 'TABLE_NOT_FOUND', message: 'Table not found' } };
      switch (action) {
        case 'add': table.rows.push(rowData); break;
        case 'update': if(table.rows[index]) table.rows[index] = { ...table.rows[index], ...rowData }; break;
        case 'delete': table.rows.splice(index, 1); break;
        case 'getAll': return { success: true, data: table.rows };
      }
      await db.data_tables.update(tableId, { rows: table.rows });
      return { success: true };
    } catch (e: any) { return { success: false, error: { code: 'TABLE_ACTION_ERROR', message: e.message } }; }
  }

  private async handleRecorderEvent(payload: any): Promise<ExtResponse> {
    const { workflowId, action } = payload;
    if (!workflowId) return { success: false, error: { code: 'MISSING_WORKFLOW_ID', message: 'Workflow ID is required' } };
    try {
      const workflow = await db.workflows.get(workflowId);
      if (!workflow) return { success: false, error: { code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' } };
      const actions = (workflow as any).actions || [];
      actions.push(action);
      await db.workflows.update(workflowId, { actions, updated_at: Date.now() });
      return { success: true };
    } catch (error: any) { return { success: false, error: { code: 'RECORDER_EVENT_ERROR', message: error.message } }; }
  }
}
