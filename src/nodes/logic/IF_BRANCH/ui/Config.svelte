<script lang="ts">
  import { Timer, Code, Play } from '@lucide/svelte';
  import ExpressionInput from '$sidepanel/components/ExpressionInput.svelte';
  import ConditionBuilder from '$sidepanel/components/ConditionBuilder.svelte';
  import { MessageType } from '$shared/constants/messages';
  import { Messenger } from '$shared/api/messenger';

  export let node: any;
  export let save: () => void;
  export let tableHeaders: string[] = [];
  export let startPicker: (cb: (data: any) => void, mode?: 'step' | 'condition') => void;
  export let testAction: (node: any) => void;

  // Ensure state exists
  if (!node.state) node.state = {};

  // Ensure initial model exists
  if (!node.state.conditionModel) {
    node.state.conditionModel = {
      mode: 'BUILDER',
      timeout: 10000,
      poll: 500,
      customCode: '',
      rootGroup: {
        id: crypto.randomUUID(),
        type: 'group',
        operator: 'ALL',
        conditions: []
      }
    };
  }
</script>

<div class="node-config-plugin if-config">
  <div class="mode-toggle">
    <label class="radio-label">
      <input type="radio" value="BUILDER" bind:group={node.state.conditionModel.mode} on:change={save} />
      Builder Mode
    </label>
    <label class="radio-label">
      <input type="radio" value="CUSTOM" bind:group={node.state.conditionModel.mode} on:change={save} />
      Custom JS
    </label>
  </div>

  <div class="wait-settings">
    <div class="input-row">
      <Timer size={12} class="icon-muted" />
      <span class="wait-label">Wait up to (ms):</span>
      <input type="number" bind:value={node.state.conditionModel.timeout} on:change={save} />
    </div>
  </div>

  {#if node.state.conditionModel.mode === 'BUILDER'}
    <ConditionBuilder 
      bind:model={node.state.conditionModel.rootGroup} 
      {tableHeaders}
      startPicker={(cb) => startPicker(cb, 'condition')}
      highlightSelector={(selector) => Messenger.send('DOM_HIGHLIGHT' as any, { selector })}
      testRule={async (rule) => {
        // Logic for testing individual rule
      }}
      onChange={save}
    />
  {:else}
    <div class="input-row custom-code-row">
      <Code size={12} class="icon-muted" />
      <ExpressionInput 
        value={node.state.conditionModel.customCode || ''} 
        headers={tableHeaders} 
        placeholder="e.g. &#123;Price&#125; > 100" 
        onChange={(val) => { node.state.conditionModel.customCode = val; save(); }} 
      />
      <button class="icon-btn test-btn" on:click={() => testAction(node)} title="Test Custom Logic">
        <Play size={12} />
      </button>
    </div>
  {/if}
  <span class="hint-text">Flow will follow the Green path if true, Red if false.</span>
</div>

<style>
  .if-config { display: flex; flex-direction: column; gap: 0.75rem; }
  .mode-toggle { display: flex; gap: 1rem; margin-bottom: 0.5rem; }
  .radio-label { font-size: 0.7rem; font-weight: 800; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; gap: 0.4rem; }
  .wait-settings { background: var(--bg-surface-solid); padding: 0.5rem; border-radius: 10px; border: 1px solid var(--border-ui); }
  .input-row { display: flex; align-items: center; gap: 0.5rem; }
  .wait-label { font-size: 0.65rem; font-weight: 700; color: var(--text-muted); }
  .input-row input { background: none; border: none; color: var(--accent); font-weight: 900; outline: none; width: 80px; font-size: 0.75rem; }
  .custom-code-row { padding: 0.5rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 10px; }
  .hint-text { font-size: 0.6rem; color: var(--text-muted); font-style: italic; }
  .icon-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.3rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
  .icon-btn:hover { background: var(--accent-glow); color: var(--accent); }
</style>
