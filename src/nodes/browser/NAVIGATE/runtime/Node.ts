import type { NodePlugin, ExecutionContext, NodeResult } from '$framework/NodePlugin';
import { manifest, type NavigateState } from '../manifest';

export default class NavigateNode implements NodePlugin<NavigateState> {
  manifest = manifest;

  async execute(ctx: ExecutionContext<NavigateState>): Promise<NodeResult> {
    const { node, vars, logger } = ctx;
    
    const resolvedUrl = await vars.resolve(node.state.url);
    if (!resolvedUrl) return { success: false, error: { code: 'INVALID_URL', message: 'No URL provided' } };

    logger.info('Navigating to URL', { url: resolvedUrl });

    try {
      await chrome.tabs.update(node.tabId, { url: resolvedUrl });
      
      // Wait for completion
      await new Promise((resolve) => {
        const listener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
          if (tabId === node.tabId && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(resolve, 1000); // Buffer for SPA/Redirection
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });

      return { success: true, nextPort: 'success' };
    } catch (e: any) {
      return { 
        success: false, 
        nextPort: 'failure',
        error: { code: 'NAVIGATE_FAILED', message: e.message || 'Failed to navigate' }
      };
    }
  }
}
