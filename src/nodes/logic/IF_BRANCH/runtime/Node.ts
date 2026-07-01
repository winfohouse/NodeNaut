import type { NodePlugin, ExecutionContext, NodeResult } from '$framework/NodePlugin';
import { manifest, type IfBranchState } from '../manifest';
import { ConditionEngine } from '$shared/utils/ConditionEngine';
import { MessageType } from '$shared/constants/messages';

export interface IfBranchOutput {
  result: boolean;
}

export default class IfBranchNode implements NodePlugin<IfBranchState, IfBranchOutput> {
  manifest = manifest;

  async execute(ctx: ExecutionContext<IfBranchState>): Promise<NodeResult<IfBranchOutput>> {
    const { node, services, vars, logger } = ctx;
    
    if (!node.state) {
      return { success: false, error: { code: 'STATE_MISSING', message: 'Node state is missing' } };
    }

    let model = node.state.conditionModel;
    
    // Auto-upgrade legacy IF_BRANCH actions
    if (!model) {
      model = ConditionEngine.createDefaultModel();
      model.mode = 'CUSTOM';
      model.customCode = node.state.value || 'false';
    }

    const timeoutMs = model.timeout || 0;
    const pollMs = model.poll || 500;
    let isTrue = false;
    let elapsed = 0;

    logger.info(`Evaluating IF branch [Mode: ${model.mode}] with ${timeoutMs}ms timeout`);

    while (true) {
      let evalResponse: any;
      
      if (model.mode === 'BUILDER') {
        // Deep resolve variables in the model before sending to tab
        const resolvedModel = JSON.parse(JSON.stringify(model));
        const resolveInGroup = async (group: any) => {
          if (!group.conditions) return;
          for (const c of group.conditions) {
            if (c.type === 'group') await resolveInGroup(c);
            else {
              if (c.value1) c.value1 = await vars.resolve(c.value1);
              if (c.value2) c.value2 = await vars.resolve(c.value2);
              if (c.selector) c.selector = await vars.resolve(c.selector);
            }
          }
        };
        await resolveInGroup(resolvedModel.rootGroup);
        
        evalResponse = await services.messenger.sendToTab(node.tabId, MessageType.DOM_EVAL, { model: resolvedModel });
      } else {
        // Custom JS mode
        const rawCode = model.customCode || 'false';
        const codeToEval = await vars.resolve(rawCode);
        const needsTab = codeToEval.includes('querySelectorDeep') || codeToEval.includes('isVisible') || codeToEval.includes('findElement');
        
        if (needsTab) {
          evalResponse = await services.messenger.sendToTab(node.tabId, MessageType.DOM_EVAL, { code: codeToEval });
        } else {
          evalResponse = await services.sandbox.execute({
            code: `return (${codeToEval})`,
            data: await vars.get('all')
          });
        }
      }

      if (evalResponse.success && (evalResponse.data === true || evalResponse.data === 'true')) {
        isTrue = true;
        break;
      }

      if (elapsed >= timeoutMs) break;

      await new Promise(r => setTimeout(r, pollMs));
      elapsed += pollMs;
    }

    return { 
      success: true, 
      nextPort: isTrue ? 'true' : 'false',
      data: { result: isTrue }
    };
  }
}
