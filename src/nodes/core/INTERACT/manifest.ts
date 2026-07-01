import type { NodeManifest } from '$framework/NodePlugin';

export interface InteractState {
  interactType: string;
  selector: string;
  value?: string;
  candidates?: Record<string, unknown>[];
  metadata?: Record<string, string | number | boolean>;
}

export const manifest: NodeManifest<InteractState> = {
  type: 'INTERACT',
  label: 'Universal Interaction',
  initialState: {
    interactType: 'click',
    selector: '',
    value: '',
    candidates: [],
    metadata: {}
  },
  description: 'A powerful, multi-mode node that handles mouse events, scrolling, clipboard actions, and data extraction.',
  category: 'Interaction',
  version: 1,
  icon: 'Zap',
  permissions: {
    domRead: true,
    domWrite: true
  },
  ports: {
    inputs: ['default'],
    outputs: ['success', 'failure']
  }
};
