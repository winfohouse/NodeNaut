<script lang="ts">
  import { Bell, AlertTriangle, Play } from '@lucide/svelte';
  import EditableLabel from '$sidepanel/components/EditableLabel.svelte';
  import Button from '$sidepanel/components/Button.svelte';

  export let node: any;
  export let save: () => void;
  export let testAction: (node: any) => Promise<void>;

  function updateField(key: string, value: any) {
    if (!node.state) node.state = {};
    node.state[key] = value;
    node = node;
    save();
  }
</script>

<div class="node-config-plugin">
  <div class="selector-row">
    <EditableLabel 
      value={node.metadata?.label || 'Notify Me'} 
      onSave={(nv) => { node.metadata.label = nv; save(); }} 
    />
  </div>

  <div class="config-section">
    <div class="field-label">Notification Type</div>
    <div class="pill-group">
      <button 
        class="pill-btn" 
        class:active={(node.state?.type || 'system') === 'system'} 
        on:click={() => updateField('type', 'system')}
      >
        <Bell size={12} />
        <span>System Push</span>
      </button>
      <button 
        class="pill-btn" 
        class:active={node.state?.type === 'alert'} 
        on:click={() => updateField('type', 'alert')}
      >
        <AlertTriangle size={12} />
        <span>Browser Alert</span>
      </button>
    </div>
  </div>

  <div class="config-section">
    <div class="field-label">Title</div>
    <input 
      type="text" 
      class="config-input" 
      value={node.state?.title || ''} 
      on:input={(e) => updateField('title', e.currentTarget.value)}
      placeholder="e.g. Workflow Done"
    />
  </div>

  <div class="config-section">
    <div class="field-label">Message</div>
    <textarea 
      class="config-textarea" 
      rows="3"
      value={node.state?.message || ''} 
      on:input={(e) => updateField('message', e.currentTarget.value)}
      placeholder="Supports expressions like: Finished fetching {'{{$row[\'Name\']}}'}"
    ></textarea>
  </div>

  <div class="action-footer">
    <Button variant="picker" size="sm" on:click={() => testAction(node)} fullWidth>
      <Play slot="icon" size={12} />
      Test Notification
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
  
  .config-textarea { width: 100%; padding: 0.5rem 0.75rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 8px; color: var(--text-primary); font-size: 0.75rem; resize: vertical; min-height: 60px; font-family: inherit; transition: border-color 0.2s; }
  .config-textarea:focus { border-color: var(--accent); outline: none; }

  .pill-group { display: flex; gap: 0.5rem; background: var(--bg-surface-solid); padding: 0.25rem; border-radius: 8px; border: 1px solid var(--border-ui); }
  .pill-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.35rem; padding: 0.4rem 0.5rem; border-radius: 6px; border: none; background: transparent; color: var(--text-muted); font-size: 0.65rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
  .pill-btn:hover { color: var(--text-primary); }
  .pill-btn.active { background: var(--accent); color: white; box-shadow: 0 2px 8px var(--accent-glow); }

  .action-footer { margin-top: 0.5rem; }
</style>
