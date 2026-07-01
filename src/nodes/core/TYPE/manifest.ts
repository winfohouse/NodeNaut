import type { NodeManifest } from '$framework/NodePlugin';

export interface TypeState {
  selector: string;
  value: string;
  candidates?: Record<string, unknown>[];
  metadata?: Record<string, string | number | boolean>;
}

export const manifest: NodeManifest<TypeState> = {
  type: 'TYPE',
  label: 'Type Text',
  initialState: {
    selector: '',
    value: ''
  },
  description: 'Enter data into forms, inputs, and textareas. Supports variable interpolation from spreadsheets.',
  category: 'Interaction',
  version: 1,
  icon: 'Type',
  permissions: {
    domRead: true,
    domWrite: true
  },
  ports: {
    inputs: ['default'],
    outputs: ['success', 'failure']
  }
};
