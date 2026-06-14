export interface NodeManifest {
  type: string;
  label: string;
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
}

export interface NodeResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
  nextPort?: string;
  data?: any;
}

export interface ExecutionContext {
  node: {
    id: string;
    state: any;
    tabId: number;
  };
  services: {
    dom: any; // Strictly typed in implementation
    messenger: any;
    vault: any;
    sandbox: any;
  };
  vars: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    resolve(str: string): Promise<string>;
  };
  logger: {
    info(msg: string, data?: any): void;
    warn(msg: string, data?: any): void;
    error(msg: string, data?: any): void;
  };
  runtime: {
    pause(): void;
    stop(): void;
    next(port: string): void;
  };
}

export interface NodePlugin {
  manifest: NodeManifest;
  onInit?(ctx: ExecutionContext): Promise<void>;
  execute(ctx: ExecutionContext): Promise<NodeResult>;
  recover?(error: any, ctx: ExecutionContext): Promise<boolean>;
  migrate?(oldState: any, fromVersion: number): any;
  onDestroy?(): void;
}
