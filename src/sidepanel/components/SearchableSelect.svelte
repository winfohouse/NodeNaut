<script lang="ts">
  import { Search, Check } from '@lucide/svelte';
  import { onMount, createEventDispatcher, tick } from 'svelte';

  const dispatch = createEventDispatcher();

  export let value: string = '';
  export let options: { label: string; value: string; category?: string; icon?: any }[] = [];
  export let placeholder: string = 'Search actions...';

  let searchTerm = '';
  let isOpen = false;
  let highlightedIndex = 0;
  let containerEl: HTMLElement;

  $: filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    opt.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  $: groupedOptions = filteredOptions.reduce((acc, opt) => {
    const cat = opt.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(opt);
    return acc;
  }, {} as Record<string, any[]>);

  $: categories = Object.keys(groupedOptions);

  // Flattened list for keyboard navigation
  $: flatList = categories.flatMap(cat => groupedOptions[cat]);

  $: selectedOption = options.find(o => o.value === value);

  function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      searchTerm = '';
      highlightedIndex = flatList.findIndex(o => o.value === value);
      if (highlightedIndex < 0) highlightedIndex = 0;
      tick().then(scrollToHighlighted);
    }
  }

  function select(opt: any) {
    if (!opt) return;
    value = opt.value;
    isOpen = false;
    dispatch('change', value);
  }

  function scrollToHighlighted() {
    const list = containerEl.querySelector('.options-list');
    const item = list?.querySelector('.option.highlighted') as HTMLElement;
    if (list && item) {
      const listRect = list.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      if (itemRect.bottom > listRect.bottom) {
        list.scrollTop += (itemRect.bottom - listRect.bottom);
      } else if (itemRect.top < listRect.top) {
        list.scrollTop -= (listRect.top - itemRect.top);
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        toggle();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      isOpen = false;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % flatList.length;
      scrollToHighlighted();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex - 1 + flatList.length) % flatList.length;
      scrollToHighlighted();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatList[highlightedIndex]) select(flatList[highlightedIndex]);
    }
  }

  onMount(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerEl && !containerEl.contains(e.target as Node)) isOpen = false;
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  });
</script>

<div class="search-select" bind:this={containerEl} on:keydown={handleKeyDown} role="none">
  <div 
    class="trigger glass" 
    role="combobox" 
    aria-expanded={isOpen} 
    aria-haspopup="listbox"
    aria-controls="fp-action-list"
    tabindex="0" 
    on:click|stopPropagation={toggle}
  >
    {#if selectedOption}
      <div class="selected-val">
        {#if selectedOption.icon}<svelte:component this={selectedOption.icon} size={14} />{/if}
        <span>{selectedOption.label}</span>
      </div>
    {:else}
      <span class="placeholder">{placeholder}</span>
    {/if}
  </div>

  {#if isOpen}
    <div 
      class="dropdown fade-in" 
      role="presentation" 
      on:click|stopPropagation 
      on:wheel|stopPropagation
    >
      <div class="search-wrap">
        <Search size={14} class="text-muted" />
        <input 
          type="text" 
          bind:value={searchTerm} 
          placeholder="Filter actions..." 
          on:click|stopPropagation
        />
      </div>

      <div class="options-list" id="fp-action-list" role="listbox">
        {#if categories.length > 0}
          {#each categories as cat}
            <div class="category-header" role="presentation">{cat}</div>
            {#each groupedOptions[cat] as opt}
              {@const fIdx = flatList.indexOf(opt)}
              <button 
                class="option" 
                class:highlighted={fIdx === highlightedIndex}
                class:selected={opt.value === value}
                role="option"
                aria-selected={opt.value === value}
                on:mouseenter={() => highlightedIndex = fIdx}
                on:click|stopPropagation={() => select(opt)}
              >
                <div class="opt-main">
                  {#if opt.icon}<svelte:component this={opt.icon} size={14} />{/if}
                  <span>{opt.label}</span>
                </div>
                {#if opt.value === value}<Check size={12} class="text-accent" />{/if}
              </button>
            {/each}
          {/each}
        {:else}
          <div class="no-results" role="status">No matches found</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .search-select { position: relative; width: 100%; font-family: inherit; }
  
  .trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.85rem;
    background: var(--bg-surface-solid);
    border: 1px solid var(--border-ui);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 38px;
    position: relative;
  }
  .trigger::after {
    content: '';
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid var(--text-muted);
    transition: transform 0.2s;
    margin-left: 0.5rem;
  }
  .trigger[aria-expanded="true"]::after { transform: rotate(180deg); border-top-color: var(--accent); }

  .trigger:hover { border-color: var(--accent); }
  .trigger:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }

  .selected-val { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; color: var(--text-primary); }
  .placeholder { font-size: 0.75rem; color: var(--text-muted); }

  .dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    z-index: 2000;
    background: var(--bg-surface-solid) !important;
    border: 1px solid var(--accent);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    max-height: 320px;
    pointer-events: auto;
  }

  .search-wrap {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem;
    border-bottom: 1px solid var(--border-ui);
    margin-bottom: 0.4rem;
  }
  .search-wrap input {
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 0.75rem;
    outline: none;
    width: 100%;
    font-weight: 600;
  }

  .options-list { flex: 1; overflow-y: auto; padding-right: 2px; }
  .options-list::-webkit-scrollbar { width: 4px; }
  .options-list::-webkit-scrollbar-thumb { background: var(--border-ui-heavy); border-radius: 4px; }

  .category-header {
    font-size: 0.55rem;
    font-weight: 900;
    text-transform: uppercase;
    color: var(--text-muted);
    letter-spacing: 0.1em;
    padding: 0.6rem 0.5rem 0.3rem 0.5rem;
  }

  .option {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.1s;
    text-align: left;
  }
  .option.highlighted { background: var(--bg-surface-solid); color: var(--text-primary); }
  .option.selected { color: var(--accent); font-weight: 800; }
  
  .opt-main { display: flex; align-items: center; gap: 0.6rem; font-size: 0.75rem; }

  .no-results { padding: 1.5rem; text-align: center; font-size: 0.7rem; color: var(--text-muted); font-style: italic; }

  .fade-in { animation: fadeIn 0.15s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
</style>
