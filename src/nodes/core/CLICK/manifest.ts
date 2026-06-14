import type { NodeManifest } from '../../../shared/framework/NodePlugin';

export const manifest: NodeManifest = {
  type: 'CLICK',
  label: 'Click Element',
  category: 'Interaction',
  version: 1,
  icon: 'MousePointer2',
  permissions: {
    domRead: true,
    domWrite: true
  },
  ports: {
    inputs: ['default'],
    outputs: ['success', 'failure']
  }
};
