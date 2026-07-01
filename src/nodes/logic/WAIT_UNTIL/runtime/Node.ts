import type { NodePlugin, ExecutionContext, NodeResult } from '$framework/NodePlugin';
import { manifest, type WaitUntilState } from '../manifest';

export default class WaitUntilNode implements NodePlugin<WaitUntilState> {
  manifest = manifest;

  async execute(ctx: ExecutionContext<WaitUntilState>): Promise<NodeResult> {
    const { node, services, vars, logger } = ctx;
    
    logger.info('Waiting until condition is met', { condition: node.state.value });

    let elapsed = 0;
    const timeout = node.state.timeout || 30000;
    const poll = node.state.poll || 1000;

    while (elapsed < timeout) {
      const resolvedCondition = await vars.resolve(node.state.value);
      
      // Execute in sandbox
      const response = await services.sandbox.execute({
        code: `return (${resolvedCondition})`,
        data: await vars.get('all')
      });

      if (response.success && (response.data === true || response.data === 'true')) {
        return { success: true, nextPort: 'success' };
      }

      await new Promise(r => setTimeout(r, poll));
      elapsed += poll;
    }

    return { 
      success: false, 
      nextPort: 'timeout',
      error: { code: 'WAIT_UNTIL_TIMEOUT', message: 'Condition was not met within timeout' }
    };
  }
}
