import type { NodeManifest } from '$framework/NodePlugin';

export interface ScriptState {
  code: string;
}

export const manifest: NodeManifest<ScriptState> = {
  type: 'SCRIPT',
  label: 'FlowScript IDE',
  initialState: {
    code: '// Write logic...'
  },
  description: 'Execute custom JavaScript logic in a secure neural sandbox.',
  category: 'Developer',
  version: 1,
  icon: 'Code',
  permissions: {
    domRead: true,
    domWrite: true,
    network: true,
    vault: true
  },
  ports: {
    inputs: ['default'],
    outputs: ['success', 'failure']
  }
};
