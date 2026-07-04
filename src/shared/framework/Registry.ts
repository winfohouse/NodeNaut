import type { NodePlugin, NodeManifest } from './NodePlugin';
import DynamicAddonView from './DynamicAddonView.svelte';
import DynamicAddonConfig from './DynamicAddonConfig.svelte';

// Placeholder for Svelte Component type if not using full svelte types
type SvelteComponent = any; 

export class FlowPilotRegistry {
  private static instance: FlowPilotRegistry;
  private plugins: Map<string, NodePlugin<any, any>> = new Map();
  private manifests: Map<string, NodeManifest<any>> = new Map();
  private views: Map<string, SvelteComponent> = new Map();
  private configs: Map<string, SvelteComponent> = new Map();

  private constructor() {}

  static getInstance(): FlowPilotRegistry {
    if (!FlowPilotRegistry.instance) {
      FlowPilotRegistry.instance = new FlowPilotRegistry();
    }
    return FlowPilotRegistry.instance;
  }

  register(plugin: NodePlugin<any, any>, view?: SvelteComponent, config?: SvelteComponent) {
    const type = plugin.manifest.type;
    this.plugins.set(type, plugin);
    this.manifests.set(type, plugin.manifest);
    if (view) this.views.set(type, view);
    if (config) this.configs.set(type, config);
    console.log(`[Registry] Node Registered: ${type} (v${plugin.manifest.version})`);
  }

  getPlugin(type: string): NodePlugin<any, any> | undefined {
    return this.plugins.get(type);
  }

  getManifest(type: string): NodeManifest<any> | undefined {
    return this.manifests.get(type);
  }

  getView(type: string): SvelteComponent | undefined {
    return this.views.get(type);
  }

  getConfig(type: string): SvelteComponent | undefined {
    return this.configs.get(type);
  }

  getAllManifests(): NodeManifest<any>[] {
    return Array.from(this.manifests.values());
  }

