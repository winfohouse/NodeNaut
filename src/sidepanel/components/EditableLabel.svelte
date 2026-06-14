<script lang="ts">
  export let value: string;
  export let subValue: string | undefined = undefined;
  export let onSave: (newValue: string) => void;

  let isEditing = false;
  let tempValue = value;

  function focus(node: HTMLInputElement) {
    node.focus();
  }

  function startEdit() {
    tempValue = value;
    isEditing = true;
  }

  function handleSave() {
    isEditing = false;
    if (tempValue !== value) {
      onSave(tempValue);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      isEditing = false;
      tempValue = value;
    }
  }
</script>

<div 
  class="editable-label-container" 
  on:dblclick={startEdit} 
  on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && startEdit()}
  role="button" 
  tabindex="0"
  aria-label="Rename {value}"
>
  {#if isEditing}
    <input
      use:focus
      type="text"
      class="inline-edit"
      bind:value={tempValue}
      on:blur={handleSave}
      on:keydown={handleKeyDown}
    />
  {:else}
    <span class="main-text" title="Double-click to rename">{value || 'Unnamed Step'}</span>
    {#if subValue}
      <span class="sub-text">({subValue})</span>
    {/if}
  {/if}
</div>

<style>
  .editable-label-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 1.2rem;
    cursor: pointer;
    width: 100%;
  }

  .main-text {
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--accent);
    border-bottom: 1px dashed transparent;
    transition: all 0.2s;
  }

  .editable-label-container:hover .main-text {
    border-bottom-color: var(--accent);
  }

  .sub-text {
    font-size: 0.6rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .inline-edit {
    background: var(--bg-surface-solid) !important;
    border: 1px solid var(--accent) !important;
    border-radius: 4px !important;
    padding: 0.1rem 0.4rem !important;
    font-size: 0.75rem !important;
    font-weight: 800 !important;
    color: var(--accent) !important;
    width: 100%;
    outline: none;
  }
</style>
