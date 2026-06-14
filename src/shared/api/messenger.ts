import type { MessageType } from '$shared/constants/messages';

export interface ExtRequest<T = any> {
  id: string;
  type: MessageType;
  payload: T;
}

export interface ExtResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export class Messenger {
  /**
   * Send a typed message to the background or another context
   */
  static async send<P = any, R = any>(type: MessageType, payload: P): Promise<ExtResponse<R>> {
    const request: ExtRequest<P> = {
      id: crypto.randomUUID(),
      type,
      payload
    };

    try {
      return await chrome.runtime.sendMessage(request);
    } catch (error: any) {
      console.error(`Messenger error [${type}]:`, error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error.message || 'Unknown IPC error'
        }
      };
    }
  }

  /**
   * Send a message to a specific tab
   */
  static async sendToTab<P = any, R = any>(tabId: number, type: MessageType, payload: P): Promise<ExtResponse<R>> {
    const request: ExtRequest<P> = {
      id: crypto.randomUUID(),
      type,
      payload
    };

    try {
      return await chrome.tabs.sendMessage(tabId, request);
    } catch (error: any) {
      // Use warn here as the background script often has resilience/retry logic
      console.warn(`[FlowPilot] IPC Connection Warning [${type}] on tab ${tabId}: ${error.message}. This may be handled by automatic re-injection.`);
      return {
        success: false,
        error: {
          code: 'IPC_TAB_ERROR',
          message: error.message || 'Unknown IPC tab error'
        }
      };
    }
  }

  /**
   * Listen for messages in the current context
   */
  static listen(handler: (request: ExtRequest) => Promise<ExtResponse | void>) {
    chrome.runtime.onMessage.addListener((request: ExtRequest, sender, sendResponse) => {
      handler(request)
        .then((response) => {
          if (response) sendResponse(response);
        })
        .catch((error) => {
          console.error('Messenger handler error:', error);
          sendResponse({
            success: false,
            error: { code: 'HANDLER_ERROR', message: error.message }
          });
        });
      return true; // Keep channel open for async response
    });
  }
}
