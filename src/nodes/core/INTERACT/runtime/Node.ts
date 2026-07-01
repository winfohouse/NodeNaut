import type { NodePlugin, ExecutionContext, NodeResult } from '$framework/NodePlugin';
import { manifest, type InteractState } from '../manifest';
import { DOMActionHelper } from '$framework/DOMActionHelper';

export default class InteractNode implements NodePlugin<InteractState> {
  manifest = manifest;

  async execute(ctx: ExecutionContext<InteractState>): Promise<NodeResult> {
    const result = await DOMActionHelper.executeInteract(ctx, {
      action: ctx.node.state.interactType,
      selector: ctx.node.state.selector,
      value: ctx.node.state.value || '',
      candidates: ctx.node.state.candidates,
      metadata: ctx.node.state.metadata,
      failCode: 'INTERACT_FAILED',
      failMessage: `Failed to execute ${ctx.node.state.interactType}`
    });

    if (result.success && ctx.node.state.interactType.startsWith('extract')) {
      ctx.logger.info('Extraction result captured', { result: result.data });
    }

    return result;
  }
}
