<script lang="ts">
  import { Timer, Play } from '@lucide/svelte';
  import EditableLabel from '$sidepanel/components/EditableLabel.svelte';
  import ExpressionInput from '$sidepanel/components/ExpressionInput.svelte';
  import Button from '$sidepanel/components/Button.svelte';

  export let node: any;
  export let save: () => void;
  export let tableHeaders: string[] = [];
  export let testAction: (node: any) => void;
  export let localVariables: string[] = [];
</script>

<div class="node-config-plugin">
  <div class="selector-row">
    <EditableLabel 
      value={node.metadata?.label || 'Wait Until'} 
      onSave={(nv) => { node.metadata.label = nv; save(); }} 
    />
  </div>

  <div class="payload-wrap">
    <div class="payload-header">
      <Timer size={10} />
      <span>Condition Expression</span>
    </div>
    <ExpressionInput 
      value={node.state.value || ''} 
      headers={tableHeaders} 
      localVariables={localVariables}
      placeholder="e.g. &#123;&#123;GLOBAL.auth.otp&#125;&#125; !== ''" 
      onChange={(val) => { node.state.value = val; save(); }} 
    />
  </div>

  <div class="settings-grid">
    <div class="input-row-flex">
      <span class="label-tiny">Timeout (ms)</span>
      <input type="number" bind:value={node.state.timeout} on:change={save} />
    </div>
    <div class="input-row-flex">
      <span class="label-tiny">Poll Rate (ms)</span>
      <input type="number" bind:value={node.state.poll} on:change={save} />
    </div>
  </div>

  <div class="test-row">
    <Button variant="primary" size="sm" on:click={() => testAction(node)} fullWidth>
      <Play slot="icon" size={14} fill="currentColor" />
      Test Condition
    </Button>
  </div>
</div>

<style>
  .node-config-plugin { display: flex; flex-direction: column; gap: 1rem; }
  .selector-row { display: flex; flex-direction: column; gap: 0.5rem; }
  .payload-wrap { background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 12px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .payload-header { display: flex; align-items: center; gap: 0.5rem; font-size: 0.55rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; }
  
  .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .input-row-flex { background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 8px; padding: 0.4rem 0.6rem; display: flex; flex-direction: column; gap: 0.2rem; }
  .label-tiny { font-size: 0.5rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
  .input-row-flex input { background: none; border: none; color: var(--accent); font-weight: 900; outline: none; font-size: 0.75rem; }

  .test-row { padding-top: 0.5rem; border-top: 1px solid var(--border-ui); }
</style>
