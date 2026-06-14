<script lang="ts">
  import { Trash2, Plus, GripVertical, Settings, Activity, Search, Play, MousePointer2, ShieldCheck } from '@lucide/svelte';
  import type { ConditionGroup, ConditionRule, ConditionModel } from '$shared/utils/ConditionEngine';

  export let model: ConditionGroup;
  export let depth = 0;
  export let onChange: () => void = () => {};
  export let onRemove: (() => void) | null = null;
  export let tableHeaders: string[] = [];
  export let startPicker: ((callback: (data: any) => void) => void) | undefined = undefined;
  export let highlightSelector: ((selector: string) => void) | undefined = undefined;
  export let testRule: ((rule: ConditionRule) => void) | undefined = undefined;

  const MAX_DEPTH = 4; // 0 to 4 means 5 levels deep

  const ruleOptions = [
    { label: 'Visual Page Checks', options: [
      { value: 'element_visible', label: 'Element is Visible' },
      { value: 'element_not_visible', label: 'Element is NOT Visible' },
      { value: 'element_exists', label: 'Element Exists in DOM' },
      { value: 'element_not_exists', label: 'Element Does NOT Exist' },
      { value: 'element_contains_text', label: 'Element Contains Text' },
      { value: 'element_equals_text', label: 'Element Equals Text' },
    ]},
    { label: 'Form & Input Checks', options: [
      { value: 'checkbox_checked', label: 'Checkbox is Checked' },
      { value: 'checkbox_not_checked', label: 'Checkbox is NOT Checked' },
      { value: 'input_empty', label: 'Input is Empty' },
      { value: 'input_has_value', label: 'Input has Value' },
      { value: 'input_equals', label: 'Input Equals' },
      { value: 'dropdown_selected', label: 'Dropdown Selected Value' },
    ]},
    { label: 'Navigation Checks', options: [
      { value: 'url_contains', label: 'URL Contains' },
      { value: 'url_equals', label: 'URL Equals' },
      { value: 'title_contains', label: 'Page Title Contains' },
    ]},
    { label: 'Variable / Spreadsheet Checks', options: [
      { value: 'var_empty', label: 'Variable is Empty' },
      { value: 'var_has_value', label: 'Variable has Value' },
      { value: 'var_equals', label: 'Variable Equals' },
      { value: 'var_contains', label: 'Variable Contains' },
    ]},
    { label: 'Number Comparisons', options: [
      { value: 'num_gt', label: 'Greater Than' },
      { value: 'num_lt', label: 'Less Than' },
      { value: 'num_eq', label: 'Equals (Number)' },
      { value: 'num_neq', label: 'Not Equals (Number)' },
      { value: 'num_gte', label: 'Greater or Equal' },
      { value: 'num_lte', label: 'Less or Equal' },
    ]},
  ];

  function addRule() {
    model.conditions = [
      ...model.conditions, 
      { id: crypto.randomUUID(), type: 'rule', ruleType: 'element_visible', selector: '', value1: '' }
    ];
    onChange();
  }

  function addGroup() {
    if (depth >= MAX_DEPTH) return;
    model.conditions = [
      ...model.conditions,
      {
        id: crypto.randomUUID(),
        type: 'group',
        operator: 'ALL',
        conditions: [
          { id: crypto.randomUUID(), type: 'rule', ruleType: 'element_visible', selector: '', value1: '' }
        ]
      }
    ];
    onChange();
  }

  function removeCondition(index: number) {
    model.conditions.splice(index, 1);
    model.conditions = [...model.conditions];
    onChange();
  }

  function handlePicker(index: number) {
    if (!startPicker) return;
    startPicker((data) => {
      if (model.conditions[index]) {
        model.conditions[index] = {
          ...model.conditions[index],
          selector: data.selector,
          selectorLabel: data.metadata?.label || 'Selected Element',
          candidates: data.candidates || [],
          spec: data.metadata?.spec // Store spec for coordinate healing
        } as any;
        model.conditions = [...model.conditions]; // trigger reactivity
        onChange();
      }
    });
  }

  function needsSelector(type: string) {
    return type.startsWith('element_') || type.startsWith('checkbox_') || type.startsWith('input_') || type.startsWith('dropdown_');
  }

  function needsValue1(type: string) {
    return type.includes('contains') || type.includes('equals') || type.includes('starts_with') || type.includes('ends_with') || type === 'dropdown_selected' || type.startsWith('num_') || type.startsWith('var_');
  }

  function needsValue2(type: string) {
    return type.startsWith('var_equals') || type.startsWith('var_contains') || type.startsWith('num_');
  }
</script>

