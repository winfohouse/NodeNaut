import type { NodeManifest } from '$framework/NodePlugin';

export interface WaitState {
  value: string;
}

export const manifest: NodeManifest<WaitState> = {
  type: 'WAIT',
  label: 'Wait (Delay)',
  initialState: {
    value: '2000'
  },
  description: 'Pause the workflow for a specified number of milliseconds.',
  category: 'Interaction',
  version: 1,
  icon: 'Clock',
  permissions: {},
  ports: {
    inputs: ['default'],
    outputs: ['success']
  }
};
