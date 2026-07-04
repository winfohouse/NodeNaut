<script lang="ts">
  import * as Icons from '@lucide/svelte';
  export let node: any;

  import { NodeNautRegistry } from './Registry';
  const registry = NodeNautRegistry.getInstance();
  const manifest = registry.getManifest(node.type) as any;

  function getIcon(name: string) {
    return (Icons as any)[name] || Icons.Cpu;
  }
</script>

<div class="node-view custom-addon-view">
  <header class="node-header">
    <div class="icon-box">
      <svelte:component this={getIcon(manifest?.icon)} size={14} />
    </div>
    <div class="name-col">
      <span class="node-name">{node.metadata?.label || manifest?.label || node.type}</span>
      <span class="node-meta-tiny">{node.id.slice(0, 8)} • ADDON</span>
    </div>
  </header>
  
  <div class="node-body">
    <span class="addon-desc">{manifest?.description || 'Custom User Addon Node'}</span>
  </div>
</div>

<style>
  .node-view { display: flex; flex-direction: column; height: 100%; }
  
  .node-header { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.75rem; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid var(--border-ui); }
  .icon-box { background: var(--accent-glow); color: var(--accent); padding: 0.35rem; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
  .name-col { display: flex; flex-direction: column; gap: 0.1rem; }
  .node-name { font-size: 0.7rem; font-weight: 800; color: var(--text-primary); }
  .node-meta-tiny { font-size: 0.45rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; }
  
  .node-body { flex: 1; padding: 0.6rem 0.75rem; display: flex; align-items: center; justify-content: center; }
  .addon-desc { font-size: 0.55rem; color: var(--text-muted); font-weight: 600; font-style: italic; text-align: center; }
</style>
