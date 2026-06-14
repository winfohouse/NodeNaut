import { db } from '$shared/services/db';
import { VaultService } from '$shared/services/vault';
import type { ExtRequest, ExtResponse } from '$shared/api/messenger';

export class SandboxService {
  private static instance: SandboxService;
  private sandboxReady = false;
  private pendingScriptResolvers = new Map<string, (res: ExtResponse) => void>();

  private constructor() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'FP_READY') {
        console.log('[FlowPilot] Sandbox Handshake Received: READY');
        this.sandboxReady = true;
        if (sendResponse) sendResponse({ success: true });
      }

      if (message.type === 'FP_LOG') {
        console.log(`[FlowPilot][Sandbox:${message.id}]`, message.message);
      }

      if (message.type === 'FP_SCRIPT_DONE') {
        const { id, success, data, error } = message;
        const resolver = this.pendingScriptResolvers.get(id);
        if (resolver) {
          resolver(success ? { success: true, data } : { success: false, error: { code: 'SCRIPT_RUNTIME_ERROR', message: error } });
          this.pendingScriptResolvers.delete(id);
        }
      }
      return false; // Sync handling for these
    });
  }

  static getInstance(): SandboxService {
    if (!SandboxService.instance) {
      SandboxService.instance = new SandboxService();
    }
    return SandboxService.instance;
  }

  async execute(payload: any): Promise<ExtResponse> {
    console.log('[FlowPilot] Starting Sandbox Execution Request');
    const { code, data, tableId } = payload;
    const scriptId = Math.random().toString(36).substring(2);
    
    try {
      await this.ensureOffscreen();
      
      // Request status if not ready
      if (!this.sandboxReady) {
        console.log('[FlowPilot] Sandbox not ready, requesting status...');
        chrome.runtime.sendMessage({ type: 'TO_SANDBOX', payload: { type: 'FP_STATUS_REQ' } });
        
        let waitCount = 0;
        while (!this.sandboxReady && waitCount < 25) { // Increased to 5s
          await new Promise(r => setTimeout(r, 200));
          if (waitCount % 5 === 0 && !this.sandboxReady) {
             chrome.runtime.sendMessage({ type: 'TO_SANDBOX', payload: { type: 'FP_STATUS_REQ' } });
          }
          waitCount++;
        }
        if (!this.sandboxReady) throw new Error('Sandbox handshake timeout (5s)');
      }

      const scriptData = await this.prepareScriptData(payload);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingScriptResolvers.delete(scriptId);
          reject(new Error('Sandbox execution watchdog timeout (30s)'));
        }, 30000);

        this.pendingScriptResolvers.set(scriptId, (res) => {
          clearTimeout(timeout);
          resolve(res);
        });

        chrome.runtime.sendMessage({
          type: 'TO_SANDBOX',
          payload: {
            id: scriptId,
            code,
            data,
            tableId,
            ...scriptData
          }
        });
      });
    } catch (e: any) {
      console.error('[FlowPilot] Sandbox execution failed:', e);
      return { success: false, error: { code: 'SANDBOX_FAILED', message: e.message } };
    }
  }

  private async ensureOffscreen() {
    try {
      const existingContexts = await (chrome.runtime as any).getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });
      if (existingContexts.length > 0) return;
    } catch (e) {}

    console.log('[FlowPilot] Initializing Offscreen Service...');
    this.sandboxReady = false; 

    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.DOM_PARSER], 
      justification: 'Sandboxed execution of custom FlowScripts to bypass page CSP.'
    });
  }

  private async prepareScriptData(payload: any): Promise<any> {
    const { tableId } = payload;
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
}
