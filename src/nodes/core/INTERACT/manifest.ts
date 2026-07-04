import type { NodeManifest } from '$framework/NodePlugin';

export interface InteractState {
  interactType: string;
  selector: string;
  value?: string;
  saveMode?: 'local' | 'global' | 'table';
  variableName?: string;
  globalTableSlug?: string;
  globalTableKey?: string;
  tableColumn?: string;
  candidates?: Record<string, unknown>[];
  metadata?: Record<string, any>;
}

export const manifest: NodeManifest<InteractState> = {
  type: 'INTERACT',
  label: 'Universal Interaction',
  initialState: {
    interactType: 'click',
    selector: '',
    value: '',
    saveMode: 'local',
    variableName: '',
    globalTableSlug: '',
    globalTableKey: '',
    tableColumn: '',
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
