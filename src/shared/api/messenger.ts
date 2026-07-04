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
      const errMsg = error.message || '';
      if (errMsg.includes('Could not establish connection') || errMsg.includes('Receiving end does not exist')) {
        console.warn(`Messenger [${type}]: Service worker is waking up...`);
      } else {
        console.error(`Messenger error [${type}]:`, error);
      }
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
      console.warn(`[NodeNaut] IPC Connection Warning [${type}] on tab ${tabId}: ${error.message}. This may be handled by automatic re-injection.`);
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
   * Broadcast a message to all frames of a specific tab and return the first successful response.
   */
  static async broadcastToTab<P = any, R = any>(tabId: number, type: MessageType, payload: P): Promise<ExtResponse<R>> {
    const request: ExtRequest<P> = {
      id: crypto.randomUUID(),
      type,
      payload
    };

    try {
      const frames = await chrome.webNavigation.getAllFrames({ tabId });
      if (!frames || frames.length === 0) {
        return await chrome.tabs.sendMessage(tabId, request);
      }

      const promises = frames.map(async (frame) => {
        try {
          return await chrome.tabs.sendMessage(tabId, request, { frameId: frame.frameId });
        } catch (err: any) {
          return { success: false, error: { code: 'IPC_FRAME_ERROR', message: err.message } };
        }
      });

      const results = await Promise.all(promises);
      const successResult = results.find(r => r && r.success);
      if (successResult) return successResult;

      const failureResult = results.find(r => r && !r.success && r.error?.code !== 'IPC_FRAME_ERROR');
      return failureResult || results[0] || { success: false, error: { code: 'NOT_FOUND', message: 'No frame responded successfully' } };
    } catch (error: any) {
      try {
        return await chrome.tabs.sendMessage(tabId, request);
      } catch (fallbackError: any) {
        return {
          success: false,
          error: {
            code: 'IPC_TAB_ERROR',
            message: fallbackError.message || 'Unknown IPC tab error'
          }
        };
      }
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
