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
      console.error(`Messenger Tab error [${type}] on tab ${tabId}:`, error);
      return {
        success: false,
        error: {
          code: 'IPC_TAB_ERROR',
          message: error.message || 'Unknown IPC tab error'
        }
      };
    }
  }
}
