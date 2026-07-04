<script lang="ts">
  import { onMount } from 'svelte';
  import { FlowPilotRegistry } from '$framework/Registry';
  import { X, AlertTriangle } from '@lucide/svelte';
  
  // Standardizing on Svelte 5 prop-based callbacks for high-performance and minification safety
  export let nodes: any[] = [];
  export let edges: any[] = [];
  export let selectedNodeId: string | null = null;
  export let selectedEdgeId: string | null = null;
  export let previews: Record<string, string> = {};
  export let validationErrors: Record<string, string[]> = {};

  // Panning/Zooming
  export let panX = 0;
  export let panY = 0;
  export let zoom = 1;

  // --- Prop-based Callbacks (Replaces dispatch) ---
  export let onNodeClick: (id: string) => void = () => {};
  export let onNodeDblClick: (id: string) => void = () => {};
  export let onEdgeClick: (id: string) => void = () => {};
  export let onDeleteNode: (id: string) => void = () => {};
  export let onDeleteEdge: (id: string) => void = () => {};
  export let onToggleEdgeMode: (id: string) => void = () => {};
  export let onConnect: (data: { sourceId: string, targetId: string, portId: string }) => void = () => {};
  export let onDrop: (data: { type: string, x: number, y: number, stateOverride?: string, labelOverride?: string }) => void = () => {};
  export let onSave: () => void = () => {};
  export let onDeselectAll: () => void = () => {};

  let isPanning = false;
  let draggingNodeId: string | null = null;
  let activeWiringSource: { nodeId: string, portId: string } | null = null;
  let lastMouse = { x: 0, y: 0 };
  let mousePos = { x: 0, y: 0 };
  let canvasEl: HTMLElement;
  let nodeHeights: Record<string, number> = {};

  const registry = FlowPilotRegistry.getInstance();

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      zoom = Math.max(0.2, Math.min(3, zoom - e.deltaY * 0.005));
    } else {
      panX -= e.deltaX;
      panY -= e.deltaY;
    }
  }

  function startPan(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.node-container, .edge-group, .edge-controls')) return;
    isPanning = true;
    lastMouse = { x: e.clientX, y: e.clientY };
    onDeselectAll?.();
  }

  function handleNodeDragStart(id: string, e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.port')) return;
    draggingNodeId = id;
    lastMouse = { x: e.clientX, y: e.clientY };
    onNodeClick?.(id);
  }

  function startWire(nodeId: string, portId: string, e: MouseEvent) {
    e.stopPropagation();
    activeWiringSource = { nodeId, portId };
    mousePos = getRelativeMouse(e);
  }

  function finalizeWire(targetNodeId: string) {
    if (!activeWiringSource || activeWiringSource.nodeId === targetNodeId) {
      activeWiringSource = null;
      return;
    }

    onConnect?.({
      sourceId: activeWiringSource.nodeId,
      targetId: targetNodeId,
      portId: activeWiringSource.portId
    });

    activeWiringSource = null;
  }

  function getRelativeMouse(e: MouseEvent) {
    if (!canvasEl) return { x: 0, y: 0 };
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panX) / zoom,
      y: (e.clientY - rect.top - panY) / zoom
    };
  }

  function handleMousemove(e: MouseEvent) {
    if (isPanning) {
      panX += e.clientX - lastMouse.x;
      panY += e.clientY - lastMouse.y;
      lastMouse = { x: e.clientX, y: e.clientY };
    } else if (draggingNodeId) {
      const node = nodes.find(n => n.id === draggingNodeId);
      if (node) {
        node.position.x += (e.clientX - lastMouse.x) / zoom;
        node.position.y += (e.clientY - lastMouse.y) / zoom;
        nodes = [...nodes];
      }
      lastMouse = { x: e.clientX, y: e.clientY };
    }

    if (activeWiringSource) {
      mousePos = getRelativeMouse(e);
    }
  }

  function stopInteraction() {
    if (draggingNodeId) {
      onSave?.();
    }
    isPanning = false;
    draggingNodeId = null;
    activeWiringSource = null;
  }

  function getNodeHeight(id: string) {
    return nodeHeights[id] || 100;
  }

  let dragMousePos = { x: 0, y: 0 };

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.clientX !== 0 || e.clientY !== 0) {
      dragMousePos = getRelativeMouse(e as unknown as MouseEvent);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer?.getData('node-type');
    if (!type) return;

    let coords;
    if (e.clientX === 0 && e.clientY === 0) {
      coords = dragMousePos;
    } else {
      coords = getRelativeMouse(e as unknown as MouseEvent);
    }

    onDrop?.({ 
      type, 
      x: coords.x, 
      y: coords.y,
      stateOverride: e.dataTransfer?.getData('node-state-override') || undefined,
      labelOverride: e.dataTransfer?.getData('node-label-override') || undefined
    });
  }

  function getPath(edge: any) {
    const source = nodes.find(n => n.id === edge.sourceNodeId);
    const target = nodes.find(n => n.id === edge.targetNodeId);
    if (!source || !target) return '';
    
    const manifest = registry.getManifest(source.type);
    const portIndex = manifest?.ports.outputs.indexOf(edge.type) || 0;
    const portCount = manifest?.ports.outputs.length || 1;

    const h = getNodeHeight(source.id);
    const sx = source.position.x + (portCount > 1 ? (portIndex + 1) * (300 / (portCount + 1)) : 150); 
    const sy = source.position.y + h; 
    const tx = target.position.x + 150;
    const ty = target.position.y;
    
    return `M ${sx} ${sy} C ${sx} ${sy + 50}, ${tx} ${ty - 50}, ${tx} ${ty}`;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedNodeId) onDeleteNode?.(selectedNodeId);
      if (selectedEdgeId) onDeleteEdge?.(selectedEdgeId);
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div 
  class="canvas-viewport" 
  bind:this={canvasEl}
  role="application"
  aria-label="Workflow Canvas Graph"
  tabindex="0"
  on:wheel|preventDefault={handleWheel}
  on:mousedown={startPan}
  on:mousemove={handleMousemove}
  on:mouseup={stopInteraction}
  on:mouseleave={stopInteraction}
  on:keydown={handleKeydown}
  on:dragover={handleDragOver}
  on:drop={handleDrop}
