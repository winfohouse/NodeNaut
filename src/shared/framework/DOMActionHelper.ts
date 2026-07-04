import type { ExecutionContext, NodeResult } from './NodePlugin';
import { MessageType } from '$shared/constants/messages';

export class DOMActionHelper {
  /**
   * Sends a generic message to the tab, logs the action, and formats the NodeResult response.
   */
  static async executeTabMessage(
    ctx: ExecutionContext<any>,
    messageType: MessageType | string,
    payload: any,
    options: {
      logMessage: string;
      logData?: Record<string, unknown>;
      failCode: string;
      failMessage: string;
    }
  ): Promise<NodeResult> {
    const { node, services, logger } = ctx;
    logger.info(options.logMessage, options.logData);

    const response = await services.messenger.sendToTab(node.tabId, messageType, payload);

    if (response.success) {
      return { success: true, nextPort: 'success', data: response.data };
    } else {
      return { 
        success: false, 
        nextPort: 'failure',
        error: { code: options.failCode, message: response.error?.message || options.failMessage }
      };
    }
  }

  /**
   * Helper to resolve variables, send interaction payload to tab, and return formatted response.
   */
  static async executeInteract(
    ctx: ExecutionContext<any>,
    options: {
      action: string;
      selector: string;
      value?: string;
      candidates?: any[];
      metadata?: any;
      failCode: string;
      failMessage: string;
    }
  ): Promise<NodeResult> {
    const { vars } = ctx;
    const resolvedSelector = await vars.resolve(options.selector);
    let resolvedValue = options.value !== undefined ? await vars.resolve(options.value) : undefined;

    // Resolve IndexedDB file references at runtime
    if (typeof resolvedValue === 'string' && resolvedValue.startsWith('dbfile:')) {
      const id = resolvedValue.split(':')[1];
      if (id) {
        try {
          const { FileStore } = await import('../../sidepanel/utils/FileStore');
          const fileData = await FileStore.getFile(id);
          if (fileData) {
            resolvedValue = new File([fileData.blob], fileData.name, { type: fileData.type }) as any;
          }
        } catch (err) {
          console.error('[NodeNaut] Failed to load large file from FileStore in runner', err);
        }
      }
    }

    // Resolve remote URL file references at runtime
    if (typeof resolvedValue === 'string' && (resolvedValue.startsWith('http://') || resolvedValue.startsWith('https://'))) {
      const isFileInput = options.metadata?.spec?.type === 'file' || options.action === 'paste';
      if (isFileInput) {
        try {
          const res = await fetch(resolvedValue);
          if (res.ok) {
            const blob = await res.blob();
            const urlParts = resolvedValue.split('/');
            const name = urlParts[urlParts.length - 1] || 'downloaded_file';
            resolvedValue = new File([blob], name, { type: blob.type }) as any;
          }
        } catch (err) {
          console.error('[NodeNaut] Failed to fetch remote file for upload in runner', err);
        }
      }
    }

    return this.executeTabMessage(
      ctx,
      MessageType.DOM_INTERACT,
      {
        action: options.action,
        selector: resolvedSelector,
        value: resolvedValue,
        candidates: options.candidates,
        metadata: options.metadata
      },
      {
        logMessage: `Executing DOM action: ${options.action}`,
        logData: { selector: resolvedSelector },
        failCode: options.failCode,
        failMessage: options.failMessage
      }
    );
  }
}
