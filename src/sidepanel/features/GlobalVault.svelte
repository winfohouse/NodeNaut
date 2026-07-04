<script lang="ts">
  import { db } from '$shared/services/db';
  import { VaultService, type VaultState } from '$shared/services/vault';
  import { 
    Database, Plus, Trash2, Lock, Unlock, ShieldCheck, 
    ShieldAlert, Key, Save, AlertTriangle, Eye, EyeOff,
    FileSpreadsheet, Hash, Settings, ChevronRight, ChevronLeft,
    Download, FileUp, Search, X
  } from '@lucide/svelte';
  import { liveQuery } from 'dexie';
  import { onMount } from 'svelte';
  import DataTable from '../components/DataTable.svelte';
  import Button from '../components/Button.svelte';
  import Papa from 'papaparse';

  let globalTables = liveQuery(() => db.global_tables.toArray());
  let selectedTableId: string | null = null;
  
  // UI States
  let activeView: 'LIST' | 'CREATE' | 'EDITOR' | 'SETTINGS' = 'LIST';
  let vaultState: VaultState = 'UNINITIALIZED';
  let passwordInput = '';
  let securityError = '';
  let isDragOver = false;

  // Filter & Search State
  let vaultSearch = '';
  let filterType: 'ALL' | 'VARIABLES' | 'DATASET' = 'ALL';
  let filterSecurity: 'ALL' | 'SECURE' | 'PUBLIC' = 'ALL';

  // New Table State
  let newTable = {
    name: '',
    slug: '',
    type: 'VARIABLES' as 'VARIABLES' | 'DATASET',
    is_secure: false
  };
  let isSlugManuallyEdited = false;
  let createPasswordInput = ''; 

  // Password Change UI
  let passwordChange = {
    old: '',
    new: '',
    confirm: ''
  };

  // Editor State
  let currentTableData: any = null;
  let isUnlocked = false;
  let showValues: Record<string, boolean> = {};

  onMount(async () => {
    await refreshVaultState();
  });

  async function refreshVaultState() {
    vaultState = await VaultService.getState();
  }

  // --- Slug Generation Logic ---
  $: if (!isSlugManuallyEdited && newTable.name) {
    newTable.slug = newTable.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function handleSlugInput(e: Event) {
    isSlugManuallyEdited = true;
    newTable.slug = (e.target as HTMLInputElement).value;
  }

  // --- Navigation ---
  function openCreateForm() {
    isSlugManuallyEdited = false;
    newTable = { name: '', slug: '', type: 'VARIABLES', is_secure: false };
    activeView = 'CREATE';
  }

  function goBack() {
    activeView = 'LIST';
    selectedTableId = null;
    currentTableData = null;
    securityError = '';
  }

  // --- Security Logic ---
  async function handleInitializeMaster(password: string) {
    if (password.length < 8) {
      securityError = 'Master password must be at least 8 characters.';
      return;
    }
    await VaultService.setMasterPassword(password);
    await refreshVaultState();
    passwordInput = '';
    createPasswordInput = '';
    securityError = '';
  }

  async function handleUnlock() {
    const success = await VaultService.unlock(passwordInput);
    if (success) {
      await refreshVaultState();
      passwordInput = '';
      securityError = '';
      if (selectedTableId) await loadTableData(selectedTableId);
    } else {
      securityError = 'Invalid Master Password.';
    }
  }

  async function handleChangePassword() {
    if (passwordChange.new !== passwordChange.confirm) {
      alert('Passwords do not match.');
      return;
    }
    if (passwordChange.new.length < 8) {
      alert('Password too short (min 8 chars).');
      return;
    }

    const success = await VaultService.changeMasterPassword(passwordChange.old, passwordChange.new);
    if (success) {
      alert('Vault Re-encrypted successfully.');
      passwordChange = { old: '', new: '', confirm: '' };
      await refreshVaultState();
    } else {
      alert('Verification failed: Current password incorrect.');
    }
  }

  async function handleVerifyAndCreate() {
    if (newTable.is_secure) {
      if (vaultState === 'UNINITIALIZED') {
        await handleInitializeMaster(createPasswordInput);
      } else if (vaultState === 'LOCKED') {
        const success = await VaultService.unlock(createPasswordInput);
        if (!success) {
          alert('Verification Failed.');
          return;
        }
        await refreshVaultState();
      }
    }
    await createTable();
  }

  // --- Data Logic ---
  async function loadTableData(id: string) {
    const table = await db.global_tables.get(id);
    if (!table) return;

    selectedTableId = id;
    if (table.is_secure && vaultState !== 'UNLOCKED') {
      isUnlocked = false;
      activeView = 'EDITOR';
      return;
    }

    try {
      if (table.is_secure) {
        const decrypted = await VaultService.decrypt(table.data.blob);
        currentTableData = JSON.parse(decrypted);
      } else {
        currentTableData = table.data;
      }
      isUnlocked = true;
      activeView = 'EDITOR';
    } catch (e) {
      securityError = 'Decryption failed.';
    }
  }

  async function createTable(initialGridData?: any) {
    if (!newTable.name || !newTable.slug) return;
    
    const existing = await db.global_tables.where('slug').equals(newTable.slug).first();
    if (existing) {
      alert('Identifier (Slug) must be unique.');
      return;
    }

    const id = crypto.randomUUID();
    let initialData: any;
    let metadata: any = {};

    if (newTable.type === 'DATASET') {
      const tableId = crypto.randomUUID();
      const headers = initialGridData?.headers || ['Field 1'];
      await db.data_tables.add({
        id: tableId,
        name: `[Global] ${newTable.name}`,
        headers,
        rows: initialGridData?.rows || [],
        created_at: Date.now()
      });
      initialData = { tableId };
      metadata = { headers };
    } else {
      initialData = initialGridData?.rows?.[0] || {};
      metadata = { keys: Object.keys(initialData) };
    }

    let dataToStore = initialData;
    if (newTable.is_secure) {
      const blob = await VaultService.encrypt(JSON.stringify(initialData));
      dataToStore = { blob };
    }

    await db.global_tables.add({
      id,
      ...newTable,
      data: dataToStore,
      metadata,
      created_at: Date.now()
    });

    newTable = { name: '', slug: '', type: 'VARIABLES', is_secure: false };
    isSlugManuallyEdited = false;
    createPasswordInput = '';
    activeView = 'LIST';
  }

  async function saveEditorData() {
    if (!selectedTableId || !currentTableData) return;
    const table = await db.global_tables.get(selectedTableId);
    if (!table) return;

    let updateData: any = {};
    let metadata: any = {};

    if (table.type === 'VARIABLES') {
      metadata = { keys: Object.keys(currentTableData) };
    } else {
      metadata = table.metadata;
    }

    if (table.is_secure) {
      const blob = await VaultService.encrypt(JSON.stringify(currentTableData));
      updateData.data = { blob };
    } else {
      updateData.data = currentTableData;
    }

    updateData.metadata = metadata;
    await db.global_tables.update(selectedTableId, updateData);
    alert('Vault updated.');
  }

  function handleFileDrop(e: DragEvent) {
    isDragOver = false;
    const file = e.dataTransfer?.files[0];
    if (!file || !file.name.toLowerCase().endsWith('.csv')) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        if (activeView === 'EDITOR' && selectedTable) {
          if (selectedTable.type === 'VARIABLES') {
            const firstRow = res.data[0] || {};
            currentTableData = { ...currentTableData, ...firstRow };
            await saveEditorData();
          } else if (selectedTable.type === 'DATASET') {
            const tableId = currentTableData.tableId;
            const headers = res.meta.fields || [];
            await db.data_tables.update(tableId, {
              headers,
              rows: res.data || []
            });
            await db.global_tables.update(selectedTableId!, { metadata: { headers } });
            alert('Neural Dataset updated.');
          }
          return;
        }

        newTable.type = 'DATASET';
        newTable.name = file.name.replace('.csv', '');
        newTable.slug = newTable.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        createTable({ headers: res.meta.fields || [], rows: res.data || [] });
      }
    });
  }

  async function exportAll() {
    const all = await db.global_tables.toArray();
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nodenaut_vault_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  }

  function exportPool(table: any) {
    if (table.type === 'VARIABLES') {
      const data = Object.entries(isUnlocked && selectedTableId === table.id ? currentTableData : table.data).map(([k,v]) => ({ key: k, value: v }));
      const csv = Papa.unparse(data);
      downloadFile(`${table.slug}_vars.csv`, csv);
    } else {
      alert('Use the Export button within the Dataset editor for grid data.');
    }
  }

  function downloadFile(name: string, content: string) {
    const blob = new Blob([content], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  }

  function addVariableField() {
    const key = prompt('Identifier (e.g. phone_number):');
    if (!key) return;
    currentTableData = { ...currentTableData, [key]: '' };
  }

  $: filteredTables = ($globalTables || []).filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(vaultSearch.toLowerCase()) || t.slug.toLowerCase().includes(vaultSearch.toLowerCase());
    const matchesType = filterType === 'ALL' || t.type === filterType;
    const matchesSecurity = filterSecurity === 'ALL' || (filterSecurity === 'SECURE' ? t.is_secure : !t.is_secure);
    return matchesSearch && matchesType && matchesSecurity;
  });

  $: selectedTable = $globalTables?.find(t => t.id === selectedTableId);
