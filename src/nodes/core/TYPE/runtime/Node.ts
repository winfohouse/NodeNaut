import type { NodePlugin, ExecutionContext, NodeResult } from '$framework/NodePlugin';
import { manifest, type TypeState } from '../manifest';
import { DOMActionHelper } from '$framework/DOMActionHelper';

export default class TypeNode implements NodePlugin<TypeState> {
  manifest = manifest;

  async execute(ctx: ExecutionContext<TypeState>): Promise<NodeResult> {
    return DOMActionHelper.executeInteract(ctx, {
      action: 'type',
      selector: ctx.node.state.selector,
      value: ctx.node.state.value,
      candidates: ctx.node.state.candidates,
      metadata: ctx.node.state.metadata,
      failCode: 'TYPE_FAILED',
      failMessage: 'Failed to type into element'
    });
  }
}
