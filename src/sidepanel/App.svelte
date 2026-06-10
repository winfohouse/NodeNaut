<script lang="ts">
  import { liveQuery } from 'dexie';
  import { db } from '$shared/services/db';
  import { Activity, Play, Plus, Settings, Trash2 } from '@lucide/svelte';
  import { Messenger } from '$shared/api/messenger';
  import { MessageType } from '$shared/constants/messages';

  const workflows = liveQuery(() => db.workflows.toArray());
  const workflowCount = liveQuery(() => db.workflows.count());
  const recentLogs = liveQuery(() => db.execution_logs.orderBy('timestamp').reverse().limit(5).toArray());

  async function startWorkflow(workflowId: string) {
    const response = await Messenger.send(MessageType.WORKFLOW_START, { workflowId });
    if (!response.success) {
      console.error('Failed to start workflow:', response.error);
    }
  }

  async function addTestWorkflow() {
    const id = crypto.randomUUID();
    await db.workflows.add({
      id,
      name: `Test Workflow ${$workflowCount + 1}`,
      version: 1,
      settings: {},
      created_at: Date.now(),
      updated_at: Date.now()
    });
    
    await db.execution_logs.add({
      workflow_id: id,
      status: 'SUCCESS',
      message: 'Workflow created successfully',
      timestamp: Date.now()
    });
  }
</script>

<main class="container">
  <header class="header">
    <div class="logo">
      <Activity size={20} color="#3b82f6" />
      <h1>FlowPilot</h1>
    </div>
    <button class="icon-btn" title="Settings">
      <Settings size={18} />
    </button>
  </header>

  <section class="stats">
    <div class="stat-card">
      <span class="stat-label">Total Workflows</span>
      <span class="stat-value">{$workflowCount ?? 0}</span>
    </div>
  </section>

  <section class="actions">
    <button class="btn btn-primary" on:click={addTestWorkflow}>
      <Plus size={18} />
      <span>Create Workflow</span>
    </button>
  </section>

  <section class="recent-activity">
    <h2>Recent Activity</h2>
    {#if $recentLogs && $recentLogs.length > 0}
      <ul class="log-list">
        {#each $recentLogs as log}
          <li class="log-item">
            <span class="log-status {log.status.toLowerCase()}"></span>
            <div class="log-info">
              <p class="log-message">{log.message}</p>
              <span class="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
            </div>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty-state">No recent activity found.</p>
    {/if}
  </section>
</main>

<style>
  :global(body) {
    background-color: #f8fafc;
    color: #1e293b;
    margin: 0;
    padding: 0;
  }

  .container {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .logo h1 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
    color: #0f172a;
  }

  .stats {
    display: grid;
    grid-template-columns: 1fr;
  }

  .stat-card {
    background: white;
    padding: 1rem;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #3b82f6;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  .btn-primary {
    background-color: #3b82f6;
    color: white;
    width: 100%;
  }

  .btn-primary:hover {
    background-color: #2563eb;
  }

  .icon-btn {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: background 0.2s;
  }

  .icon-btn:hover {
    background-color: #f1f5f9;
  }

  .recent-activity h2 {
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    margin-bottom: 0.75rem;
  }

  .log-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .log-item {
    background: white;
    padding: 0.75rem;
    border-radius: 0.5rem;
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .log-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 0.375rem;
    flex-shrink: 0;
  }

  .log-status.success {
    background-color: #10b981;
  }

  .log-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .log-message {
    font-size: 0.875rem;
    margin: 0;
    color: #334155;
  }

  .log-time {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .empty-state {
    text-align: center;
    color: #94a3b8;
    font-size: 0.875rem;
    padding: 1rem;
    background: white;
    border-radius: 0.5rem;
    border: 1px dashed #e2e8f0;
  }
</style>
