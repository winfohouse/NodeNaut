import type { NodeManifest } from '$framework/NodePlugin';

export interface SpawnState {
  url: string;
  spawnWorkflowId: string;
}

export const manifest: NodeManifest<SpawnState> = {
  type: 'SPAWN',
  label: 'Spawn Tab & Workflow',
  initialState: {
    url: 'https://',
    spawnWorkflowId: ''
  },
  description: 'Starts a new browser tab and immediately executes a selected workflow sequence.',
  category: 'Browser',
  version: 1,
  icon: 'Layers',
  permissions: {
    network: true
  },
  ports: {
    inputs: ['default'],
    outputs: ['success', 'failure']
  }
};
