import type { NodePlugin, ExecutionContext, NodeResult } from '$framework/NodePlugin';
import { manifest, type WaitState } from '../manifest';

export default class WaitNode implements NodePlugin<WaitState, Record<string, unknown>> {
  manifest = manifest;

  async execute(ctx: ExecutionContext<WaitState>): Promise<NodeResult<Record<string, unknown>>> {
    const { node, logger } = ctx;
    
    const ms = parseInt(node.state.value) || 2000;
    logger.info(`Waiting for ${ms}ms`);

    await new Promise(resolve => setTimeout(resolve, ms));

    return { success: true, nextPort: 'success' };
  }
}