>
  <svg class="edges-layer" width="100%" height="100%">
    <g transform="translate({panX}, {panY}) scale({zoom})">
      {#each edges as edge (edge.id)}
        {@const sourceNode = nodes.find(n => n.id === edge.sourceNodeId)}
        {@const outgoingCount = edges.filter(e => e.sourceNodeId === edge.sourceNodeId && e.type === edge.type).length}
        <g class="edge-group" on:mousedown|stopPropagation={() => onEdgeClick?.(edge.id)}>
          <path 
            d={getPath(edge)} 
            class="edge-path"
            class:selected={selectedEdgeId === edge.id}
            stroke={sourceNode?.type === 'IF_BRANCH' ? (edge.type === 'true' ? 'var(--status-success)' : 'var(--status-error)') : (edge.type === 'failure' ? 'var(--status-error)' : 'var(--text-muted)')} 
          />
          <path d={getPath(edge)} class="edge-interaction" />
          
          {#if outgoingCount > 1 || (edge.mode && edge.mode !== 'MAIN')}
            {@const h = getNodeHeight(edge.sourceNodeId)}
            <foreignObject 
              x={(nodes.find(n => n.id === edge.sourceNodeId)?.position.x || 0) + 50} 
              y={(nodes.find(n => n.id === edge.sourceNodeId)?.position.y || 0) + h + 10} 
              width="200" height="40"
            >
              <div class="edge-controls">
                <button 
                  class="edge-pill {edge.mode?.toLowerCase() || 'main'}"
                  on:mousedown|stopPropagation={() => onToggleEdgeMode?.(edge.id)}
                  title="Toggle Threading Mode"
                >
                  {edge.mode || 'MAIN'}
                </button>
                <button 
                  class="edge-breaker" 
                  on:mousedown|stopPropagation={() => onDeleteEdge?.(edge.id)}
                  title="Break Connection"
                >
                  <X size={10} />
                </button>
              </div>
            </foreignObject>
          {/if}
        </g>
      {/each}

      {#if activeWiringSource}
        {@const sourceNode = nodes.find(n => n.id === activeWiringSource?.nodeId)}
        {@const manifest = registry.getManifest(sourceNode.type)}
        {@const portIndex = manifest?.ports.outputs.indexOf(activeWiringSource.portId) || 0}
        {@const portCount = manifest?.ports.outputs.length || 1}
        {@const h = getNodeHeight(sourceNode.id)}
        {@const sx = sourceNode.position.x + (portCount > 1 ? (portIndex + 1) * (300 / (portCount + 1)) : 150)}
        {@const sy = sourceNode.position.y + h}
        <path 
          d={`M ${sx} ${sy} C ${sx} ${sy + 50}, ${mousePos.x} ${mousePos.y - 50}, ${mousePos.x} ${mousePos.y}`}
          stroke="var(--accent)"
          stroke-width="2"
          stroke-dasharray="5,5"
          fill="none"
        />
      {/if}
    </g>
  </svg>

  <div class="nodes-layer" style="transform: translate({panX}px, {panY}px) scale({zoom})">
    {#each nodes as node (node.id)}
      {@const manifest = registry.getManifest(node.type)}
      {@const ViewComponent = registry.getView(node.type)}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div 
        class="node-container" 
        role="button"
        tabindex="0"
        aria-label="Node: {manifest?.label || node.type}"
        style="left: {node.position.x}px; top: {node.position.y}px;"
        class:selected={selectedNodeId === node.id}
        bind:clientHeight={nodeHeights[node.id]}
        on:mousedown|stopPropagation={(e) => handleNodeDragStart(node.id, e)}
        on:dblclick|stopPropagation={() => onNodeDblClick?.(node.id)}
        on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && onNodeClick?.(node.id)}
        >
        <div class="plugin-view-mount">
          {#if ViewComponent}
            <svelte:component this={ViewComponent} {node} preview={previews[node.id]} />
          {:else}
            <span class="fallback-label">{manifest?.label || node.type}</span>
          {/if}
        </div>

        {#if validationErrors[node.id] && validationErrors[node.id].length > 0}
          <div class="node-warning-badge" title={validationErrors[node.id].join('\n')}>
            <AlertTriangle size={12} />
          </div>
        {/if}

        <button 
          class="port input-port" 
          title="Input Port"
          on:mouseup|stopPropagation={() => finalizeWire(node.id)}
        ></button>

        {#if manifest?.ports.outputs}
          {#each manifest.ports.outputs as port, i}
             <button 
                class="port output-port" 
                class:if-true={port === 'true' || port === 'success'}
                class:if-false={port === 'false' || port === 'failure'}
                style="left: {(i + 1) * (100 / (manifest.ports.outputs.length + 1))}%"
                on:mousedown|stopPropagation={(e) => startWire(node.id, port, e)}
                title="Output: {port}"
              >
                {#if manifest.ports.outputs.length > 1}
                  <span class="port-label">{port}</span>
                {/if}
              </button>
          {/each}
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .canvas-viewport { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--bg-surface); cursor: grab; background-image: radial-gradient(var(--border-ui-heavy) 1px, transparent 1px); background-size: 20px 20px; border: none; padding: 0; margin: 0; display: block; outline: none; }
  .canvas-viewport:active { cursor: grabbing; }
  .edges-layer { position: absolute; inset: 0; pointer-events: none; }
  .edge-group { pointer-events: auto; cursor: pointer; }
  .edge-path { fill: none; stroke-width: 3; opacity: 0.6; transition: all 0.2s; }
  .edge-path.selected { stroke: var(--accent); stroke-width: 5; opacity: 1; filter: drop-shadow(0 0 5px var(--accent-glow)); }
  .edge-interaction { fill: none; stroke: transparent; stroke-width: 20; }
  
  .edge-controls { display: flex; align-items: center; gap: 0.25rem; justify-content: center; }
  .edge-pill { background: var(--bg-surface-solid); border: 1px solid var(--border-ui); padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.55rem; font-weight: 900; color: var(--text-muted); cursor: pointer; text-transform: uppercase; white-space: nowrap; transition: all 0.2s; }
  .edge-pill:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }
  .edge-pill.clone { color: var(--accent); border-color: var(--accent); background: var(--accent-glow); }
  .edge-pill.fresh { color: var(--status-warning); border-color: var(--status-warning); background: rgba(245, 158, 11, 0.05); }
  
  .edge-breaker { background: var(--status-error-glow); border: 1px solid var(--status-error); color: var(--status-error); width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; padding: 0; }
  .edge-breaker:hover { background: var(--status-error); color: white; transform: scale(1.1); }

  .nodes-layer { position: absolute; inset: 0; transform-origin: top left; pointer-events: none; }
  
  .node-container { 
    position: absolute; 
    width: 300px; 
    min-height: 100px; 
    height: auto;
    padding: 0 0 2rem 0; 
    margin: 0; 
    background: var(--bg-card); 
    border: 1px solid var(--border-ui); 
    border-radius: 1.25rem; 
    pointer-events: auto; 
    box-shadow: var(--shadow-elite); 
    cursor: pointer; 
    text-align: left; 
    font-family: inherit; 
    font-size: inherit; 
    color: inherit; 
    appearance: none; 
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s; 
    box-sizing: border-box; 
    overflow: visible;
    display: flex;
    flex-direction: column;
  }
  .node-container:hover { border-color: var(--accent); transform: translateY(-2px); }
  .node-container.selected { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent), var(--shadow-elite); outline: none; }

  .plugin-view-mount { flex: 1; display: flex; flex-direction: column; }

  .port { position: absolute; width: 12px; height: 12px; background: var(--bg-surface-solid); border: 2px solid var(--text-muted); border-radius: 50%; cursor: crosshair; padding: 0; z-index: 100; }
  .port:hover { border-color: var(--accent); background: var(--accent-glow); transform: translateX(-50%) scale(1.2); }
  .input-port { top: -6px; left: 50%; transform: translateX(-50%); }
  .output-port { bottom: -6px; transform: translateX(-50%); }

  .output-port.if-true { border-color: var(--status-success); }
  .output-port.if-false { border-color: var(--status-error); }
  
  .port-label { position: absolute; top: -16px; left: 50%; transform: translateX(-50%); font-size: 0.5rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; white-space: nowrap; }
  .if-true .port-label { color: var(--status-success); }
  .if-false .port-label { color: var(--status-error); }

  .node-warning-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: var(--status-error);
    color: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 8px rgba(220, 38, 38, 0.6);
    z-index: 50;
    cursor: help;
    animation: node-warn-pulse 2s infinite;
  }

  @keyframes node-warn-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.15); box-shadow: 0 0 12px rgba(220, 38, 38, 0.9); }
    100% { transform: scale(1); }
  }
</style>
