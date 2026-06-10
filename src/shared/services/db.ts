import Dexie, { type Table } from 'dexie';

export interface Workflow {
  id: string;
  name: string;
  version: number;
  settings: any;
  created_at: number;
  updated_at: number;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  order: number;
  type: string;
  config: any;
}

export interface ExecutionLog {
  id?: number;
  workflow_id: string;
  step_id?: string;
  status: 'SUCCESS' | 'ERROR' | 'PENDING' | 'RUNNING';
  message: string;
  timestamp: number;
  retry_count?: number;
}

export class FlowPilotDatabase extends Dexie {
  workflows!: Table<Workflow>;
  workflow_steps!: Table<WorkflowStep>;
  execution_logs!: Table<ExecutionLog>;

  constructor() {
    super('FlowPilotDB');
    this.version(1).stores({
      workflows: 'id, name, created_at, updated_at',
      workflow_steps: 'id, workflow_id, order',
      execution_logs: '++id, workflow_id, status, timestamp'
    });
  }
}

export const db = new FlowPilotDatabase();
