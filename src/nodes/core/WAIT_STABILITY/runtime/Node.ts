import type { NodePlugin, ExecutionContext, NodeResult } from '$framework/NodePlugin';
import { manifest, type WaitStabilityState } from '../manifest';
import { MessageType } from '$shared/constants/messages';
import { DOMActionHelper } from '$framework/DOMActionHelper';

export default class WaitStabilityNode implements NodePlugin<WaitStabilityState> {
  manifest = manifest;

  async execute(ctx: ExecutionContext<WaitStabilityState>): Promise<NodeResult> {
    return DOMActionHelper.executeTabMessage(
      ctx,
      MessageType.DOM_WAIT_STABILITY,
      { timeout: ctx.node.state.timeout },
      {
        logMessage: 'Waiting for page stability',
        logData: { timeout: ctx.node.state.timeout },
        failCode: 'STABILITY_TIMEOUT',
        failMessage: 'Page failed to stabilize'
      }
    );
  }
}
