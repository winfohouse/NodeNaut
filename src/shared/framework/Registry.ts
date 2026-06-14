import type { NodePlugin, NodeManifest } from './NodePlugin';

export class FlowPilotRegistry {
  private static instance: FlowPilotRegistry;
  private plugins: Map<string, NodePlugin> = new Map();
  private manifests: Map<string, NodeManifest> = new Map();

  private constructor() {}

  static getInstance(): FlowPilotRegistry {
    if (!FlowPilotRegistry.instance) {
      FlowPilotRegistry.instance = new FlowPilotRegistry();
    }
    return FlowPilotRegistry.instance;
  }

  /**
   * Registers a node plugin.
   */
  register(plugin: NodePlugin) {
    const type = plugin.manifest.type;
    this.plugins.set(type, plugin);
    this.manifests.set(type, plugin.manifest);
    console.log(`[Registry] Node Registered: ${type} (v${plugin.manifest.version})`);
  }

  getPlugin(type: string): NodePlugin | undefined {
    return this.plugins.get(type);
  }

  getManifest(type: string): NodeManifest | undefined {
    return this.manifests.get(type);
  }

  getAllManifests(): NodeManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Auto-discovery helper (Vite only)
   */
  static async discoverPlugins() {
    const registry = FlowPilotRegistry.getInstance();
    
    // Auto-import all Node.ts files from nodes directory
    const pluginModules = import.meta.glob('../../nodes/**/runtime/Node.ts', { eager: true });
    
    for (const path in pluginModules) {
      const module = pluginModules[path] as any;
      if (module.default && typeof module.default === 'function') {
        try {
          const PluginClass = module.default;
          const pluginInstance = new PluginClass();
          registry.register(pluginInstance);
        } catch (e) {
          console.error(`[Registry] Failed to load plugin at ${path}:`, e);
        }
      }
    }
  }
}
