<script lang="ts">
  import { 
    Zap, Search, MousePointer2, Type, Globe, List, CheckCircle2, 
    Circle, RotateCcw, Save, Scissors, Code, Database, Layers, ShieldCheck, Play 
  } from '@lucide/svelte';
  import EditableLabel from '$sidepanel/components/EditableLabel.svelte';
  import SearchableSelect from '$sidepanel/components/SearchableSelect.svelte';
  import ExpressionInput from '$sidepanel/components/ExpressionInput.svelte';
  import Button from '$sidepanel/components/Button.svelte';

  export let node: any;
  export let save: () => void;
  export let startPicker: (cb: (data: any) => void, mode?: 'step' | 'condition') => void;
  export let highlight: (node: any) => void;
  export let testAction: (node: any) => void;
  export let tableHeaders: string[] = [];

  const interactionOptions = [
    { label: 'Left Click', value: 'click', category: 'Mouse', icon: MousePointer2 },
    { label: 'Double Click', value: 'dblclick', category: 'Mouse', icon: MousePointer2 },
    { label: 'Right Click', value: 'right-click', category: 'Mouse', icon: MousePointer2 },
    { label: 'Mouse Hover', value: 'hover', category: 'Mouse', icon: MousePointer2 },
    { label: 'Mouse Down', value: 'mousedown', category: 'Mouse', icon: MousePointer2 },
    { label: 'Mouse Up', value: 'mouseup', category: 'Mouse', icon: MousePointer2 },
    { label: 'Mouse Move', value: 'mousemove', category: 'Mouse', icon: MousePointer2 },
    { label: 'Context Menu', value: 'contextmenu', category: 'Mouse', icon: MousePointer2 },
    
    { label: 'Press Enter', value: 'press-enter', category: 'Keyboard', icon: Type },
    { label: 'Press Escape', value: 'press-escape', category: 'Keyboard', icon: Type },
    { label: 'Key Down', value: 'keydown', category: 'Keyboard', icon: Type, requiresValue: true, valueLabel: 'Key to Press', valuePlaceholder: 'e.g. Enter, Escape, a, b' },
    { label: 'Key Up', value: 'keyup', category: 'Keyboard', icon: Type, requiresValue: true, valueLabel: 'Key to Release', valuePlaceholder: 'e.g. Shift, Control' },
    
    { label: 'Scroll Into View', value: 'scroll-into-view', category: 'Scroll', icon: Globe },
    { label: 'Scroll Top', value: 'scroll-top', category: 'Scroll', icon: Globe },
    { label: 'Scroll By', value: 'scroll-by', category: 'Scroll', icon: Globe, requiresValue: true, valueLabel: 'Scroll Distance (px)', valuePlaceholder: 'e.g. 500' },
    
    { label: 'Select Option', value: 'select', category: 'Form', icon: List, requiresValue: true, valueLabel: 'Option to Select', valuePlaceholder: 'Value or Label of the option' },
    { label: 'Check Box', value: 'check', category: 'Form', icon: CheckCircle2 },
    { label: 'Uncheck Box', value: 'uncheck', category: 'Circle', icon: Circle },
    { label: 'Form Submit', value: 'submit', category: 'Form', icon: Play },
    { label: 'Form Reset', value: 'reset', category: 'Form', icon: RotateCcw },
    
    { label: 'Copy to Clipboard', value: 'copy', category: 'Clipboard', icon: Save },
    { label: 'Cut to Clipboard', value: 'cut', category: 'Scissors', icon: Scissors },
    { label: 'Paste from Clipboard', value: 'paste', category: 'Clipboard', icon: Save },
    
    { label: 'Focus Element', value: 'focus', category: 'State', icon: Search },
    { label: 'Blur Element', value: 'blur', category: 'State', icon: Search },
    { label: 'Extract Text', value: 'extract-text', category: 'Data', icon: Layers },
    { label: 'Extract HTML', value: 'extract-html', category: 'Data', icon: Code },
    { label: 'Extract Attribute', value: 'extract-attr', category: 'Data', icon: Database, requiresAttr: true },
    { label: 'Assert Visible', value: 'assert-visible', category: 'Condition', icon: ShieldCheck },
    { label: 'Assert Hidden', value: 'assert-hidden', category: 'Condition', icon: ShieldCheck },
  ];

  function handlePick() {
    startPicker((data) => {
      node.state.selector = data.selector;
      node.state.candidates = data.candidates;
      node.metadata.label = data.label || 'Interaction Target';
      save();
    }, 'step');
  }

  $: selectedOpt = interactionOptions.find(o => o.value === node.state.interactType);
</script>

<div class="node-config-plugin">
  <div class="selector-row">
    <EditableLabel 
      value={node.metadata?.label || 'Universal Interact'} 
      onSave={(nv) => { node.metadata.label = nv; save(); }} 
    />
    
    <div class="interact-picker-wrap">
      <SearchableSelect 
        options={interactionOptions} 
        bind:value={node.state.interactType} 
        on:change={save} 
      />
    </div>

    {#if selectedOpt?.requiresAttr}
      <div class="attr-input-wrap">
        <div class="input-shell-row">
          <Database size={12} class="text-muted" />
          <input 
            type="text" 
            placeholder="Attribute Name (e.g. href, src)" 
            bind:value={node.state.metadata.attribute} 
            on:change={save} 
          />
        </div>
      </div>
    {/if}

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

  {#if selectedOpt?.requiresValue}
    <div class="payload-wrap">
      <div class="payload-header">
        <Zap size={10} />
        <span>{selectedOpt.valueLabel || 'Action Parameter'}</span>
      </div>
      <ExpressionInput 
        value={node.state.value || ''} 
        headers={tableHeaders} 
        placeholder={selectedOpt.valuePlaceholder || 'Parameter for this action...'} 
        onChange={(val) => { node.state.value = val; save(); }} 
      />
    </div>
  {/if}

  <div class="test-row">
    <Button variant="primary" size="sm" on:click={() => testAction(node)} fullWidth>
      <Play slot="icon" size={14} fill="currentColor" />
      Test {selectedOpt?.label || 'Interaction'}
    </Button>
  </div>
</div>

<style>
  .node-config-plugin { display: flex; flex-direction: column; gap: 1rem; }
  .selector-row { display: flex; flex-direction: column; gap: 0.5rem; }
  
  .input-shell { display: flex; align-items: center; gap: 0.25rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 8px; padding: 0.25rem; }
  .input-shell input { flex: 1; background: none; border: none; color: var(--text-primary); font-size: 0.75rem; outline: none; padding: 0.4rem; }
  
  .input-shell-row { display: flex; align-items: center; gap: 0.75rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 8px; padding: 0.5rem 0.75rem; }
  .input-shell-row input { flex: 1; background: none; border: none; color: var(--text-primary); font-size: 0.75rem; outline: none; }

  .icon-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.3rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
  .icon-btn:hover { background: var(--accent-glow); color: var(--accent); }

  .payload-wrap { background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 12px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .payload-header { display: flex; align-items: center; gap: 0.5rem; font-size: 0.55rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; }
  
  .test-row { padding-top: 0.5rem; border-top: 1px solid var(--border-ui); }
</style>
