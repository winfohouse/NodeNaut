<script lang="ts">
  import { Activity, Zap, Timer } from '@lucide/svelte';
  export let node: any;
</script>

<div class="node-view stability-view">
  <header class="node-header">
    <div class="icon-box">
      <Activity size={14} />
    </div>
    <div class="name-col">
      <span class="node-name">{node.metadata?.label || 'Wait for Stability'}</span>
      <span class="node-meta-tiny">{node.id.slice(0, 8)} • INTERACTION</span>
    </div>
  </header>
  
  <div class="node-body">
    <div class="data-row">
      <Timer size={10} class="text-muted" />
      <span class="duration-text">Max {node.state.timeout || 10000}ms</span>
    </div>
    
    <div class="data-row status-row">
      <Zap size={10} class="text-warning" />
      <span class="type-text">DOM Mutation Check</span>
      <span class="settling-tag">SETTLING</span>
    </div>
  </div>
</div>

<style>
  .node-view { display: flex; flex-direction: column; height: 100%; }
  
  .node-header { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.75rem; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid var(--border-ui); }
  .icon-box { background: var(--status-warning-glow); color: var(--status-warning); padding: 0.35rem; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
  .name-col { display: flex; flex-direction: column; gap: 0.1rem; }
  .node-name { font-size: 0.7rem; font-weight: 800; color: var(--text-primary); }
  .node-meta-tiny { font-size: 0.45rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; }
  
  .node-body { flex: 1; padding: 0.6rem 0.75rem; display: flex; flex-direction: column; gap: 0.3rem; justify-content: center; }
  .data-row { display: flex; align-items: center; gap: 0.5rem; }
  .duration-text { font-size: 0.65rem; color: var(--text-primary); font-weight: 700; }
  
  .status-row { background: var(--bg-surface-solid); padding: 0.25rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-ui); margin-top: 0.1rem; }
  .type-text { font-size: 0.55rem; font-weight: 900; color: var(--status-warning); text-transform: uppercase; letter-spacing: 0.05em; flex: 1; }
  .settling-tag { font-size: 0.4rem; font-weight: 900; background: var(--status-warning); color: white; padding: 0.1rem 0.3rem; border-radius: 4px; }

  .text-warning { color: var(--status-warning); }
</style>
