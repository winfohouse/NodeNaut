<script lang="ts">
  import { LayoutGrid, ScrollText, Settings, Sparkles, Database, Layers } from '@lucide/svelte';
  
  export let activeTab: 'workflows' | 'scanner' | 'vault' | 'logs' | 'settings' | 'help' = 'workflows';
</script>
 
<nav class="navbar glass">
  <button class="nav-item" class:active={activeTab === 'workflows'} on:click={() => activeTab = 'workflows'}>
    <LayoutGrid size={18} />
    <span>Library</span>
  </button>
  <button class="nav-item" class:active={activeTab === 'scanner'} on:click={() => activeTab = 'scanner'}>
    <Layers size={18} />
    <span>Node Bundles</span>
  </button>
  <button class="nav-item" class:active={activeTab === 'vault'} on:click={() => activeTab = 'vault'}>
    <Database size={18} />
    <span>Vault</span>
  </button>
  <button class="nav-item" class:active={activeTab === 'help'} on:click={() => activeTab = 'help'}>
    <Sparkles size={18} />
    <span>Intelligence</span>
  </button>
  <button class="nav-item" class:active={activeTab === 'logs'} on:click={() => activeTab = 'logs'}>
    <ScrollText size={18} />
    <span>Audit</span>
  </button>
  <button class="nav-item" class:active={activeTab === 'settings'} on:click={() => activeTab = 'settings'}>
    <Settings size={18} />
    <span>OS</span>
  </button>
</nav>

<style>
  .navbar.glass {
    display: flex;
    justify-content: space-around;
    background: var(--bg-surface);
    backdrop-filter: blur(var(--glass-blur));
    padding: 0.6rem 0.4rem;
    border-top: 1px solid var(--border-ui);
    z-index: 100;
    transition: all 0.3s;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.4rem;
    flex: 1;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 0.75rem;
    position: relative;
  }

  .nav-item span {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .nav-item:hover {
    color: var(--text-primary);
    background: var(--border-ui);
  }

  .nav-item.active {
    color: var(--accent);
  }

  .nav-item.active::after {
    content: '';
    position: absolute;
    top: -0.6rem;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 2px;
    background: var(--accent);
    box-shadow: 0 0 10px var(--accent-glow);
    border-radius: 2px;
  }
</style>