</script>

<div 
  class="vault-shell"
  role="region"
  aria-label="Neural Data Center"
  on:dragover|preventDefault={() => isDragOver = true}
  on:dragleave={() => isDragOver = false}
  on:drop|preventDefault={handleFileDrop}
>
  {#if isDragOver}
    <div class="drop-overlay fade-in">
      <FileUp size={48} />
      <h3>Drop CSV to Establish Neural Dataset</h3>
    </div>
  {/if}

  <div class="vault-header">
    <div class="title" on:click={goBack} role="button" tabindex="0" on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && goBack()}>
      <Database size={20} class="text-accent" />
      <div class="text">
        <h2>Global Data Center</h2>
        <span class="meta">{vaultState} SESSION</span>
      </div>
    </div>
    <div class="header-tools">
      <Button variant="ghost" size="sm" on:click={() => activeView = 'SETTINGS'} title="Vault Settings">
        <Settings slot="icon" size={16} />
      </Button>
      <Button variant="primary" size="sm" glow on:click={openCreateForm}>
        <Plus slot="icon" size={14} />
        New Pool
      </Button>
    </div>
  </div>

  <div class="vault-layout">
    {#if activeView === 'LIST'}
      <div class="vault-toolbar glass fade-in">
        <div class="search-wrap">
          <Search size={14} class="text-muted" />
          <input type="text" bind:value={vaultSearch} placeholder="Filter neural pools..." />
          {#if vaultSearch}
            <button class="clear-btn" on:click={() => vaultSearch = ''}><X size={14} /></button>
          {/if}
        </div>
        <div class="filter-group">
          <select bind:value={filterType} title="Filter by Type">
            <option value="ALL">All Types</option>
            <option value="VARIABLES">Variables</option>
            <option value="DATASET">Datasets</option>
          </select>
          <select bind:value={filterSecurity} title="Filter by Security">
            <option value="ALL">All Access</option>
            <option value="SECURE">Secure Only</option>
            <option value="PUBLIC">Public Only</option>
          </select>
        </div>
      </div>

      <div class="pool-grid fade-in">
        {#each filteredTables as table}
          <div 
            class="pool-card glass" 
            on:click={() => loadTableData(table.id)}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && loadTableData(table.id)}
            role="button"
            tabindex="0"
          >
            <div class="card-top">
              {#if table.type === 'DATASET'}<FileSpreadsheet size={18} class="text-accent" />
              {:else}<Hash size={18} class="text-muted" />{/if}
              <div class="security-tag">
                {#if table.is_secure}<Lock size={12} class="text-warning" />
                {:else}<Unlock size={12} class="text-muted" />{/if}
              </div>
            </div>
            <div class="card-main">
              <span class="name">{table.name}</span>
              <code class="slug">GLOBAL.{table.slug}</code>
            </div>
            <div class="card-footer">
              <span>{table.type === 'DATASET' ? 'Dataset' : 'Variables'}</span>
              <div class="footer-actions">
                <button class="small-icon" on:click|stopPropagation={() => exportPool(table)} title="Export CSV"><Download size={12} /></button>
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        {/each}
        
        {#if $globalTables && $globalTables.length > 0 && filteredTables.length === 0}
          <div class="empty-hint">
            <Search size={32} opacity={0.1} />
            <p>No neural pools match your filters.</p>
            <Button variant="ghost" size="sm" on:click={() => { vaultSearch = ''; filterType = 'ALL'; filterSecurity = 'ALL'; }}>Reset Filters</Button>
          </div>
        {/if}

        {#if !$globalTables || $globalTables.length === 0}
          <div class="empty-hint">
            <Database size={48} opacity={0.1} />
            <p>Your global neural network is empty. Create a pool or Drop a CSV to begin.</p>
          </div>
        {/if}
      </div>

    {:else if activeView === 'CREATE'}
      <div class="create-form glass fade-in">
        <header>
          <button class="back-link" on:click={goBack}>
            <ChevronLeft size={12} /> Back to Library
          </button>
          <h3>Initialize Neural Pool</h3>
        </header>

        <div class="form-body">
          <div class="form-group">
            <label for="table-name">Human Identity (Name)</label>
            <input id="table-name" type="text" bind:value={newTable.name} placeholder="e.g. My Profile" />
          </div>

          <div class="form-group">
            <label for="table-slug">Neural Identifier (Slug)</label>
            <div class="slug-input">
              <span>GLOBAL.</span>
              <input 
                id="table-slug"
                type="text" 
                value={newTable.slug} 
                on:input={handleSlugInput}
                placeholder="my_info" 
              />
            </div>
            <p class="help">Access via: <code>{"{{GLOBAL." + (newTable.slug || 'slug') + ".field}}"}</code></p>
          </div>

          <div class="type-selector">
            <button class:selected={newTable.type === 'VARIABLES'} on:click={() => newTable.type = 'VARIABLES'}>
              <Hash size={16} />
              <div class="t-info"><strong>Variables</strong><span>Key-Value</span></div>
            </button>
            <button class:selected={newTable.type === 'DATASET'} on:click={() => newTable.type = 'DATASET'}>
              <FileSpreadsheet size={16} />
              <div class="t-info"><strong>Dataset</strong><span>Structured Grid</span></div>
            </button>
          </div>

          <label class="secure-toggle" class:warn={newTable.is_secure}>
            <input type="checkbox" bind:checked={newTable.is_secure} />
            <div class="check-box"><div class="dot"></div></div>
            <div class="check-label">
              <strong>Secure Encryption</strong>
              <span>Require Master Key</span>
            </div>
          </label>

          {#if newTable.is_secure && vaultState !== 'UNLOCKED'}
            <div class="form-group security-challenge fade-in">
              <label for="create-pass">{vaultState === 'UNINITIALIZED' ? 'Establish Master Key' : 'Verify Master Key'}</label>
              <div class="challenge-input">
                <Lock size={14} />
                <input id="create-pass" type="password" bind:value={createPasswordInput} placeholder="Enter Master Password" />
              </div>
            </div>
          {/if}
        </div>

        <footer>
          <Button variant="secondary" on:click={goBack}>Cancel</Button>
          <Button variant="primary" on:click={handleVerifyAndCreate} disabled={!newTable.name || !newTable.slug || (newTable.is_secure && !createPasswordInput)}>
            {newTable.is_secure ? 'Verify & Create' : 'Create Pool'}
          </Button>
        </footer>
      </div>

    {:else if activeView === 'EDITOR' && selectedTable}
      <div class="editor-view fade-in">
        <header class="editor-header">
          <div class="info">
            <button class="back-link" on:click={goBack}><ChevronLeft size={12}/> Back</button>
            <h3>{selectedTable.name}</h3>
          </div>
          <div class="actions">
            {#if isUnlocked && selectedTable.type === 'VARIABLES'}
              <Button variant="primary" size="sm" on:click={saveEditorData}><Save slot="icon" size={14} /> Persist</Button>
            {/if}
            <Button variant="danger" size="sm" on:click={() => { if(confirm('Delete pool?')) { db.global_tables.delete(selectedTableId!); goBack(); } }}><Trash2 slot="icon" size={14} /></Button>
          </div>
        </header>

        {#if !isUnlocked}
          <div class="unlock-screen">
            <Lock size={40} class="text-warning" />
            <h4>Vault Locked</h4>
            <div class="unlock-input">
              <input type="password" bind:value={passwordInput} placeholder="Master Key" on:keydown={(e) => e.key === 'Enter' && handleUnlock()} />
              <Button variant="primary" on:click={handleUnlock} fullWidth>Unlock</Button>
            </div>
            {#if securityError}<div class="error-msg">{securityError}</div>{/if}
          </div>
        {:else if currentTableData}
          <div class="editor-content">
            {#if selectedTable.type === 'VARIABLES'}
              <div class="variables-editor">
                <button class="add-field-btn" on:click={addVariableField}><Plus size={14} /> Add Data Field</button>
                {#each Object.keys(currentTableData) as key}
                  <div class="var-row">
                    <code class="var-key">{key}</code>
                    <div class="var-val">
                      <input type={showValues[key] ? 'text' : 'password'} bind:value={currentTableData[key]} />
                      <button class="eye" on:click={() => showValues[key] = !showValues[key]}>
                        {#if showValues[key]}<EyeOff size={12} />{:else}<Eye size={12} />{/if}
                      </button>
                    </div>
                    <button class="del" on:click={() => { delete currentTableData[key]; currentTableData = currentTableData; }}><Trash2 size={12} /></button>
                  </div>
                {:else}
                  <div class="empty-data-hint">No fields defined yet. Add one above or drop a CSV to populate.</div>
                {/each}
              </div>
            {:else}
              <div class="dataset-editor">
                {#if currentTableData.tableId}
                  <DataTable tableId={currentTableData.tableId} />
                {:else}
                  <div class="error-banner">Dataset corrupted or missing table ID.</div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>

    {:else if activeView === 'SETTINGS'}
      <div class="vault-settings glass fade-in">
        <header>
          <button class="back-link" on:click={goBack}><ChevronLeft size={12}/> Back</button>
          <h3>Vault Security Settings</h3>
        </header>

        <div class="settings-body">
          {#if vaultState === 'UNINITIALIZED'}
            <div class="setup-mode">
              <Key size={32} class="text-accent" />
              <h4>Set Master Password</h4>
              <p>This key protects all secure sequences and global data.</p>
              <input type="password" bind:value={passwordInput} placeholder="New Master Key" />
              <Button variant="primary" on:click={() => handleInitializeMaster(passwordInput)}>Set Key</Button>
            </div>
          {:else}
            <div class="active-mode">
              <div class="status-pill" class:unlocked={vaultState === 'UNLOCKED'}>
                <ShieldCheck size={14} />
                <span>Session {vaultState}</span>
              </div>
              
              <div class="change-password-form">
                <div class="form-group">
                  <label for="old-pass">Current Master Key</label>
                  <input id="old-pass" type="password" bind:value={passwordChange.old} />
                </div>
                <div class="form-group">
                  <label for="new-pass">New Master Key</label>
                  <input id="new-pass" type="password" bind:value={passwordChange.new} />
                </div>
                <div class="form-group">
                  <label for="conf-pass">Confirm New Key</label>
                  <input id="conf-pass" type="password" bind:value={passwordChange.confirm} />
                </div>
                <Button variant="secondary" on:click={handleChangePassword}>Update Master Key</Button>
              </div>

              <div class="setting-block">
                <div class="block-title">Vault Maintenance</div>
                <p>Export a full neural backup of all global pools.</p>
                <Button variant="secondary" on:click={exportAll}><Download slot="icon" size={14} /> Full Backup (JSON)</Button>
              </div>

              <Button variant="danger" on:click={() => { VaultService.lock(); refreshVaultState(); }} fullWidth>Lock Session</Button>
            </div>
          {/if}
          {#if securityError}<div class="error-msg">{securityError}</div>{/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .vault-shell { display: flex; flex-direction: column; height: 100%; gap: 1rem; color: var(--text-primary); position: relative; }
  .drop-overlay { position: absolute; inset: 0; z-index: 1000; background: var(--accent-glow); backdrop-filter: blur(8px); border: 2px dashed var(--accent); border-radius: 1.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--accent); gap: 1rem; pointer-events: none; }
  
  .vault-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-ui); padding-bottom: 1rem; }
  .vault-header .title { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; outline: none; }
  .vault-header h2 { font-size: 1.1rem; font-weight: 900; margin: 0; }
  .vault-header .meta { font-size: 0.6rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; }

  .vault-toolbar { display: flex; gap: 1rem; padding: 0.75rem; border-radius: 1rem; border: 1px solid var(--border-ui); background: var(--bg-card); margin-bottom: 0.5rem; flex-wrap: wrap; }
  .search-wrap { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 0.75rem; background: var(--bg-surface-solid); padding: 0.5rem 0.75rem; border-radius: 10px; border: 1px solid var(--border-ui); }
  .search-wrap input { border: none; background: none; color: var(--text-primary); outline: none; font-size: 0.75rem; font-weight: 600; flex: 1; }
  .clear-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; transition: 0.2s; }
  .clear-btn:hover { color: var(--accent); }

  .filter-group { display: flex; gap: 0.5rem; }
  .filter-group select { background: var(--bg-surface-solid); color: var(--text-primary); border: 1px solid var(--border-ui); border-radius: 8px; padding: 0.4rem 0.75rem; font-size: 0.65rem; font-weight: 700; outline: none; cursor: pointer; transition: 0.2s; }
  .filter-group select:hover { border-color: var(--accent); }

  .pool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .pool-card { padding: 1.25rem; border-radius: 1.25rem; border: 1px solid var(--border-ui); background: var(--bg-card); cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 0.75rem; text-align: left; }
  .pool-card:hover { border-color: var(--accent); transform: translateY(-3px); box-shadow: var(--shadow-elite); }
  
  .card-top { display: flex; justify-content: space-between; }
  .card-main .name { font-weight: 800; display: block; font-size: 0.9rem; }
  .card-main .slug { font-size: 0.6rem; color: var(--accent); background: var(--accent-glow); padding: 0.1rem 0.3rem; border-radius: 4px; width: fit-content; display: block; margin-top: 0.2rem; }
  .card-footer { display: flex; justify-content: space-between; align-items: center; font-size: 0.6rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; border-top: 1px solid var(--border-ui); padding-top: 0.5rem; }
  .footer-actions { display: flex; align-items: center; gap: 0.5rem; }
  .small-icon { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; transition: 0.2s; }
  .small-icon:hover { color: var(--accent); }

  .create-form, .vault-settings { padding: 1.5rem; border-radius: 1.5rem; background: var(--bg-card); border: 1px solid var(--border-ui); box-shadow: var(--shadow-elite); }
  .back-link { background: none; border: none; color: var(--accent); font-size: 0.7rem; font-weight: 800; cursor: pointer; margin-bottom: 0.5rem; padding: 0; display: flex; align-items: center; gap: 0.25rem; }
  
  .form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
  .form-group label { font-size: 0.65rem; font-weight: 900; text-transform: uppercase; color: var(--text-muted); }
  .form-group input { padding: 0.6rem 0.8rem; border-radius: 10px; border: 1px solid var(--border-ui); background: var(--bg-surface-solid); color: var(--text-primary); outline: none; }
  .slug-input { display: flex; align-items: center; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 10px; padding-left: 0.75rem; }
  .slug-input span { font-size: 0.7rem; font-weight: 900; color: var(--text-muted); }
  .slug-input input { border: none; background: none; flex: 1; padding: 0.6rem 0.2rem; color: var(--text-primary); outline: none; }
  .help { font-size: 0.6rem; color: var(--text-muted); margin-top: 0.2rem; }

  .type-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem; }
  .type-selector button { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 12px; border: 1px solid var(--border-ui); background: var(--bg-surface-solid); cursor: pointer; transition: 0.2s; text-align: left; color: var(--text-primary); }
  .type-selector button.selected { border-color: var(--accent); background: var(--accent-glow); box-shadow: 0 0 10px var(--accent-glow); }
  .t-info strong { display: block; font-size: 0.75rem; }
  .t-info span { font-size: 0.6rem; color: var(--text-muted); }

  .secure-toggle { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 12px; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); cursor: pointer; transition: 0.2s; }
  .secure-toggle.warn { border-color: var(--status-warning); background: rgba(245, 158, 11, 0.05); }
  .check-box { width: 34px; height: 18px; background: var(--border-ui); border-radius: 20px; position: relative; }
  .check-box .dot { position: absolute; left: 3px; top: 3px; width: 12px; height: 12px; background: white; border-radius: 50%; transition: 0.2s; }
  input:checked + .check-box { background: var(--status-warning); }
  input:checked + .check-box .dot { left: 19px; }
  input[type="checkbox"] { display: none; }

  .security-challenge { margin-top: 1rem; border: 1px solid var(--status-warning); padding: 1rem; border-radius: 1rem; background: rgba(245, 158, 11, 0.05); }
  .challenge-input { display: flex; align-items: center; gap: 0.75rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 10px; padding: 0 0.75rem; color: var(--status-warning); }
  .challenge-input input { border: none; flex: 1; background: none; padding: 0.6rem 0.2rem; color: var(--text-primary); outline: none; }

  footer { display: flex; gap: 1rem; margin-top: 1.5rem; }
  footer :global(.base-btn) { flex: 1; }

  .editor-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg-card-hover); border-radius: 1rem 1rem 0 0; border-bottom: 1px solid var(--border-ui); }
  .editor-view { display: flex; flex-direction: column; height: 100%; border: 1px solid var(--border-ui); border-radius: 1rem; overflow: hidden; background: var(--bg-surface); }
  .editor-content { flex: 1; overflow: hidden; }
  .dataset-editor { height: 100%; }

  .variables-editor { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; height: 100%; overflow-y: auto; }
  .add-field-btn { padding: 0.75rem; border: 1px dashed var(--border-ui); border-radius: 12px; background: none; color: var(--text-muted); font-weight: 800; cursor: pointer; transition: 0.2s; }
  .add-field-btn:hover { color: var(--accent); border-color: var(--accent); }
  
  .var-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: var(--bg-surface-solid); border-radius: 10px; border: 1px solid var(--border-ui); }
  .var-key { font-size: 0.7rem; font-weight: 900; color: var(--accent); width: 120px; overflow: hidden; text-overflow: ellipsis; background: var(--accent-glow); padding: 0.2rem 0.5rem; border-radius: 4px; }
  .var-val { flex: 1; display: flex; align-items: center; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-ui); }
  .var-val input { border: none; background: none; color: var(--text-primary); padding: 0.5rem; flex: 1; font-size: 0.85rem; outline: none; }
  .eye, .del { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.4rem; transition: 0.2s; }
  .del:hover { color: var(--status-error); }

  .unlock-screen { padding: 4rem 1rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; flex: 1; }
  .unlock-input { display: flex; flex-direction: column; gap: 0.75rem; width: 220px; }
  .unlock-input input { padding: 0.75rem; border-radius: 12px; border: 1px solid var(--border-ui); background: var(--bg-surface-solid); text-align: center; letter-spacing: 0.2em; color: var(--text-primary); outline: none; }

  .setup-mode { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .setup-mode input { width: 220px; padding: 0.75rem; border-radius: 12px; border: 1px solid var(--border-ui); background: var(--bg-surface-solid); text-align: center; color: var(--text-primary); outline: none; }

  .status-pill { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 1.25rem; border-radius: 20px; background: var(--status-error); color: white; font-size: 0.65rem; font-weight: 900; width: fit-content; margin-bottom: 2rem; }
  .status-pill.unlocked { background: var(--status-success); }

  .change-password-form { background: var(--bg-surface-solid); padding: 1.5rem; border-radius: 1.5rem; border: 1px solid var(--border-ui); margin-bottom: 2rem; display: flex; flex-direction: column; gap: 1rem; }
  .setting-block { margin-bottom: 2rem; padding: 1rem; background: var(--bg-surface-solid); border-radius: 1rem; border: 1px solid var(--border-ui); }
  .block-title { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); }
  .setting-block p { font-size: 0.65rem; color: var(--text-secondary); margin: 0.5rem 0; }

  .error-msg { color: var(--status-error); font-size: 0.75rem; font-weight: 800; margin-top: 1rem; }
  .empty-hint { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 6rem 2rem; text-align: center; color: var(--text-muted); }
  .empty-data-hint { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.75rem; font-style: italic; }

  .fade-in { animation: fade-in 0.3s ease-out; }
  @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  :global(.mood-crystal) .pool-card, :global(.mood-crystal) .create-form, :global(.mood-crystal) .vault-settings { background: #fff; }
</style>
