<script lang="ts">
  import { 
    HelpCircle, Code, MousePointer2, Type, Clock, ShieldCheck, 
    Database, Lock, Unlock, Zap, Search, X, Globe, Layers, Info, Trash2, List, Save, Braces
  } from '@lucide/svelte';
  import { db } from '$shared/services/db';
  import { liveQuery } from 'dexie';
  // @ts-ignore
  import flowscriptDts from '$shared/types/flowscript.d.ts?raw';

  let searchTerm = '';

  // --- Dynamic Parsing Engine ---
  function parseDts(source: string) {
    const sections: Record<string, any[]> = {
      flow: [],
      table: [],
      global: []
    };

    // Extract interfaces
    const interfaceRegex = /declare interface (\w+) {([\s\S]*?)\n}/g;
    let match;

    while ((match = interfaceRegex.exec(source)) !== null) {
      const [_, name, content] = match;
      const members = content.split('\n').filter(l => l.includes('(') || (l.includes(':') && !l.includes('=>')));
      
      const parsedMembers = members.map(line => {
        // Extract JSDoc if present above the line
        const linePos = source.indexOf(line);
        const prevText = source.slice(Math.max(0, linePos - 300), linePos);
        const jsDocMatch = prevText.match(/\/\*\*([\s\S]*?)\*\/\s*$/);
        const desc = jsDocMatch ? jsDocMatch[1].replace(/\*/g, '').replace(/\//g, '').trim() : 'No description available.';

        return {
          name: line.split('(')[0].split(':')[0].trim(),
          signature: line.trim().replace(';', ''),
          desc,
          icon: name.includes('Flow') ? MousePointer2 : (name.includes('Table') ? List : Database)
        };
      });

      if (name === 'FlowEngine') sections.flow = parsedMembers;
      if (name === 'FlowTable') sections.table = parsedMembers;
      if (name.includes('Global')) sections.global = parsedMembers;
    }

    return sections;
  }

  const coreApi = parseDts(flowscriptDts);

  // --- Dynamic Project Data ---
  const globalData = liveQuery(() => db.global_tables.toArray());
  $: globalTables = $globalData || [];

  export let headers: string[] = [];

  $: expressions = [
    { syntax: '{Column}', desc: 'Injects data from the active dataset row.', example: 'Hello {First Name}', icon: Layers },
    { syntax: '{{GLOBAL.slug.field}}', desc: 'Access shared data from the Neural Vault.', example: '{{GLOBAL.config.api_key}}', icon: Database },
    { syntax: '{{JS_LOGIC}}', desc: 'Execute sandboxed JavaScript.', example: '{{$row["Age"] > 18 ? "Adult" : "Minor"}}', icon: Code }
  ];

  $: filteredFlow = coreApi.flow.filter(i => i.signature.toLowerCase().includes(searchTerm.toLowerCase()) || i.desc.toLowerCase().includes(searchTerm.toLowerCase()));
  $: filteredTable = coreApi.table.filter(i => i.signature.toLowerCase().includes(searchTerm.toLowerCase()) || i.desc.toLowerCase().includes(searchTerm.toLowerCase()));
  
  $: hasResults = searchTerm === '' || filteredFlow.length || filteredTable.length;
</script>

<div class="docs-container glass" style="margin-bottom: 2rem;">
  <header class="docs-header">
    <div class="title-row">
      <HelpCircle size={20} class="text-accent" />
      <h2>Neural Knowledge Base</h2>
    </div>
    <div class="search-bar glass">
      <Search size={14} class="text-muted" />
      <input type="text" bind:value={searchTerm} placeholder="Search live commands..." />
      {#if searchTerm}
        <button class="clear-btn" on:click={() => searchTerm = ''}><X size={14} /></button>
      {/if}
    </div>
  </header>

  <div class="scroll-area">
    <!-- 1. Live Project Schema -->
    {#if !searchTerm}
      <div class="section-title">Current Project Environment</div>
      <div class="project-state-grid">
        <div class="state-card glass">
          <div class="card-head"><Braces size={12} /><span>Table Row ($row)</span></div>
          <div class="pills">
            {#each headers as h}<span class="pill">{h}</span>{/each}
            {#if !headers.length}<span class="empty">No columns active</span>{/if}
          </div>
        </div>
        <div class="state-card glass">
          <div class="card-head"><ShieldCheck size={12} /><span>Global Vault (GLOBAL)</span></div>
          <div class="pills">
            {#each globalTables as t}<span class="pill slug">{t.slug}</span>{/each}
            {#if !globalTables.length}<span class="empty">No global items</span>{/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- 2. Dynamic Core API -->
    {#if filteredFlow.length}
      <div class="section-title">Automated Actions (FLOW)</div>
      <div class="doc-grid">
        {#each filteredFlow as item}
          <div class="doc-card glass fade-in">
            <div class="card-head">
              <svelte:component this={item.icon} size={14} class="text-accent" />
              <code>FLOW.{item.signature}</code>
            </div>
            <p>{item.desc}</p>
          </div>
        {/each}
      </div>
    {/if}

    {#if filteredTable.length}
      <div class="section-title">Collection API (Table)</div>
      <div class="doc-grid">
        {#each filteredTable as item}
          <div class="doc-card glass fade-in">
            <div class="card-head">
              <svelte:component this={item.icon} size={14} class="text-accent" />
              <code>Table.{item.signature}</code>
            </div>
            <p>{item.desc}</p>
          </div>
        {/each}
      </div>
    {/if}

    <div class="section-title">Security & Environment</div>
    <div class="security-info glass">
      <div class="s-item">
        <Lock size={14} class="text-warning" />
        <div class="s-text">
          <strong>Elite Encryption</strong>
          <span>Definitions parsed live from: <code>flowscript.d.ts</code></span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .docs-container { padding: 1.25rem; display: flex; flex-direction: column; height: 100%; gap: 1rem; }
  .docs-header { display: flex; flex-direction: column; gap: 1rem; border-bottom: 1px solid var(--border-ui); padding-bottom: 1.25rem; }
  .title-row { display: flex; align-items: center; gap: 0.75rem; }
  .docs-header h2 { font-size: 1.1rem; font-weight: 900; color: var(--text-primary); margin: 0; }

  .search-bar { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 1rem; border-radius: 12px; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); }
  .search-bar input { border: none; background: none; color: var(--text-primary); outline: none; font-size: 0.8rem; font-weight: 600; flex: 1; }
  .clear-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; transition: 0.2s; }
  .clear-btn:hover { color: var(--accent); }

  .scroll-area { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 1.5rem; padding-right: 0.5rem; }
  
  .section-title { font-size: 0.6rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: var(--text-muted); margin-bottom: -0.75rem; margin-top: 0.5rem; }

  .project-state-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .state-card { padding: 1rem; border: 1px solid var(--border-ui); border-radius: 1rem; background: var(--bg-card); }
  .state-card .card-head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; font-size: 0.65rem; font-weight: 800; color: var(--text-primary); opacity: 0.7; }
  .pills { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .pill { padding: 0.2rem 0.6rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 6px; font-size: 0.6rem; font-weight: 700; color: var(--text-secondary); }
  .pill.slug { border-color: var(--accent); color: var(--accent); }
  .empty { font-size: 0.6rem; color: var(--text-muted); font-style: italic; }

  .doc-grid { display: flex; flex-direction: column; gap: 0.75rem; }
  .doc-card { padding: 1.25rem; border: 1px solid var(--border-ui); border-radius: 1rem; background: var(--bg-card); transition: all 0.2s; }
  .doc-card:hover { border-color: var(--accent); transform: translateX(4px); background: var(--bg-card-hover); }
  
  .card-head { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
  .card-head code { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; font-weight: 800; color: var(--accent); }
  
  .doc-card p { font-size: 0.7rem; color: var(--text-secondary); margin: 0; line-height: 1.5; font-weight: 500; }
  
  .security-info { padding: 1.25rem; border: 1px solid var(--border-ui); border-radius: 1rem; display: flex; flex-direction: column; gap: 1rem; background: var(--bg-card); }
  .s-item { display: flex; align-items: flex-start; gap: 1rem; }
  .s-text { display: flex; flex-direction: column; gap: 0.1rem; }
  .s-text strong { font-size: 0.75rem; color: var(--text-primary); }
  .s-text span { font-size: 0.65rem; color: var(--text-secondary); }

  .fade-in { animation: fade-in 0.3s ease-out; }
  @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>
