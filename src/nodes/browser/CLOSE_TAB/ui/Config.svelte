<script lang="ts">
  import { XCircle } from '@lucide/svelte';
  import EditableLabel from '$sidepanel/components/EditableLabel.svelte';

  export let node: any;
  export let save: () => void;
</script>

<div class="node-config-plugin">
  <div class="selector-row">
    <EditableLabel 
      value={node.metadata?.label || 'Close Tab'} 
      onSave={(nv) => { node.metadata.label = nv; save(); }} 
    />
  </div>

  <div class="payload-wrap">
    <div class="payload-header">
      <XCircle size={10} />
      <span>Termination Action</span>
    </div>
    <p class="hint-text">This will immediately close the tab that this workflow is running in. Use as a final step in multi-tab workflows.</p>
  </div>
</div>

<style>
  .node-config-plugin { display: flex; flex-direction: column; gap: 1rem; }
  .selector-row { display: flex; flex-direction: column; gap: 0.5rem; }
  .payload-wrap { background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 12px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .payload-header { display: flex; align-items: center; gap: 0.5rem; font-size: 0.55rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; }
  .hint-text { font-size: 0.7rem; color: var(--text-muted); line-height: 1.4; }
</style>
