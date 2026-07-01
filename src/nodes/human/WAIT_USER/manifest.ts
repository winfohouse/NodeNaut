import type { NodeManifest } from '$framework/NodePlugin';

export const manifest: NodeManifest<Record<string, unknown>> = {
  type: 'WAIT_USER',
  label: 'Wait for User',
  initialState: {},
  category: 'Advanced',
  version: 1,
  icon: 'UserCircle',
  permissions: {},
  ports: {
    inputs: ['default'],
    outputs: ['success']
  }
};
