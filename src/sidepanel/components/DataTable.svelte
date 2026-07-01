<script lang="ts">
  import {
    Table as TableIcon, Trash2, FileUp, CheckCircle2, XCircle, Clock,
    Plus, Download, RotateCcw, RotateCw, GripVertical, WrapText
  } from '@lucide/svelte';
  import Papa from 'papaparse';
  import { db } from '$shared/services/db';
  import { liveQuery } from 'dexie';
  import { onMount } from 'svelte';
  import EditableLabel from './EditableLabel.svelte';

  // ── Types ────────────────────────────────────────────────
  interface ExecutionLog {
    id?: number;
    workflow_id: string;
    status: string;
    message: string;
    details?: any;
    timestamp: number;
    row_index?: number;
  }

  export let tableId: string | null = null;
  export let onImport: (id: string) => void = () => {};
  export let onDataChange: () => void = () => {};
  export let workflowId: string | null = null;

  let currentTable: any = null;

  // ── History ──────────────────────────────────────────────
  let historyStack: string[] = [];
  let redoStack: string[] = [];
  const MAX_HISTORY = 50;

  // ── Selection ────────────────────────────────────────────
  let selection: { r1: number; c1: number; r2: number; c2: number } | null = null;
  let isSelecting = false;
  let isMovingSelection = false;

  // ── Drag (rows / cols / files) ───────────────────────────
  let draggedRowIndices: number[] = [];
  let draggedColIndices: number[] = [];
  let dragOverRow: number | null = null;
  let dragOverCol: number | null = null;
  let isDraggingRow = false;
  let isDraggingCol = false;
  let isDragOverFile = false;

  // ── Column resize ─────────────────────────────────────────
  let colWidths: Record<string, number> = {};
  let isResizing = false;
  let currentResizingCol: string | null = null;
  let startX = 0;
  let startWidth = 0;

  $: if (tableId) loadTable(tableId);
  $: totalTableWidth = (currentTable?.headers?.reduce((sum: number, h: string) => sum + (colWidths[h] || 140), 0) || 0) + 52;

  const logs = liveQuery(async () => {
    if (!workflowId) return [] as ExecutionLog[];
    const result = await db.execution_logs.where('workflow_id').equals(workflowId).toArray();
    return result as ExecutionLog[];
  });

  async function loadTable(id: string) {
    const table = await db.data_tables.get(id);
    if (!table) return;
    currentTable = table;
    currentTable.headers.forEach((h: string) => { if (!colWidths[h]) colWidths[h] = 140; });
    const snap = snapshot();
    historyStack = [snap];
    redoStack = [];
  }

  function snapshot() {
    if (!currentTable) return '';
    return JSON.stringify({
      headers: [...currentTable.headers],
      rows: (currentTable.rows as Record<string, any>[]).map((r) => ({ ...r }))
    });
  }

  function pushToHistory() {
    if (!currentTable) return;
    const snap = snapshot();
    if (historyStack[historyStack.length - 1] === snap) return;
    historyStack = [...historyStack.slice(-(MAX_HISTORY - 1)), snap];
    redoStack = [];
    historyStack = historyStack;
    redoStack = redoStack;
  }

  function undo() {
    if (historyStack.length <= 1) return;
    const current = historyStack.pop()!;
    redoStack = [...redoStack, current];
    const prev = JSON.parse(historyStack[historyStack.length - 1]);
    currentTable.headers = prev.headers;
    currentTable.rows = prev.rows;
    historyStack = historyStack;
    redoStack = redoStack;
    updateTable(false);
  }

  function redo() {
    if (!redoStack.length) return;
    const next = redoStack.pop()!;
    historyStack = [...historyStack, next];
    const state = JSON.parse(next);
    currentTable.headers = state.headers;
    currentTable.rows = state.rows;
    historyStack = historyStack;
    redoStack = redoStack;
    updateTable(false);
  }

  function handleGlobalKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  });

  async function updateTable(recordHistory = true) {
    if (!currentTable) return;
    if (recordHistory) pushToHistory();
    await db.data_tables.update(currentTable.id, {
      headers: currentTable.headers,
      rows: currentTable.rows
    });
    onDataChange();
  }

  // ── Selection logic ───────────────────────────────────────
  function startSelection(r: number, c: number, e: MouseEvent) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.move-handle')) return;
    if (e.target instanceof HTMLInputElement && !isCellSelected(r, c)) return;
    selection = e.shiftKey && selection
      ? { ...selection, r2: r, c2: c }
      : { r1: r, c1: c, r2: r, c2: c };
    isSelecting = true;
    window.addEventListener('mouseup', stopSelection, { once: true });
  }

  function updateSelection(r: number, c: number) {
    if (!isSelecting || !selection) return;
    selection = { ...selection, r2: r, c2: c };
  }

  function stopSelection() { isSelecting = false; }

  function isCellSelected(r: number, c: number) {
    if (!selection) return false;
    const minR = Math.min(selection.r1, selection.r2), maxR = Math.max(selection.r1, selection.r2);
    const minC = Math.min(selection.c1, selection.c2), maxC = Math.max(selection.c1, selection.c2);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  }

  // ── Move selection ────────────────────────────────────────
  function handleSelectionDragStart(e: DragEvent) {
    if (!selection) return;
    isMovingSelection = true;
    isDraggingRow = false;
    isDraggingCol = false;
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer?.setDragImage(img, 0, 0);
    e.dataTransfer?.setData('text/plain', 'MOVE_SELECTION');
  }

  function handleSelectionDrop(targetR: number, targetC: number) {
    if (!isMovingSelection || !selection || !currentTable) return;
    const minR = Math.min(selection.r1, selection.r2), maxR = Math.max(selection.r1, selection.r2);
    const minC = Math.min(selection.c1, selection.c2), maxC = Math.max(selection.c1, selection.c2);
    const rows = [...(currentTable.rows as Record<string, any>[])];
    const headers = currentTable.headers;
    const data: any[][] = [];
    for (let r = minR; r <= maxR; r++) {
      const row: any[] = [];
      for (let c = minC; c <= maxC; c++) { row.push(rows[r][headers[c]]); rows[r][headers[c]] = ''; }
      data.push(row);
    }
    for (let i = 0; i < data.length; i++) {
      const tr = targetR + i;
      if (tr >= rows.length) break;
      for (let j = 0; j < data[i].length; j++) {
        const tc = targetC + j;
        if (tc >= headers.length) break;
        rows[tr][headers[tc]] = data[i][j];
      }
    }
    currentTable.rows = rows;
    selection = null;
    isMovingSelection = false;
    updateTable(true); // Commit to history after mutation
  }

  // ── Column resize ─────────────────────────────────────────
  function startResize(e: MouseEvent, header: string) {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    currentResizingCol = header;
    startX = e.pageX;
    startWidth = colWidths[header] || 140;
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResize, { once: true });
  }

  function handleResize(e: MouseEvent) {
    if (!isResizing || !currentResizingCol) return;
    colWidths[currentResizingCol] = Math.max(60, startWidth + (e.pageX - startX));
    colWidths = colWidths;
  }

  function stopResize() {
    isResizing = false;
    currentResizingCol = null;
    window.removeEventListener('mousemove', handleResize);
  }

  // ── Row drag ──────────────────────────────────────────────
  function handleRowDragStart(index: number, e: DragEvent) {
    isDraggingRow = true;
    isDraggingCol = false;
    isMovingSelection = false;
    const minR = selection ? Math.min(selection.r1, selection.r2) : index;
    const maxR = selection ? Math.max(selection.r1, selection.r2) : index;
    draggedRowIndices = (index >= minR && index <= maxR && selection)
      ? Array.from({ length: maxR - minR + 1 }, (_, i) => minR + i)
      : [index];
    e.dataTransfer?.setData('text/plain', 'MOVE_ROWS');
  }

  function handleRowDrop(targetIndex: number) {
    if (!isDraggingRow || isMovingSelection) return;
    isDraggingRow = false;
    dragOverRow = null;
    const rows = [...currentTable.rows];
    const items = draggedRowIndices.map(i => rows[i]);
    draggedRowIndices.sort((a, b) => b - a).forEach(i => rows.splice(i, 1));
    const shift = draggedRowIndices.filter(i => i < targetIndex).length;
    rows.splice(Math.max(0, targetIndex - shift), 0, ...items);
    currentTable.rows = rows;
    draggedRowIndices = [];
    updateTable(true);
  }

  // ── Col drag ──────────────────────────────────────────────
  function handleColDragStart(index: number, e: DragEvent) {
    isDraggingCol = true;
    isDraggingRow = false;
    isMovingSelection = false;
    const minC = selection ? Math.min(selection.c1, selection.c2) : index;
    const maxC = selection ? Math.max(selection.c1, selection.c2) : index;
    draggedColIndices = (index >= minC && index <= maxC && selection)
      ? Array.from({ length: maxC - minC + 1 }, (_, i) => minC + i)
      : [index];
    e.dataTransfer?.setData('text/plain', 'MOVE_COLS');
  }

  function handleColDrop(targetIndex: number) {
    if (!isDraggingCol || isMovingSelection) return;
    isDraggingCol = false;
    dragOverCol = null;
    const headers = [...currentTable.headers];
    const items = draggedColIndices.map(i => headers[i]);
    draggedColIndices.sort((a, b) => b - a).forEach(i => headers.splice(i, 1));
    const shift = draggedColIndices.filter(i => i < targetIndex).length;
    headers.splice(Math.max(0, targetIndex - shift), 0, ...items);
    currentTable.headers = headers;
    draggedColIndices = [];
    updateTable(true);
  }

  // ── CRUD ──────────────────────────────────────────────────
  async function addRow() {
    if (!currentTable) return;
    const row: Record<string, any> = {};
    currentTable.headers.forEach((h: string) => row[h] = '');
    currentTable.rows = [...(currentTable.rows as any[]), row];
    updateTable(true);
  }

  async function addColumn() {
    if (!currentTable) return;
    const name = prompt('Column name:');
    if (!name) return;
    const def = prompt('Default value (leave blank for empty):') ?? '';
    currentTable.headers = [...currentTable.headers, name];
    currentTable.rows = (currentTable.rows as Record<string, any>[]).map((r) => ({ ...r, [name]: def }));
    colWidths[name] = 140;
    updateTable(true);
  }

  async function deleteColumn(header: string) {
    if (!currentTable || currentTable.headers.length <= 1) return;
    currentTable.headers = currentTable.headers.filter((h: string) => h !== header);
    currentTable.rows = (currentTable.rows as Record<string, any>[]).map((r) => {
      const nr = { ...r }; delete nr[header]; return nr;
    });
    updateTable(true);
  }

  async function deleteRow(index: number) {
    if (!currentTable) return;
    currentTable.rows = (currentTable.rows as any[]).filter((_: any, i: number) => i !== index);
    updateTable(true);
  }

  async function renameColumn(oldH: string, newH: string) {
    if (!currentTable || oldH === newH || !newH) return;
    const idx = currentTable.headers.indexOf(oldH);
    currentTable.headers[idx] = newH;
    currentTable.rows = (currentTable.rows as Record<string, any>[]).map((r) => {
      const nr = { ...r }; nr[newH] = r[oldH]; delete nr[oldH]; return nr;
    });
    updateTable(true);
  }

  function handleFileUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        const id = crypto.randomUUID();
        const rows = res.data as Record<string, any>[];
        await db.data_tables.add({ id, name: file.name, headers: res.meta.fields || [], rows, created_at: Date.now() });
        onImport(id);
      }
    });
  }

  function handleMergeCSV(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !currentTable) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        const newH = res.meta.fields || [];
        const combined = Array.from(new Set([...currentTable.headers, ...newH]));
        const newData = res.data as Record<string, any>[];
        currentTable.headers = combined;
        currentTable.rows = [
          ...(currentTable.rows as Record<string, any>[]),
          ...newData.map((r) => {
            const nr: Record<string, any> = {};
            combined.forEach((h: string) => nr[h] = r[h] ?? '');
            return nr;
          })
        ];
        updateTable(true);
      }
    });
  }

  function exportCSV() {
    if (!currentTable) return;
    const csv = Papa.unparse({ fields: currentTable.headers, data: currentTable.rows });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${currentTable.name}_export.csv`;
    a.click();
  }

  async function deleteTable() {
    if (!tableId) return;
    await db.data_tables.delete(tableId);
    currentTable = null;
    tableId = null;
  }

  async function handleNewTable() {
    const id = crypto.randomUUID();
    const headers = ['Column 1', 'Column 2'];
    const rows = [{ 'Column 1': '', 'Column 2': '' }];
    await db.data_tables.add({
      id,
      name: 'New Table',
      headers,
      rows,
      created_at: Date.now()
    });
    onImport(id);
  }

  let isAutoExpand = false;

  // ── Row resize ────────────────────────────────────────────
  let rowHeights: Record<string, number> = {};
  let isRowResizing = false;
  let currentResizingRow: string | null = null;
  let startY = 0;
  let startHeight = 0;

  function startRowResize(e: MouseEvent, rowId: string) {
    e.preventDefault();
    e.stopPropagation();
    isRowResizing = true;
    currentResizingRow = rowId;
    startY = e.pageY;
    startHeight = rowHeights[rowId] || 30;
    window.addEventListener('mousemove', handleRowResize);
    window.addEventListener('mouseup', stopRowResize, { once: true });
  }

  function handleRowResize(e: MouseEvent) {
    if (!isRowResizing || !currentResizingRow) return;
    rowHeights[currentResizingRow] = Math.max(22, startHeight + (e.pageY - startY));
    rowHeights = rowHeights;
  }

  function stopRowResize() {
    isRowResizing = false;
    currentResizingRow = null;
    window.removeEventListener('mousemove', handleRowResize);
  }

  function ensureRowIds(rows: any[]) {
    if (!rows) return;
    rows.forEach((r) => {
      if (r && !r._id) {
        Object.defineProperty(r, '_id', {
          value: crypto.randomUUID(),
          writable: true,
          enumerable: false
        });
      }
    });
  }

  $: if (currentTable?.rows) {
    ensureRowIds(currentTable.rows);
  }

  function autoResize(node: HTMLTextAreaElement, params: { value: string; hasCustomHeight: boolean; active: boolean }) {
    const update = () => {
      if (!params.active || params.hasCustomHeight) {
        node.style.height = '';
        return;
      }
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight}px`;
    };
    
    update();
    
    return {
      update(newParams: { value: string; hasCustomHeight: boolean; active: boolean }) {
        params = newParams;
        update();
      }
    };
  }

  function handleCellChange(row: any, header: string, val: string) {
    if (row[header] === val) return;
    row[header] = val;
    updateTable(true);
  }

  // ── CSV Drag & Drop ───────────────────────────────────────
  function handleFileDrop(e: DragEvent) {
    isDragOverFile = false;
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.csv')) return;

    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        if (currentTable) {
          const newH = res.meta.fields || [];
          const combined = Array.from(new Set([...currentTable.headers, ...newH]));
          currentTable.headers = combined;
          currentTable.rows = [
            ...currentTable.rows,
            ...res.data.map((r: any) => {
              const nr: any = {};
              combined.forEach((h: string) => nr[h] = r[h] ?? '');
              return nr;
            })
          ];
          updateTable(true);
        } else {
          const id = crypto.randomUUID();
          const name = file.name;
          const headers = res.meta.fields || [];
          const rows = res.data as Record<string, any>[];
          await db.data_tables.add({ id, name, headers, rows, created_at: Date.now() });
          onImport(id);
        }
      }
    });
  }

  function getRowStatus(i: number) {
    const logsList = ($logs || []) as ExecutionLog[];
    const rowLogs = logsList.filter(l => l.row_index === i);
    if (rowLogs.length === 0) return null;
    return rowLogs.sort((a, b) => b.timestamp - a.timestamp)[0]?.status;
  }
