import Dexie, { type Table } from 'dexie';

export interface Workflow {
  id: string;
  name: string;
  version: number;
  actions?: any[]; // Deprecated
  graph?: { nodes: any[], edges: any[] };
  settings: any;
  is_encrypted?: boolean;
  encrypted_blob?: string;
  requires_secure_vault?: boolean; // New: Always challenge password if true
  created_at: number;
  updated_at: number;
}

export interface WorkflowVersion {
  id?: number;
  workflow_id: string;
  version: number;
  snapshot: string;
  timestamp: number;
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
  row_index?: number;
  status: 'SUCCESS' | 'ERROR' | 'PENDING' | 'RUNNING';
  message: string;
  details?: any; // Rich metadata for debugging
  timestamp: number;
  retry_count?: number;
}

export interface WorkflowContext {
  id: string; // Session ID (uuid)
  workflow_id: string;
  tab_id: number;
  current_step_index?: number; // Deprecated
  current_node_id?: string;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'SUCCESS' | 'FAILED' | 'WAITING';
  variables: Record<string, any>;
  last_updated: number;
  error?: string;
  parent_session_id?: string; // Optional: Link branches
}

export interface DataTable {
  id: string;
  name: string;
  headers: string[];
  rows: Record<string, any>[];
  created_at: number;
}

export interface GlobalTable {
  id: string;
  name: string;
  slug: string; 
  type: 'VARIABLES' | 'DATASET';
  data: any; 
  metadata?: {
    headers?: string[]; // For DATASET type
    keys?: string[];    // For VARIABLES type
  };
  is_secure: boolean;
  created_at: number;
}

export class NodeNautDatabase extends Dexie {
  workflows!: Table<Workflow>;
  workflow_steps!: Table<WorkflowStep>;
  workflow_versions!: Table<WorkflowVersion>;
  execution_logs!: Table<ExecutionLog>;
  execution_sessions!: Table<WorkflowContext>; // Renamed from workflow_context
  data_tables!: Table<DataTable>;
  global_tables!: Table<GlobalTable>;

  constructor() {
    super('NodeNautDB');
    this.version(7).stores({
      workflows: 'id, name, created_at, updated_at, is_encrypted',
      workflow_steps: 'id, workflow_id, order',
      workflow_versions: '++id, workflow_id, version',
      execution_logs: '++id, workflow_id, status, timestamp',
      execution_sessions: 'id, workflow_id, tab_id', // Fresh table
      data_tables: 'id, name, created_at',
      global_tables: 'id, name, slug, is_secure',
      workflow_context: null // Explicitly delete the problematic table
    });

    this.version(8).stores({
      workflows: 'id, name, created_at, updated_at, is_encrypted',
      workflow_steps: 'id, workflow_id, order',
      workflow_versions: '++id, workflow_id, version',
      execution_logs: '++id, workflow_id, status, timestamp',
      execution_sessions: 'id, workflow_id, tab_id',
      data_tables: 'id, name, created_at',
      global_tables: 'id, name, slug, is_secure'
    }).upgrade(tx => {
      // Auto-migrate legacy linear actions array into a 2D graph
      return tx.table('workflows').toCollection().modify(workflow => {
        if (!workflow.graph && workflow.actions && workflow.actions.length > 0) {
          const nodes: any[] = [];
          const edges: any[] = [];
          
          let currentY = 50;
          const startX = 250;

          workflow.actions.forEach((action: any, index: number) => {
            nodes.push({
              ...action,
              position: { x: startX, y: currentY },
              isRoot: index === 0
            });

            if (index < workflow.actions.length - 1) {
              edges.push({
                id: crypto.randomUUID(),
                sourceNodeId: action.id,
                targetNodeId: workflow.actions[index + 1].id
              });
            }

            currentY += 150; // Spacing for linear flow
          });

          workflow.graph = { nodes, edges };
        }
      });
    });
  }
}

export const db = new NodeNautDatabase();
