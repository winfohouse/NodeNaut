import type { NodeManifest } from '$framework/NodePlugin';
import { type ConditionModel } from '$shared/utils/ConditionEngine';

export interface IfBranchState {
  conditionModel?: ConditionModel;
  value?: string;
}

export const manifest: NodeManifest<IfBranchState> = {
  type: 'IF_BRANCH',
  label: 'Logic Branch',
  initialState: {
    value: 'false'
  },
  description: 'A visual decision-making node. Split your workflow based on element visibility, text content, or spreadsheet values.',
  category: 'Logic',
  version: 1,
  icon: 'Layers',
  permissions: {
    domRead: true
  },
  ports: {
    inputs: ['default'],
    outputs: ['true', 'false']
  }
};
