<script lang="ts">
  import { 
    getSuggestions, 
    applySuggestion, 
    validateExpression, 
    type AutocompleteSuggestion,
    type ValidationResult 
  } from '$shared/utils/expressions';
  import { AlertCircle, CheckCircle2, Database, Code, Braces, Info } from '@lucide/svelte';

  import { liveQuery } from 'dexie';
  import { db } from '$shared/services/db';

  export let value = '';
  export let headers: string[] = [];
  export let onChange: (val: string) => void;
  export let placeholder = 'Enter value...';
  export let style = '';

  let inputEl: HTMLInputElement;
  let suggestions: AutocompleteSuggestion[] = [];
  let selectedIndex = 0;
  let showSuggestions = false;
  let isMouseOverSuggestions = false;
  let validation: ValidationResult = { isValid: true, message: null };

  const globalData = liveQuery(() => db.global_tables.toArray());
  $: globalTables = $globalData || [];

  $: validation = validateExpression(value);

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    value = target.value;
    onChange(value);
    updateSuggestions();
  }

  function updateSuggestions() {
    const cursor = inputEl?.selectionStart || 0;
    suggestions = getSuggestions(value, cursor, headers, globalTables);
    showSuggestions = suggestions.length > 0;
    selectedIndex = 0;
  }

  function selectSuggestion(suggestion: string) {
    const cursor = inputEl.selectionStart || 0;
    const newVal = applySuggestion(value, suggestion, cursor);
    value = newVal;
    showSuggestions = false;
    onChange(value);
    inputEl.focus();
    
    // Position cursor after insertion
    setTimeout(() => {
      const insertedAt = newVal.indexOf(suggestion);
      const newPos = insertedAt + suggestion.length;
      inputEl.setSelectionRange(newPos, newPos);
    }, 0);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % suggestions.length;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectSuggestion(suggestions[selectedIndex].value);
      } else if (e.key === 'Escape') {
        showSuggestions = false;
      }
    }
  }

  function handleBlur() {
    // Keep popover long enough for mousedown, unless mouse is already over it
    setTimeout(() => {
      if (!isMouseOverSuggestions) {
        showSuggestions = false;
      }
    }, 200);
  }
</script>

