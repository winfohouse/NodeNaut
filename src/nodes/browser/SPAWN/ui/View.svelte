<script lang="ts">
  import { Layers, Zap, Globe } from '@lucide/svelte';
  export let node: any;
  export let preview: string | null = null;
</script>

<div class="node-view spawn-view">
  <header class="node-header">
    <div class="icon-box">
      <Layers size={14} />
    </div>
    <div class="name-col">
      <span class="node-name">{node.metadata?.label || 'Spawn Sequence'}</span>
      <span class="node-meta-tiny">{node.id.slice(0, 8)} • BROWSER</span>
    </div>
  </header>
  
  <div class="node-body">
    <div class="data-row">
      <Globe size={10} class="text-muted" />
      <code class="url-peek">{node.state.url || 'No URL'}</code>
    </div>
    
    <div class="data-row status-row">
      <Zap size={10} class="text-warning" />
      <span class="type-text">Parallel Thread</span>
      {#if preview}
        <div class="live-pill">
          <span>{preview}</span>
          <span class="tag">LIVE</span>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .node-view { display: flex; flex-direction: column; height: 100%; }
  
  .node-header { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.75rem; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid var(--border-ui); }
  .icon-box { background: var(--bg-surface-solid); color: var(--text-primary); padding: 0.35rem; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-ui); border-left: 4px solid var(--status-warning); }
  .name-col { display: flex; flex-direction: column; gap: 0.1rem; }
  .node-name { font-size: 0.7rem; font-weight: 800; color: var(--text-primary); }
  .node-meta-tiny { font-size: 0.45rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; }
  
  .node-body { flex: 1; padding: 0.6rem 0.75rem; display: flex; flex-direction: column; gap: 0.3rem; justify-content: center; }
  .data-row { display: flex; align-items: center; gap: 0.5rem; }
  .url-peek { font-size: 0.55rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  
  .status-row { background: var(--bg-surface-solid); padding: 0.25rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-ui); margin-top: 0.1rem; }
  .type-text { font-size: 0.5rem; font-weight: 900; color: var(--status-warning); text-transform: uppercase; letter-spacing: 0.05em; flex: 1; }
  
  .live-pill { display: flex; align-items: center; gap: 0.3rem; background: var(--accent-glow); padding: 0.1rem 0.3rem; border-radius: 4px; border: 1px solid var(--accent); max-width: 100px; }
  .live-pill span { font-size: 0.5rem; font-weight: 800; color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .live-pill .tag { background: var(--accent); color: white; padding: 0.05rem 0.2rem; border-radius: 2px; font-size: 0.4rem; font-weight: 900; }
</style>