  static async discoverPlugins() {
    const registry = FlowPilotRegistry.getInstance();
    
    const nodeFiles = import.meta.glob<Record<string, any>>('$nodes/**/*.ts', { eager: true });
    const svelteFiles = import.meta.glob<Record<string, any>>('$nodes/**/*.svelte', { eager: true });
    console.log('[Registry] discoverPlugins nodeFiles keys count:', Object.keys(nodeFiles).length, 'keys:', Object.keys(nodeFiles));
    
    // 1. Process all Node.ts files (Handlers)
    for (const path in nodeFiles) {
      if (path.endsWith('/runtime/Node.ts')) {
        try {
          const module = nodeFiles[path];
          if (module.default) {
            const plugin = new module.default() as NodePlugin<any, any>;
            const type = plugin.manifest.type;
            
            // 2. Find corresponding UI components
            const viewPath = path.replace('/runtime/Node.ts', '/ui/View.svelte');
            const configPath = path.replace('/runtime/Node.ts', '/ui/Config.svelte');
            
            const view = svelteFiles[viewPath]?.default || DynamicAddonView;
            const config = svelteFiles[configPath]?.default || DynamicAddonConfig;
            
            registry.register(plugin, view, config);
          }
        } catch (e: any) {
          console.error(`[Registry] Error registering node at ${path}:`, e.message);
        }
      }
    }

    // 3. Load custom addon nodes from local storage
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get('custom_nodes');
        const customNodes = stored.custom_nodes || [];
        for (const addon of customNodes) {
          if (addon.enabled === false) continue;
          const manifest = addon.manifest;
          const runtimeCode = addon.runtime;
          const configSchema = addon.configSchema || [];
          
          class CustomAddonNode implements NodePlugin<any, any> {
            manifest = {
              ...manifest,
              configSchema
            };
            
            async execute(ctx: any) {
              const { node, vars, logger, services } = ctx;
              
              const res = await services.sandbox.execute({
                code: `
                  const ctx = ${JSON.stringify({
                    node: {
                      id: node.id,
                      type: node.type,
                      state: node.state,
                      tabId: node.tabId
                    }
                  })};
                  
                  const runExecute = async () => {
                    ${runtimeCode}
                  };
                  return await runExecute();
                `,
                data: await vars.get('all')
              });
              
              if (res.success) {
                if (res.data && typeof res.data === 'object') {
                  const outputVars = res.data.variables || res.data.output || {};
                  for (const key of Object.keys(outputVars)) {
                    await vars.set(key, outputVars[key]);
                  }
                }
                return { success: true, nextPort: res.data?.nextPort || 'success', data: res.data };
              } else {
                return { 
                  success: false, 
                  nextPort: 'failure',
                  error: res.error || { code: 'EXECUTION_FAILED', message: 'Custom node execution failed' } 
                };
              }
            }
          }
          
          registry.register(new CustomAddonNode(), DynamicAddonView, DynamicAddonConfig);
        }
      }
    } catch (e) {
      console.error('[Registry] Failed to load custom addon nodes', e);
    }

    // 4. Register Built-in Subflow Logic Nodes
    try {
      class StartNode implements NodePlugin<any, any> {
        manifest = {
          type: 'START',
          label: 'Start',
          description: 'Entry point of the workflow execution',
          category: 'logic',
          ports: {
            inputs: [],
            outputs: ['success']
          },
          configSchema: []
        };
        async execute(ctx: any) {
          return { success: true, nextPort: 'success' };
        }
      }
      registry.register(new StartNode(), DynamicAddonView, DynamicAddonConfig);

      class BundleReturnNode implements NodePlugin<any, any> {
        manifest = {
          type: 'BUNDLE_RETURN',
          label: 'Return from Bundle',
          description: 'Stops subflow execution and returns to parent node',
          category: 'logic',
          ports: {
            inputs: ['input'],
            outputs: []
          },
          configSchema: [
            {
              name: 'outputPort',
              label: 'Return Port (Output)',
              type: 'text',
              required: true,
              placeholder: 'e.g. success'
            }
          ]
        };
        async execute(ctx: any) {
          return { success: true, nextPort: 'success' };
        }
      }
      registry.register(new BundleReturnNode(), DynamicAddonView, DynamicAddonConfig);

      class ExecuteNodeRefNode implements NodePlugin<any, any> {
        manifest = {
          type: 'EXECUTE_NODE_REF',
          label: 'Execute Node Reference',
          description: 'Executes a parent node or node bundle passed as a parameter',
          category: 'logic',
          ports: {
            inputs: ['input'],
            outputs: ['success', 'failure']
          },
          configSchema: [
            {
              name: 'paramName',
              label: 'Parameter Name',
              type: 'text',
              required: true,
              placeholder: 'e.g. myNodeRef'
            }
          ]
        };
        async execute(ctx: any) {
          const { node, vars, logger, services } = ctx;
          const paramName = node.state.paramName;
          if (!paramName) {
            return { success: false, error: { code: 'MISSING_PARAM', message: 'Parameter name is required' } };
          }

          const parentNodeIdOrIds = await vars.get(paramName);
          if (!parentNodeIdOrIds) {
            return { success: true, nextPort: 'success' };
          }

          const runner = services.runner;
          if (!runner) {
            return { success: false, error: { code: 'NO_RUNNER', message: 'Workflow runner not found' } };
          }

          const { db } = await import('$shared/services/db');
          const workflows = await db.workflows.toArray();
          const ids = Array.isArray(parentNodeIdOrIds) ? parentNodeIdOrIds : [parentNodeIdOrIds];

          for (const id of ids) {
            let targetNode: any = null;
            let targetWorkflow: any = null;
            for (const wf of workflows) {
              if (wf.graph?.nodes) {
                const found = wf.graph.nodes.find(n => n.id === id);
                if (found) {
                  targetNode = found;
                  targetWorkflow = wf;
                  break;
                }
              }
            }
            if (!targetNode) continue;
            
            const isFlow = (await vars.get(`__type_${paramName}`)) === 'nodes_flow';
            if (isFlow && targetWorkflow) {
              const nodes = targetWorkflow.graph.nodes || [];
              const edges = targetWorkflow.graph.edges || [];
              let currentNode = targetNode;
              
              while (currentNode) {
                logger.info(`[ExecuteNodeRefNode] Running connected node flow step: ${currentNode.type} (${currentNode.id})`);
                const res = await runner.executeSingleNode(currentNode, await vars.get('all'), ctx.node.id);
                if (!res.success) {
                  return res;
                }
                
                const port = res.nextPort || 'success';
                const edge = edges.find((e: any) => e.sourceNodeId === currentNode.id && e.type === port);
                if (edge) {
                  currentNode = nodes.find((n: any) => n.id === edge.targetNodeId);
                } else {
                  currentNode = null;
                }
              }
            } else {
              const res = await runner.executeSingleNode(targetNode, await vars.get('all'), ctx.node.id);
              if (!res.success) {
                return res;
              }
            }
          }
          return { success: true, nextPort: 'success' };
        }
      }
      registry.register(new ExecuteNodeRefNode(), DynamicAddonView, DynamicAddonConfig);

      // 5. Load Custom Node Bundles (Subflows)
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get('node_bundles');
        const bundles = stored.node_bundles || [];
        for (const bundle of bundles) {
          if (bundle.enabled === false) continue;
          
          class CustomBundleNode implements NodePlugin<any, any> {
            manifest = {
              type: `BUNDLE_${bundle.id}`,
              label: bundle.name,
              description: bundle.description || 'Custom subflow bundle',
              category: 'custom',
              ports: {
                inputs: ['input'],
                outputs: bundle.outputs || ['success', 'failure']
              },
              configSchema: (bundle.inputs || []).map((input: any) => ({
                name: input.name,
                label: input.label,
                type: input.type === 'value' ? 'text' : input.type,
                required: input.required,
                placeholder: input.placeholder || ''
              }))
            };
            
            async execute(ctx: any) {
              const { node, vars, logger, services } = ctx;
              const runner = services.runner;
              
              if (!runner) {
                return { success: false, error: { code: 'NO_RUNNER', message: 'Workflow runner not found' } };
              }

              const { db } = await import('$shared/services/db');
              const rawBundle = await db.workflows.get(bundle.id);
              if (!rawBundle || !rawBundle.graph) {
                return { success: false, error: { code: 'BUNDLE_NOT_FOUND', message: `Subflow bundle graph "${bundle.name}" not found` } };
              }

              const subVars: Record<string, any> = {};
              for (const input of bundle.inputs || []) {
                const rawVal = node.state[input.name];
                if (input.type === 'expression') {
                  subVars[input.name] = await vars.resolve(rawVal || '');
                } else if (input.type === 'node_ref' || input.type === 'nodes_flow') {
                  subVars[input.name] = rawVal || '';
                  subVars[`__type_${input.name}`] = input.type;
                } else {
                  subVars[input.name] = rawVal !== undefined ? rawVal : input.defaultValue;
                }
              }

              const nodes = rawBundle.graph.nodes || [];
              const edges = rawBundle.graph.edges || [];
              
              let currentSubNode = nodes.find((n: any) => n.isRoot) || nodes[0];
              if (!currentSubNode) {
                return { success: true, nextPort: 'success' };
              }

              logger.info(`[Subflow] Starting bundle subflow: ${bundle.name}`);
              let nextPort = 'success';
              let executionError: any = null;

              while (currentSubNode) {
                if (currentSubNode.type === 'BUNDLE_RETURN') {
                  nextPort = currentSubNode.state?.outputPort || 'success';
                  break;
                }

                logger.info(`[Subflow] Executing sub-node: ${currentSubNode.type} (${currentSubNode.id})`);
                const res = await runner.executeSingleNode(currentSubNode, subVars, ctx.node.id);
                
                if (!res.success) {
                  nextPort = 'failure';
                  executionError = res.error || { code: 'SUBFLOW_NODE_FAILED', message: `Sub-node ${currentSubNode.type} failed` };
                  break;
                }

                const port = res.nextPort || 'success';
                const edge = edges.find((e: any) => e.sourceNodeId === currentSubNode.id && e.type === port);
                if (edge) {
                  currentSubNode = nodes.find((n: any) => n.id === edge.targetNodeId);
                } else {
                  currentSubNode = null;
                }
              }

              for (const key of Object.keys(subVars)) {
                await vars.set(key, subVars[key]);
              }

              if (executionError) {
                return { success: false, nextPort: 'failure', error: executionError };
              }

              return { success: true, nextPort };
            }
          }

          registry.register(new CustomBundleNode(), DynamicAddonView, DynamicAddonConfig);
        }
      }
    } catch (e) {
      console.error('[Registry] Failed to register built-in subflow logic or custom bundles', e);
    }
  }
}
