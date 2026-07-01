<script lang="ts">
  import { Type, Search, Play, FileUp, X, Sparkles, Sliders, Palette, Calendar, Clock, ToggleLeft, ListFilter, HelpCircle, Link2 } from '@lucide/svelte';
  import EditableLabel from '$sidepanel/components/EditableLabel.svelte';
  import ExpressionInput from '$sidepanel/components/ExpressionInput.svelte';
  import Button from '$sidepanel/components/Button.svelte';
  import { FileStore } from '$sidepanel/utils/FileStore';
  import { Messenger } from '$shared/api/messenger';
  import { MessageType } from '$shared/constants/messages';
  import { onMount } from 'svelte';

  export let node: any;
  export let save: () => void;
  export let startPicker: (cb: (data: any) => void, mode?: 'step' | 'condition') => void;
  export let highlight: (node: any) => void;
  export let testAction: (node: any) => void;
  export let tableHeaders: string[] = [];

  let fileInfo: { name: string; size: string } | null = null;
  let fileInputEl: HTMLInputElement;
  let detectTimeout: any;

  $: spec = node.state.spec || {};
  $: inputType = node.state.helperType || spec.type || 'text';
  $: isDynamic = typeof node.state.value === 'string' && node.state.value.includes('{{');

  // Reactively detect element spec when selector changes
  $: {
    if (node.state.selector) {
      clearTimeout(detectTimeout);
      detectTimeout = setTimeout(detectElementSpec, 400);
    }
  }

  onMount(async () => {
    await syncFileStatus();
  });

  // Watch node value changes to keep fileInfo synced
  $: {
    if (node.state.value) {
      syncFileStatus();
    } else {
      fileInfo = null;
    }
  }

  function guessHelperType(selector: string): string {
    if (!selector) return 'text';
    const s = selector.toLowerCase();
    if (s.includes('[type="color"]') || s.includes('type=color')) return 'color';
    if (s.includes('[type="range"]') || s.includes('type=range')) return 'range';
    if (s.includes('[type="date"]') || s.includes('type=date')) return 'date';
    if (s.includes('[type="time"]') || s.includes('type=time')) return 'time';
    if (s.includes('[type="datetime-local"]') || s.includes('type=datetime-local')) return 'datetime-local';
    if (s.includes('[type="month"]') || s.includes('type=month')) return 'month';
    if (s.includes('[type="week"]') || s.includes('type=week')) return 'week';
    if (s.includes('[type="file"]') || s.includes('type=file')) return 'file';
    if (s.includes('[type="checkbox"]') || s.includes('type=checkbox')) return 'checkbox';
    if (s.includes('[type="radio"]') || s.includes('type=radio')) return 'checkbox';
    if (s.includes('textarea')) return 'text';
    if (s.includes('select')) return 'select';
    return 'text';
  }

  async function detectElementSpec() {
    if (!node.state.selector) return;
    try {
      const res = await Messenger.send(MessageType.DOM_GET_SPEC, {
        selector: node.state.selector,
        candidates: node.state.candidates || []
      });
      if (res.success && res.data) {
        node.state.spec = res.data;
        node.state.helperType = res.data.type || 'text';
        node = node;
        save();
      } else {
        const guessed = guessHelperType(node.state.selector);
        if (guessed && node.state.helperType !== guessed) {
          node.state.helperType = guessed;
          node = node;
          save();
        }
      }
    } catch (e) {
      const guessed = guessHelperType(node.state.selector);
      if (guessed && node.state.helperType !== guessed) {
        node.state.helperType = guessed;
        node = node;
        save();
      }
    }
  }

  async function syncFileStatus() {
    if (node.state.value && typeof node.state.value === 'string' && node.state.value.startsWith('dbfile:')) {
      const fileId = node.state.value.split(':')[1];
      if (fileId) {
        const fileData = await FileStore.getFile(fileId);
        if (fileData) {
          fileInfo = {
            name: fileData.name,
            size: formatBytes(fileData.blob.size)
          };
        }
      }
    } else {
      fileInfo = null;
    }
  }

  function handlePick() {
    startPicker((data) => {
      node.state.selector = data.selector;
      node.state.candidates = data.candidates;
      node.state.spec = data.metadata?.spec || null;
      node.state.helperType = data.metadata?.spec?.type || 'text';
      node.metadata.label = data.label || 'Input Field';
      
      if (node.state.spec?.type === 'checkbox') {
        node.state.value = 'true';
      } else if (node.state.spec?.type === 'color') {
        node.state.value = '#0078ff';
      } else if (node.state.spec?.type === 'range') {
        node.state.value = node.state.spec.min || '50';
      } else {
        node.state.value = '';
      }
      
      node = node;
      save();
    }, 'step');
  }

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      await FileStore.saveFile(node.id, file);
      node.state.value = `dbfile:${node.id}`;
      fileInfo = {
        name: file.name,
        size: formatBytes(file.size)
      };
      save();
    }
  }

  async function handleFileDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await FileStore.saveFile(node.id, file);
      node.state.value = `dbfile:${node.id}`;
      fileInfo = {
        name: file.name,
        size: formatBytes(file.size)
      };
      save();
    }
  }

  async function removeFile() {
    await FileStore.deleteFile(node.id);
    node.state.value = '';
    fileInfo = null;
    save();
  }

  function formatBytes(bytes: number, decimals = 2) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
