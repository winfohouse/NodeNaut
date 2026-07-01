<script lang="ts">
  import { Zap, Search, Activity } from '@lucide/svelte';
  export let node: any;
  export let preview: string | null = null;
</script>

<div class="node-view interact-view">
  <header class="node-header">
    <div class="icon-box">
      <Zap size={14} />
    </div>
    <div class="name-col">
      <span class="node-name">{node.metadata?.label || 'Universal Interact'}</span>
      <span class="node-meta-tiny">{node.id.slice(0, 8)} • POLYMORPHIC</span>
    </div>
  </header>
  
  <div class="node-body">
    <div class="data-row">
      <Search size={10} class="text-muted" />
      <code class="selector-peek">{node.state.selector || 'No selector'}</code>
      {#if node.state.candidates?.length}
        <span class="cand-tag">{node.state.candidates.length}H</span>
      {/if}
    </div>
    
    <div class="data-row status-row">
      <Activity size={10} class="text-accent" />
      <span class="type-text">{node.state.interactType || 'click'}</span>
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
  .icon-box { background: var(--accent-glow); color: var(--accent); padding: 0.35rem; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
  .name-col { display: flex; flex-direction: column; gap: 0.1rem; }
  .node-name { font-size: 0.7rem; font-weight: 800; color: var(--text-primary); }
  .node-meta-tiny { font-size: 0.45rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; }
  
  .node-body { flex: 1; padding: 0.6rem 0.75rem; display: flex; flex-direction: column; gap: 0.3rem; justify-content: center; }
  .data-row { display: flex; align-items: center; gap: 0.5rem; }
  .cand-tag { font-size: 0.45rem; font-weight: 900; background: var(--accent); color: white; padding: 0.05rem 0.25rem; border-radius: 4px; }
  .selector-peek { font-size: 0.55rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
  
  .status-row { background: var(--bg-surface-solid); padding: 0.25rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-ui); margin-top: 0.1rem; }
  .type-text { font-size: 0.55rem; font-weight: 900; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em; flex: 1; }
  
  .live-pill { display: flex; align-items: center; gap: 0.3rem; background: var(--status-success-glow); padding: 0.1rem 0.3rem; border-radius: 4px; border: 1px solid var(--status-success); max-width: 100px; }
  .live-pill span { font-size: 0.5rem; font-weight: 800; color: var(--status-success); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .live-pill .tag { background: var(--status-success); color: white; padding: 0.05rem 0.2rem; border-radius: 2px; font-size: 0.4rem; font-weight: 900; }

  .text-accent { color: var(--accent); }
</style>
