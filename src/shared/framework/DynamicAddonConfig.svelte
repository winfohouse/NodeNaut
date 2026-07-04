<script lang="ts">
  import EditableLabel from '$sidepanel/components/EditableLabel.svelte';
  import Button from '$sidepanel/components/Button.svelte';
  import { Play } from '@lucide/svelte';
  import { onMount } from 'svelte';

  export let node: any;
  export let graph: any = { nodes: [] };
  export let save: () => void;
  export let testAction: (node: any) => Promise<void>;
  export let tableHeaders: string[] = [];
  export let bundleParams: string[] = [];

  import { NodeNautRegistry } from './Registry';
  const registry = NodeNautRegistry.getInstance();
  const manifest = registry.getManifest(node.type) as any;
  const configSchema = manifest?.configSchema || [];

  let nodeBundles: any[] = [];
  onMount(async () => {
    // 1. Fetch all custom node bundles for bundle_ref selection
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const stored = await chrome.storage.local.get('node_bundles');
      nodeBundles = stored.node_bundles || [];
    }
  });

  $: otherNodes = (graph && graph.nodes) ? graph.nodes.filter((n: any) => n.id !== node.id) : [];

  function updateField(key: string, value: any) {
    if (!node.state) node.state = {};
    node.state[key] = value;
    node = node;
    save();
  }

  const REF_TYPES = ['node_ref', 'bundle_ref', 'nodes_flow'];

  function validateField(controlName: string, paramInfo: any) {
    const value = node.state?.[controlName];
    if (!paramInfo) return null;
    
    // Check required fields — use friendly messages for each type
    if (paramInfo.required && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
      if (paramInfo.type === 'node_ref' || paramInfo.type === 'nodes_flow') return 'Pick a step from the flow';
      if (paramInfo.type === 'bundle_ref') return 'Pick a bundle';
      return 'This field is required';
    }

    if (!value) return null;

    // Check if the entire field is a dynamic bracket expression (e.g. {myVar})
    const isExpression = typeof value === 'string' && value.startsWith('{') && value.endsWith('}');

    if (paramInfo.type === 'node_ref' || paramInfo.type === 'nodes_flow') {
      if (isExpression) return null; // Resolved dynamically at runtime
      const exists = otherNodes.some(n => n.id === value);
      if (!exists) {
        return 'This step was removed from the flow';
      }
    }

    if (paramInfo.type === 'bundle_ref') {
      if (isExpression) return null; // Resolved dynamically at runtime
      const exists = nodeBundles.some(b => b.id === value);
      if (!exists) {
        return 'This bundle was deleted';
      }
    }

    return null;
  }

  function isFieldDynamic(fieldName: string) {
    const val = node.state?.[fieldName];
    return typeof val === 'string' && val.startsWith('{') && val.endsWith('}');
  }

  function toggleFieldMode(fieldName: string) {
    const isDyn = isFieldDynamic(fieldName);
    if (isDyn) {
      updateField(fieldName, '');
    } else {
      updateField(fieldName, '{var}');
    }
  }

  // Handle multi-select list for node_list
  function toggleNodeSelection(key: string, nodeId: string) {
    const currentList = Array.isArray(node.state?.[key]) ? node.state[key] : [];
    let newList;
    if (currentList.includes(nodeId)) {
      newList = currentList.filter((id: string) => id !== nodeId);
    } else {
      newList = [...currentList, nodeId];
    }
    updateField(key, newList);
  }

  $: allSuggestions = [
    ...(tableHeaders || []).map(h => ({ name: h, type: 'column' })),
    ...(bundleParams || []).map(p => ({ name: p, type: 'parameter' }))
  ];

  let activeSuggestField: string | null = null;
  let suggestQuery = '';

  function handleInputType(fieldName: string, val: string) {
    updateField(fieldName, val);
    const lastOpenCurly = val.lastIndexOf('{');
    const lastCloseCurly = val.lastIndexOf('}');
    if (lastOpenCurly > lastCloseCurly) {
      activeSuggestField = fieldName;
      suggestQuery = val.slice(lastOpenCurly + 1);
    } else {
      activeSuggestField = null;
      suggestQuery = '';
    }
  }

  function handleInputFocus(fieldName: string, val: string) {
    const lastOpenCurly = val.lastIndexOf('{');
    const lastCloseCurly = val.lastIndexOf('}');
    if (lastOpenCurly > lastCloseCurly) {
      activeSuggestField = fieldName;
      suggestQuery = val.slice(lastOpenCurly + 1);
    } else {
      activeSuggestField = fieldName;
      suggestQuery = '';
    }
  }

  function handleInputBlur() {
    setTimeout(() => {
      activeSuggestField = null;
      suggestQuery = '';
    }, 200);
  }

  function selectSuggestion(fieldName: string, varName: string) {
    const currentVal = String(node.state?.[fieldName] ?? '');
    const lastOpenCurly = currentVal.lastIndexOf('{');
    let newVal;
    if (lastOpenCurly !== -1) {
      newVal = currentVal.slice(0, lastOpenCurly) + `{${varName}}`;
    } else {
      newVal = currentVal + `{${varName}}`;
    }
    updateField(fieldName, newVal);
    activeSuggestField = null;
    suggestQuery = '';
  }

  $: filteredSuggestions = allSuggestions.filter(item => 
    item.name.toLowerCase().includes(suggestQuery.toLowerCase())
  );

  $: isBundleNode = manifest?.type?.startsWith('BUNDLE_');
  $: bundleValueFields = isBundleNode ? configSchema.filter((c: any) => { const p = (manifest.configSchema || []).find((cc: any) => cc.name === c.name); return p && !REF_TYPES.includes(p.type); }) : [];
  $: bundleRefFields = isBundleNode ? configSchema.filter((c: any) => { const p = (manifest.configSchema || []).find((cc: any) => cc.name === c.name); return p && REF_TYPES.includes(p.type); }) : [];