</script>

<div class="node-config-plugin">
  <div class="selector-row">
    <EditableLabel 
      value={node.metadata?.label || 'Input Field'} 
      onSave={(nv) => { node.metadata.label = nv; save(); }} 
    />
    
    <div class="input-shell">
      <input 
        type="text" 
        bind:value={node.state.selector} 
        placeholder="Input Selector" 
        on:change={save} 
      />
      <button class="icon-btn" on:click={handlePick} title="Pick Element">
        <Type size={14} />
      </button>
      <button class="icon-btn" on:click={() => highlight(node)} title="Highlight">
        <Search size={14} />
      </button>
    </div>
  </div>

  <div class="payload-wrap">
    <div class="payload-header">
      <div class="header-left">
        <Type size={12} />
        <span>Text / Expression Value</span>
      </div>
      {#if isDynamic}
        <div class="dynamic-badge">
          <Sparkles size={10} />
          <span>Dynamic</span>
        </div>
      {/if}
    </div>

    <ExpressionInput 
      value={node.state.value || ''} 
      headers={tableHeaders} 
      placeholder={inputType === 'file' ? "file:name:mime:base64 or {Variable}" : "Value or {Variable}"} 
      onChange={(val) => { node.state.value = val; save(); }} 
    />
  </div>

  <div class="payload-wrap helper-wrap">
    <div class="payload-header">
      <div class="header-left">
        {#if inputType === 'color'}<Palette size={12} class="text-accent" />
        {:else if inputType === 'range'}<Sliders size={12} class="text-accent" />
        {:else if inputType === 'date' || inputType === 'month' || inputType === 'week'}<Calendar size={12} class="text-accent" />
        {:else if inputType === 'time' || inputType === 'datetime-local'}<Clock size={12} class="text-accent" />
        {:else if inputType === 'checkbox' || inputType === 'radio'}<ToggleLeft size={12} class="text-accent" />
        {:else if inputType === 'select'}<ListFilter size={12} class="text-accent" />
        {:else if inputType === 'file'}<FileUp size={12} class="text-accent" />
        {:else}<HelpCircle size={12} />{/if}
        <span>Visual Input Helper</span>
      </div>
    </div>

    <div class="helper-type-row">
      <span class="helper-label">Helper Widget:</span>
      <select 
        bind:value={node.state.helperType} 
        on:change={save}
        class="helper-type-select"
      >
        <option value="text">Plain Text Box</option>
        <option value="date">Calendar Date Picker</option>
        <option value="time">Time Picker</option>
        <option value="datetime-local">Date & Time Local</option>
        <option value="month">Month Picker</option>
        <option value="week">Week Picker</option>
        <option value="range">Range (Slider)</option>
        <option value="color">Color Picker</option>
        <option value="checkbox">Checkbox (Toggle)</option>
        <option value="select">Dropdown List</option>
        <option value="file">File Drag & Drop Upload</option>
      </select>
    </div>

    <div class="helper-content-container">
      {#if isDynamic}
        <div class="dynamic-overlay glass">
          <Link2 size={16} class="link-icon" />
          <span class="overlay-text">Linked to Dynamic Expression</span>
          <span class="overlay-subtext">Helper is locked while using variables.</span>
        </div>
      {/if}

      <div class="interactive-input-container" class:blurred={isDynamic}>
        {#if inputType === 'checkbox'}
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              checked={node.state.value === 'true'} 
              disabled={isDynamic}
              on:change={(e) => { node.state.value = e.currentTarget.checked ? 'true' : 'false'; save(); }} 
            />
            <span class="slider"></span>
            <span class="toggle-label">{node.state.value === 'true' ? 'Checked (True)' : 'Unchecked (False)'}</span>
          </label>

        {:else if inputType === 'color'}
          <div class="color-picker-row">
            <div class="color-preview" style="background-color: {node.state.value || '#0078ff'}"></div>
            <input 
              type="color" 
              bind:value={node.state.value} 
              disabled={isDynamic}
              on:input={save} 
            />
            <span class="color-hex">{node.state.value || '#0078ff'}</span>
          </div>

        {:else if inputType === 'range'}
          <div class="slider-row">
            <input 
              type="range" 
              min={spec.min || 0} 
              max={spec.max || 100} 
              step={spec.step || 1} 
              bind:value={node.state.value} 
              disabled={isDynamic}
              on:input={save} 
            />
            <span class="slider-val">{node.state.value || 50}</span>
          </div>

        {:else if inputType === 'date'}
          <input 
            type="date" 
            class="native-date"
            bind:value={node.state.value} 
            disabled={isDynamic}
            on:change={save} 
          />

        {:else if inputType === 'time'}
          <input 
            type="time" 
            class="native-date"
            bind:value={node.state.value} 
            disabled={isDynamic}
            on:change={save} 
          />

        {:else if inputType === 'datetime-local'}
          <input 
            type="datetime-local" 
            class="native-date"
            bind:value={node.state.value} 
            disabled={isDynamic}
            on:change={save} 
          />

        {:else if inputType === 'month'}
          <input 
            type="month" 
            class="native-date"
            bind:value={node.state.value} 
            disabled={isDynamic}
            on:change={save} 
          />

        {:else if inputType === 'week'}
          <input 
            type="week" 
            class="native-date"
            bind:value={node.state.value} 
            disabled={isDynamic}
            on:change={save} 
          />

        {:else if inputType === 'select'}
          <select 
            class="native-select"
            bind:value={node.state.value} 
            disabled={isDynamic}
            on:change={save}
          >
            <option value="">-- Choose Option --</option>
            {#if spec.options}
              {#each spec.options as opt}
                <option value={opt}>{opt}</option>
              {/each}
            {/if}
          </select>

        {:else if inputType === 'file'}
          <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
          <div 
            class="file-dropzone"
            on:dragover|preventDefault
            on:drop|preventDefault={handleFileDrop}
            on:click={() => !isDynamic && fileInputEl.click()}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && !isDynamic && fileInputEl.click()}
          >
            <input 
              type="file" 
              bind:this={fileInputEl} 
              on:change={handleFileChange} 
              disabled={isDynamic}
              style="display: none;" 
            />
            
            {#if fileInfo}
              <div class="uploaded-file-card" on:click|stopPropagation role="none">
                <div class="file-icon-wrap">
                  <FileUp size={16} />
                </div>
                <div class="file-details">
                  <span class="file-name" title={fileInfo.name}>{fileInfo.name}</span>
                  <span class="file-size">{fileInfo.size}</span>
                </div>
                <button class="remove-file-btn" on:click={removeFile} disabled={isDynamic} title="Remove File">
                  <X size={12} />
                </button>
              </div>
            {:else}
              <div class="dropzone-prompt">
                <FileUp size={24} class="drop-icon" />
                <span class="prompt-title">Click or drag file to upload</span>
                <span class="prompt-subtitle">Supports large files &gt; 1GB safely</span>
              </div>
            {/if}
          </div>

        {:else}
          <input 
            type="text" 
            class="native-text"
            bind:value={node.state.value} 
            disabled={isDynamic}
            placeholder={spec.placeholder || 'Type value...'}
            on:input={save} 
          />
        {/if}
      </div>
    </div>
  </div>

  <div class="test-row">
    <Button variant="primary" size="sm" on:click={() => testAction(node)} fullWidth>
      <Play slot="icon" size={14} fill="currentColor" />
      Test Input Value
    </Button>
  </div>
</div>

<style>
  .node-config-plugin { display: flex; flex-direction: column; gap: 1.25rem; }
  .selector-row { display: flex; flex-direction: column; gap: 0.5rem; }
  .input-shell { display: flex; align-items: center; gap: 0.25rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 8px; padding: 0.25rem; }
  .input-shell input { flex: 1; background: none; border: none; color: var(--text-primary); font-size: 0.75rem; outline: none; padding: 0.4rem; }
  .icon-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.3rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
  .icon-btn:hover { background: var(--accent-glow); color: var(--accent); }
  
  .payload-wrap { background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 12px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .payload-header { display: flex; align-items: center; justify-content: space-between; font-size: 0.55rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; }
  .header-left { display: flex; align-items: center; gap: 0.5rem; }
  
  .helper-wrap { border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: none; margin-bottom: -0.75rem; }
  .helper-type-row { display: flex; align-items: center; gap: 0.75rem; background: var(--bg-surface-solid); border-left: 1px solid var(--border-ui); border-right: 1px solid var(--border-ui); padding: 0 0.75rem 0.5rem 0.75rem; }
  .helper-label { font-size: 0.65rem; color: var(--text-muted); font-weight: bold; }
  .helper-type-select { flex: 1; background: var(--bg-surface); border: 1px solid var(--border-ui); border-radius: 6px; color: var(--text-primary); font-size: 0.7rem; outline: none; padding: 0.3rem; }
  
  .helper-content-container { position: relative; border-radius: 0 0 12px 12px; overflow: hidden; background: var(--bg-surface-solid); border-left: 1px solid var(--border-ui); border-right: 1px solid var(--border-ui); border-bottom: 1px solid var(--border-ui); padding: 0 0.75rem 0.75rem 0.75rem; }
  
  /* Dynamic Overlay styling */
  .dynamic-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; background: rgba(0, 0, 0, 0.4); border-radius: 8px; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); transition: all 0.3s ease; border: 1px dashed var(--accent); }
  .link-icon { color: var(--accent); margin-bottom: 0.25rem; filter: drop-shadow(0 0 4px var(--accent-glow)); animation: pulse 2s infinite; }
  .overlay-text { font-size: 0.7rem; font-weight: bold; color: var(--text-primary); }
  .overlay-subtext { font-size: 0.55rem; color: var(--text-muted); margin-top: 0.1rem; }
  
  .interactive-input-container { display: flex; flex-direction: column; gap: 0.5rem; transition: all 0.2s; }
  .interactive-input-container.blurred { filter: blur(1.5px); opacity: 0.5; pointer-events: none; }
  
  .dynamic-badge { display: flex; align-items: center; gap: 0.25rem; background: var(--accent-glow); color: var(--accent); border: 1px solid var(--accent); border-radius: 4px; padding: 0.1rem 0.3rem; font-size: 0.55rem; font-weight: bold; }
  
  /* Toggle Switch styling */
  .toggle-switch { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; user-select: none; }
  .toggle-switch input { display: none; }
  .slider { position: relative; display: inline-block; width: 34px; height: 20px; background-color: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 20px; transition: .4s; }
  .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: var(--text-muted); border-radius: 50%; transition: .4s; }
  input:checked + .slider { background-color: var(--accent); border-color: var(--accent); }
  input:checked + .slider:before { transform: translateX(14px); background-color: white; }
  .toggle-label { font-size: 0.75rem; color: var(--text-primary); font-weight: 500; }
  
  /* Color picker styling */
  .color-picker-row { display: flex; align-items: center; gap: 0.75rem; background: var(--bg-surface); border: 1px solid var(--border-ui); border-radius: 8px; padding: 0.4rem 0.6rem; position: relative; }
  .color-preview { width: 20px; height: 20px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); }
  .color-picker-row input[type="color"] { position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
  .color-hex { font-size: 0.75rem; font-family: monospace; color: var(--text-primary); }
  
  /* Slider styling */
  .slider-row { display: flex; align-items: center; gap: 0.75rem; }
  .slider-row input[type="range"] { flex: 1; accent-color: var(--accent); background: var(--bg-surface); height: 6px; border-radius: 3px; outline: none; }
  .slider-val { font-size: 0.75rem; font-weight: bold; min-width: 24px; text-align: right; color: var(--accent); }
  
  /* Native input element styling */
  .native-date, .native-select, .native-text { width: 100%; background: var(--bg-surface); border: 1px solid var(--border-ui); border-radius: 8px; color: var(--text-primary); font-size: 0.75rem; outline: none; padding: 0.5rem 0.6rem; transition: border-color 0.2s; }
  .native-date:focus, .native-select:focus, .native-text:focus { border-color: var(--accent); }
  .native-date:disabled, .native-select:disabled, .native-text:disabled { opacity: 0.5; }
  
  /* File dropzone styling */
  .file-dropzone { width: 100%; border: 2px dashed var(--border-ui); border-radius: 12px; padding: 1.25rem 1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; background: var(--bg-surface); }
  .file-dropzone:hover { border-color: var(--accent); background: var(--accent-glow); }
  .dropzone-prompt { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; text-align: center; }
  .drop-icon { color: var(--text-muted); opacity: 0.7; }
  .prompt-title { font-size: 0.75rem; font-weight: bold; color: var(--text-primary); }
  .prompt-subtitle { font-size: 0.6rem; color: var(--text-muted); }
  
  .uploaded-file-card { width: 100%; display: flex; align-items: center; gap: 0.75rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 8px; padding: 0.5rem; position: relative; }
  .file-icon-wrap { width: 28px; height: 28px; background: var(--accent-glow); color: var(--accent); border-radius: 6px; display: flex; align-items: center; justify-content: center; }
  .file-details { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; min-width: 0; }
  .file-name { font-size: 0.7rem; font-weight: bold; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-size { font-size: 0.6rem; color: var(--text-muted); }
  .remove-file-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
  .remove-file-btn:hover { background: rgba(239, 68, 68, 0.1); color: var(--status-error); }
  .remove-file-btn:disabled { opacity: 0.5; pointer-events: none; }

  .test-row { padding-top: 0.5rem; border-top: 1px solid var(--border-ui); }

  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
</style>
