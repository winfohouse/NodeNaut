import type { NodePlugin, ExecutionContext, NodeResult } from '$framework/NodePlugin';
import { manifest } from '../manifest';

export default class CloseTabNode implements NodePlugin<Record<string, unknown>> {
  manifest = manifest;

  async execute(ctx: ExecutionContext<Record<string, unknown>>): Promise<NodeResult> {
    const { node, logger } = ctx;
    
    logger.info('Closing active tab', { tabId: node.tabId });

    try {
      await chrome.tabs.remove(node.tabId);
      return { success: true, nextPort: 'success' };
    } catch (e: any) {
      return { 
        success: false, 
        error: { code: 'CLOSE_FAILED', message: e.message || 'Failed to close tab' }
      };
    }
  }
}
