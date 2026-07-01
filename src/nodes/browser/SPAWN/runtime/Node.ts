import type { NodePlugin, ExecutionContext, NodeResult } from '$framework/NodePlugin';
import { manifest, type SpawnState } from '../manifest';

export default class SpawnNode implements NodePlugin<SpawnState> {
  manifest = manifest;

  async execute(ctx: ExecutionContext<SpawnState>): Promise<NodeResult> {
    const { node, vars, logger } = ctx;
    
    const resolvedUrl = await vars.resolve(node.state.url);
    logger.info('Spawning new parallel sequence', { url: resolvedUrl, workflowId: node.state.spawnWorkflowId });

    try {
      // 1. Create the new background tab
      const tab = await chrome.tabs.create({ url: resolvedUrl || 'about:blank', active: false });
      
      if (!tab.id) throw new Error('Failed to obtain new tab ID');

      // 2. Start the workflow in the new tab
      // We use the runtime.sendMessage to avoid circular dependency or complex kernel logic here
      // But actually, we can just call start on the runner if we had access to it.
      // Since we are in a plugin, we use the messenger service.
      
      // Wait for tab to load before starting sequence
      await new Promise((resolve) => {
        const listener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve(true);
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
        // Timeout fallback
        setTimeout(resolve, 5000);
      });

      // Trigger workflow start via background bridge
      chrome.runtime.sendMessage({
        type: 'WORKFLOW_START',
        payload: { 
          workflowId: node.state.spawnWorkflowId,
          tabId: tab.id 
        }
      });

      return { success: true, nextPort: 'success' };
    } catch (e: any) {
      return { 
        success: false, 
        nextPort: 'failure',
        error: { code: 'SPAWN_FAILED', message: e.message || 'Failed to spawn sequence' }
      };
    }
  }
}
