import type { SelectorScore } from './scanner';
export type ActionType = 
  | 'CLICK' 
  | 'TYPE' 
  | 'INTERACT'
  | 'SELECT' 
  | 'NAVIGATE' 
  | 'WAIT' 
  | 'HOVER' 
  | 'SCRIPT' 
  | 'WAIT_USER' 
  | 'WAIT_STABILITY'
  | 'SPAWN'
  | 'CLOSE_TAB'
  | 'WAIT_UNTIL'
  | 'IF_BRANCH';

export type InteractType = 
  | 'click' | 'dblclick' | 'right-click' | 'hover' 
  | 'scroll-into-view' | 'type' | 'check' | 'uncheck' 
  | 'select' | 'extract-text' | 'extract-attr'
  | 'mousedown' | 'mouseup' | 'mousemove' | 'mouseover' | 'mouseout'
  | 'focus' | 'blur' | 'submit' | 'reset' | 'paste' | 'copy' | 'cut';

export interface WorkflowAction {
  id: string;
  type: ActionType;
  interactType?: InteractType; 
  selector: string; 
  candidates?: SelectorScore[]; 
  value?: string;   // For 'TYPE', 'SELECT', 'SCRIPT' (code), or 'WAIT_UNTIL' (expr)
  url?: string;     // For 'NAVIGATE' or 'SPAWN'
  spawnWorkflowId?: string; // For 'SPAWN'
  timeout?: number; 
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface WorkflowNode extends WorkflowAction {
  position: { x: number, y: number };
  isRoot?: boolean;
}

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type?: 'MAIN' | 'CLONE' | 'FRESH'; // MAIN = same tab, CLONE = new tab duplicate, FRESH = new tab blank
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Workflow {
  id: string;
  name: string;
  version: number;
  actions?: WorkflowAction[]; // Deprecated, migrating to graph
  graph?: WorkflowGraph;
  settings: Record<string, any>;
  created_at: number;
  updated_at: number;
}
