import type { NodeManifest } from '$framework/NodePlugin';

export interface NavigateState {
  url: string;
}

export const manifest: NodeManifest<NavigateState> = {
  type: 'NAVIGATE',
  label: 'Navigate to URL',
  initialState: {
    url: ''
  },
  description: 'Change the current page URL. Supports relative paths and dynamic variables.',
  category: 'Browser',
  version: 1,
  icon: 'Globe',
  permissions: {
    network: true
  },
  ports: {
    inputs: ['default'],
    outputs: ['success', 'failure']
  }
};
