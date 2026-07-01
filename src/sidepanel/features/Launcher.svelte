<script lang="ts">
  import { Plus, Search, GripVertical, MousePointer2, ShieldCheck, Layers } from '@lucide/svelte';
  import { FlowPilotRegistry } from '$framework/Registry';
  import * as Icons from '@lucide/svelte';
  import Button from '$sidepanel/components/Button.svelte';
  import { onMount } from 'svelte';
  
  export let onDragStart: (type: string, e: DragEvent) => void;
  export let onScan: () => void = () => {};
  export let onPicker: () => void = () => {};

  let isOpen = false;
  let isDragging = false;
  let searchTerm = '';
  const registry = FlowPilotRegistry.getInstance();
  
  $: manifests = registry.getAllManifests();

  // High-discoverability specialized nodes (mapped to INTERACT runtime)
  const specializedNodes: any[] = [
    { 
      type: 'ASSERT_VISIBLE', 
      label: 'Assert Visible', 
      description: 'Verifies an element is visible on the page before proceeding.', 
      category: 'Interaction', 
      icon: 'ShieldCheck', 
      version: 1,
      isSpecialized: true,
      runtimeType: 'INTERACT',
      initialState: { interactType: 'assert-visible' }
    },
    { 
      type: 'EXTRACT_TEXT', 
      label: 'Extract Text', 
      description: 'Captures text content from a page element into a variable.', 
      category: 'Interaction', 
      icon: 'Layers', 
      version: 1,
      isSpecialized: true,
      runtimeType: 'INTERACT',
      initialState: { interactType: 'extract-text' }
    }
  ];

  $: allAvailableNodes = [...manifests, ...specializedNodes];
  
  $: filteredManifests = allAvailableNodes.filter(m => 
    m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  $: categories = [...new Set(allAvailableNodes.map(m => m.category))];

  function getIcon(name: string) {
    return (Icons as any)[name] || Icons.HelpCircle;
  }

  function handleDragStart(node: any, e: DragEvent) {
    if (e.dataTransfer) {
      isDragging = true;
      // For specialized nodes, we need to pass the real runtime type
      const type = node.isSpecialized ? node.runtimeType : node.type;
      e.dataTransfer.setData('node-type', type);
      
      // Store specialized state if needed (handled by handleDropNode in Editor)
      if (node.isSpecialized) {
        e.dataTransfer.setData('node-state-override', JSON.stringify(node.initialState));
        e.dataTransfer.setData('node-label-override', node.label);
      }
      
      e.dataTransfer.effectAllowed = 'copy';
      
      // Also call the prop callback for any side-effects
      if (onDragStart) onDragStart(type, e);

      // Reset state on drag end
      const onDragEnd = () => {
        isDragging = false;
        isOpen = false;
        window.removeEventListener('dragend', onDragEnd);
      };
      window.addEventListener('dragend', onDragEnd);
    }
  }

  let container: HTMLDivElement;

  function handleClickOutside(event: MouseEvent) {
    if (isOpen && container && !container.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  $: if (isOpen) {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousedown', handleClickOutside);
    }
  } else {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousedown', handleClickOutside);
    }
  }

  onMount(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousedown', handleClickOutside);
      }
    };
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  bind:this={container}
  class="launcher-shell" 
  role="navigation"
  aria-label="Node Toolbox"