<div class="group-container" class:root={depth === 0}>
  <div class="group-header">
    <div class="operator-select">
      <select bind:value={model.operator} on:change={onChange}>
        <option value="ALL">ALL (AND)</option>
        <option value="ANY">ANY (OR)</option>
        <option value="NONE">NONE (NOT)</option>
      </select>
      <span>of the following conditions must be true:</span>
    </div>
    {#if onRemove}
      <button class="remove-btn" title="Remove Group" on:click={onRemove}><Trash2 size={12} /></button>
    {/if}
  </div>

  <div class="conditions-list">
    {#each model.conditions as cond, index (cond.id)}
      <div class="condition-item">
        <div class="logic-line"></div>
        {#if cond.type === 'group'}
          <svelte:self 
            bind:model={cond} 
            depth={depth + 1} 
            {tableHeaders}
            {startPicker}
            {highlightSelector}
            {testRule}
            onRemove={() => removeCondition(index)}
            onChange={onChange}
          />
        {:else}
          <div class="rule-container glass">
            <select class="rule-type-select" bind:value={cond.ruleType} on:change={onChange}>
              {#each ruleOptions as category}
                <optgroup label={category.label}>
                  {#each category.options as opt}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
                </optgroup>
              {/each}
            </select>

            <div class="rule-inputs">
              {#if needsSelector(cond.ruleType)}
                <button class="icon-btn picker-btn" on:click={() => handlePicker(index)} title="Pick Target Element">
                  <MousePointer2 size={12} />
                </button>
                <div class="selector-input-shell" style="flex: 1; position: relative;">
                  <input type="text" class="val-input selector-input" placeholder="CSS/XPath Selector..." bind:value={cond.selector} on:change={onChange} />
                  {#if cond.candidates?.length}
                    <div class="selector-stack-popover">
                      <button class="shield-btn" title="Tune Resilience Stack">
                        <ShieldCheck size={12} />
                        <span>{cond.candidates.length} Fallbacks</span>
                      </button>
                      <div class="stack-dropdown glass">
                        <div class="stack-header">Resilience Hierarchy</div>
                        {#each cond.candidates as cand, ci}
                          <div class="stack-item">
                            <select class="cand-type-select" bind:value={cand.type} on:change={onChange}>
                              <option value="ID">ID</option>
                              <option value="CLASS">CLASS</option>
                              <option value="XPATH">XPATH</option>
                              <option value="NAME">NAME</option>
                              <option value="ARIA">ARIA</option>
                              <option value="LABEL">LABEL</option>
                              <option value="PLACEHOLDER">HLD</option>
                              <option value="RELATIVE">REL</option>
                            </select>
                            <input type="text" class="sel-inp" bind:value={cand.selector} on:change={onChange} placeholder="Selector string..." />
                            <div class="index-wrap">
                              <span>#</span>
                              <input type="number" class="idx-inp" bind:value={cand.index} min="0" on:change={onChange} />
                            </div>
                            <button class="cand-del" on:click={() => { cond.candidates.splice(ci, 1); cond.candidates = cond.candidates; onChange(); }}><Plus size={10} style="transform: rotate(45deg)" /></button>
                          </div>
                        {/each}
                        <button class="add-cand" on:click={() => { cond.candidates = [...(cond.candidates || []), { type: 'XPATH', selector: '', confidence: 10 }]; onChange(); }}><Plus size={10} /> Add Fallback</button>
                      </div>
                    </div>
                  {/if}
                </div>
                {#if highlightSelector && cond.selector}
                  <button class="icon-btn" on:click={() => highlightSelector && highlightSelector(cond.selector || '')} title="Locate on page">
                    <Search size={12} />
                  </button>
                {/if}
              {/if}

              {#if cond.ruleType.startsWith('var_') || cond.ruleType.startsWith('num_')}
                <input type="text" class="val-input" placeholder="Variable (e.g. &#123;Price&#125;)" bind:value={cond.value1} on:change={onChange} />
              {/if}

              {#if needsValue1(cond.ruleType) && !cond.ruleType.startsWith('var_') && !cond.ruleType.startsWith('num_')}
                <input type="text" class="val-input" placeholder="Expected Value..." bind:value={cond.value1} on:change={onChange} />
              {/if}

              {#if needsValue2(cond.ruleType)}
                <span class="compare-label">Expected:</span>
                <input type="text" class="val-input" placeholder="Expected Value..." bind:value={cond.value2} on:change={onChange} />
              {/if}

              {#if testRule}
                <button class="icon-btn test-btn" on:click={() => testRule && testRule(cond)} title="Test this specific rule">
                  <Play size={12} />
                </button>
              {/if}
            </div>

            <button class="remove-rule-btn" title="Remove Rule" on:click={() => removeCondition(index)}><Trash2 size={12} /></button>
          </div>
        {/if}
      </div>
    {/each}

    <div class="add-actions">
      <button class="add-btn" on:click={addRule}><Plus size={12} /> Add Rule</button>
      {#if depth < MAX_DEPTH}
        <button class="add-btn group-btn" on:click={addGroup}><Plus size={12} /> Add Group</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .group-container {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 12px;
    padding: 0.75rem;
    border: 1px solid var(--border-ui);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .group-container.root {
    background: transparent;
    padding: 0;
    border: none;
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .operator-select {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-muted);
  }
  .operator-select select {
    background: var(--bg-surface-solid);
    color: var(--accent);
    font-weight: 900;
    border: 1px solid var(--border-ui);
    border-radius: 6px;
    padding: 0.2rem 0.5rem;
    outline: none;
    cursor: pointer;
  }

  .conditions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-left: 1rem;
    position: relative;
  }
  
  .condition-item {
    position: relative;
  }
  .logic-line {
    position: absolute;
    left: -1rem;
    top: -0.5rem;
    bottom: -0.5rem;
    width: 1px;
    background: var(--border-ui-heavy);
  }
  .condition-item::before {
    content: '';
    position: absolute;
    left: -1rem;
    top: 50%;
    width: 0.5rem;
    height: 1px;
    background: var(--border-ui-heavy);
  }

  .rule-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--bg-surface-solid);
    border: 1px solid var(--border-ui);
    border-radius: 10px;
    padding: 0.5rem;
  }

  .rule-type-select {
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border-ui);
    border-radius: 6px;
    padding: 0.3rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 700;
    outline: none;
    min-width: 150px;
  }

  .rule-inputs {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .picker-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--accent-glow);
    border: 1px solid var(--accent);
    color: var(--accent);
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 800;
    cursor: pointer;
    white-space: nowrap;
  }
  .picker-btn:hover {
    background: var(--accent);
    color: white;
  }

  .val-input {
    flex: 1;
    background: var(--bg-card);
    border: 1px solid var(--border-ui);
    color: var(--text-primary);
    border-radius: 6px;
    padding: 0.3rem 0.5rem;
    font-size: 0.7rem;
    outline: none;
    min-width: 100px;
  }
  .val-input:focus {
    border-color: var(--accent);
  }

  .compare-label {
    font-size: 0.65rem;
    font-weight: 800;
    color: var(--text-muted);
  }

  .remove-btn, .remove-rule-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .remove-btn:hover, .remove-rule-btn:hover {
    color: var(--status-error);
  }

  .add-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.25rem;
    position: relative;
  }
  .add-actions::before {
    content: '';
    position: absolute;
    left: -1rem;
    top: -0.5rem;
    bottom: 50%;
    width: 1px;
    background: var(--border-ui-heavy);
  }
  .add-actions::after {
    content: '';
    position: absolute;
    left: -1rem;
    top: 50%;
    width: 0.5rem;
    height: 1px;
    background: var(--border-ui-heavy);
  }
  .add-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    background: var(--bg-surface-solid);
    border: 1px solid var(--border-ui);
    color: var(--text-secondary);
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    font-size: 0.65rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s;
  }
  .add-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .group-btn {
    background: transparent;
    border-style: dashed;
  }
  .icon-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.3rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .icon-btn:hover {
    background: var(--accent-glow);
    color: var(--accent);
  }
  .selector-input-shell { position: relative; display: flex; align-items: center; width: 100%; box-sizing: border-box; }
  .selector-input-shell input.selector-input { width: 100%; padding-right: 6rem; }
  .selector-stack-popover { position: absolute; right: 0.5rem; height: 100%; display: flex; align-items: center; }
  .shield-btn { display: flex; align-items: center; gap: 0.3rem; background: var(--status-success); color: white; border: none; border-radius: 6px; padding: 0.2rem 0.5rem; font-size: 0.55rem; font-weight: 800; cursor: pointer; }
  .stack-dropdown { position: absolute; top: 110%; right: 0; width: 320px; z-index: 1000; border: 1px solid var(--border-ui-heavy); border-radius: 1rem; padding: 0.75rem; display: none; flex-direction: column; gap: 0.5rem; box-shadow: var(--shadow-elite); background: var(--bg-card); }
  .selector-stack-popover:hover .stack-dropdown { display: flex; }
  .stack-item { display: flex; align-items: center; gap: 0.5rem; background: var(--bg-surface-solid); padding: 0.4rem 0.6rem; border-radius: 8px; border: 1px solid var(--border-ui); }
  .cand-type-select { background: none; border: none; font-size: 0.5rem; font-weight: 900; color: var(--accent); width: 60px; flex-shrink: 0; outline: none; cursor: pointer; text-transform: uppercase; }
  .cand-type-select option { background: var(--bg-card); color: var(--text-primary); font-size: 0.7rem; }
  .stack-item .sel-inp { flex: 1; font-size: 0.65rem; border: none; background: transparent; color: var(--text-primary); outline: none; min-width: 0; }
  .index-wrap { display: flex; align-items: center; gap: 0.1rem; background: var(--bg-card-hover); padding: 0.1rem 0.3rem; border-radius: 4px; border: 1px solid var(--border-ui-heavy); flex-shrink: 0; }
  .index-wrap span { font-size: 0.55rem; font-weight: 900; color: var(--text-muted); }
  .idx-inp { width: 22px; border: none; background: transparent; font-size: 0.65rem; color: var(--accent); font-weight: 800; outline: none; text-align: center; }
  .idx-inp::-webkit-inner-spin-button { display: none; }
  .cand-del { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center; }
  .cand-del:hover { color: var(--status-error); }
  .add-cand { margin-top: 0.25rem; background: var(--accent-glow); border: 1px dashed var(--accent); color: var(--accent); border-radius: 8px; padding: 0.4rem; font-size: 0.6rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem; }
  .add-cand:hover { background: var(--accent); color: white; }
</style>
