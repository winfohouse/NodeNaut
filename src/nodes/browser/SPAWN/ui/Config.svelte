<script lang="ts">
  import { Layers, Globe, Play } from '@lucide/svelte';
  import { db } from '$shared/services/db';
  import { onMount } from 'svelte';
  import EditableLabel from '$sidepanel/components/EditableLabel.svelte';
  import ExpressionInput from '$sidepanel/components/ExpressionInput.svelte';
  import Button from '$sidepanel/components/Button.svelte';

  export let node: any;
  export let save: () => void;
  export let tableHeaders: string[] = [];
  export let testAction: (node: any) => void;
  export let localVariables: string[] = [];

  let allWorkflows: any[] = [];

  onMount(async () => {
    allWorkflows = await db.workflows.toArray();
  });
</script>

<div class="node-config-plugin">
  <div class="selector-row">
    <EditableLabel 
      value={node.metadata?.label || 'Spawn Sequence'} 
      onSave={(nv) => { node.metadata.label = nv; save(); }} 
    />
  </div>

  <div class="payload-wrap">
    <div class="payload-header">
      <Layers size={10} />
      <span>Sequence to Execute</span>
    </div>
    <select class="val-input" bind:value={node.state.spawnWorkflowId} on:change={save}>
      <option value="">-- Select Sequence --</option>
      {#each allWorkflows as wf}
        <option value={wf.id}>{wf.name}</option>
      {/each}
    </select>
  </div>

  <div class="payload-wrap">
    <div class="payload-header">
      <Globe size={10} />
      <span>Target URL</span>
    </div>
    <ExpressionInput 
      value={node.state.url || ''} 
      headers={tableHeaders} 
      localVariables={localVariables}
      placeholder="https://..." 
      onChange={(val) => { node.state.url = val; save(); }} 
    />
    <span class="hint-text">Starts a new tab and begins the sequence above.</span>
  </div>

  <div class="test-row">
    <Button variant="primary" size="sm" on:click={() => testAction(node)} fullWidth>
      <Play slot="icon" size={14} fill="currentColor" />
      Test Spawn
    </Button>
  </div>
</div>

<style>
  .node-config-plugin { display: flex; flex-direction: column; gap: 1.25rem; }
  .selector-row { display: flex; flex-direction: column; gap: 0.5rem; }
  .payload-wrap { background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 12px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .payload-header { display: flex; align-items: center; gap: 0.5rem; font-size: 0.55rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; }
  .val-input { background: var(--bg-card); border: 1px solid var(--border-ui); color: var(--text-primary); border-radius: 8px; padding: 0.5rem; font-size: 0.75rem; outline: none; width: 100%; cursor: pointer; }
  .hint-text { font-size: 0.6rem; color: var(--text-muted); font-style: italic; }
  .test-row { padding-top: 0.5rem; border-top: 1px solid var(--border-ui); }
</style>
