import type { NodePlugin, ExecutionContext, NodeResult } from '$framework/NodePlugin';
import { manifest, type ClickState } from '../manifest';
import { DOMActionHelper } from '$framework/DOMActionHelper';

export default class ClickNode implements NodePlugin<ClickState> {
  manifest = manifest;

  async execute(ctx: ExecutionContext<ClickState>): Promise<NodeResult> {
    return DOMActionHelper.executeInteract(ctx, {
      action: ctx.node.state.interactType || 'click',
      selector: ctx.node.state.selector,
      candidates: ctx.node.state.candidates,
      metadata: ctx.node.state.metadata,
      failCode: 'CLICK_FAILED',
      failMessage: 'Failed to click element'
    });
  }
}
