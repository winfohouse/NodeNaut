<script lang="ts">
  import { Eye, Search, Info, Trash2, ShieldCheck } from '@lucide/svelte';
  import { Messenger } from '$shared/api/messenger';
  import { MessageType } from '$shared/constants/messages';
  import type { ScannedField } from '$shared/types/scanner';
  import Button from '../components/Button.svelte';

  let scannedFields: ScannedField[] = [];
  let isScanning = false;
  let scanError: string | null = null;

  async function scanPage() {
    isScanning = true;
    scanError = null;
    const response = await Messenger.send(MessageType.DOM_SCAN, {});
    
    if (response.success) {
      scannedFields = response.data;
    } else {
      console.error('Scan failed:', response.error);
      scanError = response.error?.message || 'Connection failed. Try refreshing the page.';
    }
    isScanning = false;
  }

  async function highlightField(selector: string) {
    await Messenger.send('DOM_HIGHLIGHT' as any, { selector });
  }
</script>

<div class="view-container">
  <header class="view-header">
    <div class="header-text">
      <h2>Smart Senses</h2>
      <p>Analyze the neural structure of the current page.</p>
    </div>
    <Button variant="primary" glow on:click={scanPage} loading={isScanning}>
      <Search slot="icon" size={16} />
      Initialize Scan
    </Button>
  </header>

  {#if scanError}
    <div class="alert alert-error glass">
      <Info size={16} />
      <p>{scanError}</p>
    </div>
  {/if}

  <div class="results-container">
    {#if scannedFields.length > 0}
      <div class="results-header">
        <h3>Detected Nodes ({scannedFields.length})</h3>
        <button class="text-btn" on:click={() => scannedFields = []}>
          <Trash2 size={12} />
          <span>Purge</span>
        </button>
      </div>
      <div class="fields-list">
        {#each scannedFields as field}
          <div class="field-card glass">
            <div class="field-main">
              <div class="field-status {field.type.toLowerCase()}"></div>
              <div class="field-details">
                <span class="field-label">{field.label}</span>
                <span class="field-meta">
                  {field.type} 
                  {#if field.selectors?.length > 1}
                    <span class="healing-capable"><ShieldCheck size={10} /> Healing Active</span>
                  {/if}
                </span>
              </div>
            </div>
            <button class="icon-btn highlight" on:click={() => highlightField(field.selectors?.[0]?.selector)}>
              <Eye size={16} />
            </button>
          </div>
        {/each}
      </div>
    {:else if !isScanning}
      <div class="empty-state glass">
        <Search size={32} color="var(--border-ui)" />
        <p>No active scan data.</p>
        <span class="hint">Deploy the scanner to map the environment.</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .view-container { padding-bottom: 5rem; }
  .view-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; border-bottom: 1px solid var(--border-ui); padding-bottom: 1rem; }
  .header-text h2 { font-size: 1.25rem; font-weight: 900; color: var(--text-primary); margin: 0; letter-spacing: -0.02em; }
  .header-text p { font-size: 0.75rem; color: var(--text-secondary); margin: 0.25rem 0 0 0; font-weight: 500; }

  .alert { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border-radius: 1rem; margin-bottom: 1.5rem; background: var(--accent-glow); color: var(--status-error); border: 1px solid var(--border-ui); font-size: 0.75rem; font-weight: 600; }

  .results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .results-header h3 { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin: 0; letter-spacing: 0.05em; }

  .field-card.glass { 
    background: var(--bg-card); 
    backdrop-filter: blur(8px); 
    border: 1px solid var(--border-ui); 
    padding: 1rem; 
    border-radius: 1rem; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    margin-bottom: 0.75rem; 
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
    box-shadow: var(--shadow-elite);
  }
  .field-card:hover { background: var(--bg-card-hover); transform: translateX(4px); border-color: var(--accent); }

  .field-main { display: flex; align-items: center; gap: 1rem; }
  .field-status { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); box-shadow: 0 0 6px var(--border-ui); }
  .field-status.text { background: var(--accent); box-shadow: 0 0 8px var(--accent-glow); }
  .field-status.password { background: var(--status-error); box-shadow: 0 0 8px var(--status-error); }
  .field-status.button, .field-status.submit { background: var(--status-success); box-shadow: 0 0 8px var(--status-success); }

  .field-details { display: flex; flex-direction: column; gap: 0.1rem; }
  .field-label { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); }
  .field-meta { font-size: 0.6rem; color: var(--text-secondary); text-transform: uppercase; display: flex; align-items: center; gap: 0.5rem; font-weight: 700; }
  
  .healing-capable { color: var(--status-success); font-weight: 800; display: flex; align-items: center; gap: 0.25rem; }

  .icon-btn { background: var(--border-ui); border: 1px solid var(--border-ui); color: var(--text-muted); cursor: pointer; padding: 0.5rem; border-radius: 0.75rem; transition: all 0.2s; }
  .icon-btn:hover { color: var(--accent); background: var(--accent-glow); border-color: var(--accent); }

  .empty-state.glass { text-align: center; padding: 4rem 1rem; border: 1px dashed var(--border-ui); border-radius: 1.5rem; color: var(--text-muted); background: var(--bg-card); }
  .empty-state p { font-size: 0.9rem; font-weight: 800; color: var(--text-secondary); margin: 1rem 0 0.25rem 0; }
  .hint { font-size: 0.7rem; font-weight: 500; }

  .text-btn { background: none; border: none; color: var(--text-muted); font-size: 0.65rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; text-transform: uppercase; transition: color 0.2s; }
  .text-btn:hover { color: var(--status-error); }
</style>
