import type { NodeManifest } from '$framework/NodePlugin';

export interface WaitStabilityState {
  timeout: number;
}

export const manifest: NodeManifest<WaitStabilityState> = {
  type: 'WAIT_STABILITY',
  label: 'Wait for Page Stability',
  initialState: {
    timeout: 10000
  },
  description: 'Pauses the workflow until no significant DOM mutations are detected, ensuring the page has finished loading dynamic content.',
  category: 'Interaction',
  version: 1,
  icon: 'Activity',
  permissions: {
    domRead: true
  },
  ports: {
    inputs: ['default'],
    outputs: ['success', 'failure']
  }
};
