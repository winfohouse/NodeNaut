export type WorkflowStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'WAITING' | 'COMPLETED' | 'FAILED';

export interface WorkflowContext {
  workflow_id: string;
  current_step_index: number;
  status: WorkflowStatus;
  variables: Record<string, any>;
  last_updated: number;
}
