import type { NodeManifest } from '$framework/NodePlugin';

export interface NotifyState {
  title: string;
  message: string;
  type: 'system' | 'alert';
}

export const manifest: NodeManifest<NotifyState> = {
  type: 'NOTIFY',
  label: 'Notify Me',
  initialState: {
    title: 'NodeNaut',
    message: 'Workflow execution update',
    type: 'system'
  },
  category: 'Advanced',
  version: 1,
  icon: 'Bell',
  permissions: {},
  ports: {
    inputs: ['default'],
    outputs: ['success']
  }
};
