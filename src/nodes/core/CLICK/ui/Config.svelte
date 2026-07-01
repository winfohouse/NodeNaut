<script lang="ts">
  import { MousePointer2, Search, Play } from '@lucide/svelte';
  import EditableLabel from '$sidepanel/components/EditableLabel.svelte';
  import SearchableSelect from '$sidepanel/components/SearchableSelect.svelte';
  import Button from '$sidepanel/components/Button.svelte';

  export let node: any;
  export let save: () => void;
  export let startPicker: (cb: (data: any) => void, mode?: 'step' | 'condition') => void;
  export let highlight: (node: any) => void;
  export let testAction: (node: any) => void;

  const interactionOptions = [
    { label: 'Left Click', value: 'click', category: 'Mouse', icon: MousePointer2 },
    { label: 'Double Click', value: 'dblclick', category: 'Mouse', icon: MousePointer2 },
    { label: 'Right Click', value: 'right-click', category: 'Mouse', icon: MousePointer2 },
    { label: 'Mouse Hover', value: 'hover', category: 'Mouse', icon: MousePointer2 },
  ];

  function handlePick() {
    startPicker((data) => {
      node.state.selector = data.selector;
      node.state.candidates = data.candidates;
      node.metadata.label = data.label || 'Click Target';
      save();
    }, 'step');
  }
</script>

<div class="node-config-plugin">
  <div class="selector-row">
    <EditableLabel 
      value={node.metadata?.label || 'Click Target'} 
      onSave={(nv) => { node.metadata.label = nv; save(); }} 
    />
    
    <div class="picker-row">
      <SearchableSelect 
        options={interactionOptions} 
        bind:value={node.state.interactType} 
        on:change={save} 
      />
    </div>

    <div class="input-shell">
      <input 
        type="text" 
        bind:value={node.state.selector} 
        placeholder="Primary Selector" 
        on:change={save} 
      />
      <button class="icon-btn" on:click={handlePick} title="Pick Element">
        <MousePointer2 size={14} />
      </button>
      <button class="icon-btn" on:click={() => highlight(node)} title="Highlight">
        <Search size={14} />
      </button>
    </div>
  </div>

  <div class="test-row">
    <Button variant="primary" size="sm" on:click={() => testAction(node)} fullWidth>
      <Play slot="icon" size={14} fill="currentColor" />
      Test Click
    </Button>
  </div>
</div>

<style>
  .node-config-plugin { display: flex; flex-direction: column; gap: 1.25rem; }
  .selector-row { display: flex; flex-direction: column; gap: 0.5rem; }
  .input-shell { display: flex; align-items: center; gap: 0.25rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 8px; padding: 0.25rem; }
  .input-shell input { flex: 1; background: none; border: none; color: var(--text-primary); font-size: 0.75rem; outline: none; padding: 0.4rem; }
  .icon-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.3rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
  .icon-btn:hover { background: var(--accent-glow); color: var(--accent); }
  .test-row { padding-top: 0.5rem; border-top: 1px solid var(--border-ui); }
</style>
