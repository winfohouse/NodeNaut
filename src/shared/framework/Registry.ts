import type { NodePlugin, NodeManifest } from './NodePlugin';

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
    
    // Discovery glob for all essential node files
    const nodeFiles = import.meta.glob<Record<string, any>>('$nodes/**/*.ts', { eager: true });
    const svelteFiles = import.meta.glob<Record<string, any>>('$nodes/**/*.svelte', { eager: true });
    
    // 1. Process all Node.ts files (Handlers)
    for (const path in nodeFiles) {
      if (path.endsWith('/runtime/Node.ts')) {
        const module = nodeFiles[path];
        if (module.default) {
          const plugin = new module.default() as NodePlugin<any, any>;
          const type = plugin.manifest.type;
          
          // 2. Find corresponding UI components
          const viewPath = path.replace('/runtime/Node.ts', '/ui/View.svelte');
          const configPath = path.replace('/runtime/Node.ts', '/ui/Config.svelte');
          
          const view = svelteFiles[viewPath]?.default;
          const config = svelteFiles[configPath]?.default;
          
          registry.register(plugin, view, config);
        }
      }
    }
  }
}
