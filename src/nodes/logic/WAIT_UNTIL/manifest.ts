import type { NodeManifest } from '$framework/NodePlugin';

export interface WaitUntilState {
  value: string;
  timeout: number;
  poll: number;
}

export const manifest: NodeManifest<WaitUntilState> = {
  type: 'WAIT_UNTIL',
  label: 'Wait Until (Condition)',
  initialState: {
    value: '',
    timeout: 30000,
    poll: 1000
  },
  description: 'Polls the page until a specific expression or element state becomes true. Ideal for waiting for OTPs or dynamic page transitions.',
  category: 'Logic',
  version: 1,
  icon: 'Timer',
  permissions: {
    domRead: true
  },
  ports: {
    inputs: ['default'],
    outputs: ['success', 'timeout']
  }
};
