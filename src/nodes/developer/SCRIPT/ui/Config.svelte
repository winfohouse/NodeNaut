<script lang="ts">
  import { Code, Play, ExternalLink } from '@lucide/svelte';
  import EditableLabel from '$sidepanel/components/EditableLabel.svelte';

  export let node: any;
  export let save: () => void;
  export let testAction: (node: any) => void;

  function handleOpenIDE() {
    // Dispatch custom event that WorkflowEditor listens for
    const event = new CustomEvent('openIDE', { detail: node.id, bubbles: true });
    document.dispatchEvent(event);
  }
</script>

<div class="node-config-plugin">
  <div class="selector-row">
    <EditableLabel 
      value={node.metadata?.label || 'FlowScript Logic'} 
      onSave={(nv) => { node.metadata.label = nv; save(); }} 
    />
  </div>

  <div class="payload-wrap">
    <div class="payload-header">
      <Code size={10} />
      <span>Logic Fragment</span>
    </div>
    
    <div class="script-preview-box">
      <code class="preview-text">
        {(node.state.code || '// Write logic...').split('\n')[0]}...
      </code>
      <div class="preview-actions">
        <button class="expand-btn" on:click={() => testAction(node)} title="Verify Logic Syntax">
          Verify Syntax
        </button>
        <button class="expand-btn primary" on:click={handleOpenIDE} title="Open full screen Monaco IDE">
          <ExternalLink size={12} />
          Open Full IDE
        </button>
      </div>
    </div>
    <span class="hint-text">Advanced logic is executed within the Neural Sandbox.</span>
  </div>
</div>

<style>
  .node-config-plugin { display: flex; flex-direction: column; gap: 1rem; }
  .selector-row { display: flex; flex-direction: column; gap: 0.5rem; }
  .payload-wrap { background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 12px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .payload-header { display: flex; align-items: center; gap: 0.5rem; font-size: 0.55rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; }
  
  .script-preview-box { background: var(--bg-card); border: 1px solid var(--border-ui); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .preview-text { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--text-primary); opacity: 0.8; }
  
  .preview-actions { display: flex; gap: 0.5rem; }
  .expand-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); color: var(--text-primary); border-radius: 6px; padding: 0.4rem 0.8rem; font-size: 0.65rem; font-weight: 800; cursor: pointer; transition: all 0.2s; }
  .expand-btn.primary { background: var(--accent); color: white; border-color: var(--accent); }
  .expand-btn:hover { border-color: var(--accent); background: var(--accent-glow); color: var(--accent); }
  .expand-btn.primary:hover { background: var(--text-primary); color: white; border-color: var(--text-primary); }

  .hint-text { font-size: 0.6rem; color: var(--text-muted); font-style: italic; }
</style>
