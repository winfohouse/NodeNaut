import type { NodePlugin, ExecutionContext, NodeResult } from '$framework/NodePlugin';
import { manifest, type NotifyState } from '../manifest';

export default class NotifyNode implements NodePlugin<NotifyState> {
  manifest = manifest;

  async execute(ctx: ExecutionContext<NotifyState>): Promise<NodeResult> {
    const { node, vars, logger } = ctx;
    
    const resolvedTitle = await vars.resolve(node.state?.title || 'NodeNaut');
    const resolvedMessage = await vars.resolve(node.state?.message || 'Workflow notification message');
    const type = node.state?.type || 'system';

    logger.info(`Sending notification [Type: ${type}]: ${resolvedTitle} - ${resolvedMessage}`);

    try {
      if (type === 'alert') {
        if (typeof chrome !== 'undefined' && chrome.scripting && node.tabId) {
          await chrome.scripting.executeScript({
            target: { tabId: node.tabId },
            func: (msg) => alert(msg),
            args: [resolvedMessage]
          });
        } else {
          alert(`${resolvedTitle}: ${resolvedMessage}`);
        }
      } else {
        if (typeof chrome !== 'undefined' && chrome.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            title: resolvedTitle,
            message: resolvedMessage,
            priority: 2
          });
        } else {
          console.log(`[Notification Fallback] ${resolvedTitle}: ${resolvedMessage}`);
        }
      }

      return { success: true, nextPort: 'success' };
    } catch (e: any) {
      return { 
        success: false, 
        nextPort: 'failure',
        error: { code: 'NOTIFY_FAILED', message: e.message || 'Failed to send notification' }
      };
    }
  }
}
