/**
 * NodeNaut Custom Node Developer Boilerplate & TypeScript Definitions
 * 
 * Instructions:
 * 1. Open this file in your TypeScript IDE (e.g., VS Code or Cursor) for full autocomplete.
 * 2. Implement your custom node by modifying the manifest and execute function below.
 * 3. Package your custom node by bundling it or saving the manifest and code as JSON:
 *    {
 *      "manifest": {
 *        "type": "MY_CUSTOM_NODE",
 *        "label": "My Custom Node",
 *        "category": "Advanced",
 *        "icon": "Cpu",
 *        "ports": {
 *          "inputs": ["default"],
 *          "outputs": ["success", "failure"]
 *        }
 *      },
 *      "runtime": "return async (ctx) => { ... your execute js code ... }",
 *      "configSchema": [
 *        { "name": "myTextOption", "type": "text", "label": "Custom Input Label", "placeholder": "Enter value..." }
 *      ]
 *    }
 * 4. Upload the JSON package in NodeNaut Settings under the Addon Panel.
 */

// ==========================================
// 1. TYPE DEFINITIONS & APIS
// ==========================================

export interface NodeManifest<TState = any> {
  type: string;
  label: string;
  category: 'Data' | 'Interaction' | 'Logic' | 'Browser' | 'Advanced';
  version: number;
  icon: string; // Any valid Lucide icon name (e.g., "Bell", "Cpu", "Globe", "Mail", "Search")
  ports: {
    inputs: string[];
    outputs: string[];
  };
  initialState?: TState;
}

export interface ExecutionContext<TState = any> {
  node: {
    id: string;
    type: string;
    state: TState;
    tabId: number;
  };
  vars: {
    resolve: (expression: string) => Promise<any>;
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
  logger: {
    info: (msg: string, details?: any) => void;
    warn: (msg: string, details?: any) => void;
    error: (msg: string, details?: any) => void;
  };
  services: {
    messenger: {
      sendToTab: (tabId: number, type: string, payload?: any) => Promise<any>;
    };
  };
}

export interface NodeResult<TOutput = any> {
  success: boolean;
  nextPort?: string; // The output port to route execution to (e.g. 'success', 'failure')
  data?: TOutput;
  error?: {
    code: string;
    message: string;
  };
}

export interface NodePlugin<TState = any, TOutput = any> {
  manifest: NodeManifest<TState>;
  execute(ctx: ExecutionContext<TState>): Promise<NodeResult<TOutput>>;
}

// APIs available inside the execute() code block:
export interface FlowAPI {
  click: (selector: string) => Promise<void>;
  fill: (selector: string, value: string) => Promise<void>;
  wait: (ms: number) => Promise<void>;
  scan: () => Promise<any[]>;
  log: (msg: any) => Promise<void>;
  waitFor: (selector: string, timeoutMs: number) => Promise<boolean>;
  alert: (msg: any) => Promise<void>;
}

export interface TableAPI {
  add: (rowData: Record<string, any>) => Promise<void>;
  update: (index: number, rowData: Record<string, any>) => Promise<void>;
  delete: (index: number) => Promise<void>;
  getAll: () => Promise<Record<string, any>[]>;
}

// ==========================================
// 2. EXAMPLE CUSTOM NODE IMPLEMENTATION
// ==========================================

export interface MyNodeState {
  selector: string;
  variableName: string;
}

export class MyCustomScraperNode implements NodePlugin<MyNodeState> {
  manifest: NodeManifest<MyNodeState> = {
    type: 'CUSTOM_SCRAPER',
    label: 'Custom Scraper',
    category: 'Advanced',
    version: 1,
    icon: 'Cpu',
    ports: {
      inputs: ['default'],
      outputs: ['success', 'failure']
    },
    initialState: {
      selector: 'h1',
      variableName: 'scrapedHeader'
    }
  };

  /**
   * The execute method runs in the background sandbox.
   * You can use browser tab control scripting, standard sandbox variables,
   * and the FLOW or Table APIs to build your logic!
   */
  async execute(ctx: ExecutionContext<MyNodeState>): Promise<NodeResult> {
    const { node, vars, logger, services } = ctx;
    const { selector, variableName } = node.state;

    logger.info(`Starting scrape node on selector: ${selector}`);

    try {
      // 1. Resolve selector expression in case of variable syntax
      const resolvedSelector = await vars.resolve(selector);

      // 2. Query element and extract text inside the tab context
      const evalResponse = await services.messenger.sendToTab(node.tabId, 'DOM_EVAL', {
        code: `(() => {
          const el = document.querySelector('${resolvedSelector}');
          return el ? el.textContent.trim() : null;
        })()`
      });

      if (!evalResponse.success || evalResponse.data === null) {
        throw new Error(`Element matching selector "${resolvedSelector}" not found.`);
      }

      const extractedText = evalResponse.data;
      logger.info(`Successfully scraped text: ${extractedText}`);

      // 3. Save to variable
      await vars.set(variableName || 'scrapedText', extractedText);

      return {
        success: true,
        nextPort: 'success'
      };
    } catch (err: any) {
      logger.error('Scraper Node failed', err);
      return {
        success: false,
        nextPort: 'failure',
        error: {
          code: 'SCRAPE_ERROR',
          message: err.message || 'Scrape execution failed'
        }
      };
    }
  }
}
