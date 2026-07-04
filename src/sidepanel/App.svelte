<script lang="ts">
  import { onMount } from 'svelte';
  import { Activity, Zap, ZapOff, Edit3, Settings2, Sun, Moon, Terminal, Palette, Sparkles, ShieldAlert, Code, Globe, Play, Trash2, Plus, Download, Upload, Layers, Cpu } from '@lucide/svelte';
  import mcpPkg from '../../mcp-server/package.json';
  
  const mcpVersion = mcpPkg.version || '1.0.0';
  
  import Navbar from './components/Navbar.svelte';
  import WorkflowList from './features/WorkflowList.svelte';
  import WorkflowEditor from './features/WorkflowEditor.svelte';
  import Scanner from './features/Scanner.svelte';
  import Logs from './features/Logs.svelte';
  import GlobalVault from './features/GlobalVault.svelte';
  import Docs from './components/Docs.svelte';
  import { Messenger } from '$shared/api/messenger';
  import { MessageType } from '$shared/constants/messages';
  import { VaultService } from '$shared/services/vault';
  import Button from './components/Button.svelte';
  import JSZip from 'jszip';

  type Mood = 'obsidian' | 'crystal' | 'synthwave' | 'nebula';
  let activeTab: 'workflows' | 'scanner' | 'vault' | 'logs' | 'settings' | 'help' = 'workflows';
  let selectedWorkflowId: string | null = null;
  let currentMood: Mood = 'obsidian';
  let previewMood: Mood | null = null;
  let mcpConnected = false;

  // Security Challenge State
  let isVaultChallenged = false;
  let challengePassword = '';
  let challengeError = '';
  let keepAlivePort: chrome.runtime.Port | null = null;

  onMount(() => {
    // Keep background service worker alive by establishing a persistent connection port
    try {
      keepAlivePort = chrome.runtime.connect({ name: 'flowpilot-keepalive' });
      keepAlivePort.onDisconnect.addListener(() => {
        setTimeout(() => {
          keepAlivePort = chrome.runtime.connect({ name: 'flowpilot-keepalive' });
        }, 5000);
      });
    } catch (e) {}

    const init = async () => {
      const stored = await chrome.storage.local.get('flowpilot_mood');
      if (stored.flowpilot_mood) {
        currentMood = stored.flowpilot_mood as Mood;
      }
      await loadCustomNodes();
      await loadNodeBundles();
      
      // Fetch initial MCP status
      try {
        const statusRes = await Messenger.send('GET_MCP_STATUS' as any, {});
        if (statusRes && statusRes.success && statusRes.data) {
          mcpConnected = statusRes.data.connected;
        }
      } catch (e) {}
    };
    init();

    // Listen for events from background
    const listener = (request: any) => {
      if (request.type === MessageType.VAULT_CHALLENGE) {
        isVaultChallenged = true;
      }
      if (request.type === 'MCP_CONNECTION_STATUS') {
        mcpConnected = request.payload.connected;
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  });

  async function handleChallengeUnlock() {
    const success = await VaultService.unlock(challengePassword);
    if (success) {
      isVaultChallenged = false;
      challengePassword = '';
      challengeError = '';
      // Notify background to resume
      await Messenger.send(MessageType.VAULT_UNLOCKED, {});
    } else {
      challengeError = 'Invalid Master Key';
    }
  }

  async function setMood(mood: Mood) {
    currentMood = mood;
    await chrome.storage.local.set({ flowpilot_mood: mood });
  }

  import { FlowPilotRegistry } from '$shared/framework/Registry';
  let customNodes: any[] = [];

  async function loadCustomNodes() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const stored = (await chrome.storage.local.get('custom_nodes')) as any;
      customNodes = stored.custom_nodes || [];
    }
  }

  async function saveCustomNodes(nodes: any[]) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ custom_nodes: nodes });
      customNodes = nodes;
      
      // Re-run discoverPlugins to update registry
      await FlowPilotRegistry.discoverPlugins();
    }
  }

  async function handleAddonUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Find files using regex (tolerates directory wrappers)
      const manifestFile = zip.file(/manifest\.json$/i)[0];
      const runtimeFile = zip.file(/(runtime|Node)\.js$/i)[0];

      if (!manifestFile) {
        alert('Invalid addon ZIP: Missing manifest.json file.');
        return;
      }

      if (!runtimeFile) {
        alert('Invalid addon ZIP: Missing runtime.js compiled JavaScript execution logic.');
        return;
      }

      const manifestText = await manifestFile.async('string');
      const runtimeText = await runtimeFile.async('string');
      
      const manifest = JSON.parse(manifestText);

      if (!manifest.type || !manifest.label) {
        alert('Invalid manifest.json: Fields "type" and "label" are required.');
        return;
      }

      const pkg = {
        manifest: {
          type: manifest.type,
          label: manifest.label,
          description: manifest.description || '',
          category: manifest.category || 'core',
          ports: manifest.ports || { inputs: ['input'], outputs: ['success', 'failure'] }
        },
        configSchema: manifest.configSchema || [],
        runtime: runtimeText,
        enabled: true
      };

      // Check duplicate
      const exists = customNodes.some(n => n.manifest.type === pkg.manifest.type);
      if (exists) {
        if (!confirm(`An addon with type "${pkg.manifest.type}" already exists. Overwrite?`)) return;
        customNodes = customNodes.filter(n => n.manifest.type !== pkg.manifest.type);
      }

      const updated = [...customNodes, pkg];
      await saveCustomNodes(updated);
      alert(`Addon "${pkg.manifest.label}" uploaded and registered successfully!`);
    } catch (err: any) {
      alert('Failed to process addon ZIP archive: ' + err.message);
    } finally {
      // Reset input element
      (e.target as HTMLInputElement).value = '';
    }
  }

  async function deleteCustomNode(type: string) {
    if (!confirm('Are you sure you want to delete this custom node addon? Any workflows using this node type will fail to execute.')) return;
    const updated = customNodes.filter(n => n.manifest.type !== type);
    await saveCustomNodes(updated);
  }

  async function toggleCustomNode(type: string) {
    const updated = customNodes.map(n => {
      if (n.manifest.type === type) {
        return { ...n, enabled: !n.enabled };
      }
      return n;
    });
    await saveCustomNodes(updated);
  }

  async function downloadBoilerplate() {
    try {
      const zip = new JSZip();

      // 1. package.json
      const packageJson = {
        name: "flowpilot-addon-boilerplate",
        version: "1.0.0",
        description: "FlowPilot Custom Node Addon Developer Framework",
        main: "dist/runtime.js",
        scripts: {
          build: "node build.js",
          test: "vitest run"
        },
        devDependencies: {
          esbuild: "^0.20.0",
          jszip: "^3.10.1",
          typescript: "^5.3.3",
          vitest: "^1.3.1"
        }
      };
      zip.file('package.json', JSON.stringify(packageJson, null, 2));

      // 2. tsconfig.json
      const tsconfigJson = {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true
        },
        include: ["src/**/*"]
      };
      zip.file('tsconfig.json', JSON.stringify(tsconfigJson, null, 2));

      // 3. src/manifest.json
      const manifestJson = {
        type: "CUSTOM_MATH_MULTIPLY",
        label: "Multiply Variable",
        description: "Multiplies a FlowPilot variable by a constant factor",
        category: "core",
        ports: {
          inputs: ["input"],
          outputs: ["success", "failure"]
        },
        configSchema: [
          {
            name: "variableName",
            label: "Variable Name",
            type: "text",
            required: true,
            placeholder: "e.g. price"
          },
          {
            name: "factor",
            label: "Factor",
            type: "number",
            required: true,
            placeholder: "e.g. 1.2"
          }
        ]
      };
      zip.file('src/manifest.json', JSON.stringify(manifestJson, null, 2));

      // 4. src/runtime.ts
      const runtimeTs = `/**
 * FlowPilot Sandbox Context Typings
 */
interface ExecutionContext {
  node: {
    id: string;
    type: string;
    state: Record<string, any>;
    tabId?: number;
  };
}

// FlowPilot Logic API
declare const FLOW: {
  click(selector: string): Promise<boolean>;
  fill(selector: string, value: string): Promise<boolean>;
  wait(ms: number): Promise<void>;
};

// FlowPilot global variable tables
declare const GLOBAL: {
  variables: {
    update(data: Record<string, any>): Promise<void>;
  };
};

/**
 * Custom Node execution handler.
 * Writes logic with full browser sandbox access and variables modification support.
 */
export async function execute(ctx: ExecutionContext, vars: Record<string, any>) {
  try {
    const variableName = ctx.node.state.variableName;
    const factor = parseFloat(ctx.node.state.factor || "1");

    if (!variableName) {
      throw new Error("Variable Name is required");
    }

    const currentValue = parseFloat(vars[variableName] || "0");
    const result = currentValue * factor;

    // Return next port to follow and variables to update
    return {
      nextPort: "success",
      variables: {
        [variableName]: result
      }
    };
  } catch (err: any) {
    return {
      nextPort: "failure",
      error: {
        code: "MULTIPLICATION_ERROR",
        message: err.message
      }
    };
  }
}`;
      zip.file('src/runtime.ts', runtimeTs);

      // 5. src/runtime.test.ts
      const runtimeTestTs = `import { describe, it, expect } from 'vitest';
import { execute } from './runtime';

describe('Multiply Variable Addon', () => {
  it('should successfully multiply context variable', async () => {
    const ctx = {
      node: {
        id: 'test-node-1',
        type: 'CUSTOM_MATH_MULTIPLY',
        state: {
          variableName: 'count',
          factor: 2.5
        }
      }
    };
    
    const mockVars = {
      count: 10
    };

    const res = await execute(ctx, mockVars);

    expect(res.nextPort).toBe('success');
    expect(res.variables?.count).toBe(25);
  });

  it('should fail if variableName is missing', async () => {
    const ctx = {
      node: {
        id: 'test-node-2',
        type: 'CUSTOM_MATH_MULTIPLY',
        state: {
          factor: 2.5
        }
      }
    };

    const res = await execute(ctx, {});
    expect(res.nextPort).toBe('failure');
    expect(res.error?.message).toContain('Variable Name is required');
  });
});`;
      zip.file('src/runtime.test.ts', runtimeTestTs);

      // 6. build.js
      const buildJs = `const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function build() {
  console.log('Compiling TypeScript...');
  
  // Create dist folder if not exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  // 1. Build runtime typescript file to bundle JS
  await esbuild.build({
    entryPoints: ['src/runtime.ts'],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    globalName: 'AddonModule',
    outfile: 'dist/runtime.js',
    minify: false,
    sourcemap: false
  });

  // 2. Prepare manifest
  fs.copyFileSync('src/manifest.json', 'dist/manifest.json');
  console.log('Build completed in dist/');

  // 3. Packaging into ZIP
  console.log('Packaging ZIP archive...');
  const zip = new JSZip();
  zip.file('manifest.json', fs.readFileSync('dist/manifest.json'));
  zip.file('runtime.js', fs.readFileSync('dist/runtime.js'));

  const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('addon.zip', zipContent);
  console.log('Package ready: addon.zip is generated successfully!');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});`;
      zip.file('build.js', buildJs);

      // 7. README.md
      const readmeMd = `# FlowPilot Custom Node Developer Framework

Welcome to the FlowPilot custom node developer environment!

## Getting Started

1. **Install Dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

2. **Write Logic**:
   - \`src/manifest.json\`: Declare your configuration fields, category, and node ports.
   - \`src/runtime.ts\`: Implement the node execution code.

3. **Run Unit Tests**:
   - Verify execution logic locally:
     \`\`\`bash
     npm run test
     \`\`\`

4. **Package & Deploy**:
   - Compile code and package into \`addon.zip\`:
     \`\`\`bash
     npm run build
     \`\`\`
   - Go to FlowPilot sidepanel > **Settings** > **Custom Node Addons**.
   - Drag/upload \`addon.zip\` to register it instantly!
`;
      zip.file('README.md', readmeMd);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flowpilot-addon-boilerplate.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to generate developer framework ZIP: ' + err.message);
    }
  }

  // Node Bundles (Subflow Components) Manager
  let showBundleModal = false;
  let editingBundleId: string | null = null;
  let bundleName = '';
  let bundleDesc = '';
  let bundleOutputs = 'success, failure';
  let bundleInputs: Array<{
    name: string;
    label: string;
    type: 'value' | 'expression' | 'node_ref' | 'bundle_ref';
    required: boolean;
    defaultValue: string;
  }> = [];

  let nodeBundles: any[] = [];

  async function loadNodeBundles() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const stored = (await chrome.storage.local.get('node_bundles')) as any;
      nodeBundles = stored.node_bundles || [];
    }
  }

  async function saveNodeBundles(bundles: any[]) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ node_bundles: bundles });
      nodeBundles = bundles;
      await FlowPilotRegistry.discoverPlugins();
    }
  }

  function openBundleModal(bundle?: any) {
    if (bundle) {
      editingBundleId = bundle.id;
      bundleName = bundle.name;
      bundleDesc = bundle.description || '';
      bundleOutputs = (bundle.outputs || ['success', 'failure']).join(', ');
      bundleInputs = (bundle.inputs || []).map((i: any) => ({ ...i }));
    } else {
      editingBundleId = null;
      bundleName = '';
      bundleDesc = '';
      bundleOutputs = 'success, failure';
      bundleInputs = [];
    }
    showBundleModal = true;
  }

  function addParameterRow() {
    bundleInputs = [...bundleInputs, {
      name: '',
      label: '',
      type: 'value',
      required: false,
      defaultValue: ''
    }];
  }

  function removeParameterRow(index: number) {
    bundleInputs = bundleInputs.filter((_, idx) => idx !== index);
  }

  async function handleSaveBundle() {
    if (!bundleName) {
      alert('Bundle Name is required');
      return;
    }

    const outputsArray = bundleOutputs.split(',').map(s => s.trim()).filter(Boolean);
    const bundleId = editingBundleId || crypto.randomUUID();

    const manifestRecord = {
      id: bundleId,
      name: bundleName,
      description: bundleDesc,
      outputs: outputsArray,
      inputs: bundleInputs.map(i => ({ ...i })),
      enabled: true
    };

    let updatedBundles;
    const { db } = await import('$shared/services/db');

    if (editingBundleId) {
      updatedBundles = nodeBundles.map(b => b.id === editingBundleId ? manifestRecord : b);
      await db.workflows.update(bundleId, { name: `[Bundle] ${bundleName}` });
    } else {
      updatedBundles = [...nodeBundles, manifestRecord];
      await db.workflows.add({
        id: bundleId,
        name: `[Bundle] ${bundleName}`,
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
        settings: { is_bundle: true },
        created_at: Date.now(),
        updated_at: Date.now()
      });
    }

    await saveNodeBundles(updatedBundles);
    showBundleModal = false;
    editingBundleId = null;
    alert(editingBundleId ? 'Node Bundle manifest updated!' : 'Node Bundle created successfully! Open it in the library to edit its internal graph.');
  }

  async function toggleBundleEnabled(id: string) {
    const updated = nodeBundles.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b);
    await saveNodeBundles(updated);
  }

  async function deleteBundle(id: string) {
    if (!confirm('Are you sure you want to delete this Node Bundle? This will delete both the manifest and its workflow graph.')) return;
    
    const { db } = await import('$shared/services/db');
    await db.workflows.delete(id);

    const updated = nodeBundles.filter(b => b.id !== id);
    await saveNodeBundles(updated);
  }

  async function exportNodeBundle(bundle: any) {
    try {
      const { db } = await import('$shared/services/db');
      const rawWorkflow = await db.workflows.get(bundle.id);
      
      const payload = {
        manifest: bundle,
        workflow: rawWorkflow || null
      };

      const data = JSON.stringify(payload, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bundle.name.replace(/\s+/g, '_').toLowerCase()}.flowbundle`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export Node Bundle: ' + err.message);
    }
  }

  async function handleBundleImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      if (!payload.manifest || !payload.manifest.id || !payload.manifest.name) {
        alert('Invalid .flowbundle file structure.');
        return;
      }

      const exists = nodeBundles.some(b => b.id === payload.manifest.id);
      let updated;
      if (exists) {
        if (!confirm(`A Node Bundle with ID "${payload.manifest.id}" already exists. Overwrite?`)) return;
        updated = nodeBundles.map(b => b.id === payload.manifest.id ? payload.manifest : b);
      } else {
        updated = [...nodeBundles, payload.manifest];
      }

      if (payload.workflow) {
        const { db } = await import('$shared/services/db');
        await db.workflows.put(payload.workflow);
      }

      await saveNodeBundles(updated);
      alert(`Node Bundle "${payload.manifest.name}" imported successfully!`);
    } catch (err: any) {
      alert('Failed to import Node Bundle: ' + err.message);
    } finally {
      (e.target as HTMLInputElement).value = '';
    }
  }

  $: activeMood = previewMood || currentMood;
</script>

<main class="app-shell mood-{activeMood}">
  <div class="neural-canvas">
    <div class="node n1"></div>
    <div class="node n2"></div>
    <div class="node n3"></div>
  </div>
  
  {#if !selectedWorkflowId}
  <header class="app-header glass">
    <div class="logo-area">
      <div class="logo-icon">
        <Activity size={18} color="var(--text-primary)" />
      </div>
      <div class="logo-text">
        <h1>FlowPilot <span class="v-tag">ELITE</span></h1>
        <div class="status-badge">
          <div class="pulse-dot"></div>
          <span>Neural Link Established</span>
        </div>
      </div>
    </div>
    <div class="header-tools">
      <div class="perf-stats glass">
        <Zap size={12} fill="var(--accent)" color="var(--accent)" />
        <span>Sub-ms Latency</span>
      </div>
    </div>
  </header>
  {/if}

  <div class="view-content" class:full-view={selectedWorkflowId}>
    {#if selectedWorkflowId}
      <WorkflowEditor workflowId={selectedWorkflowId} onBack={() => selectedWorkflowId = null} />
    {:else if activeTab === 'workflows'}
      <WorkflowList onEdit={(id) => selectedWorkflowId = id} />
    {:else if activeTab === 'scanner'}
      <div class="view-container">
        <header class="view-header">
          <div class="header-text">
            <h2>Custom Node Bundles (Subflows)</h2>
            <p>Bundle sequences into custom reusable nodes that take parameters (properties) and return flow ports.</p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <label class="upload-btn" style="margin: 0; padding: 0.5rem 1rem; height: 36px; border-radius: 8px;">
              <Upload slot="icon" size={14} />
              Import Bundle
              <input type="file" accept=".flowbundle" style="display: none;" on:change={handleBundleImport} />
            </label>
            <Button variant="primary" glow on:click={() => openBundleModal()}>
              <Plus slot="icon" size={14} />
              Create New Bundle
            </Button>
          </div>
        </header>

        <div class="workflow-grid" style="padding: 1rem 0;">
          {#if nodeBundles.length > 0}
            {#each nodeBundles as bundle}
              <div class="workflow-card glass">
                <div 
                  class="workflow-info" 
                  role="button"
                  tabindex="0"
                  on:click={() => selectedWorkflowId = bundle.id}
                  on:keydown={(e) => e.key === 'Enter' && (selectedWorkflowId = bundle.id)}
                >
                  <span class="workflow-name" style="display: flex; align-items: center; gap: 0.5rem;">
                    {bundle.name}
                    <span style="font-size: 0.55rem; font-weight: 900; background: {bundle.enabled !== false ? 'rgba(5, 150, 105, 0.1)' : 'var(--border-ui)'}; color: {bundle.enabled !== false ? 'var(--status-success)' : 'var(--text-secondary)'}; padding: 0.1rem 0.35rem; border-radius: 4px; text-transform: uppercase;">
                      {bundle.enabled !== false ? 'Active' : 'Disabled'}
                    </span>
                  </span>
                  
                  <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0.25rem 0;">
                    {bundle.description || 'No description provided.'}
                  </p>

                  <div class="workflow-tags">
                    <span class="tag">{(bundle.inputs || []).length} inputs</span>
                    <span class="tag">{(bundle.outputs || []).length} outputs</span>
                  </div>
                </div>

                <div class="workflow-actions">
                  <button 
                    class="action-btn" 
                    title={bundle.enabled !== false ? 'Deactivate' : 'Activate'}
                    on:click|stopPropagation={() => toggleBundleEnabled(bundle.id)}
                    style="color: {bundle.enabled !== false ? 'var(--status-success)' : 'var(--text-muted)'};"
                  >
                    {#if bundle.enabled !== false}
                      <Zap size={14} fill="currentColor" />
                    {:else}
                      <ZapOff size={14} />
                    {/if}
                  </button>

                  <button class="action-btn" title="Export" on:click|stopPropagation={() => exportNodeBundle(bundle)}>
                    <Download size={14} />
                  </button>

                  <button class="action-btn" title="Edit Manifest" on:click|stopPropagation={() => openBundleModal(bundle)}>
                    <Settings2 size={14} />
                  </button>

                  <button class="action-btn start" title="Edit Flow" on:click|stopPropagation={() => selectedWorkflowId = bundle.id}>
                    <Edit3 size={14} />
                  </button>

                  <button class="action-btn delete" title="Delete" on:click|stopPropagation={() => deleteBundle(bundle.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            {/each}
          {:else}
            <div class="empty-state glass">
              <Layers size={32} color="rgba(255,255,255,0.05)" />
              <p>No custom node bundles created yet.</p>
              <Button variant="ghost" on:click={() => openBundleModal()}>Create First Node Bundle</Button>
            </div>
          {/if}
        </div>
      </div>
    {:else if activeTab === 'vault'}
      <GlobalVault />
    {:else if activeTab === 'logs'}
      <Logs />
    {:else if activeTab === 'help'}
      <Docs />
    {:else if activeTab === 'settings'}
      <div class="settings-wrap">
        <div class="section-title">
          <Palette size={14} />
          <span>Atmospheric Mood</span>
        </div>
        
        <div class="mood-grid">
          <button 
            class="mood-card obsidian" 
            class:active={currentMood === 'obsidian'}
            on:click={() => setMood('obsidian')}
            on:mouseenter={() => previewMood = 'obsidian'}
            on:mouseleave={() => previewMood = null}
          >
            <div class="preview-box">
              <Moon size={20} />
            </div>
            <div class="mood-meta">
              <span class="m-name">Obsidian</span>
              <span class="m-desc">Deep Space / Stealth</span>
            </div>
          </button>

          <button 
            class="mood-card crystal" 
            class:active={currentMood === 'crystal'}
            on:click={() => setMood('crystal')}
            on:mouseenter={() => previewMood = 'crystal'}
            on:mouseleave={() => previewMood = null}
          >
            <div class="preview-box">
              <Sun size={20} />
            </div>
            <div class="mood-meta">
              <span class="m-name">Crystal</span>
              <span class="m-desc">Pure / High Clarity</span>
            </div>
          </button>

          <button 
            class="mood-card synthwave" 
            class:active={currentMood === 'synthwave'}
            on:click={() => setMood('synthwave')}
            on:mouseenter={() => previewMood = 'synthwave'}
            on:mouseleave={() => previewMood = null}
          >
            <div class="preview-box">
              <Terminal size={20} />
            </div>
            <div class="mood-meta">
              <span class="m-name">Synthwave</span>
              <span class="m-desc">Neon / Cyberpunk</span>
            </div>
          </button>

          <button 
            class="mood-card nebula" 
            class:active={currentMood === 'nebula'}
            on:click={() => setMood('nebula')}
            on:mouseenter={() => previewMood = 'nebula'}
            on:mouseleave={() => previewMood = null}
          >
            <div class="preview-box">
              <Sparkles size={20} />
            </div>
            <div class="mood-meta">
              <span class="m-name">Nebula</span>
              <span class="m-desc">Dream / Astral</span>
            </div>
          </button>
        </div>

        <div class="addons-card glass">
          <div class="card-header">
            <Code size={16} />
            <h3>Custom Node Addons</h3>
          </div>
          <p class="zone-desc">Develop and upload custom browser automation node types to extend FlowPilot globally.</p>
          
          <div class="addon-actions">
            <Button variant="picker" size="sm" fullWidth on:click={downloadBoilerplate}>
              <Globe slot="icon" size={14} />
              Download Boilerplate
            </Button>
            
            <label class="upload-btn">
              <Play slot="icon" size={14} style="transform: rotate(90deg);" />
              Upload Addon ZIP
              <input type="file" accept=".zip" style="display: none;" on:change={handleAddonUpload} />
            </label>
          </div>

          {#if customNodes.length > 0}
            <div class="addons-list">
              <strong>Active Custom Nodes</strong>
              {#each customNodes as addon}
                <div class="addon-item">
                  <div class="addon-info">
                    <span class="name">{addon.manifest.label}</span>
                    <span class="meta">{addon.manifest.type} ({addon.manifest.category})</span>
                  </div>
                  <div class="addon-controls">
                    <!-- Active / Inactive switch -->
                    <label class="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={addon.enabled !== false} 
                        on:change={() => toggleCustomNode(addon.manifest.type)} 
                        style="display: none;"
                      />
                      <div class="switch-outer" style="background: {addon.enabled !== false ? 'var(--accent)' : 'var(--border-ui)'};">
                        <div class="switch-inner" style="left: {addon.enabled !== false ? '17px' : '3px'};"></div>
                      </div>
                      <span style="font-size: 0.65rem; font-weight: 700; color: {addon.enabled !== false ? 'var(--text-primary)' : 'var(--text-muted)'};">
                        {addon.enabled !== false ? 'Active' : 'Disabled'}
                      </span>
                    </label>

                    <Button variant="danger" size="sm" on:click={() => deleteCustomNode(addon.manifest.type)}>
                      <Trash2 slot="icon" size={10} />
                      Delete
                    </Button>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="no-addons" style="font-size: 0.7rem; color: var(--text-muted); font-style: italic; text-align: center; width: 100%; border-top: 1px solid var(--border-ui); padding-top: 1rem;">
              No custom addons uploaded yet.
            </div>
          {/if}
        </div>

        <div class="addons-card glass">
          <div class="card-header" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <Cpu size={16} />
              <h3>Model Context Protocol (MCP) Setup</h3>
              <div class="mcp-status-pill {mcpConnected ? 'connected' : 'disconnected'}">
                <span class="mcp-status-dot"></span>
                <span>{mcpConnected ? 'Connected' : 'Offline'}</span>
              </div>
            </div>
            <span style="font-size: 0.6rem; font-weight: 900; background: var(--accent-glow); color: var(--accent); padding: 0.15rem 0.4rem; border-radius: 4px; border: 1px solid var(--accent); margin-left: 0.5rem;">v{mcpVersion}</span>
          </div>
          <p class="zone-desc">Connect FlowPilot to external AI assistants (like Claude Desktop or Cursor) to build and run workflows using natural language. Download the portable local companion binary for your OS to enable automatic local pairing (Zero Cloud Costs).</p>
          
          <div class="mcp-downloads">
            <a href="/mcp/flowpilot-mcp-win-v{mcpVersion}.exe" download="flowpilot-mcp-win-v{mcpVersion}.exe" class="mcp-btn">
              <Download size={12} />
              <span>Windows (.exe)</span>
            </a>
            <a href="/mcp/flowpilot-mcp-macos-v{mcpVersion}" download="flowpilot-mcp-macos-v{mcpVersion}" class="mcp-btn">
              <Download size={12} />
              <span>macOS Binary</span>
            </a>
            <a href="/mcp/flowpilot-mcp-linux-v{mcpVersion}" download="flowpilot-mcp-linux-v{mcpVersion}" class="mcp-btn">
              <Download size={12} />
              <span>Linux Binary</span>
            </a>
          </div>
          <div class="mcp-instructions">
            <strong>How to pair:</strong>
            <ol>
              <li>Download the executable for your operating system.</li>
              <li>Double-click the binary on your computer to run it once. It will automatically detect and register FlowPilot inside your Claude Desktop configuration.</li>
              <li>Restart Claude Desktop.</li>
            </ol>
          </div>
        </div>

        <div class="engine-stats glass">
          <div class="stat-row">
            <span class="s-label">Vault Status</span>
            <span class="s-val secure">Encrypted (AES-GCM)</span>
          </div>
          <div class="stat-row">
            <span class="s-label">Self-Healing</span>
            <span class="s-val active">Neural Active</span>
          </div>
        </div>
      </div>
    {/if}
  </div>

  {#if !selectedWorkflowId}
  <Navbar bind:activeTab />
  {/if}

  {#if isVaultChallenged}
    <div class="challenge-overlay fade-in">
      <div class="challenge-card glass">
        <div class="c-header">
          <ShieldAlert size={32} class="text-warning" />
          <h2>Identity Verification</h2>
          <p>This operation requires access to your secure neural vault. Please provide your Master Key.</p>
        </div>
        
        <div class="c-body">
          <input 
            type="password" 
            bind:value={challengePassword} 
            placeholder="Master Password" 
            on:keydown={(e) => e.key === 'Enter' && handleChallengeUnlock()}
          />
          {#if challengeError}<span class="err">{challengeError}</span>{/if}
        </div>

        <div class="c-footer">
          <Button variant="secondary" on:click={() => isVaultChallenged = false}>Cancel</Button>
          <Button variant="primary" glow on:click={handleChallengeUnlock}>Unlock & Resume</Button>
        </div>
      </div>
    </div>
  {/if}
  {#if showBundleModal}
    <div class="challenge-overlay fade-in" style="background: rgba(0,0,0,0.6); backdrop-filter: blur(12px);">
      <div class="challenge-card glass" style="max-width: 500px; padding: 2rem; display: flex; flex-direction: column; gap: 1rem; text-align: left;">
        <div class="c-header" style="text-align: center;">
          <Layers size={32} class="text-accent" style="color: var(--accent);" />
          <h2>{editingBundleId ? 'Edit Node Bundle' : 'Configure Node Bundle'}</h2>
          <p>Define custom properties and output return ports for your reusable subflow.</p>
        </div>
        
        <div class="c-body" style="display: flex; flex-direction: column; gap: 0.75rem; text-align: left; align-items: stretch;">
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <label for="bundle-name-field" style="font-size: 0.65rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Bundle Name</label>
            <input id="bundle-name-field" type="text" bind:value={bundleName} placeholder="e.g. Login Helper" class="bundle-form-input" />
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <label for="bundle-desc-field" style="font-size: 0.65rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Description</label>
            <input id="bundle-desc-field" type="text" bind:value={bundleDesc} placeholder="Helper subflow to type username/password" class="bundle-form-input" />
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <label for="bundle-ports-field" style="font-size: 0.65rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Output ports (comma separated)</label>
            <input id="bundle-ports-field" type="text" bind:value={bundleOutputs} placeholder="success, failure" class="bundle-form-input" />
          </div>
        </div>

        <div class="c-footer" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <Button variant="secondary" on:click={() => showBundleModal = false}>Cancel</Button>
          <Button variant="primary" glow on:click={handleSaveBundle}>Save Bundle</Button>
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(:root) {
    /* Obsidian Mood (Default - Elite Dark) */
    --bg-app: #020617;
    --bg-surface: #0f172a;
    --bg-surface-solid: #0f172a;
    --bg-card: #1e293b;
    --bg-card-hover: #334155;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --accent: #3b82f6;
    --accent-glow: #1e3a8a;
    --border-ui: rgba(255, 255, 255, 0.05);
    --border-ui-heavy: rgba(255, 255, 255, 0.1);
    --status-success: #10b981;
    --status-error: #ef4444;
    --status-warning: #f59e0b;
    --node-anim: n-obsidian;
    --glass-blur: 0px;
    --shadow-elite: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
  }

  :global(.mood-crystal) {
    --bg-app: #f8fafc;
    --bg-surface: #ffffff;
    --bg-surface-solid: #ffffff;
    --bg-card: #f1f5f9;
    --bg-card-hover: #e2e8f0;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --accent: #2563eb;
    --accent-glow: #dbeafe;
    --border-ui: rgba(0, 0, 0, 0.05);
    --border-ui-heavy: rgba(0, 0, 0, 0.1);
    --status-success: #059669;
    --status-error: #dc2626;
    --status-warning: #d97706;
    --node-anim: n-crystal;
    --shadow-elite: 0 10px 30px -10px rgba(0, 0, 0, 0.1);
  }

  :global(.mood-synthwave) {
    --bg-app: #09090b;
    --bg-surface: #121214;
    --bg-surface-solid: #121214;
    --bg-card: #1a1a1e;
    --bg-card-hover: #242429;
    --text-primary: #ec4899;
    --text-secondary: #f472b6;
    --text-muted: #701a75;
    --accent: #ec4899;
    --accent-glow: #4a044e;
    --border-ui: rgba(236, 72, 153, 0.2);
    --border-ui-heavy: rgba(236, 72, 153, 0.4);
    --node-anim: n-synth;
  }

  :global(.mood-nebula) {
    --bg-app: #0f0b1e;
    --bg-surface: #1f1740;
    --bg-surface-solid: #1f1740;
    --bg-card: #2b1e5a;
    --bg-card-hover: #3b2a7c;
    --text-primary: #c084fc;
    --text-secondary: #d8b4fe;
    --text-muted: #581c87;
    --accent: #c084fc;
    --accent-glow: #3b0764;
    --border-ui: rgba(192, 132, 252, 0.1);
    --border-ui-heavy: rgba(192, 132, 252, 0.3);
    --node-anim: n-nebula;
  }

  :global(body) {
    background-color: var(--bg-app);
    color: var(--text-primary);
    margin: 0;
    padding: 0;
    font-family: 'Inter', system-ui, sans-serif;
    overflow: hidden;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: relative;
    background: var(--bg-app);
    overflow: hidden;
  }

  /* Neural Canvas Animation */
  .neural-canvas {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .node {
    position: absolute;
    width: 400px;
    height: 400px;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.15;
    background: var(--accent);
    animation: var(--node-anim) 10s infinite alternate cubic-bezier(0.45, 0, 0.55, 1);
  }

  .n1 { top: -10%; left: -10%; }
  .n2 { bottom: -10%; right: -10%; animation-delay: -2s; }
  .n3 { top: 40%; left: 30%; width: 200px; height: 200px; opacity: 0.1; }

  @keyframes n-obsidian { from { transform: translate(0, 0) scale(1); } to { transform: translate(50px, 50px) scale(1.2); } }
  @keyframes n-crystal { from { transform: translate(0, 0) scale(1); opacity: 0.05; } to { transform: translate(-30px, -30px) scale(1.1); opacity: 0.1; } }
  @keyframes n-synth { from { transform: translate(0, 0) scale(1); background: #ec4899; } to { transform: translate(40px, -40px) scale(1.3); background: #06b6d4; } }
  @keyframes n-nebula { from { transform: translate(0, 0) scale(1); background: #c084fc; } to { transform: translate(-50px, -50px) scale(1.2); background: #6366f1; } }

  .app-header.glass {
    background: var(--bg-surface);
    backdrop-filter: blur(var(--glass-blur));
    padding: 1.25rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-ui);
    z-index: 10;
  }

  .logo-area { display: flex; align-items: center; gap: 0.75rem; }
  .logo-icon {
    background: linear-gradient(135deg, var(--accent) 0%, #1e3a8a 100%);
    padding: 0.5rem;
    border-radius: 0.75rem;
    display: flex;
    box-shadow: 0 0 20px var(--accent-glow);
    transition: all 0.3s;
  }

  .logo-text h1 { font-size: 1rem; font-weight: 900; margin: 0; letter-spacing: -0.02em; display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary); }
  .v-tag { font-size: 0.55rem; background: var(--accent); color: white; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 900; }

  .status-badge { display: flex; align-items: center; gap: 0.4rem; font-size: 0.6rem; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; margin-top: 0.2rem; }
  .pulse-dot { width: 6px; height: 6px; background: var(--status-success); border-radius: 50%; box-shadow: 0 0 10px var(--status-success); animation: p-dot 2s infinite; }
  @keyframes p-dot { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }

  .perf-stats.glass {
    background: var(--border-ui);
    padding: 0.3rem 0.6rem;
    border-radius: 30px;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.6rem;
    font-weight: 800;
    color: var(--text-secondary);
    border: 1px solid var(--border-ui);
  }

  .view-content { flex: 1; overflow-y: auto; padding: 1.25rem; z-index: 5; }
  .view-content.full-view { padding: 0; }

  /* Settings UI Enhancement */
  .settings-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
  .section-title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.1em; }

  .mood-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .mood-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-ui);
    border-radius: 1rem;
    padding: 1rem;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    text-align: left;
    position: relative;
    overflow: hidden;
  }

  .mood-card:hover { transform: translateY(-4px); border-color: var(--accent); background: var(--bg-card-hover); }
  .mood-card.active { border-color: var(--accent); box-shadow: var(--shadow-elite); }

  .preview-box { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: var(--border-ui); color: var(--accent); transition: all 0.3s; }
  .mood-card:hover .preview-box { transform: scale(1.1); background: var(--accent); color: white; }

  .mood-meta { display: flex; flex-direction: column; gap: 0.1rem; }
  .m-name { font-size: 0.8rem; font-weight: 800; color: var(--text-primary); }
  .m-desc { font-size: 0.6rem; color: var(--text-secondary); font-weight: 600; }

  .engine-stats.glass {
    background: var(--bg-surface);
    padding: 1rem;
    border-radius: 1rem;
    border: 1px solid var(--border-ui);
    display: flex;
    flex-direction: column; gap: 0.75rem;
  }

  .stat-row { display: flex; justify-content: space-between; align-items: center; }
  .s-label { font-size: 0.7rem; font-weight: 700; color: var(--text-secondary); }
  .s-val { font-size: 0.7rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; }
  .s-val.secure { color: var(--status-success); }
  .s-val.active { color: var(--accent); }

  /* Challenge Modal */
  .challenge-overlay {
    position: absolute;
    inset: 0;
    z-index: 10000;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .challenge-card {
    background: var(--bg-card);
    border: 1px solid var(--border-ui-heavy);
    border-radius: 2rem;
    padding: 2.5rem;
    max-width: 420px;
    width: 100%;
    text-align: center;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .c-header h2 { font-size: 1.25rem; font-weight: 900; margin: 0.5rem 0; color: var(--text-primary); }
  .c-header p { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin: 0; }

  .c-body { display: flex; flex-direction: column; gap: 0.75rem; }
  .c-body input {
    width: 100%;
    padding: 1rem;
    border-radius: 1rem;
    border: 1px solid var(--border-ui-heavy);
    background: var(--bg-surface-solid);
    color: var(--text-primary);
    text-align: center;
    font-size: 1.1rem;
    letter-spacing: 0.2em;
    outline: none;
    transition: all 0.2s;
  }
  .c-body input:focus { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-glow); }
  .c-body .err { font-size: 0.75rem; color: var(--status-error); font-weight: 700; }

  .c-footer { display: flex; gap: 1rem; }
  .c-footer :global(.base-btn) { flex: 1; }

  .fade-in { animation: fade-in 0.3s ease-out; }
  @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  :global(.text-warning) { color: var(--status-warning); }

  /* Mood Overrides */
  :global(.mood-crystal) .mood-card { background: var(--bg-surface-solid); }
  :global(.mood-crystal) .glass { background: var(--bg-surface); }

  /* MCP Setup Panel Styling */
  .mcp-downloads {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .mcp-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: var(--bg-surface-solid);
    border: 1px solid var(--border-ui);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    height: 32px;
    text-decoration: none;
    transition: all 0.2s;
  }

  .mcp-btn:hover {
    border-color: var(--accent);
    background: var(--bg-card-hover);
    color: var(--accent);
  }

  .mcp-instructions {
    border-top: 1px solid var(--border-ui);
    padding-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .mcp-instructions strong {
    font-size: 0.7rem;
    color: var(--text-primary);
  }

  .mcp-instructions ol {
    margin: 0;
    padding-left: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .mcp-instructions li {
    font-size: 0.65rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  /* Custom Addons Panel styling */
  .addons-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-ui);
    border-radius: 1rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  
  .addons-card .card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .addons-card .card-header h3 {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 800;
  }
  
  .mcp-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.6rem;
    font-weight: 800;
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-ui);
    color: var(--text-muted);
  }
  .mcp-status-pill.connected {
    color: #10b981;
    background: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.2);
  }
  .mcp-status-pill.disconnected {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.2);
  }
  .mcp-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .mcp-status-pill.connected .mcp-status-dot {
    box-shadow: 0 0 6px #10b981;
  }
  
  .addons-card .zone-desc {
    margin: 0;
    font-size: 0.7rem;
    color: var(--text-muted);
    line-height: 1.4;
  }
  
  .addon-actions {
    display: flex;
    gap: 0.5rem;
    width: 100%;
  }
  
  .upload-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: var(--bg-surface-solid);
    border: 1px dashed var(--border-ui);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    height: 32px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .upload-btn:hover {
    border-color: var(--accent);
    background: var(--bg-card-hover);
    color: var(--accent);
  }
  
  .addons-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    border-top: 1px solid var(--border-ui);
    padding-top: 1rem;
  }
  
  .addons-list strong {
    font-size: 0.65rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .addon-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-surface-solid);
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    border: 1px solid var(--border-ui);
    transition: all 0.2s;
  }
  
  .addon-item:hover {
    border-color: var(--border-ui-heavy);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .addon-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  
  .addon-info .name {
    font-size: 0.75rem;
    font-weight: bold;
    color: var(--text-primary);
  }
  
  .addon-info .meta {
    font-size: 0.6rem;
    color: var(--text-muted);
  }
  
  .addon-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .toggle-switch {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
  }
  
  .switch-outer {
    width: 32px;
    height: 18px;
    border-radius: 10px;
    position: relative;
    transition: background 0.2s;
  }
  
  .switch-inner {
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 3px;
    transition: left 0.2s;
  }

  .bundle-form-input {
    width: 100%;
    font-size: 0.8rem !important;
    padding: 0.5rem 0.75rem !important;
    border-radius: 8px !important;
    border: 1px solid var(--border-ui-heavy) !important;
    background: var(--bg-surface-solid) !important;
    color: var(--text-primary) !important;
    text-align: left !important;
    letter-spacing: normal !important;
    outline: none !important;
    transition: all 0.2s !important;
  }
  .bundle-form-input:focus {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 2px var(--accent-glow) !important;
  }

  .bundle-param-row-input {
    flex: 1;
    font-size: 0.7rem !important;
    padding: 0.25rem 0.5rem !important;
    border-radius: 4px !important;
    border: 1px solid var(--border-ui) !important;
    background: var(--bg-card) !important;
    color: var(--text-primary) !important;
    text-align: left !important;
    letter-spacing: normal !important;
    outline: none !important;
    transition: all 0.2s !important;
  }
  .bundle-param-row-input:focus {
    border-color: var(--accent) !important;
  }

  .bundle-param-select {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border-ui);
    outline: none;
    transition: all 0.2s;
  }
  .bundle-param-select:focus {
    border-color: var(--accent);
  }

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
    text-align: left;
  }
  .workflow-card:hover { 
    background: var(--bg-card-hover); 
    border-color: var(--accent); 
    transform: scale(1.02);
    box-shadow: 0 20px 40px -20px rgba(0,0,0,0.3);
  }

  .workflow-info { flex: 1; cursor: pointer; display: flex; flex-direction: column; gap: 0.4rem; text-align: left; }
  .workflow-name { font-size: 0.9rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.01em; }

  .workflow-tags { display: flex; gap: 0.5rem; }
  .tag { font-size: 0.6rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; background: var(--border-ui); padding: 0.15rem 0.5rem; border-radius: 6px; letter-spacing: 0.02em; }

  .workflow-actions { display: flex; gap: 0.4rem; }
  .action-btn { background: var(--border-ui); border: 1px solid var(--border-ui); color: var(--text-muted); cursor: pointer; padding: 0.5rem; border-radius: 0.75rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
  .action-btn:hover { color: var(--text-primary); background: var(--border-ui-heavy); border-color: var(--accent); }
  .action-btn.start { color: var(--status-success); }
  .action-btn.start:hover { background: var(--status-success); color: white; border-color: var(--status-success); }
  .action-btn.delete:hover { color: white; background: var(--status-error); border-color: var(--status-error); }

  .empty-state.glass { text-align: center; padding: 5rem 2rem; border: 1px dashed var(--border-ui); border-radius: 2rem; color: var(--text-muted); background: var(--bg-card); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; }
  .empty-state p { font-weight: 800; color: var(--text-secondary); margin: 1rem 0 0.5rem 0; }

  .view-container { padding-bottom: 5rem; text-align: left; }
  .view-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; border-bottom: 1px solid var(--border-ui); padding-bottom: 1rem; text-align: left; }
  .header-text h2 { font-size: 1.25rem; font-weight: 900; color: var(--text-primary); margin: 0; letter-spacing: -0.02em; }
  .header-text p { font-size: 0.75rem; color: var(--text-secondary); margin: 0.25rem 0 0 0; font-weight: 500; }
</style>