<div class="exp-input-container" style={style}>
  <div class="input-wrapper" class:invalid={!validation.isValid}>
    <input
      bind:this={inputEl}
      type="text"
      {value}
      {placeholder}
      on:input={handleInput}
      on:keydown|stopPropagation={handleKeyDown}
      on:focus={updateSuggestions}
      on:blur={handleBlur}
      style="anchor-name: --suggestion-anchor"
    />
    
    <div class="status-indicators">
      {#if !validation.isValid}
        <div class="error-indicator">
          <AlertCircle size={14} />
          <div class="error-tooltip glass">
            <div class="error-header">
              <AlertCircle size={12} />
              <span>Diagnostic Report</span>
            </div>
            <div class="error-body">
              <span class="error-msg">{validation.message}</span>
              <div class="error-meta">
                <span class="loc">Pos: {validation.errorIndex ?? 'End'}</span>
                <span class="fix">Check bracket symmetry</span>
              </div>
            </div>
          </div>
        </div>
      {:else if value.includes('{')}
        <div class="success-indicator" title="Expression Valid">
          <CheckCircle2 size={14} />
        </div>
      {/if}
    </div>

    <!-- Red Undermark (Visual Error Line) -->
    {#if !validation.isValid}
      <div class="error-undermark" style="left: {Math.min(90, (validation.errorIndex || 0) * 1)}%"></div>
    {/if}
  </div>

  {#if showSuggestions}
    <div 
      class="suggestion-popover glass" 
      role="listbox"
      tabindex="-1"
      on:mouseenter={() => isMouseOverSuggestions = true}
      on:mouseleave={() => isMouseOverSuggestions = false}
      on:keydown={handleKeyDown}
    >
      <div class="popover-header">Neural Intelligence</div>
      <div class="suggestion-scroll">
        {#each suggestions as suggestion, i}
          <button
            class="suggestion-item"
            class:selected={i === selectedIndex}
            role="option"
            aria-selected={i === selectedIndex}
            on:mousedown|preventDefault={() => selectSuggestion(suggestion.value)}
          >
            <div class="s-icon" class:script={suggestion.type === 'script'} class:column={suggestion.type === 'column'}>
              {#if suggestion.type === 'script'}<Code size={12} />
              {:else if suggestion.type === 'column'}<Database size={12} />
              {:else}<Braces size={12} />{/if}
            </div>
            <div class="s-content">
              <div class="s-row">
                <span class="s-label">{suggestion.label}</span>
                <span class="s-badge {suggestion.type}">{suggestion.type}</span>
              </div>
              {#if suggestion.description}
                <span class="s-desc">{suggestion.description}</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .exp-input-container { position: relative; width: 100%; }
  
  .input-wrapper { 
    position: relative; 
    display: flex; 
    align-items: center; 
    background: var(--bg-surface-solid); 
    border: 1px solid var(--border-ui); 
    border-radius: 0.75rem; 
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    min-height: 38px;
  }
  .input-wrapper:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
  .input-wrapper.invalid { border-color: var(--status-error); }
  .input-wrapper.invalid:focus-within { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2); }

  .error-undermark {
    position: absolute;
    bottom: -1px;
    height: 2px;
    width: 20px;
    background: var(--status-error);
    box-shadow: 0 0 8px var(--status-error);
    border-radius: 2px;
    transition: left 0.3s ease;
  }

  input { 
    flex: 1; 
    background: transparent; 
    border: none; 
    padding: 0.65rem 0.85rem; 
    color: var(--text-primary); 
    font-family: 'JetBrains Mono', monospace; 
    font-size: 0.8rem; 
    outline: none; 
  }

  .status-indicators { display: flex; align-items: center; padding-right: 0.75rem; gap: 0.5rem; }
  
  .error-indicator { color: var(--status-error); cursor: help; position: relative; display: flex; align-items: center; }
  .success-indicator { color: var(--status-success); opacity: 0.8; display: flex; align-items: center; }

  .error-tooltip { 
    position: absolute; 
    bottom: 120%; 
    right: -10px; 
    width: 240px; 
    background: var(--bg-card); 
    border: 1px solid var(--status-error); 
    border-radius: 1rem; 
    padding: 1rem; 
    box-shadow: var(--shadow-elite); 
    z-index: 10000; 
    display: none; 
    pointer-events: none;
    backdrop-filter: blur(16px);
    animation: pop-up 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .error-indicator:hover .error-tooltip { display: flex; flex-direction: column; gap: 0.5rem; }
  
  .error-header { display: flex; align-items: center; gap: 0.5rem; font-size: 0.65rem; font-weight: 900; text-transform: uppercase; color: var(--status-error); letter-spacing: 0.1em; border-bottom: 1px solid rgba(239, 68, 68, 0.1); padding-bottom: 0.5rem; }
  .error-body { display: flex; flex-direction: column; gap: 0.4rem; }
  .error-msg { font-size: 0.8rem; color: var(--text-primary); line-height: 1.5; font-weight: 500; }
  
  .error-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; }
  .error-meta .loc { font-size: 0.6rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; font-weight: 800; background: var(--bg-surface-solid); padding: 0.1rem 0.4rem; border-radius: 4px; }
  .error-meta .fix { font-size: 0.6rem; color: var(--status-error); font-weight: 800; text-transform: uppercase; }

  @keyframes pop-up { from { opacity: 0; transform: translateY(15px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }

  .suggestion-popover {
    position: fixed;
    position-anchor: --suggestion-anchor;
    top: anchor(bottom);
    left: anchor(left);
    width: anchor-size(width);
    margin-top: 0.6rem;
    background: var(--bg-card);
    border: 1px solid var(--accent);
    border-radius: 1rem;
    box-shadow: 0 15px 50px rgba(0,0,0,0.4);
    max-height: 280px;
    z-index: 99999;
    padding: 0.6rem;
    display: flex;
    flex-direction: column;
    pointer-events: auto;
  }

  .suggestion-scroll {
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    padding-right: 4px;
  }

  /* Custom Scrollbar */
  .suggestion-scroll::-webkit-scrollbar { width: 4px; }
  .suggestion-scroll::-webkit-scrollbar-track { background: transparent; }
  .suggestion-scroll::-webkit-scrollbar-thumb { background: var(--border-ui-heavy); border-radius: 4px; }

  .popover-header { font-size: 0.55rem; font-weight: 900; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.15em; padding: 0.4rem 0.85rem 0.6rem 0.85rem; border-bottom: 1px solid var(--border-ui); margin-bottom: 0.4rem; flex-shrink: 0; }

  .suggestion-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 0.85rem;
    border-radius: 0.75rem;
    background: transparent;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .suggestion-item:hover, .suggestion-item.selected { background: var(--accent-glow); color: var(--accent); transform: translateX(4px); }
  
  .s-icon { 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    width: 28px; 
    height: 28px; 
    border-radius: 8px; 
    background: var(--bg-surface-solid); 
    color: var(--text-muted); 
    flex-shrink: 0;
    transition: all 0.2s;
  }
  .suggestion-item:hover .s-icon { background: white; }
  .s-icon.script { color: var(--accent); background: var(--accent-glow); }
  .s-icon.column { color: var(--status-success); background: rgba(34, 197, 94, 0.1); }

  .s-content { display: flex; flex-direction: column; overflow: hidden; flex: 1; }
  .s-row { display: flex; justify-content: space-between; align-items: center; }
  .s-label { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .s-badge { font-size: 0.5rem; text-transform: uppercase; font-weight: 900; padding: 0.1rem 0.4rem; border-radius: 4px; opacity: 0.6; }
  .s-badge.script { color: var(--accent); border: 1px solid var(--accent); }
  .s-badge.column { color: var(--status-success); border: 1px solid var(--status-success); }
  
  .s-desc { font-size: 0.65rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 0.1rem; }
</style>
