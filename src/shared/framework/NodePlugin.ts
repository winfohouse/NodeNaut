import type { MessageType } from '$shared/constants/messages';

/**
 * --- System-Wide Persistence Types ---
 */
export interface HeuristicCandidate {
  selector: string;
  score: number;
  type: string;
  source: string;
}

export interface ElementDiscovery {
  selector: string;
  label: string;
  candidates: HeuristicCandidate[];
  type?: 'CLICK' | 'TYPE' | 'BUTTON' | 'INPUT';
  metadata?: Record<string, string | number | boolean>;
}

export interface ExecutionError {
  code: string;
  message: string;
}

export interface ExtResponse<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: ExecutionError;
}

/**
 * --- Capability Interfaces (Services) ---
 */
export interface MessengerService {
  send<P = Record<string, unknown>, R = Record<string, unknown>>(
    type: MessageType | string, 
    payload: P
  ): Promise<ExtResponse<R>>;
  
  sendToTab<P = Record<string, unknown>, R = Record<string, unknown>>(
    tabId: number, 
    type: MessageType | string, 
    payload: P
  ): Promise<ExtResponse<R>>;
}

export interface VaultServiceCapability {
  encrypt(plaintext: string): Promise<string>;
  decrypt(base64: string): Promise<string>;
}

export interface SandboxServiceCapability {
  execute<P = Record<string, unknown>, R = Record<string, unknown>>(
    payload: { code: string; data?: P; tableId?: string }
  ): Promise<ExtResponse<R>>;
}

export interface DiscoveryServiceCapability {
  start(mode?: 'step' | 'condition'): Promise<ElementDiscovery>;
  scan(): Promise<ElementDiscovery[]>;
}

/**
 * --- Core Plugin Interfaces ---
 */
export interface NodeManifest<TState = Record<string, unknown>> {
  type: string;
  label: string;
  description?: string;
  category: 'Interaction' | 'Logic' | 'Browser' | 'Data' | 'Advanced';
  version: number;
  icon: string;
  permissions: {
    domRead?: boolean;
    domWrite?: boolean;
    storage?: boolean;
    vault?: boolean;
    network?: boolean;
  };
  ports: {
    inputs: string[];
    outputs: string[];
  };
  initialState?: TState;
}

export interface NodeResult<TOutput = Record<string, unknown>> {
  success: boolean;
  error?: ExecutionError;
  nextPort?: string;
  data?: TOutput;
}

export interface ExecutionContext<TState = Record<string, unknown>> {
  node: {
    id: string;
    state: TState;
    tabId: number;
    tableId?: string;
    rowIndex?: number;
  };
  services: {
    dom: Record<string, unknown>; // Page-specific context
    messenger: MessengerService;
    vault: VaultServiceCapability;
    sandbox: SandboxServiceCapability;
    picker: DiscoveryServiceCapability;
    runner: any;
  };
  vars: {
    get<V = unknown>(key: string): Promise<V>;
    set<V = unknown>(key: string, value: V): Promise<void>;
    resolve(str: string): Promise<string>;
  };
  logger: {
    info(msg: string, data?: Record<string, unknown>): void;
    warn(msg: string, data?: Record<string, unknown>): void;
    error(msg: string, data?: Record<string, unknown>): void;
  };
  runtime: {
    pause(): void;
    stop(): void;
    next(port: string): void;
  };
}

export interface NodePlugin<TState = Record<string, unknown>, TOutput = Record<string, unknown>> {
  manifest: NodeManifest<TState>;
  onInit?(ctx: ExecutionContext<TState>): Promise<void>;
  execute(ctx: ExecutionContext<TState>): Promise<NodeResult<TOutput>>;
  recover?(error: ExecutionError, ctx: ExecutionContext<TState>): Promise<boolean>;
  migrate?(oldState: Record<string, unknown>, fromVersion: number): TState;
  onDestroy?(): void;
}
