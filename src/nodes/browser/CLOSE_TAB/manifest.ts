import type { NodeManifest } from '$framework/NodePlugin';

export const manifest: NodeManifest<Record<string, unknown>> = {
  type: 'CLOSE_TAB',
  label: 'Close Current Tab',
  initialState: {},
  description: 'Terminates the browser tab associated with the current execution context.',
  category: 'Browser',
  version: 1,
  icon: 'XCircle',
  permissions: {},
  ports: {
    inputs: ['default'],
    outputs: ['success']
  }
};
