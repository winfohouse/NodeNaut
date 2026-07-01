import type { NodePlugin, ExecutionContext, NodeResult } from '$framework/NodePlugin';
import { manifest } from '../manifest';

export default class WaitUserNode implements NodePlugin<Record<string, unknown>, Record<string, unknown>> {
  manifest = manifest;

  async execute(ctx: ExecutionContext<Record<string, unknown>>): Promise<NodeResult<Record<string, unknown>>> {
    const { logger, runtime } = ctx;
    
    logger.info('Workflow Halted: Waiting for Human Interaction');

    // In a real execution, we would pause the session and wait for a resume signal.
    // For now, we use the runtime helper.
    runtime.pause();

    return { success: true, nextPort: 'success' };
  }
}
