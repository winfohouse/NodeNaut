<script lang="ts">
  import { liveQuery } from 'dexie';
  import { db } from '$shared/services/db';
  import { Play, Plus, Trash2, Circle, Square, Edit3, Database, Download, Upload, MousePointer2, Code, Clock, Type } from '@lucide/svelte';
  import { Messenger } from '$shared/api/messenger';
  import { MessageType } from '$shared/constants/messages';
  import Button from '../components/Button.svelte';

  export let onEdit: (id: string) => void;

  const workflows = liveQuery(async () => {
    const list = await db.workflows.toArray();
    return list.filter(w => !w.settings?.is_bundle);
  });
  const workflowCount = liveQuery(async () => {
    const list = await db.workflows.toArray();
    return list.filter(w => !w.settings?.is_bundle).length;
  });

  let recordingId: string | null = null;
  let fileInput: HTMLInputElement;
  let selectedIds = new Set<string>();
  let isDragging = false;

  $: isSelectionMode = selectedIds.size > 0;

  async function processFile(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const payload = JSON.parse(e.target?.result as string);
        
        // Handle combined Node Bundle (.flowbundle) package
        if (payload.manifest && payload.workflow) {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const stored = await chrome.storage.local.get('node_bundles');
            const nodeBundles = stored.node_bundles || [];
            const exists = nodeBundles.some((b: any) => b.id === payload.manifest.id);
            let updated;
            if (exists) {
              if (!confirm(`A Node Bundle with ID "${payload.manifest.id}" already exists. Overwrite?`)) return;
              updated = nodeBundles.map((b: any) => b.id === payload.manifest.id ? payload.manifest : b);
            } else {
              updated = [...nodeBundles, payload.manifest];
            }
            await chrome.storage.local.set({ node_bundles: updated });
          }
          await db.workflows.put(payload.workflow);
          alert(`Node Bundle "${payload.manifest.name}" imported successfully!`);
          return;
        }

        // Standard flow import
        payload.id = crypto.randomUUID();
        payload.created_at = Date.now();
        payload.updated_at = Date.now();
        await db.workflows.add(payload);
      } catch (err) {
        console.error('Import failed:', err);
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
  }

  async function handleImport(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    for (const file of Array.from(input.files)) await processFile(file);
    input.value = '';
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        if (file.name.endsWith('.nodenaut') || file.name.endsWith('.json')) {
          processFile(file);
        }
      }
    }
  }

  function toggleSelect(id: string) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    selectedIds = selectedIds;
  }

  async function bulkDelete() {
    if (!confirm(`DANGER: Permanently delete ${selectedIds.size} sequences?`)) return;
    for (const id of selectedIds) {
      await db.workflows.delete(id);
    }
    selectedIds.clear();
    selectedIds = selectedIds;
  }

  async function startWorkflow(workflowId: string) {
    await Messenger.send(MessageType.WORKFLOW_START, { workflowId });
  }

  async function toggleRecording(workflowId: string) {
    if (recordingId === workflowId) {
      await Messenger.send(MessageType.RECORDER_STOP, {});
      recordingId = null;
    } else {
      if (recordingId) await Messenger.send(MessageType.RECORDER_STOP, {});
      const response = await Messenger.send(MessageType.RECORDER_START, { workflowId });
      if (response.success) recordingId = workflowId;
    }
  }

  async function addNewWorkflow() {
    const id = crypto.randomUUID();
    await db.workflows.add({
      id,
      name: `New Sequence ${($workflowCount || 0) + 1}`,
      version: 1,
      graph: {
        nodes: [
          {
            id: 'start-node',
            type: 'START',
            position: { x: 250, y: 100 },
            isRoot: true,
            state: {}
          }
        ],
        edges: []
      },
      settings: {},
      created_at: Date.now(),
      updated_at: Date.now()
    });
    onEdit(id);
  }

  async function exportWorkflow(workflow: any) {
    const data = JSON.stringify(workflow, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name.replace(/\s+/g, '_').toLowerCase()}.nodenaut`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleConfirmDelete(id: string, name: string) {
    const input = prompt(`DANGER: To delete "${name}", type the name below:`);
    if (input === name) {
      await db.workflows.delete(id);
    } else if (input !== null) {
      alert('Delete failed: Name mismatch.');
    }
  }
</script>

<div 
  class="view-container" 
  class:dragging={isDragging}
  role="region"
  aria-label="Workflow Library"
  on:dragover|preventDefault={() => isDragging = true}
  on:dragleave|preventDefault={() => isDragging = false}
  on:drop|preventDefault={handleDrop}
>
  <input type="file" accept=".nodenaut,.json" multiple bind:this={fileInput} on:change={handleImport} style="display: none;" />
  
  <header class="view-header">
    <div class="header-text">
      <h2>Sequence Library</h2>
      <p>{isSelectionMode ? `${selectedIds.size} sequences selected` : 'Your collection of automated neural flows.'}</p>
    </div>
    <div class="header-actions">
      {#if isSelectionMode}
        <Button variant="ghost" on:click={() => { selectedIds.clear(); selectedIds = selectedIds; }}>Cancel</Button>
        <Button variant="danger" on:click={bulkDelete}>
          <Trash2 slot="icon" size={14} />
          Delete ({selectedIds.size})
        </Button>
      {:else}
        <Button variant="secondary" on:click={() => fileInput.click()}>
          <Upload slot="icon" size={14} />
          Import
        </Button>
        <Button variant="primary" glow on:click={addNewWorkflow}>
          <Plus slot="icon" size={16} />
          New Flow
        </Button>
      {/if}
    </div>
  </header>

  <div class="workflow-grid">
    {#if $workflows && $workflows.length > 0}
      {#each $workflows as workflow}
        <div class="workflow-card glass" class:selected={selectedIds.has(workflow.id)}>
          <div class="select-col">
            <button 
              class="checkbox-elite" 
              class:checked={selectedIds.has(workflow.id)} 
              on:click|stopPropagation={() => toggleSelect(workflow.id)}
              aria-label="Select sequence"
              role="checkbox"
              aria-checked={selectedIds.has(workflow.id)}
            ></button>
          </div>
          <div 
            class="workflow-info" 
            role="button"
            tabindex="0"
            on:click={() => onEdit(workflow.id)}
            on:keydown={(e) => e.key === 'Enter' && onEdit(workflow.id)}
          >
            <span class="workflow-name">{workflow.name}</span>
            <div class="workflow-step-preview">
              {#each (workflow.graph?.nodes || workflow.actions || []).slice(0, 5) as step}
                <div class="step-mini-icon" title={step.type}>
                  {#if step.type === 'CLICK'}<MousePointer2 size={10} />
                  {:else if step.type === 'TYPE'}<Type size={10} />
                  {:else if step.type === 'SCRIPT'}<Code size={10} />
                  {:else if step.type === 'WAIT'}<Clock size={10} />
                  {:else}<Circle size={10} />{/if}
                </div>
              {/each}
              {#if (workflow.graph?.nodes || workflow.actions || []).length > 5}
                <span class="more-steps">+{(workflow.graph?.nodes || workflow.actions || []).length - 5}</span>
              {/if}
            </div>
            <div class="workflow-tags">
              <span class="tag">{(workflow.graph?.nodes?.length || workflow.actions?.length || 0)} steps</span>
              {#if workflow.settings?.table_id}
                <span class="tag data"><Database size={10} /> Data Linked</span>
              {/if}
            </div>
          </div>
          <div class="workflow-actions">
            <button class="action-btn record" title="Record" class:active={recordingId === workflow.id} on:click={() => toggleRecording(workflow.id)}>
              {#if recordingId === workflow.id}<Square size={14} fill="currentColor" />{:else}<Circle size={14} fill="currentColor" />{/if}
            </button>
            <button class="action-btn" title="Export" on:click={() => exportWorkflow(workflow)}>
              <Download size={14} />
            </button>
            <button class="action-btn edit" title="Edit" on:click={() => onEdit(workflow.id)}>
              <Edit3 size={14} />
            </button>
            <button class="action-btn start" title="Execute" on:click={() => startWorkflow(workflow.id)}>
              <Play size={14} fill="currentColor" />
            </button>
            <button class="action-btn delete" title="Delete" on:click={() => handleConfirmDelete(workflow.id, workflow.name)}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      {/each}
    {:else}
      <div class="empty-state glass">
        <Plus size={32} color="rgba(255,255,255,0.05)" />
        <p>No sequences found.</p>
        <Button variant="ghost" on:click={addNewWorkflow}>Initialize First Flow</Button>
      </div>
    {/if}
  </div>
</div>

<style>
  .view-container { padding-bottom: 5rem; }
  .view-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; border-bottom: 1px solid var(--border-ui); padding-bottom: 1rem; }
  .header-text h2 { font-size: 1.25rem; font-weight: 900; color: var(--text-primary); margin: 0; letter-spacing: -0.02em; }
  .header-text p { font-size: 0.75rem; color: var(--text-secondary); margin: 0.25rem 0 0 0; font-weight: 500; }

  .workflow-grid { display: flex; flex-direction: column; gap: 0.75rem; }
  .workflow-card.glass { 
    background: var(--bg-card); 
    backdrop-filter: blur(8px); 
    border: 1px solid var(--border-ui); 
    padding: 1.25rem; 
    border-radius: 1.25rem; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1); 
    box-shadow: var(--shadow-elite);
  }
  .workflow-card:hover { 
    background: var(--bg-card-hover); 
    border-color: var(--accent); 
    transform: scale(1.02);
    box-shadow: 0 20px 40px -20px rgba(0,0,0,0.3);
  }

  .select-col { width: 24px; display: flex; align-items: center; justify-content: center; }
  .checkbox-elite { width: 18px; height: 18px; border: 2px solid var(--border-ui-heavy); border-radius: 6px; cursor: pointer; transition: all 0.2s; position: relative; background: none; padding: 0; }
  .checkbox-elite.checked { background: var(--accent); border-color: var(--accent); }
  .checkbox-elite.checked::after { content: '✓'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 900; }
  .workflow-card.selected { border-color: var(--accent); background: var(--accent-glow); }

  .workflow-info { flex: 1; cursor: pointer; display: flex; flex-direction: column; gap: 0.4rem; }
  .workflow-name { font-size: 0.9rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.01em; }
  
  .workflow-step-preview { display: flex; align-items: center; gap: 0.3rem; margin: 0.1rem 0; }
  .step-mini-icon { width: 18px; height: 18px; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); opacity: 0.6; }
  .more-steps { font-size: 0.55rem; font-weight: 900; color: var(--accent); background: var(--accent-glow); padding: 0.1rem 0.3rem; border-radius: 4px; margin-left: 0.2rem; }

  .workflow-tags { display: flex; gap: 0.5rem; }
  .tag { font-size: 0.6rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; background: var(--border-ui); padding: 0.15rem 0.5rem; border-radius: 6px; letter-spacing: 0.02em; }
  .tag.data { color: var(--accent); background: var(--accent-glow); display: flex; align-items: center; gap: 0.25rem; }

  .workflow-actions { display: flex; gap: 0.4rem; }
  .action-btn { background: var(--border-ui); border: 1px solid var(--border-ui); color: var(--text-muted); cursor: pointer; padding: 0.5rem; border-radius: 0.75rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
  .action-btn:hover { color: var(--text-primary); background: var(--border-ui-heavy); border-color: var(--accent); }
  .action-btn.start { color: var(--status-success); }
  .action-btn.start:hover { background: var(--status-success); color: white; border-color: var(--status-success); }
  .action-btn.record.active { color: white; background: var(--status-error); border-color: var(--status-error); animation: blink 1.5s infinite; }
  .action-btn.delete:hover { color: white; background: var(--status-error); border-color: var(--status-error); }

  @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }

  .empty-state.glass { text-align: center; padding: 5rem 2rem; border: 1px dashed var(--border-ui); border-radius: 2rem; color: var(--text-muted); background: var(--bg-card); }
  .empty-state p { font-weight: 800; color: var(--text-secondary); margin: 1rem 0 0.5rem 0; }
</style>
