<script lang="ts">
  import { Clock, Play } from '@lucide/svelte';
  import EditableLabel from '$sidepanel/components/EditableLabel.svelte';
  import Button from '$sidepanel/components/Button.svelte';

  export let node: any;
  export let save: () => void;
  export let testAction: (node: any) => void;
</script>

<div class="node-config-plugin">
  <div class="selector-row">
    <EditableLabel 
      value={node.metadata?.label || 'Pause Execution'} 
      onSave={(nv) => { node.metadata.label = nv; save(); }} 
    />
  </div>

  <div class="payload-wrap">
    <div class="payload-header">
      <Clock size={10} />
      <span>Delay Amount (ms)</span>
    </div>
    <input 
      type="number" 
      class="val-input"
      bind:value={node.state.value} 
      on:change={save} 
      placeholder="e.g. 2000"
    />
    <span class="hint-text">Pause the workflow for specific milliseconds.</span>
  </div>

  <div class="test-row">
    <Button variant="primary" size="sm" on:click={() => testAction(node)} fullWidth>
      <Play slot="icon" size={14} fill="currentColor" />
      Test Delay
    </Button>
  </div>
</div>

<style>
  .node-config-plugin { display: flex; flex-direction: column; gap: 1.25rem; }
  .selector-row { display: flex; flex-direction: column; gap: 0.5rem; }
  .payload-wrap { background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 12px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .payload-header { display: flex; align-items: center; gap: 0.5rem; font-size: 0.55rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; }
  .val-input { background: var(--bg-card); border: 1px solid var(--border-ui); color: var(--accent); border-radius: 8px; padding: 0.5rem; font-size: 0.85rem; font-weight: 900; outline: none; }
  .hint-text { font-size: 0.6rem; color: var(--text-muted); font-style: italic; }
  .test-row { padding-top: 0.5rem; border-top: 1px solid var(--border-ui); }
</style>