</script>

<div 
  class="sheet-wrap" 
  class:drag-over-file={isDragOverFile}
  role="grid" 
  tabindex="0"
  aria-label="Data table" 
  on:contextmenu|preventDefault
  on:dragover|preventDefault={() => isDragOverFile = true}
  on:dragleave={() => isDragOverFile = false}
  on:drop|preventDefault={handleFileDrop}
>
  {#if currentTable}

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <TableIcon size={14} class="icon-muted" />
        <span class="table-name">{currentTable.name}</span>
        <span class="row-count">{currentTable.rows?.length || 0} rows</span>
      </div>
      <div class="toolbar-right">
        <button class="tb-btn" on:click={undo} disabled={historyStack.length <= 1} title="Undo (Ctrl+Z)">
          <RotateCcw size={13} />
        </button>
        <button class="tb-btn" on:click={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Shift+Z / Ctrl+Y)">
          <RotateCw size={13} />
        </button>
        <div class="sep"></div>
        <label class="tb-btn" title="Merge CSV">
          <FileUp size={13} />
          <input type="file" accept=".csv" on:change={handleMergeCSV} style="display:none" />
        </label>
        <button class="tb-btn" on:click={addColumn} title="Add column"><Plus size={13} /></button>
        <button class="tb-btn" on:click={addRow} title="Add row"><Plus size={13} /><span>Row</span></button>
        <button 
          class="tb-btn" 
          class:active-toggle={isAutoExpand}
          on:click={() => isAutoExpand = !isAutoExpand} 
          title="Toggle text wrapping and auto-expanding rows"
        >
          <WrapText size={13} />
          <span>Wrap</span>
        </button>
        <button class="tb-btn" on:click={exportCSV} title="Export CSV"><Download size={13} /></button>
        <button class="tb-btn danger" on:click={deleteTable} title="Delete table"><Trash2 size={13} /></button>
      </div>
    </div>

    <!-- Grid -->
    <div class="grid-scroll">
      <table class="grid" style="width:{totalTableWidth}px">
        <thead>
          <tr>
            <!-- row-number column -->
            <th class="rn-col"></th>
            {#each (currentTable.headers || []) as header, ci}
              <th
                class:col-dragging={draggedColIndices.includes(ci)}
                class:col-drag-over={dragOverCol === ci && isDraggingCol}
                style="width:{colWidths[header] || 140}px"
                draggable="true"
                on:dragstart={(e) => handleColDragStart(ci, e)}
                on:dragover|preventDefault={() => { if (isDraggingCol) dragOverCol = ci; }}
                on:dragleave={() => { dragOverCol = null; }}
                on:drop={() => handleColDrop(ci)}
              >
                <div class="th-inner">
                  <GripVertical size={11} class="grip" />
                  <EditableLabel value={header} onSave={(nv: string) => renameColumn(header, nv)} />
                  <div class="header-actions">
                    <button class="col-del" on:click={() => deleteColumn(header)} title="Delete column">
                      <Trash2 size={10} />
                    </button>
                    <div
                      class="resizer"
                      on:mousedown={(e) => startResize(e, header)}
                      role="button"
                      tabindex="-1"
                      aria-label="Resize column"
                    ></div>
                  </div>
                </div>
              </th>
            {/each}
            <th class="act-col"></th>
          </tr>
        </thead>
        <tbody>
          {#each (currentTable.rows || []).slice(0, 100) as row, ri}
            {@const status = getRowStatus(ri)}
            <tr
              class:row-dragging={draggedRowIndices.includes(ri)}
              class:row-drag-over={dragOverRow === ri && isDraggingRow}
              style={rowHeights[row._id] ? `height: ${rowHeights[row._id]}px` : ''}
            >
              <!-- row number / status / drag handle -->
              <td
                class="rn-col"
                draggable="true"
                on:dragstart={(e) => handleRowDragStart(ri, e)}
                on:dragover|preventDefault={() => { if (isDraggingRow) dragOverRow = ri; }}
                on:dragleave={() => { dragOverRow = null; }}
                on:drop={() => handleRowDrop(ri)}
                style={rowHeights[row._id] ? `height: ${rowHeights[row._id]}px` : ''}
              >
                <div class="rn-inner">
                  {#if status === 'SUCCESS'}<CheckCircle2 size={12} class="s-ok" />
                  {:else if status === 'ERROR'}<XCircle size={12} class="s-err" />
                  {:else if status === 'RUNNING'}<Clock size={12} class="s-run pulse" />
                  {:else}<span class="rn">{ri + 1}</span>{/if}
                  <GripVertical size={11} class="row-grip" />
                </div>
                <div
                  class="row-resizer"
                  on:mousedown={(e) => startRowResize(e, row._id)}
                  role="button"
                  tabindex="-1"
                  aria-label="Resize row"
                ></div>
              </td>

              {#each (currentTable.headers || []) as header, ci}
                <td
                  class:cell-sel={isCellSelected(ri, ci)}
                  style="width:{colWidths[header] || 140}px"
                  on:mousedown={(e) => startSelection(ri, ci, e)}
                  on:mouseenter={() => updateSelection(ri, ci)}
                  on:dragover|preventDefault
                  on:drop={() => handleSelectionDrop(ri, ci)}
                  role="gridcell"
                  tabindex="-1"
                >
                  {#if isAutoExpand}
                    <textarea
                      class="cell wrap-cell"
                      use:autoResize={{ value: row[header] ?? '', hasCustomHeight: !!rowHeights[row._id], active: isAutoExpand }}
                      value={row[header] ?? ''}
                      on:input={(e) => {
                        if (isAutoExpand && !rowHeights[row._id]) {
                          e.currentTarget.style.height = 'auto';
                          e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                        }
                      }}
                      on:change={(e) => handleCellChange(row, header, (e.target as HTMLTextAreaElement).value)}
                      style={rowHeights[row._id] ? `height: ${rowHeights[row._id] - 2}px; overflow-y: auto;` : ''}
                    />
                  {:else}
                    <input
                      type="text"
                      class="cell"
                      value={row[header] ?? ''}
                      on:change={(e) => handleCellChange(row, header, (e.target as HTMLInputElement).value)}
                      style={rowHeights[row._id] ? `height: ${rowHeights[row._id] - 2}px;` : ''}
                    />
                  {/if}
                  {#if isCellSelected(ri, ci) && ri === Math.max(selection!.r1, selection!.r2) && ci === Math.max(selection!.c1, selection!.c2)}
                    <div
                      class="move-handle"
                      draggable="true"
                      on:dragstart={handleSelectionDragStart}
                      role="button"
                      tabindex="-1"
                      aria-label="Move selection"
                    ></div>
                  {/if}
                </td>
              {/each}

              <td class="act-col">
                <button class="row-del" on:click={() => deleteRow(ri)} title="Delete row">
                  <Trash2 size={10} />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <button class="add-row-btn" on:click={addRow}>
        <Plus size={12} /> Add row
      </button>
    </div>

  {:else}
    <!-- Empty state -->
    <div class="empty-state">
      <FileUp size={40} class="icon-muted" />
      <p>No data loaded</p>
      <div class="empty-actions">
        <label class="btn-primary">
          Import CSV
          <input type="file" accept=".csv" on:change={handleFileUpload} style="display:none" />
        </label>
        <button class="btn-secondary" on:click={handleNewTable}>
          <Plus size={13} /> New table
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  /* ── Layout ───────────────────────────────────────────── */
  .sheet-wrap {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-surface, #fff);
    border: 1px solid var(--border-ui, #e0e0e0);
    border-radius: 6px;
    overflow: hidden;
    font-family: inherit;
    font-size: 13px;
    user-select: none;
    position: relative;
  }

  /* ── Drag & Drop Overlay ──────────────────────────────── */
  .sheet-wrap.drag-over-file {
    border-color: var(--accent, #4f8ef7);
    box-shadow: inset 0 0 0 2px var(--accent, #4f8ef7);
  }
  .sheet-wrap.drag-over-file::after {
    content: 'Drop CSV to inject data';
    position: absolute;
    inset: 0;
    background: rgba(79, 142, 247, 0.1);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: var(--accent, #4f8ef7);
    z-index: 100;
    pointer-events: none;
    font-size: 14px;
    border: 2px dashed var(--accent, #4f8ef7);
    margin: 4px;
    border-radius: 4px;
  }

  /* ── Toolbar ──────────────────────────────────────────── */
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    height: 38px;
    border-bottom: 1px solid var(--border-ui, #e0e0e0);
    background: var(--bg-card-hover, #f5f5f5);
    flex-shrink: 0;
    gap: 8px;
  }
  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .table-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary, #111);
  }
  .row-count {
    font-size: 11px;
    color: var(--text-muted, #888);
  }
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .sep {
    width: 1px;
    height: 16px;
    background: var(--border-ui, #ddd);
    margin: 0 4px;
  }
  .tb-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--text-secondary, #555);
    cursor: pointer;
    padding: 4px 7px;
    font-size: 12px;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .tb-btn:hover:not(:disabled) {
    background: var(--bg-surface-solid, #e8e8e8);
    border-color: var(--border-ui, #ccc);
    color: var(--text-primary, #111);
  }
  .tb-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .tb-btn.danger:hover:not(:disabled) {
    background: rgba(220, 50, 50, 0.08);
    border-color: #dc3232;
    color: #dc3232;
  }

  /* ── Grid scroll ──────────────────────────────────────── */
  .grid-scroll {
    flex: 1;
    overflow: auto;
    min-height: 0;
  }

  /* ── Table ────────────────────────────────────────────── */
  .grid {
    border-collapse: collapse;
    table-layout: fixed;
  }

  /* ── Header row ───────────────────────────────────────── */
  thead tr {
    position: sticky;
    top: 0;
    z-index: 5;
  }
  th {
    background: var(--bg-card-hover, #f0f0f0);
    border-right: 1px solid var(--border-ui, #ddd);
    border-bottom: 2px solid var(--border-ui, #ccc);
    padding: 0;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    color: var(--text-secondary, #555);
    white-space: nowrap;
    overflow: hidden;
    position: relative;
  }
  .th-inner {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 6px 0 4px;
    height: 30px;
    position: relative;
  }
  :global(.grip) {
    color: var(--text-muted, #bbb);
    flex-shrink: 0;
    cursor: grab;
  }
  .col-del {
    background: none;
    border: none;
    color: var(--text-muted, #bbb);
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    opacity: 0;
    transition: opacity 0.15s;
    border-radius: 3px;
    flex-shrink: 0;
  }
  th:hover .col-del { opacity: 1; }
  .col-del:hover { color: #dc3232; background: rgba(220,50,50,0.08); }

  .col-dragging { opacity: 0.4; }
  .col-drag-over { outline: 2px solid var(--accent, #4f8ef7); outline-offset: -2px; }

  /* ── Resizer ──────────────────────────────────────────── */
  .resizer {
    position: absolute;
    right: 0;
    top: 0;
    width: 5px;
    height: 100%;
    cursor: col-resize;
    z-index: 6;
  }
  .resizer:hover { background: var(--accent, #4f8ef7); }

  /* ── Row number column ────────────────────────────────── */
  .rn-col {
    width: 52px;
    min-width: 52px;
    text-align: center;
    background: var(--bg-card-hover, #f5f5f5);
    border-right: 1px solid var(--border-ui, #ddd);
    position: sticky;
    left: 0;
    z-index: 4;
    cursor: move;
    padding: 0;
  }
  .rn-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 100%;
    padding: 0 4px;
  }
  .rn {
    font-size: 11px;
    color: var(--text-muted, #aaa);
    font-variant-numeric: tabular-nums;
  }
  :global(.row-grip) {
    color: var(--text-muted, #ccc);
    opacity: 0;
    transition: opacity 0.15s;
  }
  tr:hover :global(.row-grip) { opacity: 1; }
  :global(.s-ok) { color: #22c55e; }
  :global(.s-err) { color: #ef4444; }
  :global(.s-run) { color: var(--accent, #4f8ef7); }

  /* ── Body rows ────────────────────────────────────────── */
  tbody tr { transition: background 0.1s; }
  tbody tr:hover { background: var(--bg-card-hover, #fafafa); }
  tbody tr.row-dragging { opacity: 0.35; }
  tbody tr.row-drag-over td { border-top: 2px solid var(--accent, #4f8ef7); }

  td {
    padding: 0;
    border-right: 1px solid var(--border-ui, #ebebeb);
    border-bottom: 1px solid var(--border-ui, #ebebeb);
    position: relative;
    overflow: hidden;
    white-space: nowrap;
  }
  td.cell-sel {
    background: rgba(79, 142, 247, 0.08) !important;
    outline: 1px solid var(--accent, #4f8ef7);
    outline-offset: -1px;
    z-index: 2;
  }

  /* ── Cell input ───────────────────────────────────────── */
  .cell {
    width: 100%;
    height: 28px;
    background: transparent;
    border: none;
    padding: 0 8px;
    font-size: 13px;
    color: var(--text-primary, #111);
    outline: none;
    font-family: inherit;
  }
  .cell:focus {
    background: var(--bg-surface-solid, #fff);
    box-shadow: inset 0 0 0 2px var(--accent, #4f8ef7);
  }

  /* ── Move handle (selection corner) ──────────────────── */
  .move-handle {
    position: absolute;
    bottom: -3px;
    right: -3px;
    width: 7px;
    height: 7px;
    background: var(--accent, #4f8ef7);
    border: 1px solid #fff;
    cursor: crosshair;
    z-index: 10;
  }

  /* ── Action column ────────────────────────────────────── */
  .act-col {
    width: 36px;
    min-width: 36px;
    text-align: center;
    padding: 0;
    border-right: none;
  }
  .row-del {
    background: none;
    border: none;
    color: var(--text-muted, #bbb);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    opacity: 0;
    transition: opacity 0.15s;
    border-radius: 3px;
    margin: 0 auto;
  }
  tr:hover .row-del { opacity: 1; }
  .row-del:hover { color: #dc3232; background: rgba(220,50,50,0.08); }

  /* ── Add row button ───────────────────────────────────── */
  .add-row-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    width: 100%;
    padding: 7px 12px;
    background: none;
    border: none;
    border-top: 1px solid var(--border-ui, #ebebeb);
    color: var(--text-muted, #aaa);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    text-align: left;
  }
  .add-row-btn:hover {
    background: var(--bg-card-hover, #f5f5f5);
    color: var(--text-primary, #111);
  }

  /* ── Empty state ──────────────────────────────────────── */
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 3rem;
    color: var(--text-muted, #aaa);
  }
  .empty-state p { font-size: 14px; margin: 0; }
  .empty-actions { display: flex; gap: 10px; margin-top: 8px; }

  .btn-primary {
    background: var(--accent, #4f8ef7);
    color: #fff;
    border: none;
    border-radius: 5px;
    padding: 7px 16px;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .btn-primary:hover { filter: brightness(1.1); }
  .btn-secondary {
    background: var(--bg-surface-solid, #f0f0f0);
    border: 1px solid var(--border-ui, #ddd);
    border-radius: 5px;
    padding: 7px 14px;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-primary, #333);
  }
  .btn-secondary:hover { border-color: var(--accent, #4f8ef7); }

  .row-resizer {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 5px;
    cursor: row-resize;
    z-index: 6;
  }
  .row-resizer:hover {
    background: var(--accent, #4f8ef7);
  }
  .cell.wrap-cell {
    resize: none;
    white-space: pre-wrap;
    word-break: break-all;
    box-sizing: border-box;
    line-height: 1.4;
    padding: 6px 8px;
    display: block;
    overflow-y: hidden;
  }
  .tb-btn.active-toggle {
    background: var(--bg-surface-solid, #e8e8e8);
    border-color: var(--accent, #4f8ef7);
    color: var(--accent, #4f8ef7);
  }

  /* ── Misc ─────────────────────────────────────────────── */
  :global(.icon-muted) { color: var(--text-muted, #aaa); }
  :global(.pulse) { animation: pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
</style>