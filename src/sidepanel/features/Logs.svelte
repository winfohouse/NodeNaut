<script lang="ts">
  import { liveQuery } from 'dexie';
  import { db } from '$shared/services/db';
  import { Terminal, Trash2, ShieldCheck, ChevronDown, ChevronUp, Bug, Search } from '@lucide/svelte';
  import Button from '../components/Button.svelte';
  import { onMount, afterUpdate } from 'svelte';

  const logs = liveQuery(() => 
    db.execution_logs.orderBy('timestamp').toArray() // Natural order for console
  );

  let expandedLogs = new Set<number>();
  let consoleContainer: HTMLDivElement;
  let autoScroll = true;
  let filterText = '';

  onMount(() => {
    scrollToBottom();
  });

  afterUpdate(() => {
    if (autoScroll) scrollToBottom();
  });

  function scrollToBottom() {
    if (consoleContainer) {
      consoleContainer.scrollTop = consoleContainer.scrollHeight;
    }
  }

  function handleScroll(e: Event) {
    const el = e.target as HTMLDivElement;
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 20;
    autoScroll = isAtBottom;
  }

  async function clearLogs() {
    if (!confirm('Clear console?')) return;
    await db.execution_logs.clear();
    expandedLogs.clear();
  }

  function toggleLog(id?: number) {
    if (!id) return;
    if (expandedLogs.has(id)) expandedLogs.delete(id);
    else expandedLogs.add(id);
    expandedLogs = expandedLogs;
  }

  $: filteredLogs = ($logs || []).filter(l => 
    !filterText || 
    l.message.toLowerCase().includes(filterText.toLowerCase()) || 
    l.status.toLowerCase().includes(filterText.toLowerCase())
  );
</script>

<div class="terminal-view">
  <header class="terminal-header">
    <div class="term-title">
      <Terminal size={14} />
      <span>Audit Trail Console</span>
    </div>
    
    <div class="term-actions">
      <div class="filter-box">
        <Search size={12} />
        <input type="text" placeholder="Filter logs..." bind:value={filterText} />
      </div>
      <button class="action-btn" on:click={clearLogs} title="Clear Terminal">
        <Trash2 size={14} />
      </button>
    </div>
  </header>

  <div 
    class="console-output" 
    bind:this={consoleContainer} 
    on:scroll={handleScroll}
  >
    {#if filteredLogs.length > 0}
      {#each filteredLogs as log (log.id)}
        {@const isExpanded = expandedLogs.has(log.id!)}
        <div class="console-line {log.status.toLowerCase()}" class:expanded={isExpanded}>
          <button 
            class="line-content" 
            on:click={() => log.details && toggleLog(log.id)}
            aria-expanded={isExpanded}
            title={log.details ? 'Toggle details' : ''}
          >
            <span class="timestamp">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
            <span class="status-prefix">{log.status.padEnd(7)}</span>
            {#if log.row_index !== undefined}
              <span class="row-tag">Row:{log.row_index + 1}</span>
            {/if}
            <span class="message">
              {#if log.message.includes('Healed')}
                <span class="healing"><ShieldCheck size={10} /> {log.message}</span>
              {:else}
                {log.message}
              {/if}
            </span>
            {#if log.details}
              <span class="detail-hint">{isExpanded ? '[-]' : '[+]'}</span>
            {/if}
          </button>

          {#if isExpanded && log.details}
            <div class="json-payload fade-in">
              <pre><code>{JSON.stringify(log.details, null, 2)}</code></pre>
              {#if log.details.stack}
                <div class="stack-trace">
                  <div class="trace-header"><Bug size={10} /> Stack Trace</div>
                  <pre><code>{log.details.stack}</code></pre>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
      {#if autoScroll}
        <div class="scroll-anchor"></div>
      {/if}
    {:else}
      <div class="console-empty">
        <div class="cursor">_</div>
        <span>Neural Link Standby...</span>
      </div>
    {/if}
  </div>

  <footer class="terminal-footer">
    <div class="status-pill">
      <div class="dot active"></div>
      Live Terminal Output
    </div>
    <div class="log-count">Total Entries: {filteredLogs.length}</div>
  </footer>
</div>

<style>
  .terminal-view {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-card);
    color: var(--text-primary);
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    position: relative;
    border: 1px solid var(--border-ui);
    margin: -1.25rem; /* Negate parent padding */
  }

  .terminal-header {
    background: var(--bg-surface-solid);
    padding: 0.5rem 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-ui);
  }

  .term-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--accent);
  }

  .term-actions { display: flex; align-items: center; gap: 0.75rem; }

  .filter-box {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--bg-app);
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    border: 1px solid var(--border-ui);
  }

  .filter-box input {
    background: none;
    border: none;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.65rem;
    width: 100px;
    outline: none;
  }

  .action-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.2rem;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .action-btn:hover { color: var(--status-error); background: rgba(239, 68, 68, 0.1); }

  .console-output {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
    font-size: 0.7rem;
    line-height: 1.4;
    display: flex;
    flex-direction: column;
  }

  /* Console Lines */
  .console-line {
    padding: 0.1rem 1rem;
    border-left: 2px solid transparent;
    transition: background 0.1s;
  }

  .console-line:hover { background: var(--bg-card-hover); }
  .console-line.expanded { background: var(--bg-surface-solid); border-left-color: var(--accent); }

  .line-content { cursor: pointer; display: flex; align-items: flex-start; gap: 0.6rem; background: none; border: none; width: 100%; text-align: left; font-family: inherit; padding: 0; }

  .timestamp { color: var(--text-muted); user-select: none; opacity: 0.6; }
  .status-prefix { font-weight: 800; min-width: 60px; display: inline-block; }
  .row-tag { color: var(--accent); background: var(--accent-glow); padding: 0 0.3rem; border-radius: 2px; font-size: 0.6rem; }
  .message { flex: 1; word-break: break-word; color: var(--text-primary); }

  /* Status Colors */
  .running .status-prefix { color: var(--accent); }
  .success .status-prefix { color: var(--status-success); }
  .error .status-prefix, .failed .status-prefix { color: var(--status-error); }
  .pending .status-prefix, .waiting .status-prefix { color: var(--status-warning); }

  .healing { color: var(--status-success); display: flex; align-items: center; gap: 0.3rem; }
  .detail-hint { color: var(--text-muted); font-weight: 800; }

  /* JSON Payload */
  .json-payload {
    margin: 0.5rem 2rem;
    background: var(--bg-app);
    padding: 0.75rem;
    border-radius: 4px;
    border: 1px solid var(--border-ui);
  }

  pre { margin: 0; overflow-x: auto; font-family: inherit; }
  code { color: var(--text-secondary); }

  .stack-trace { margin-top: 0.75rem; border-top: 1px solid var(--border-ui); padding-top: 0.75rem; }
  .trace-header { font-size: 0.6rem; color: var(--status-error); font-weight: 800; text-transform: uppercase; display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.4rem; }

  /* Empty State */
  .console-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: var(--text-muted); }
  .cursor { font-size: 1.5rem; animation: blink 1s infinite; color: var(--accent); }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

  .terminal-footer {
    background: var(--bg-surface-solid);
    padding: 0.3rem 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--border-ui);
    font-size: 0.6rem;
    color: var(--text-muted);
  }

  .status-pill { display: flex; align-items: center; gap: 0.4rem; font-weight: 800; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: #475569; }
  .dot.active { background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse 2s infinite; }
  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

  .fade-in { animation: fadeIn 0.2s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

  /* Custom Scrollbar for Console */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
</style>
