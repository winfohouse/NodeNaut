<script lang="ts">
  import { Bell, AlertTriangle } from '@lucide/svelte';
  export let node: any;

  $: title = node.state?.title || 'FlowPilot';
  $: message = node.state?.message || 'Workflow notification message';
  $: isAlert = node.state?.type === 'alert';
</script>

<div class="node-view notify-view">
  <header class="node-header">
    <div class="icon-box" class:alert-box={isAlert}>
      {#if isAlert}
        <AlertTriangle size={14} />
      {:else}
        <Bell size={14} />
      {/if}
    </div>
    <div class="name-col">
      <span class="node-name">{node.metadata?.label || 'Notify Me'}</span>
      <span class="node-meta-tiny">{node.id.slice(0, 8)} • HUMAN</span>
    </div>
  </header>
  
  <div class="node-body">
    <div class="notify-bubble">
      <div class="bubble-title">{title}</div>
      <div class="bubble-desc">{message}</div>
    </div>
    <span class="type-badge" class:alert-badge={isAlert}>
      {isAlert ? 'ALERT BOX' : 'SYSTEM NOTIFICATION'}
    </span>
  </div>
</div>

<style>
  .node-view { display: flex; flex-direction: column; height: 100%; }
  
  .node-header { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.75rem; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid var(--border-ui); }
  .icon-box { background: var(--accent-glow); color: var(--accent); padding: 0.35rem; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
  .icon-box.alert-box { background: var(--status-warning-glow); color: var(--status-warning); }
  .name-col { display: flex; flex-direction: column; gap: 0.1rem; }
  .node-name { font-size: 0.7rem; font-weight: 800; color: var(--text-primary); }
  .node-meta-tiny { font-size: 0.45rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; }
  
  .node-body { flex: 1; padding: 0.6rem 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; justify-content: space-between; }
  .notify-bubble { background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 8px; padding: 0.4rem 0.5rem; display: flex; flex-direction: column; gap: 0.15rem; }
  .bubble-title { font-size: 0.6rem; font-weight: 800; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bubble-desc { font-size: 0.55rem; color: var(--text-muted); font-weight: 500; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  
  .type-badge { align-self: flex-start; font-size: 0.45rem; font-weight: 900; color: var(--accent); background: var(--accent-glow); padding: 0.1rem 0.4rem; border-radius: 4px; letter-spacing: 0.05em; border: 1px solid var(--accent); }
  .type-badge.alert-badge { color: var(--status-warning); background: var(--status-warning-glow); border: 1px solid var(--status-warning); }
</style>
