<script lang="ts">
  import { Code, Terminal, Zap } from '@lucide/svelte';
  export let node: any;
</script>

<div class="node-view script-view">
  <header class="node-header">
    <div class="icon-box">
      <Code size={14} />
    </div>
    <div class="name-col">
      <span class="node-name">{node.metadata?.label || 'FlowScript Logic'}</span>
      <span class="node-meta-tiny">{node.id.slice(0, 8)} • DEVELOPER</span>
    </div>
  </header>
  
  <div class="node-body">
    <div class="data-row">
      <Terminal size={10} class="text-muted" />
      <code class="code-peek">{(node.state.code || '// Write logic...').split('\n')[0]}</code>
    </div>
    
    <div class="data-row status-row">
      <Zap size={10} class="text-accent" />
      <span class="type-text">Sandbox Engine</span>
      <span class="engine-tag">NEURAL</span>
    </div>
  </div>
</div>

<style>
  .node-view { display: flex; flex-direction: column; height: 100%; }
  
  .node-header { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.75rem; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid var(--border-ui); }
  .icon-box { background: var(--accent); color: white; padding: 0.35rem; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
  .name-col { display: flex; flex-direction: column; gap: 0.1rem; }
  .node-name { font-size: 0.7rem; font-weight: 800; color: var(--text-primary); }
  .node-meta-tiny { font-size: 0.45rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; }
  
  .node-body { flex: 1; padding: 0.6rem 0.75rem; display: flex; flex-direction: column; gap: 0.3rem; justify-content: center; }
  .data-row { display: flex; align-items: center; gap: 0.5rem; }
  .code-peek { font-size: 0.55rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  
  .status-row { background: var(--bg-surface-solid); padding: 0.25rem 0.5rem; border-radius: 6px; border: 1px solid var(--border-ui); margin-top: 0.1rem; }
  .type-text { font-size: 0.55rem; font-weight: 900; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em; flex: 1; }
  .engine-tag { font-size: 0.4rem; font-weight: 900; background: var(--accent); color: white; padding: 0.1rem 0.3rem; border-radius: 4px; }

  .text-accent { color: var(--accent); }
</style>
