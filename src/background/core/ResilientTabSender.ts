import { Messenger, type ExtResponse } from '$shared/api/messenger';
import { MessageType } from '$shared/constants/messages';

export class ResilientTabSender {
  /**
   * Sends a message to a tab with automatic content script re-injection on failure.
   */
  static async send(tabId: number, type: MessageType, payload: any): Promise<ExtResponse> {
    let response = await Messenger.sendToTab(tabId, type, payload);

    const isConnectionError = 
      !response.success && 
      (response.error?.message?.includes('Could not establish connection') || 
       response.error?.message?.includes('Receiving end does not exist') ||
       response.error?.code === 'IPC_TAB_ERROR');

    if (isConnectionError) {
      // Security Check: Do not attempt injection on restricted schemes
      try {
        const tab = await chrome.tabs.get(tabId);
        const url = tab.url || '';
        const restricted = ['chrome:', 'about:', 'edge:', 'view-source:', 'chrome-extension:'];
        if (restricted.some(s => url.startsWith(s))) {
          console.warn(`[FlowPilot] Skipping resilient re-injection on restricted URL: ${url}`);
          return response;
        }
      } catch (e) {
        // Tab might be gone or inaccessible
      }

      console.warn(`[FlowPilot] Tab ${tabId} disconnected during ${type}. Attempting resilient re-injection...`);
      try {
        // Attempt to re-inject the main content script
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['assets/content.js']
        });

        // HANDSHAKE: Verify script is truly active before proceeding
        let isReady = false;
        const PING_TYPE = MessageType.IPC_PING; // Local reference to help bundler
        
        for (let attempt = 0; attempt < 5; attempt++) {
          await new Promise(r => setTimeout(r, 200 * (attempt + 1))); // Incremental backoff
          const ping = await Messenger.sendToTab(tabId, PING_TYPE, {});
          if (ping.success && ping.data === 'PONG') {
            isReady = true;
            break;
          }
          console.warn(`[FlowPilot] Handshake attempt ${attempt + 1} failed for tab ${tabId}`);
        }

        if (!isReady) {
          throw new Error('Content script failed to initialize after re-injection');
        }

        // Retry the original message
        response = await Messenger.sendToTab(tabId, type, payload);
        
        if (response.success) {
          console.info(`[FlowPilot] Resilient connection RE-ESTABLISHED on tab ${tabId} for ${type}`);
        } else {
          console.error(`[FlowPilot] Retry failed after handshake on tab ${tabId}:`, response.error);
        }
      } catch (injectError: any) {
        console.error(`[FlowPilot] Critical: Resilient injection failed on tab ${tabId}:`, injectError);
        return {
          success: false,
          error: {
            code: 'RESILIENT_INJECTION_FAILED',
            message: injectError.message
          }
        };
      }
    }

    return response;
  }
}
