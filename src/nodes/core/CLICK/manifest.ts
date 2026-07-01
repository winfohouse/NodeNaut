import type { NodeManifest } from '$framework/NodePlugin';

export interface ClickState {
  selector: string;
  interactType?: 'click' | 'dblclick' | 'right-click' | 'hover';
  candidates?: Record<string, unknown>[];
  metadata?: Record<string, string | number | boolean>;
}

export const manifest: NodeManifest<ClickState> = {
  type: 'CLICK',
  label: 'Click Element',
  initialState: {
    selector: '',
    interactType: 'click'
  },
  description: 'Trigger mouse events (Click, Double-Click, Right-Click, Hover) on a targeted element.',
  category: 'Interaction',
  version: 1,
  icon: 'MousePointer2',
  permissions: {
    domRead: true,
    domWrite: true
  },
  ports: {
    inputs: ['default'],
    outputs: ['success', 'failure']
  }
};