>
  <button 
    class="hub-btn" 
    class:active={isOpen} 
    on:click={() => isOpen = !isOpen} 
    aria-label="Open Toolbox"
  >
    <Plus size={24} />
    <div class="pulse-ring"></div>
  </button>

  {#if isOpen}
    <div class="launcher-panel fade-in" style="background: var(--bg-surface);" role="dialog" aria-modal="true">
      <div class="tool-belt">
        <Button variant="picker" on:click={onPicker} size="sm" fullWidth>
          <MousePointer2 slot="icon" size={14} />
          Element Picker
        </Button>
        <Button variant="scan" on:click={onScan} size="sm" fullWidth>
          <Search slot="icon" size={14} />
          Full Page Scan
        </Button>
      </div>

      <div class="search-header">
        <Search size={14} class="text-muted" />
        <input type="text" bind:value={searchTerm} placeholder="Search nodes..." />
      </div>

      <div class="nodes-grid">
        {#each categories as cat}
          {@const catNodes = filteredManifests.filter(m => m.category === cat)}
          {#if catNodes.length > 0}
            <section class="category-section">
              <div class="cat-label">{cat}</div>
              <div class="node-list" role="list">
                {#each catNodes as node}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div 
                    class="node-item" 
                    draggable="true"
                    role="listitem"
                    on:dragstart={(e) => handleDragStart(node, e)}
                  >
                    <div class="node-icon-wrap">
                      <svelte:component this={getIcon(node.icon)} size={18} />
                    </div>
                    <div class="node-info">
                      <div class="node-header-row">
                        <span class="node-label">{node.label}</span>
                        <span class="node-v">v{node.version}</span>
                      </div>
                      {#if node.description}
                        <p class="node-desc">{node.description}</p>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </section>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .launcher-shell { position: fixed; bottom: 2rem; left: 2rem; z-index: 1000; }
  
  .hub-btn { width: 60px; height: 60px; border-radius: 50%; background: var(--accent); color: white; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 0 20px var(--accent-glow); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; }
  .hub-btn:hover, .hub-btn.active { transform: scale(1.1) rotate(45deg); background: var(--text-primary); }
  
  .pulse-ring { position: absolute; inset: -4px; border: 2px solid var(--accent); border-radius: 50%; animation: pulse 2s infinite; opacity: 0; }
  @keyframes pulse { 0% { transform: scale(0.95); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }

  .launcher-panel { 
    position: absolute; 
    bottom: calc(100% + 1.5rem); 
    left: 0; 
    width: 340px; 
    max-height: 560px; 
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(40px) saturate(160%) brightness(120%);
    -webkit-backdrop-filter: blur(40px) saturate(160%) brightness(120%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    border-left: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 2.25rem; 
    box-shadow: 
      0 40px 80px rgba(0, 0, 0, 0.6),
      inset 0 0 40px rgba(255, 255, 255, 0.02);
    display: flex; 
    flex-direction: column; 
    overflow: hidden; 
    z-index: 2000;
    animation: floating-glow 4s infinite alternate ease-in-out;
  }

  @keyframes floating-glow {
    from { box-shadow: 0 40px 80px rgba(0, 0, 0, 0.6), inset 0 0 40px rgba(255, 255, 255, 0.02); }
    to { box-shadow: 0 40px 80px rgba(0, 0, 0, 0.6), inset 0 0 60px rgba(59, 130, 246, 0.1); }
  }

  .tool-belt { 
    display: flex; 
    flex-direction: column; 
    gap: 0.6rem; 
    padding: 1.5rem; 
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08); 
  }

  .search-header { 
    display: flex; 
    align-items: center; 
    gap: 0.75rem; 
    padding: 1.25rem 1.5rem; 
    border-bottom: 1px solid rgba(255, 255, 255, 0.08); 
  }
  .search-header input { background: none; border: none; color: var(--text-primary); font-size: 0.85rem; font-weight: 600; outline: none; flex: 1; }

  .nodes-grid { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 1.5rem; }
  .cat-label { font-size: 0.6rem; font-weight: 900; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.1em; margin-bottom: 0.75rem; }

  .node-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .node-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 12px; cursor: grab; transition: all 0.2s; }
  .node-item:hover { border-color: var(--accent); background: var(--bg-card-hover); transform: translateY(-2px); }
  .node-item:active { cursor: grabbing; }

  .node-icon-wrap { width: 36px; height: 36px; background: var(--accent-glow); color: var(--accent); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .node-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .node-header-row { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
  .node-label { font-size: 0.8rem; font-weight: 800; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .node-desc { font-size: 0.65rem; color: var(--text-muted); margin: 0.1rem 0 0 0; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .node-v { font-size: 0.55rem; color: var(--text-muted); opacity: 0.5; font-weight: 800; }
  
  .fade-in { animation: fadeIn 0.2s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