</script>

<div class="node-config-plugin">
  <div class="selector-row">
    <EditableLabel 
      value={node.metadata?.label || manifest?.label || node.type} 
      onSave={(nv) => { node.metadata.label = nv; save(); }} 
    />
  </div>


  {#if isBundleNode && bundleValueFields.length > 0}
    <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.25rem;">
      <span style="font-size: 0.6rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em;">📝 Value Parameters</span>
    </div>
  {/if}

  {#each configSchema as control}
    {@const paramInfo = isBundleNode ? (manifest.configSchema || []).find((c: any) => c.name === control.name) : null}
    {@const errorMsg = validateField(control.name, paramInfo)}
    {@const isRefType = paramInfo && REF_TYPES.includes(paramInfo.type)}

    <!-- Insert Reference section header before the first reference field -->
    {#if isBundleNode && isRefType && bundleRefFields.length > 0 && control.name === bundleRefFields[0]?.name}
      <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-ui);">
        <span style="font-size: 0.6rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em;">🔗 Reference Parameters</span>
        <span style="font-size: 0.5rem; color: var(--text-secondary); opacity: 0.7;">— always required</span>
      </div>
    {/if}

    <div class="config-section">
      <div class="field-label" style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; width: 100%;">
        <span>{control.label || control.name}</span>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          {#if paramInfo && !isRefType}
            <!-- Dynamic toggle only for VALUE params, not reference params -->
            <button 
              type="button"
              class="toggle-mode-btn"
              on:click|preventDefault={() => toggleFieldMode(control.name)}
              title="Toggle between Static Selection and Dynamic Variable Expression"
              style="background: transparent; border: none; font-size: 0.6rem; font-weight: 800; color: {isFieldDynamic(control.name) ? 'var(--accent)' : 'var(--text-muted)'}; cursor: pointer; display: flex; align-items: center; gap: 0.15rem; padding: 0.1rem 0.3rem; border-radius: 4px; border: 1px solid {isFieldDynamic(control.name) ? 'var(--accent)' : 'var(--border-ui)'};"
            >
              <span>{"{x}"}</span>
              <span>{isFieldDynamic(control.name) ? 'Dynamic' : 'Static'}</span>
            </button>
          {/if}
          {#if isRefType}
            <span style="font-size: 0.55rem; font-weight: 700; color: var(--warning, #f59e0b); background: rgba(245,158,11,0.1); padding: 0.1rem 0.35rem; border-radius: 4px;">REQUIRED</span>
          {:else if paramInfo?.required}
            <span style="font-size: 0.55rem; color: var(--accent); font-weight: bold; text-transform: uppercase;">Required</span>
          {/if}
        </div>
      </div>
      
      {#if paramInfo && isFieldDynamic(control.name)}
        <!-- Dynamic Variable Expression Input -->
        <div class="suggest-input-wrapper" style="position: relative; width: 100%;">
          <input 
            type="text" 
            class="config-input" 
            class:input-invalid={errorMsg}
            value={node.state?.[control.name] ?? ''} 
            on:input={(e) => handleInputType(control.name, e.currentTarget.value)}
            on:focus={(e) => handleInputFocus(control.name, e.currentTarget.value)}
            on:blur={handleInputBlur}
            placeholder="Enter dynamic expression like {'{varName}'}"
            style="width: 100%;"
          />

          {#if activeSuggestField === control.name && filteredSuggestions.length > 0}
            <div class="suggest-dropdown glass" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 999; max-height: 150px; overflow-y: auto; background: var(--bg-card); border: 1px solid var(--border-ui-heavy); border-radius: 8px; box-shadow: var(--shadow-elite); margin-top: 4px; display: flex; flex-direction: column;">
              {#each filteredSuggestions as item}
                <button 
                  type="button"
                  on:mousedown|preventDefault={() => selectSuggestion(control.name, item.name)}
                  style="display: flex; justify-content: space-between; align-items: center; width: 100%; background: transparent; border: none; padding: 0.5rem 0.75rem; font-size: 0.75rem; text-align: left; color: var(--text-primary); cursor: pointer; transition: background 0.2s;"
                  class="suggest-item"
                >
                  <span style="font-weight: bold;">{`{${item.name}}`}</span>
                  <span style="font-size: 0.65rem; color: var(--accent); font-weight: bold; text-transform: uppercase;">{item.type}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {:else if control.type === 'select' && control.options && Array.isArray(control.options)}
        <select 
          class="config-select" 
          class:input-invalid={errorMsg}
          value={node.state?.[control.name] ?? control.default ?? ''}
          on:change={(e) => updateField(control.name, e.currentTarget.value)}
        >
          <option value="">-- Select Option --</option>
          {#each control.options as option}
            <option value={option}>{option}</option>
          {/each}
        </select>

      {:else if manifest?.type?.startsWith('BUNDLE_') && control.name}
        <!-- Node Bundle configured instance parameter inputs -->
        {#if paramInfo}
          <!-- Depending on parameter type, render custom UI inputs! -->
          {#if paramInfo.type === 'node_ref' || paramInfo.type === 'nodes_flow'}
            <select 
              class="config-select" 
              class:input-invalid={errorMsg}
              value={node.state?.[control.name] ?? ''}
              on:change={(e) => updateField(control.name, e.currentTarget.value)}
            >
              <option value="">{paramInfo.type === 'nodes_flow' ? '-- Pick Starting Step --' : '-- Pick a Step --'}</option>
              {#each otherNodes as n}
                <option value={n.id}>{n.metadata?.label || n.type} ({n.id.slice(0, 8)})</option>
              {/each}
            </select>
            
          {:else if paramInfo.type === 'bundle_ref'}
            <select 
              class="config-select" 
              class:input-invalid={errorMsg}
              value={node.state?.[control.name] ?? ''}
              on:change={(e) => updateField(control.name, e.currentTarget.value)}
            >
              <option value="">-- Pick a Bundle --</option>
              {#each nodeBundles as b}
                <option value={b.id}>{b.name}</option>
              {/each}
            </select>
            
          {:else}
            <!-- Standard text / expression inputs -->
            <div class="suggest-input-wrapper" style="position: relative; width: 100%;">
              <input 
                type="text" 
                class="config-input" 
                class:input-invalid={errorMsg}
                value={node.state?.[control.name] ?? control.default ?? ''} 
                on:input={(e) => handleInputType(control.name, e.currentTarget.value)}
                on:focus={(e) => handleInputFocus(control.name, e.currentTarget.value)}
                on:blur={handleInputBlur}
                placeholder={control.placeholder || 'Enter value or {varName}'}
                style="width: 100%;"
              />

              {#if activeSuggestField === control.name && filteredSuggestions.length > 0}
                <div class="suggest-dropdown glass" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 999; max-height: 150px; overflow-y: auto; background: var(--bg-card); border: 1px solid var(--border-ui-heavy); border-radius: 8px; box-shadow: var(--shadow-elite); margin-top: 4px; display: flex; flex-direction: column;">
                  {#each filteredSuggestions as item}
                    <button 
                      type="button"
                      on:mousedown|preventDefault={() => selectSuggestion(control.name, item.name)}
                      style="display: flex; justify-content: space-between; align-items: center; width: 100%; background: transparent; border: none; padding: 0.5rem 0.75rem; font-size: 0.75rem; text-align: left; color: var(--text-primary); cursor: pointer; transition: background 0.2s;"
                      class="suggest-item"
                    >
                      <span style="font-weight: bold;">{`{${item.name}}`}</span>
                      <span style="font-size: 0.65rem; color: var(--accent); font-weight: bold; text-transform: uppercase;">{item.type}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        {/if}

      {:else if control.type === 'select'}
        <select 
          class="config-select" 
          class:input-invalid={errorMsg}
          value={node.state?.[control.name] ?? control.default ?? ''}
          on:change={(e) => updateField(control.name, e.currentTarget.value)}
        >
          <option value="">-- Select Option --</option>
          {#each control.options || [] as option}
            <option value={option}>{option}</option>
          {/each}
        </select>
      {:else}
        <div class="suggest-input-wrapper" style="position: relative; width: 100%;">
          <input 
            type={control.type || 'text'} 
            class="config-input" 
            class:input-invalid={errorMsg}
            value={node.state?.[control.name] ?? control.default ?? ''} 
            on:input={(e) => handleInputType(control.name, e.currentTarget.value)}
            on:focus={(e) => handleInputFocus(control.name, e.currentTarget.value)}
            on:blur={handleInputBlur}
            placeholder={control.placeholder || 'Enter value or {varName}'}
            style="width: 100%;"
          />

          {#if activeSuggestField === control.name && filteredSuggestions.length > 0}
            <div class="suggest-dropdown glass" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 999; max-height: 150px; overflow-y: auto; background: var(--bg-card); border: 1px solid var(--border-ui-heavy); border-radius: 8px; box-shadow: var(--shadow-elite); margin-top: 4px; display: flex; flex-direction: column;">
              {#each filteredSuggestions as item}
                <button 
                  type="button"
                  on:mousedown|preventDefault={() => selectSuggestion(control.name, item.name)}
                  style="display: flex; justify-content: space-between; align-items: center; width: 100%; background: transparent; border: none; padding: 0.5rem 0.75rem; font-size: 0.75rem; text-align: left; color: var(--text-primary); cursor: pointer; transition: background 0.2s;"
                  class="suggest-item"
                >
                  <span style="font-weight: bold;">{`{${item.name}}`}</span>
                  <span style="font-size: 0.65rem; color: var(--accent); font-weight: bold; text-transform: uppercase;">{item.type}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      {#if errorMsg}
        <div class="validation-error">{errorMsg}</div>
      {/if}
    </div>
  {/each}

  <div class="action-footer">
    <Button variant="picker" size="sm" on:click={() => testAction(node)} fullWidth>
      <Play slot="icon" size={12} />
      Test Custom Node
    </Button>
  </div>
</div>

<style>
  .node-config-plugin { display: flex; flex-direction: column; gap: 1rem; }
  .selector-row { display: flex; flex-direction: column; gap: 0.5rem; }
  
  .config-section { display: flex; flex-direction: column; gap: 0.4rem; }
  .field-label { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  
  .config-input { width: 100%; padding: 0.5rem 0.75rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 8px; color: var(--text-primary); font-size: 0.75rem; transition: border-color 0.2s; }
  .config-input:focus { border-color: var(--accent); outline: none; }

  .config-select { width: 100%; padding: 0.5rem 0.75rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 8px; color: var(--text-primary); font-size: 0.75rem; cursor: pointer; transition: border-color 0.2s; }
  .config-select:focus { border-color: var(--accent); outline: none; }

  .action-footer { margin-top: 0.5rem; }

  .validation-error {
    font-size: 0.65rem;
    font-weight: 800;
    color: var(--status-error);
    margin-top: 0.2rem;
  }

  :global(.input-invalid) {
    border-color: var(--status-error) !important;
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2) !important;
  }
</style>
