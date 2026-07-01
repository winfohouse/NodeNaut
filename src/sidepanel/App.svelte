<script lang="ts">
  import { onMount } from 'svelte';
  import { Activity, Zap, Sun, Moon, Terminal, Palette, Sparkles, ShieldAlert } from '@lucide/svelte';
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

  type Mood = 'obsidian' | 'crystal' | 'synthwave' | 'nebula';
  let activeTab: 'workflows' | 'scanner' | 'vault' | 'logs' | 'settings' | 'help' = 'workflows';
  let selectedWorkflowId: string | null = null;
  let currentMood: Mood = 'obsidian';
  let previewMood: Mood | null = null;

  // Security Challenge State
  let isVaultChallenged = false;
  let challengePassword = '';
  let challengeError = '';

  onMount(() => {
    const init = async () => {
      const stored = await chrome.storage.local.get('flowpilot_mood');
      if (stored.flowpilot_mood) {
        currentMood = stored.flowpilot_mood as Mood;
      }
    };
    init();

    // Listen for security challenges from the runner
    const listener = (request: any) => {
      if (request.type === MessageType.VAULT_CHALLENGE) {
        isVaultChallenged = true;
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
    {#if activeTab === 'workflows'}
      {#if selectedWorkflowId}
        <WorkflowEditor workflowId={selectedWorkflowId} onBack={() => selectedWorkflowId = null} />
      {:else}
        <WorkflowList onEdit={(id) => selectedWorkflowId = id} />
      {/if}
    {:else if activeTab === 'scanner'}
      <Scanner />
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
</style>
