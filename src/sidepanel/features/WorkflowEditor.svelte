<script lang="ts">
  import { db } from '$shared/services/db';
  import { VaultService, type VaultState } from '$shared/services/vault';
  import { 
    Play, ChevronLeft, Trash2, Code, Settings2, Lock,
    Unlock, ShieldCheck, ShieldAlert, Eraser, Pause, Square,
    Activity, X, Search, Database, Activity as ActivityIcon, Scissors, Link2,
    Zap, Layers, Globe, Type, Hash, ToggleLeft, Braces, Package, Plus, GitBranch
  } from '@lucide/svelte';
  import { Messenger } from '$shared/api/messenger';
  import { MessageType } from '$shared/constants/messages';
  import type { ScannedField } from '$shared/types/scanner';
  import CodeEditor from '../components/CodeEditor.svelte';
  import DataTable from '../components/DataTable.svelte';
  import Button from '../components/Button.svelte';
  import { onMount } from 'svelte';
  import { ConditionEngine } from '$shared/utils/ConditionEngine';
  import { FlowPilotRegistry } from '$framework/Registry';
  import Launcher from './Launcher.svelte';
  import NeuralCanvas from './NeuralCanvas.svelte';
  import { FileStore } from '../utils/FileStore';

  export let workflowId: string;
  export let onBack: () => void;

  let workflow: any = null;
  let decryptedGraph: { nodes: any[], edges: any[] } | null = null;
  let decryptedSettings: any | null = null;
  
  // Security & Unified Session
  let vaultState: VaultState = 'UNINITIALIZED';
  let isLocked = false;
  let passwordInput = '';
  let securityError = '';
  
  let tableHeaders: string[] = [];
  let isScanning = false;
  let isPicking = false;
  let pickerMode: 'step' | 'condition' = 'step';
  let conditionPickerCallback: ((data: any) => void) | null = null;
  let scannedFields: (ScannedField & { selected?: boolean })[] = [];
  let scanSearchQuery = '';
  let showScanResults = false;

  $: filteredScannedFields = scannedFields.filter(f => 
    !scanSearchQuery || 
    f.label.toLowerCase().includes(scanSearchQuery.toLowerCase()) || 
    f.type.toLowerCase().includes(scanSearchQuery.toLowerCase())
  );
  $: allSelected = filteredScannedFields.length > 0 && filteredScannedFields.every(f => f.selected);
  let activeTab: 'steps' | 'data' | 'settings' = 'steps';
  let editingScriptId: string | null = null;
  let previews: Record<string, string> = {};
  let currentStatus: 'IDLE' | 'RUNNING' | 'PAUSED' | 'SUCCESS' | 'FAILED' | 'WAITING';
  let currentError: string | null = null;
  let currentStepIndex: number | null = null;
  let selectedNodeId: string | null = null;
  let inspectedNodeId: string | null = null;
  let selectedEdgeId: string | null = null;
  let isWiring = false;
  let showValueMenu = false;
  let showRefMenu = false;
  let wireSourceId: string | null = null;
  let activeWiringSource: string | null = null;
  let mousePos = { x: 0, y: 0 };

  // Canvas State (Bound to NeuralCanvas)
  let panX = 0;
  let panY = 0;
  let zoom = 1;

  // History Engine
  let historyStack: string[] = [];
  let redoStack: string[] = [];
  const MAX_HISTORY = 50;

  // Drag & Drop State
  let draggedStepIndex: number | null = null;
  let dragOverStepIndex: number | null = null;

  let allWorkflows: any[] = [];
  let editorFontSize = 14;

  $: editingNode = activeGraph.nodes.find(n => n.id === editingScriptId);

  const registry = FlowPilotRegistry.getInstance();

  onMount(() => {
    const init = async () => {
      await FlowPilotRegistry.discoverPlugins();
      await loadWorkflow();
      await checkEngineStatus();
      allWorkflows = await db.workflows.toArray();
      await loadBundleManifest();
    };
    init();

    // Poll for status or use a more reactive approach
    const statusInterval = setInterval(checkEngineStatus, 1000);

    const listener = (request: any) => {
      if (request.type === MessageType.HUD_UPDATE) {
        if (request.payload.status) currentStatus = request.payload.status;
      }
      if (request.type === 'DB_MODIFIED') {
        loadWorkflow().catch(() => {});
        db.workflows.toArray().then(list => { allWorkflows = list; }).catch(() => {});
      }
      if (request.type === MessageType.PICKER_SELECT) {
        const payload = request.payload;
        const rawField = payload.isBatch ? payload.fields[0] : payload.fields?.[0] || payload;

        // UNIFY: Normalize field structure for framework consumption
        const unifiedField = {
          selector: rawField.selectors?.[0]?.selector || rawField.selector || '',
          candidates: rawField.selectors || rawField.candidates || [],
          label: rawField.label || rawField.metadata?.label || 'Picked Element',
          type: rawField.type,
          metadata: rawField.metadata || {}
        };

        // PRIORITY: If we have a local callback, it means an existing node requested the pick
        if (conditionPickerCallback && typeof conditionPickerCallback === 'function') {
          conditionPickerCallback(unifiedField);
          conditionPickerCallback = null;
          isPicking = false;
          return;
        }
        
        if (payload.isBatch && payload.fields.length > 1) {
          scannedFields = payload.fields.map((f: any) => ({ ...f, selected: true }));
          showScanResults = true;
        } else {
          // Create modern modular node based on the chosen action!
          let nodeType = 'CLICK';
          let interactAction = 'click';

          const chosenType = unifiedField.type;
          if (chosenType === 'TYPE') {
            nodeType = 'TYPE';
            interactAction = 'type';
          } else if (chosenType === 'CLICK') {
            nodeType = 'CLICK';
            interactAction = 'click';
          } else {
            nodeType = 'INTERACT';
            interactAction = chosenType.toLowerCase();
          }

          const manifest = registry.getManifest(nodeType);
          
          const newNode: any = {
            id: crypto.randomUUID(),
            type: nodeType,
            position: { x: 300 - panX, y: 150 - panY },
            state: {
              ...JSON.parse(JSON.stringify(manifest?.initialState || {})),
              selector: unifiedField.selector,
              candidates: unifiedField.candidates,
              interactType: interactAction
            },
            metadata: { 
              label: unifiedField.label,
              ...unifiedField.metadata 
            },
            timestamp: Date.now()
          };

          decryptedGraph = {
            nodes: [...(decryptedGraph?.nodes || []), newNode],
            edges: [...(decryptedGraph?.edges || [])]
          };
          saveWorkflow();
        }
        isPicking = false;
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    // Global listener for opening the Monaco IDE
    const ideListener = (e: any) => {
      editingScriptId = e.detail;
    };
    document.addEventListener('openIDE', ideListener);

    return () => {
      clearInterval(statusInterval);
      chrome.runtime.onMessage.removeListener(listener);
      document.removeEventListener('openIDE', ideListener);
    };
  });

  async function loadWorkflow() {
    workflow = await db.workflows.get(workflowId);
    vaultState = await VaultService.getState();
    
    if (workflow) {
      if (workflow.is_encrypted && vaultState !== 'UNLOCKED') {
        isLocked = true;
      } else {
        await decryptWorkflowData();
        await updateAllPreviews();
      }
      historyStack = [];
      redoStack = [];
      if (!isLocked) pushToHistory(false);
    }
  }

  async function checkEngineStatus() {
    const context = await db.execution_sessions.toCollection().first();
    if (context && context.workflow_id === workflowId) {
      currentStatus = context.status;
      currentStepIndex = context.current_step_index ?? null;
      currentError = context.error || null;
    } else {
      currentStatus = 'IDLE';
      currentStepIndex = null;
      currentError = null;
    }
  }

  async function handleExecution() {
    if (currentStatus === 'IDLE') {
      await Messenger.send(MessageType.WORKFLOW_START, { workflowId });
      currentStatus = 'RUNNING';
    } else if (currentStatus === 'RUNNING') {
      await Messenger.send(MessageType.WORKFLOW_PAUSE, {});
      currentStatus = 'PAUSED';
    } else if (currentStatus === 'PAUSED') {
      await Messenger.send(MessageType.WORKFLOW_RESUME, {});
      currentStatus = 'RUNNING';
    }
  }

  async function handleStop() {
    await Messenger.send(MessageType.WORKFLOW_STOP, {});
    currentStatus = 'IDLE';
  }

  function ensureStartNode(graph: any) {
    if (!graph) return { nodes: [], edges: [] };
    if (!graph.nodes) graph.nodes = [];
    if (!graph.edges) graph.edges = [];
    
    const hasStartNode = graph.nodes.some((n: any) => n.type === 'START');
    if (!hasStartNode) {
      const existingRoot = graph.nodes.find((n: any) => n.isRoot);
      const startNode = {
        id: 'start-node',
        type: 'START',
        position: { x: 250, y: 100 },
        isRoot: true,
        state: {}
      };
      graph.nodes.push(startNode);
      if (existingRoot) {
        existingRoot.isRoot = false;
        graph.edges.push({
          id: crypto.randomUUID(),
          sourceNodeId: 'start-node',
          targetNodeId: existingRoot.id,
          type: 'success'
        });
      } else if (graph.nodes.length > 1) {
        const firstOther = graph.nodes.find((n: any) => n.id !== 'start-node');
        if (firstOther) {
          graph.edges.push({
            id: crypto.randomUUID(),
            sourceNodeId: 'start-node',
            targetNodeId: firstOther.id,
            type: 'success'
          });
        }
      }
      setTimeout(() => saveWorkflow(), 100);
    } else {
      let updated = false;
      graph.nodes.forEach((n: any) => {
        if (n.type === 'START') {
          if (!n.isRoot || n.id !== 'start-node') {
            n.isRoot = true;
            n.id = 'start-node';
            updated = true;
          }
        } else {
          if (n.isRoot) {
            n.isRoot = false;
            updated = true;
          }
        }
      });
      if (updated) {
        setTimeout(() => saveWorkflow(), 100);
      }
    }
    return graph;
  }

  async function decryptWorkflowData() {
    if (!workflow.is_encrypted) {
      decryptedGraph = ensureStartNode(workflow.graph || { nodes: [], edges: [] });
      decryptedSettings = workflow.settings || {};
    } else {
      try {
        const decryptedStr = await VaultService.decrypt(workflow.encrypted_blob!);
        const data = JSON.parse(decryptedStr);
        decryptedGraph = ensureStartNode(data.graph || { nodes: [], edges: [] });
        decryptedSettings = data.settings;
      } catch (e) {
        isLocked = true; 
      }
    }
    
    if (decryptedSettings?.table_id) {
      const table = await db.data_tables.get(decryptedSettings.table_id);
      if (table) tableHeaders = table.headers;
    }
  }

  async function handleUnlock() {
    const success = await VaultService.unlock(passwordInput);
    if (success) {
      vaultState = 'UNLOCKED';
      await decryptWorkflowData();
      await updateAllPreviews();
      isLocked = false;
      securityError = '';
      passwordInput = '';
      pushToHistory(false);
    } else {
      securityError = 'Access Denied: Invalid Master Key.';
    }
  }

  async function handleLockToggle() {
    if (workflow.is_encrypted) {
      const password = prompt('Enter Master Password to remove encryption:');
      if (!password) return;
      try {
        const success = await VaultService.unlock(password);
        if (!success) throw new Error();
        
        await db.workflows.update(workflowId, {
          is_encrypted: false,
          encrypted_blob: undefined,
          graph: decryptedGraph,
          settings: decryptedSettings,
          updated_at: Date.now()
        });
        workflow.is_encrypted = false;
        alert('Workflow set to Public.');
      } catch (e) {
        alert('Unlock failed: Invalid password');
      }
    } else {
      const password = prompt('Confirm Master Password to Encrypt:');
      if (!password) return;
      const success = await VaultService.unlock(password);
      if (!success) { alert('Invalid password.'); return; }

      const encrypted = await VaultService.encrypt(JSON.stringify({ graph: decryptedGraph, settings: decryptedSettings }));
      await db.workflows.update(workflowId, {
        is_encrypted: true,
        encrypted_blob: encrypted,
        graph: { nodes: [], edges: [] }, 
        settings: {},
        updated_at: Date.now()
      });
      workflow.is_encrypted = true;
      isLocked = true;
      decryptedGraph = null;
      decryptedSettings = null;
      alert('Workflow Locked & Encrypted.');
    }
  }

  function snapshot() {
    return JSON.stringify({
      graph: {
        nodes: (decryptedGraph?.nodes || []).map((n: any) => ({ ...n })),
        edges: (decryptedGraph?.edges || []).map((e: any) => ({ ...e }))
      },
      settings: { ...decryptedSettings }
    });
  }

  async function autoMapFields() {
    const targetTableId = decryptedSettings?.table_id || workflow?.settings?.table_id;
    if (!targetTableId) return;
    const table = await db.data_tables.get(targetTableId);
    if (!table) return;

    scannedFields = scannedFields.map(field => {
      if (field.type === 'SUBMIT' || field.type === 'BUTTON') return field;
      const label = (field.label || '').toLowerCase().trim();
      const placeholder = (field.placeholder || '').toLowerCase().trim();
      const match = table.headers.find(h => 
        label.includes(h.toLowerCase()) || 
        h.toLowerCase().includes(label) ||
        placeholder.includes(h.toLowerCase())
      );
      if (match) {
        field.mappedValue = `{${match}}`;
        field.selected = true;
      }
      return field;
    });
  }

  async function syncVariablesToDOM() {
    if (!decryptedGraph?.nodes) return;
    
    for (const node of decryptedGraph.nodes) {
      const state = (node as any).state;
      const value = state?.value || (node as any).value;
      const selector = state?.selector || (node as any).selector;

      if (typeof value === 'string' && value.includes('{') && selector) {
        const resolvedValue = await resolveExpression(value);
        const resolvedSelector = await resolveExpression(selector);
        
        await Messenger.send(MessageType.DOM_INTERACT, {
          action: 'type',
          selector: resolvedSelector,
          value: resolvedValue,
          candidates: state?.candidates || (node as any).candidates,
          metadata: { ...((node as any).metadata || {}), skipHUD: true } 
        });
      }
    }
  }

  function handleDropNode(data: { type: string, x: number, y: number, stateOverride?: string, labelOverride?: string }) {
    const { type, x, y, stateOverride, labelOverride } = data;
    if (type === 'START') {
      alert("A workflow can only have one Start node, which is already present.");
      return;
    }

    const manifest = registry.getManifest(type);
    if (!manifest) return;

    const id = crypto.randomUUID();
    const initialState = JSON.parse(JSON.stringify(manifest.initialState || {}));

    // Apply specialized logic if dragged from specialized Launcher entry
    const finalState = stateOverride ? { ...initialState, ...JSON.parse(stateOverride) } : initialState;
    const finalLabel = labelOverride || manifest.label;

    const newNode: any = {
      id,
      type,
      position: { x, y },
      state: finalState,
      metadata: { label: finalLabel },
      timestamp: Date.now()
    };

    decryptedGraph = {
      nodes: [...(decryptedGraph?.nodes || []), newNode],
      edges: [...(decryptedGraph?.edges || [])]
    };
    selectedNodeId = id;
    inspectedNodeId = id;
    saveWorkflow();
  }

  function handleSelectNode(data: { type: string, stateOverride?: string, labelOverride?: string }) {
    // Add to center of current view
    const x = (300 - panX) / zoom;
    const y = (150 - panY) / zoom;
    handleDropNode({
      type: data.type,
      x,
      y,
      stateOverride: data.stateOverride,
      labelOverride: data.labelOverride
    });
  }

  function handleConnectNode(data: { sourceId: string, targetId: string, portId: string }) {
    const { sourceId, targetId, portId } = data;
    if (!decryptedGraph) return;

    // Check same port multiple connections
    const existing = decryptedGraph.edges.filter(edge => edge.sourceNodeId === sourceId && edge.type === portId);
    const mode = existing.length > 0 ? 'CLONE' : 'MAIN';

    if (decryptedGraph.edges.some(edge => 
      edge.sourceNodeId === sourceId && 
      edge.targetNodeId === targetId && 
      edge.type === portId
    )) return;

    decryptedGraph.edges.push({
      id: crypto.randomUUID(),
      sourceNodeId: sourceId,
      targetNodeId: targetId,
      type: portId,
      mode: mode as any
    });

    decryptedGraph = { ...decryptedGraph };
    saveWorkflow();
  }

  function pushToHistory(clearRedo = true) {
    if (!workflow || isLocked) return;
    const snap = snapshot();
    if (historyStack[historyStack.length - 1] === snap) return;
    historyStack = [...historyStack.slice(-(MAX_HISTORY - 1)), snap];
    if (clearRedo) redoStack = [];
    historyStack = historyStack;
    redoStack = redoStack;
  }

  function undo() {
    if (historyStack.length <= 1) return;
    const current = historyStack.pop()!;
    redoStack = [...redoStack, current];
    const previous = JSON.parse(historyStack[historyStack.length - 1]);
    decryptedGraph = previous.graph;
    decryptedSettings = previous.settings;
    saveWorkflow(false);
    historyStack = historyStack;
    redoStack = redoStack;
  }

  function redo() {
    if (redoStack.length === 0) return;
    const nextStr = redoStack.pop()!;
    historyStack = [...historyStack, nextStr];
    const next = JSON.parse(nextStr);
    decryptedGraph = next.graph;
    decryptedSettings = next.settings;
    saveWorkflow(false);
    historyStack = historyStack;
    redoStack = redoStack;
  }

  async function resolveExpression(val: any): Promise<any> {
    if (typeof val !== 'string' || !val.includes('{')) return val;
    const response = await Messenger.send('RESOLVE_EXPRESSION' as any, { 
      expression: val,
      tableId: decryptedSettings?.table_id
    });
    return response.success ? response.data : val;
  }

  async function updateAllPreviews() {
    if (!decryptedGraph?.nodes) return;
    const newPreviews: Record<string, string> = {};
    for (const node of decryptedGraph.nodes) {
      const state = (node as any).state;
      const value = state?.value || (node as any).value;
      const url = state?.url || (node as any).url;
      const target = value || url;

      if (target && String(target).includes('{')) {
        newPreviews[node.id] = await resolveExpression(String(target));
      }
    }
    previews = newPreviews;
  }

  async function saveWorkflow(recordHistory = true) {
    if (!workflow || isLocked) return;
    if (recordHistory) pushToHistory();
    
    await updateAllPreviews();

    const updateData: any = { 
      updated_at: Date.now(),
      requires_secure_vault: workflow.requires_secure_vault 
    };

    if (workflow.is_encrypted) {
      updateData.encrypted_blob = await VaultService.encrypt(JSON.stringify({ graph: decryptedGraph, settings: decryptedSettings }));
    } else {
      updateData.graph = decryptedGraph;
      updateData.settings = decryptedSettings;
    }
    
    await db.workflows.update(workflowId, updateData);

    // Snapshot versioning
    const lastVersion = await db.workflow_versions.where('workflow_id').equals(workflowId).reverse().first();
    const currentSnapshot = snapshot();
    if (!lastVersion || lastVersion.snapshot !== currentSnapshot) {
      await db.workflow_versions.add({
        workflow_id: workflowId,
        version: (lastVersion?.version || 0) + 1,
        snapshot: currentSnapshot,
        timestamp: Date.now()
      });
    }
  }

  // --- Workflow Management ---
  function removeAction(id: string) {
    if (decryptedGraph) {
      const node = decryptedGraph.nodes.find((n: any) => n.id === id);
      if (node && node.type === 'START') {
        alert("The Start node cannot be deleted.");
        return;
      }
    }
    if (!confirm('Permanent Removal: Are you sure?')) return;
    if (decryptedGraph) {
      decryptedGraph.nodes = decryptedGraph.nodes.filter((n: any) => n.id !== id);
      decryptedGraph.edges = decryptedGraph.edges.filter((e: any) => e.sourceNodeId !== id && e.targetNodeId !== id);
      decryptedGraph = { ...decryptedGraph };
    }
    delete previews[id];
    saveWorkflow();
  }

  function removeEdge(id: string) {
    if (decryptedGraph) {
      decryptedGraph.edges = decryptedGraph.edges.filter(e => e.id !== id);
      decryptedGraph = { ...decryptedGraph };
      selectedEdgeId = null;
      saveWorkflow();
    }
  }

  function clearNodeEdges(id: string) {
    if (!decryptedGraph) return;
    decryptedGraph.edges = decryptedGraph.edges.filter(e => e.sourceNodeId !== id && e.targetNodeId !== id);
    decryptedGraph = { ...decryptedGraph };
    saveWorkflow();
  }

  function toggleEdgeMode(id: string) {
    if (decryptedGraph) {
      const edge = decryptedGraph.edges.find(e => e.id === id);
      if (edge) {
        const siblings = decryptedGraph.edges.filter(e => 
          e.sourceNodeId === edge.sourceNodeId && 
          e.type === edge.type
        );
        
        const otherMain = siblings.find(e => e.id !== id && (e.mode === 'MAIN' || !e.mode));
        const currentMode = edge.mode || 'MAIN';
        let nextMode: string;

        if (currentMode === 'MAIN') {
           if (siblings.length === 1) return; // Must be main if solo
           
           // Toggle away from main: promote someone else first
           nextMode = 'CLONE';
           const candidate = siblings.find(e => e.id !== id);
           if (candidate) candidate.mode = 'MAIN';
        } else if (currentMode === 'CLONE') {
           nextMode = 'FRESH';
        } else { // FRESH
           // Can only become MAIN if nobody else is MAIN
           if (!otherMain) {
             nextMode = 'MAIN';
           } else {
             nextMode = 'CLONE';
           }
        }

        edge.mode = nextMode as any;
        decryptedGraph = { ...decryptedGraph };
        saveWorkflow();
      }
    }
  }

  // --- Actions ---
  async function startPicker(cb: ((data: any) => void) | null = null, mode: 'step' | 'condition' = 'step') {
    isPicking = true;
    pickerMode = mode;
    conditionPickerCallback = cb;
    const isStandalone = cb === null && !selectedNodeId;
    const response = await Messenger.send(MessageType.PICKER_START, {
      source: isStandalone ? 'standalone' : 'node'
    });
    if (!response.success) isPicking = false;
  }

  function clearSequence() {
    if (!confirm('EXTREME DANGER: Clear every step in this sequence?')) return;
    if (decryptedGraph) {
      decryptedGraph.nodes = [];
      decryptedGraph.edges = [];
      decryptedGraph = { ...decryptedGraph };
    }
    previews = {};
    saveWorkflow();
  }

  async function testAction(action: any) {
    let testData = {};
    const targetTableId = decryptedSettings?.table_id || workflow?.settings?.table_id;
    if (targetTableId) {
      const table = await db.data_tables.get(targetTableId);
      if (table && table.rows?.length) {
        testData = table.rows[0];
      }
    }

    console.log(`[FlowPilot] Testing Node [${action.type}]`, action);
    const response = await Messenger.send(MessageType.TEST_NODE, {
      node: action,
      rowData: testData
    });

    if (response && response.success) {
      const result = response.data;
      if (action.type === 'IF_BRANCH' || action.type === 'WAIT_UNTIL') {
        const isTrue = result?.nextPort === 'true' || result?.nextPort === 'success';
        alert(`Logic Test Result: ${isTrue ? 'TRUE' : 'FALSE'}`);
      } else if (result?.error) {
        alert(`Test Failed: ${result.error.message || 'Unknown error'}`);
      } else {
        alert(`Test completed successfully!`);
      }
    } else {
      const errMsg = response?.error?.message || 'Unknown error';
      alert(`Test failed to execute: ${errMsg}`);
    }
  }

  async function highlightAction(nodeOrSelector: any) {
    let selector = '';
    let candidates = null;

    if (typeof nodeOrSelector === 'string') {
      selector = nodeOrSelector;
    } else if (nodeOrSelector) {
      selector = nodeOrSelector.state?.selector || nodeOrSelector.selector || nodeOrSelector.selectors?.[0]?.selector || '';
      candidates = nodeOrSelector.state?.candidates || nodeOrSelector.candidates || nodeOrSelector.selectors || null;
    }

    if (!selector) return;
    await Messenger.send('DOM_HIGHLIGHT' as any, {
      selector,
      candidates
    });
  }

  async function scanPage() {
    isScanning = true;
    const response = await Messenger.send(MessageType.DOM_SCAN, {});
    if (response.success) {
      scannedFields = response.data.map((f: any) => ({ ...f, selected: false }));
      showScanResults = true;
    }
    isScanning = false;
  }

  function toggleSelectAll() {
    const targetState = !allSelected;
    const filteredIds = new Set(filteredScannedFields.map(f => f.selectors?.[0]?.selector || ''));
    scannedFields = scannedFields.map(f => {
      const key = f.selectors?.[0]?.selector || '';
      if (filteredIds.has(key)) {
        return { ...f, selected: targetState };
      }
      return f;
    });
  }

  function addSelectedScanned() {
    const selected = scannedFields.filter(f => f.selected);
    if (!selected.length) {
      showScanResults = false;
      return;
    }

    const newNodes: any[] = [];
    const newEdges: any[] = [];
    let startX = 300 - panX;
    let startY = 150 - panY;

    // Get the last node if graph has nodes to connect to
    let lastNodeId = '';
    const graph = decryptedGraph;
    if (graph && graph.nodes?.length) {
      const leafNodes = graph.nodes.filter(n => 
        !graph.edges.some(e => e.sourceNodeId === n.id)
      );
      if (leafNodes.length) {
        lastNodeId = leafNodes[leafNodes.length - 1].id;
        const lastNode = graph.nodes.find(n => n.id === lastNodeId);
        if (lastNode) {
          startX = lastNode.position.x;
          startY = lastNode.position.y + 150;
        }
      }
    }

    // Import FieldType values to match
    const textTypes = [
      'TEXT',
      'PASSWORD',
      'EMAIL',
      'NUMBER',
      'DATE',
      'TEXTAREA'
    ];

    for (let i = 0; i < selected.length; i++) {
      const field = selected[i];
      const isTextInput = textTypes.includes(String(field.type));
      const type = isTextInput ? 'TYPE' : 'CLICK';
      const manifest = registry.getManifest(type);
      const nodeId = crypto.randomUUID();

      const newNode = {
        id: nodeId,
        type,
        position: { x: startX, y: startY + (i * 150) },
        state: {
          ...JSON.parse(JSON.stringify(manifest?.initialState || {})),
          selector: field.selectors?.[0]?.selector || '',
          candidates: field.selectors || [],
          interactType: isTextInput ? 'type' : 'click'
        },
        metadata: {
          label: field.label || 'Action Step',
          ...field.metadata
        },
        timestamp: Date.now()
      };

      newNodes.push(newNode);

      if (lastNodeId) {
        newEdges.push({
          id: crypto.randomUUID(),
          sourceNodeId: lastNodeId,
          targetNodeId: nodeId,
          type: 'success',
          mode: 'MAIN'
        });
      }
      lastNodeId = nodeId;
    }

    decryptedGraph = {
      nodes: [...(decryptedGraph?.nodes || []), ...newNodes],
      edges: [...(decryptedGraph?.edges || []), ...newEdges]
    };

    showScanResults = false;
    saveWorkflow();
  }

  let currentBundleManifest: any = null;
  async function loadBundleManifest() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const stored = (await chrome.storage.local.get('node_bundles')) as any;
      const bundles = stored.node_bundles || [];
      currentBundleManifest = bundles.find((b: any) => b.id === workflowId) || null;
    }
  }

  function updateTestProp(key: string, value: any) {
    if (!decryptedSettings.test_props) decryptedSettings.test_props = {};
    decryptedSettings.test_props[key] = value;
    saveWorkflow();
  }

  async function saveBundleManifest(updatedInputs: any[]) {
    if (!currentBundleManifest) return;
    currentBundleManifest.inputs = updatedInputs;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const stored = (await chrome.storage.local.get('node_bundles')) as any;
      const bundles = (stored.node_bundles || []) as any[];
      const updatedBundles = bundles.map((b: any) => b.id === workflowId ? { ...currentBundleManifest } : b);
      await chrome.storage.local.set({ node_bundles: updatedBundles });
      await FlowPilotRegistry.discoverPlugins();
    }
    currentBundleManifest = { ...currentBundleManifest };
  }

  function addBundleValueParam(type: string = 'text') {
    if (!currentBundleManifest) return;
    const inputs = currentBundleManifest.inputs || [];
    const count = inputs.filter((i: any) => !['node_ref', 'node_list', 'bundle_ref'].includes(i.type)).length;
    const updatedInputs = [...inputs, {
      name: `value_${count + 1}`,
      label: `Value ${count + 1}`,
      type,
      required: false,
      defaultValue: ''
    }];
    saveBundleManifest(updatedInputs);
  }

  function addBundleRefParam(type: string = 'node_ref') {
    if (!currentBundleManifest) return;
    const inputs = currentBundleManifest.inputs || [];
    const count = inputs.filter((i: any) => ['node_ref', 'nodes_flow', 'bundle_ref'].includes(i.type)).length;
    const friendlyNames: Record<string, string> = { node_ref: 'Step', nodes_flow: 'Flow', bundle_ref: 'Bundle' };
    const updatedInputs = [...inputs, {
      name: `ref_${count + 1}`,
      label: `${friendlyNames[type] || 'Reference'} ${count + 1}`,
      type,
      required: true,
      defaultValue: ''
    }];
    saveBundleManifest(updatedInputs);
  }

  const VALUE_TYPES = ['text', 'number', 'boolean', 'expression'];
  const REF_TYPES = ['node_ref', 'nodes_flow', 'bundle_ref'];
  const TYPE_LABELS: Record<string, string> = {
    value: 'Text Input',
    text: 'Text Input',
    number: 'Number',
    boolean: 'Yes / No',
    expression: 'Formula',
    node_ref: 'Pick a Step',
    nodes_flow: 'Nodes Flow',
    bundle_ref: 'Pick a Bundle'
  };
  const TYPE_HINTS: Record<string, string> = {
    value: 'Any text: URL, selector, message',
    text: 'Any text: URL, selector, message',
    number: 'A numeric value: delay, count',
    boolean: 'A true/false toggle',
    expression: 'A JavaScript expression',
    node_ref: 'User picks ONE step to execute in isolation',
    nodes_flow: 'User picks a starting step, executing the entire connected chain',
    bundle_ref: 'User picks another Node Bundle'
  };
  const TYPE_ICONS: Record<string, any> = {
    value: Type,
    text: Type,
    number: Hash,
    boolean: ToggleLeft,
    expression: Braces,
    node_ref: Play,
    nodes_flow: GitBranch,
    bundle_ref: Package
  };

  function updateBundleParam(index: number, field: string, val: any) {
    if (!currentBundleManifest) return;
    const inputs = [...(currentBundleManifest.inputs || [])];
    inputs[index] = { ...inputs[index], [field]: val };
    // Auto-enforce constraints when type changes
    if (field === 'type' && REF_TYPES.includes(val)) {
      inputs[index].required = true;
      inputs[index].defaultValue = '';
    }
    saveBundleManifest(inputs);
  }

  async function removeBundleParam(index: number) {
    if (!currentBundleManifest || !decryptedGraph) return;
    const param = currentBundleManifest.inputs[index];
    if (!param) return;

    const paramName = param.name;
    let isUsed = false;
    const nodes = decryptedGraph.nodes || [];

    for (const node of nodes) {
      const stateStr = JSON.stringify(node.state || {});
      if (stateStr.includes(`{${paramName}}`) || stateStr.includes(`{variables.${paramName}}`)) {
        isUsed = true;
        break;
      }
    }

    if (isUsed) {
      if (!confirm(`The parameter "${paramName}" is currently referenced inside your flow nodes. Removing it will strip the references from those node configurations. Proceed?`)) {
        return;
      }
      
      const cleanNodes = nodes.map(node => {
        let stateStr = JSON.stringify(node.state || {});
        if (stateStr.includes(`{${paramName}}`) || stateStr.includes(`{variables.${paramName}}`)) {
          stateStr = stateStr
            .replaceAll(`{${paramName}}`, '')
            .replaceAll(`{variables.${paramName}}`, '');
          return { ...node, state: JSON.parse(stateStr) };
        }
        return node;
      });
      
      decryptedGraph.nodes = cleanNodes;
      saveWorkflow();
    } else {
      if (!confirm(`Are you sure you want to delete parameter "${paramName}"?`)) return;
    }

    const updatedInputs = currentBundleManifest.inputs.filter((_: any, idx: number) => idx !== index);
    await saveBundleManifest(updatedInputs);
  }

  $: activeGraph = decryptedGraph || { nodes: [], edges: [] };
  $: activeSettings = decryptedSettings || {};
  $: localVariables = activeGraph?.nodes
    ? Array.from(new Set(
        activeGraph.nodes
          .map((n: any) => n.state?.variableName || n.state?.varName || n.state?.outputVar)
          .filter(Boolean)
      ))
    : [];

  $: validationErrors = (() => {
    const errors: Record<string, string[]> = {};
    if (!workflow || !activeGraph || !activeGraph.nodes) return errors;

    const declaredKeys = new Set(
      workflow.settings?.is_bundle && currentBundleManifest
        ? (currentBundleManifest.inputs || []).map((i: any) => i.name)
        : []
    );

    if (workflow.settings?.is_bundle && currentBundleManifest) {
      for (const node of activeGraph.nodes) {
        const nodeErrors: string[] = [];
        const stateStr = JSON.stringify(node.state || {});

        const matches = stateStr.matchAll(/\{([a-zA-Z0-9_]+)\}/g);
        for (const match of matches) {
          const varName = match[1];
          if (!declaredKeys.has(varName) && varName !== 'all' && varName !== 'index') {
            nodeErrors.push(`Reference to undeclared parameter: "${varName}"`);
          }
        }

        const matchesVars = stateStr.matchAll(/\{variables\.([a-zA-Z0-9_]+)\}/g);
        for (const match of matchesVars) {
          const varName = match[1];
          if (!declaredKeys.has(varName)) {
            nodeErrors.push(`Reference to undeclared parameter: "variables.${varName}"`);
          }
        }

        if (node.type === 'EXECUTE_NODE_REF') {
          let refParamName = node.state?.paramName;
          // Strip curly braces if user typed {ref_1} instead of ref_1
          if (typeof refParamName === 'string' && refParamName.startsWith('{') && refParamName.endsWith('}')) {
            refParamName = refParamName.slice(1, -1);
          }
          // Also strip variables. prefix
          if (typeof refParamName === 'string' && refParamName.startsWith('variables.')) {
            refParamName = refParamName.slice('variables.'.length);
          }
          if (refParamName && !declaredKeys.has(refParamName)) {
            nodeErrors.push(`Referenced parameter "${refParamName}" is not declared`);
          } else if (refParamName) {
            const param = (currentBundleManifest.inputs || []).find((i: any) => i.name === refParamName);
            if (param && param.type !== 'node_ref') {
              nodeErrors.push(`Parameter "${refParamName}" type must be "Pick a Step"`);
            }
          }
        }

        if (nodeErrors.length > 0) {
          errors[node.id] = nodeErrors;
        }
      }
    }
    return errors;
  })();
</script>

<div class="editor-shell">
  {#if workflow}
    <header class="editor-header">
      <button class="back-btn" on:click={onBack} title="Back to Library"><ChevronLeft size={18} /></button>
      <div class="header-info">
        <h1>{workflow.name}</h1>
        <span class="status">Sequence Designer</span>
      </div>
      <div class="header-actions">
        {#if !isLocked}
          {#if !workflow.settings?.is_bundle}
            <div class="control-group">
              {#if currentStatus === 'FAILED' && currentError}
                 <div class="error-pill fade-in">
                    <ShieldAlert size={12} />
                    <span>{currentError}</span>
                 </div>
              {/if}

              {#if currentStatus !== 'IDLE'}
                <button class="icon-btn" on:click={handleStop} title="Stop Workflow">
                  <Square size={14} fill="currentColor" class="text-error" />
                </button>
              {/if}
              
              <Button 
                variant={currentStatus === 'RUNNING' ? 'ghost' : 'primary'} 
                glow={currentStatus !== 'RUNNING'} 
                on:click={handleExecution}
              >
                {#if currentStatus === 'IDLE'}
                  <Play slot="icon" size={14} fill="currentColor" />
                  Execute
                {:else if currentStatus === 'RUNNING'}
                  <Pause slot="icon" size={14} fill="currentColor" />
                  Pause
                {:else if currentStatus === 'PAUSED'}
                  <Play slot="icon" size={14} fill="currentColor" />
                  Resume
                {/if}
              </Button>
            </div>
          {/if}
        {/if}
      </div>
    </header>

    {#if isLocked}
      <div class="lock-screen glass">
        <div class="lock-card">
          <div class="lock-icon"><Lock size={32} /></div>
          <h2>Workflow Protected</h2>
          <p>This sequence is encrypted. Provide your master key to unlock.</p>
          <div class="lock-input">
            <input type="password" bind:value={passwordInput} placeholder="Master Key" on:keydown={(e) => e.key === 'Enter' && handleUnlock()} />
            <Button variant="primary" on:click={handleUnlock} fullWidth>Unlock</Button>
          </div>
          {#if securityError}<div class="error-msg"><ShieldAlert size={14} /><span>{securityError}</span></div>{/if}
        </div>
      </div>
    {:else}
      <nav class="editor-nav">
        <button class:active={activeTab === 'steps'} on:click={() => activeTab = 'steps'}>Canvas Editor</button>
        <button class:active={activeTab === 'data'} on:click={() => activeTab = 'data'}>Variable Pool</button>
        <button class:active={activeTab === 'settings'} on:click={() => activeTab = 'settings'}>Config</button>
      </nav>

      <div class="editor-content">
        <div class="tab-pane" class:hidden={activeTab !== 'steps'}>
          <div class="steps-layout split-view">
            <!-- Scan Overlay -->
            {#if showScanResults}
              <div class="scan-overlay glass fade-in">
                <header class="scan-header">
                  <div class="scan-title">
                    <Search size={18} class="text-accent" />
                    <span>Neural Scan Discovery</span>
                  </div>
                  <div class="scan-actions">
                    <Button variant="ghost" size="sm" on:click={autoMapFields}>
                      <Database slot="icon" size={12} />
                      Neural Map
                    </Button>
                    <Button variant="ghost" size="sm" on:click={() => showScanResults = false}>Dismiss</Button>
                    <Button variant="primary" size="sm" on:click={addSelectedScanned}>Initialize Steps</Button>
                  </div>
                </header>

                <div class="bulk-toolbar" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                   <label class="checkbox-container">
                      <input type="checkbox" checked={allSelected} on:change={toggleSelectAll} />
                      <div class="checkmark"></div>
                      <span class="label">Select all Actionable Fields ({filteredScannedFields.length})</span>
                   </label>
                   
                   <div class="scan-search-box" style="display: flex; align-items: center; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 8px; padding: 0.25rem 0.5rem; flex: 1; max-width: 250px;">
                      <input type="text" placeholder="Search fields..." bind:value={scanSearchQuery} style="background: transparent; border: none; font-size: 0.75rem; color: var(--text-primary); outline: none; width: 100%;" />
                   </div>
                </div>

                <div class="scan-body">
                  {#each filteredScannedFields as field}
                    <div class="scan-field-row" class:selected={field.selected}>
                      <label class="checkbox-container">
                        <input type="checkbox" bind:checked={field.selected} />
                        <div class="checkmark"></div>
                      </label>
                      <div class="field-info">
                        <span class="field-label">{field.label}</span>
                        <span class="field-type">{field.type}</span>
                      </div>
                      <div class="field-mapping">
                         {#if field.mappedValue}
                           <div class="mapping-pill active">Mapped to {field.mappedValue}</div>
                         {/if}
                         <button class="add-btn highlight" on:click={() => highlightAction(field)} title="Preview on Page">
                            <Search size={14} />
                         </button>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <div class="canvas-main">
              <NeuralCanvas 
                bind:nodes={activeGraph.nodes} 
                bind:edges={activeGraph.edges} 
                bind:panX
                bind:panY
                bind:zoom
                {previews}
                {validationErrors}
                selectedNodeId={selectedNodeId}
                selectedEdgeId={selectedEdgeId}
                onNodeClick={(id) => { selectedNodeId = id; selectedEdgeId = null; }}
                onEdgeClick={(id) => { selectedEdgeId = id; selectedNodeId = null; }}
                onNodeDblClick={(id) => {
                  const node = activeGraph.nodes.find(n => n.id === id);
                  if (node?.type === 'SCRIPT') {
                    editingScriptId = node.id;
                  } else {
                    inspectedNodeId = id;
                  }
                  selectedNodeId = id;
                  selectedEdgeId = null;
                }}
                onDeleteNode={(id) => removeAction(id)}
                onDeleteEdge={(id) => removeEdge(id)}
                onToggleEdgeMode={(id) => toggleEdgeMode(id)}
                onDeselectAll={() => { selectedNodeId = null; inspectedNodeId = null; selectedEdgeId = null; }}
                onDrop={handleDropNode}
                onConnect={handleConnectNode}
                onSave={() => saveWorkflow()}
                />
              
              <Launcher 
                isBundle={workflow.settings?.is_bundle || false}
                onDragStart={(type, e) => {
                  if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'copy';
                  }
                }} 
                onScan={scanPage}
                onPicker={() => startPicker()}
                onSelectNode={handleSelectNode}
              />
            </div>

            {#if inspectedNodeId}
              {@const selectedNode = activeGraph.nodes.find(n => n.id === inspectedNodeId)}
              <div class="inspector-side glass fade-in">
                <header class="inspector-header">
                  <div class="header-main">
                    <span class="type-pill">{selectedNode?.type}</span>
                    <h3>{selectedNode?.metadata?.label || 'Node Configuration'}</h3>
                  </div>
                  <div class="header-tools">
                    <button class="icon-btn" on:click={() => inspectedNodeId = null} title="Close Inspector"><X size={16} /></button>
                  </div>
                </header>

                <div class="inspector-body">
                  {#if selectedNode}
                    {@const ConfigComponent = registry.getConfig(selectedNode.type)}
                    {#if ConfigComponent}
                      <svelte:component 
                        this={ConfigComponent} 
                        node={selectedNode}
                        graph={activeGraph}
                        {tableHeaders}
                        localVariables={localVariables}
                        bundleParams={currentBundleManifest ? (currentBundleManifest.inputs || []).map((i: any) => i.name) : []}
                        save={() => saveWorkflow()}
                        startPicker={(cb: (data: any) => void, mode: 'step' | 'condition' = 'step') => {
                          isPicking = true;
                          pickerMode = mode; 
                          conditionPickerCallback = cb;
                          Messenger.send(MessageType.PICKER_START, {});
                        }}
                        highlight={(n: any ) => highlightAction(n)}
                        testAction={(n : any) => testAction(n)}
                      />
                    {:else}
                      <div class="no-config">
                        <ShieldAlert size={24} />
                        <p>No configuration UI found for this node type.</p>
                      </div>
                    {/if}
                  {/if}
                </div>
                
                <footer class="inspector-footer">
                   <Button variant="picker" size="sm" on:click={() => clearNodeEdges(inspectedNodeId!)} title="Detach node from all connections">
                     <Scissors slot="icon" size={14} />
                     Cut All Links
                   </Button>
                   {#if selectedNode?.type !== 'START'}
                     <Button variant="danger" size="sm" on:click={() => removeAction(inspectedNodeId!)}>
                       <Trash2 slot="icon" size={14} />
                       Delete Node
                     </Button>
                   {/if}
                </footer>
              </div>
            {:else if selectedEdgeId}
               {@const selectedEdge = activeGraph.edges.find(e => e.id === selectedEdgeId)}
               {@const sourceNode = activeGraph.nodes.find(n => n.id === selectedEdge?.sourceNodeId)}
               <div class="inspector-side glass fade-in">
                  <header class="inspector-header">
                    <div class="header-main">
                      <span class="type-pill">Connection</span>
                      <h3>Neural Link Configuration</h3>
                    </div>
                    <div class="header-tools">
                      <button class="icon-btn" on:click={() => selectedEdgeId = null} title="Close Inspector"><X size={16} /></button>
                    </div>
                  </header>

                  <div class="inspector-body">
                    <div class="connection-info">
                      <div class="node-link-path">
                        <span class="n-name">{sourceNode?.metadata?.label || 'Source'}</span>
                        <Link2 size={12} />
                        <span class="n-name">{activeGraph.nodes.find(n => n.id === selectedEdge?.targetNodeId)?.metadata?.label || 'Target'}</span>
                      </div>
                    </div>

                    <div class="setting-item">
                      <span class="label-heading">Execution Threading</span>
                      <div class="mode-grid">
                        <button class="mode-btn" class:active={selectedEdge?.mode === 'MAIN' || !selectedEdge?.mode} on:click={() => toggleEdgeMode(selectedEdgeId!)}>
                          <div class="mode-header">
                            <Zap size={12} class="text-accent" />
                            <strong>Exclusive Main</strong>
                          </div>
                          <span>Continue primary sequence in this tab</span>
                        </button>
                        <button class="mode-btn" class:active={selectedEdge?.mode === 'CLONE'} on:click={() => toggleEdgeMode(selectedEdgeId!)}>
                          <div class="mode-header">
                            <Layers size={12} class="text-warning" />
                            <strong>Session Clone</strong>
                          </div>
                          <span>Fork cookies & session into new tab</span>
                        </button>
                        <button class="mode-btn" class:active={selectedEdge?.mode === 'FRESH'} on:click={() => toggleEdgeMode(selectedEdgeId!)}>
                          <div class="mode-header">
                            <Globe size={12} class="text-muted" />
                            <strong>Fresh Start</strong>
                          </div>
                          <span>Parallel start in clean background tab</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <footer class="inspector-footer">
                     <Button variant="danger" size="sm" on:click={() => removeEdge(selectedEdgeId!)}>
                       <Scissors slot="icon" size={14} />
                       Break Connection
                     </Button>
                  </footer>
               </div>
            {/if}
          </div>
        </div>

        <div class="tab-pane" class:hidden={activeTab !== 'data'}>
          {#if workflow.settings?.is_bundle}
            <div class="bundle-guide-wrap" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; height: 100%; overflow-y: auto;">
              <div class="guide-card glass" style="padding: 1.25rem; border-radius: 12px; display: flex; flex-direction: column; gap: 0.75rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui);">
                <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--accent);">
                  <Layers size={18} />
                  <h3 style="margin: 0; font-size: 0.95rem; font-weight: bold; color: var(--text-primary);">Bundle Parameters Guide</h3>
                </div>
                <p style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4; margin: 0;">
                  This sequence acts as a reusable subflow. Any parameters defined in its manifest are available as local variables.
                </p>
                <div style="background: rgba(59, 130, 246, 0.05); padding: 0.75rem; border-radius: 8px; border: 1px dashed var(--border-ui-heavy); font-size: 0.7rem; color: var(--text-secondary); line-height: 1.45;">
                  <strong>How to use inside inputs:</strong><br/>
                  Place the parameter key inside curly braces to resolve its value dynamically. <br/>
                  For example: type <code style="background: var(--bg-card); padding: 0.1rem 0.25rem; border-radius: 4px; color: var(--accent); font-family: monospace;">{'{username}'}</code> or <code style="background: var(--bg-card); padding: 0.1rem 0.25rem; border-radius: 4px; color: var(--accent); font-family: monospace;">{'{variables.username}'}</code> inside any node's text inputs.
                </div>
              </div>

              <div class="guide-card glass" style="padding: 1.25rem; border-radius: 12px; display: flex; flex-direction: column; gap: 0.75rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-ui); padding-bottom: 0.5rem;">
                  <h4 style="margin: 0; font-size: 0.8rem; font-weight: bold; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.35rem;">
                    <Layers size={14} style="color: var(--accent);" />
                    Declared Parameters
                  </h4>
                </div>

                <!-- Two add buttons -->
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  <div style="position: relative; flex: 1;" class="param-add-group">
                    <Button variant="secondary" size="sm" on:click={() => { showValueMenu = !showValueMenu; showRefMenu = false; }} style="width: 100%;">
                      <Plus size={12} slot="icon" />
                      Add Value
                    </Button>
                    {#if showValueMenu}
                      <div class="param-type-menu" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 50; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-top: 4px; overflow: hidden;">
                        {#each VALUE_TYPES as vt}
                          <button
                            on:click={() => { addBundleValueParam(vt); showValueMenu = false; }}
                            style="display: flex; align-items: center; gap: 0.5rem; width: 100%; padding: 0.5rem 0.75rem; border: none; background: transparent; cursor: pointer; text-align: left; color: var(--text-primary); transition: background 0.15s;"
                            class="param-menu-item"
                          >
                            <svelte:component this={TYPE_ICONS[vt]} size={12} style="color: var(--accent); flex-shrink: 0;" />
                            <div style="display: flex; flex-direction: column;">
                              <span style="font-size: 0.72rem; font-weight: 600; line-height: 1.2;">{TYPE_LABELS[vt]}</span>
                              <span style="font-size: 0.58rem; color: var(--text-secondary); line-height: 1.2;">{TYPE_HINTS[vt]}</span>
                            </div>
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                  <div style="position: relative; flex: 1;" class="param-add-group">
                    <Button variant="secondary" size="sm" on:click={() => { showRefMenu = !showRefMenu; showValueMenu = false; }} style="width: 100%;">
                      <Link2 size={12} slot="icon" />
                      Add Reference
                    </Button>
                    {#if showRefMenu}
                      <div class="param-type-menu" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 50; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-top: 4px; overflow: hidden;">
                        {#each REF_TYPES as rt}
                          <button
                            on:click={() => { addBundleRefParam(rt); showRefMenu = false; }}
                            style="display: flex; align-items: center; gap: 0.5rem; width: 100%; padding: 0.5rem 0.75rem; border: none; background: transparent; cursor: pointer; text-align: left; color: var(--text-primary); transition: background 0.15s;"
                            class="param-menu-item"
                          >
                            <svelte:component this={TYPE_ICONS[rt]} size={12} style="color: var(--warning, #f59e0b); flex-shrink: 0;" />
                            <div style="display: flex; flex-direction: column;">
                              <span style="font-size: 0.72rem; font-weight: 600; line-height: 1.2;">{TYPE_LABELS[rt]}</span>
                              <span style="font-size: 0.58rem; color: var(--text-secondary); line-height: 1.2;">{TYPE_HINTS[rt]}</span>
                            </div>
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>

                {#if currentBundleManifest && (currentBundleManifest.inputs || []).length > 0}
                  <!-- VALUE PARAMETERS SECTION -->
                  {@const valueParams = (currentBundleManifest.inputs || []).map((p, i) => ({...p, _origIdx: i})).filter(p => !REF_TYPES.includes(p.type))}
                  {@const refParams = (currentBundleManifest.inputs || []).map((p, i) => ({...p, _origIdx: i})).filter(p => REF_TYPES.includes(p.type))}

                  {#if valueParams.length > 0}
                    <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.25rem;">
                      <span style="font-size: 0.65rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; display: flex; align-items: center; gap: 0.25rem;">
                        <Settings2 size={10} style="color: var(--accent);" />
                        Value Parameters
                      </span>
                      <span style="font-size: 0.55rem; color: var(--text-secondary); opacity: 0.7;">— can have defaults</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.6rem;">
                      {#each valueParams as input}
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-ui); border-left: 3px solid var(--accent);">
                          <!-- Type badge -->
                          <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.6rem; font-weight: 700; color: var(--accent); background: rgba(59,130,246,0.08); padding: 0.15rem 0.5rem; border-radius: 4px;">
                              <svelte:component this={TYPE_ICONS[input.type]} size={10} />
                              <span>{TYPE_LABELS[input.type] || input.type}</span>
                            </div>
                            <span style="font-size: 0.55rem; color: var(--text-secondary); font-style: italic;">{TYPE_HINTS[input.type] || ''}</span>
                          </div>
                          <!-- Key + Label row -->
                          <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 0.15rem;">
                              <span style="font-size: 0.6rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Param Key</span>
                              <input
                                type="text"
                                value={input.name}
                                on:input={(e) => updateBundleParam(input._origIdx, 'name', e.currentTarget.value)}
                                placeholder="e.g. username"
                                style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-ui); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; width: 100%; outline: none;"
                              />
                            </div>
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 0.15rem;">
                              <span style="font-size: 0.6rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Label</span>
                              <input
                                type="text"
                                value={input.label || ''}
                                on:input={(e) => updateBundleParam(input._origIdx, 'label', e.currentTarget.value)}
                                placeholder="e.g. Username"
                                style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-ui); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; width: 100%; outline: none;"
                              />
                            </div>
                          </div>
                          <!-- Type + Default row -->
                          <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 0.15rem;">
                              <span style="font-size: 0.6rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Type</span>
                              <select
                                value={input.type}
                                on:change={(e) => updateBundleParam(input._origIdx, 'type', e.currentTarget.value)}
                                style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-ui); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; width: 100%; outline: none; height: 28px;"
                              >
                                <optgroup label="Value Types">
                                  <option value="text">Text Input</option>
                                  <option value="number">Number</option>
                                  <option value="boolean">Yes / No</option>
                                  <option value="expression">Formula</option>
                                </optgroup>
                                <optgroup label="Reference Types">
                                  <option value="node_ref">Pick a Step</option>
                                  <option value="nodes_flow">Nodes Flow</option>
                                  <option value="bundle_ref">Pick a Bundle</option>
                                </optgroup>
                              </select>
                            </div>
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 0.15rem;">
                              <span style="font-size: 0.6rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Default Value</span>
                              {#if input.type === 'boolean'}
                                <select
                                  value={input.defaultValue || 'false'}
                                  on:change={(e) => updateBundleParam(input._origIdx, 'defaultValue', e.currentTarget.value)}
                                  style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-ui); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; width: 100%; outline: none; height: 28px;"
                                >
                                  <option value="true">Yes (true)</option>
                                  <option value="false">No (false)</option>
                                </select>
                              {:else if input.type === 'number'}
                                <input
                                  type="number"
                                  value={input.defaultValue || ''}
                                  on:input={(e) => updateBundleParam(input._origIdx, 'defaultValue', e.currentTarget.value)}
                                  placeholder="e.g. 1000"
                                  style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-ui); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; width: 100%; outline: none;"
                                />
                              {:else}
                                <input
                                  type="text"
                                  value={input.defaultValue || ''}
                                  on:input={(e) => updateBundleParam(input._origIdx, 'defaultValue', e.currentTarget.value)}
                                  placeholder={input.type === 'expression' ? 'e.g. Date.now()' : 'Default value'}
                                  style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-ui); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; width: 100%; outline: none;"
                                />
                              {/if}
                            </div>
                          </div>
                          <!-- Footer: Required + Remove -->
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.15rem; border-top: 1px solid var(--border-ui); padding-top: 0.35rem;">
                            <label style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.7rem; color: var(--text-primary); cursor: pointer;">
                              <input
                                type="checkbox"
                                checked={input.required || false}
                                on:change={(e) => updateBundleParam(input._origIdx, 'required', e.currentTarget.checked)}
                              />
                              Required
                            </label>
                            <Button variant="danger" size="sm" on:click={() => removeBundleParam(input._origIdx)}>
                              <Trash2 slot="icon" size={10} />
                              Remove
                            </Button>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}

                  <!-- REFERENCE PARAMETERS SECTION -->
                  {#if refParams.length > 0}
                    <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.5rem;">
                      <span style="font-size: 0.65rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; display: flex; align-items: center; gap: 0.25rem;">
                        <Link2 size={10} style="color: var(--warning, #f59e0b);" />
                        Reference Parameters
                      </span>
                      <span style="font-size: 0.55rem; color: var(--text-secondary); opacity: 0.7;">— always required, no defaults</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.6rem;">
                      {#each refParams as input}
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-ui); border-left: 3px solid var(--warning, #f59e0b);">
                          <!-- Type badge -->
                          <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.6rem; font-weight: 700; color: var(--warning, #f59e0b); background: rgba(245,158,11,0.08); padding: 0.15rem 0.5rem; border-radius: 4px;">
                              <svelte:component this={TYPE_ICONS[input.type]} size={10} />
                              <span>{TYPE_LABELS[input.type] || input.type}</span>
                            </div>
                            <span style="font-size: 0.55rem; font-weight: 700; color: var(--warning, #f59e0b); background: rgba(245,158,11,0.1); padding: 0.1rem 0.4rem; border-radius: 4px;">⚡ ALWAYS REQUIRED</span>
                          </div>
                          <!-- Key + Label row -->
                          <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 0.15rem;">
                              <span style="font-size: 0.6rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Param Key</span>
                              <input
                                type="text"
                                value={input.name}
                                on:input={(e) => updateBundleParam(input._origIdx, 'name', e.currentTarget.value)}
                                placeholder="e.g. login_step"
                                style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-ui); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; width: 100%; outline: none;"
                              />
                            </div>
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 0.15rem;">
                              <span style="font-size: 0.6rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Label</span>
                              <input
                                type="text"
                                value={input.label || ''}
                                on:input={(e) => updateBundleParam(input._origIdx, 'label', e.currentTarget.value)}
                                placeholder="e.g. Login Action"
                                style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-ui); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; width: 100%; outline: none;"
                              />
                            </div>
                          </div>
                          <!-- Type row (no default value) -->
                          <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 0.15rem;">
                              <span style="font-size: 0.6rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Type</span>
                              <select
                                value={input.type}
                                on:change={(e) => updateBundleParam(input._origIdx, 'type', e.currentTarget.value)}
                                style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-ui); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; width: 100%; outline: none; height: 28px;"
                              >
                                <optgroup label="Reference Types">
                                  <option value="node_ref">Pick a Step</option>
                                  <option value="nodes_flow">Nodes Flow</option>
                                  <option value="bundle_ref">Pick a Bundle</option>
                                </optgroup>
                                <optgroup label="Value Types">
                                  <option value="text">Text Input</option>
                                  <option value="number">Number</option>
                                  <option value="boolean">Yes / No</option>
                                  <option value="expression">Formula</option>
                                </optgroup>
                              </select>
                            </div>
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 0.15rem;">
                              <span style="font-size: 0.6rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Default</span>
                              <div style="font-size: 0.65rem; color: var(--text-secondary); font-style: italic; padding: 0.35rem 0.5rem; background: rgba(245,158,11,0.04); border: 1px dashed var(--border-ui); border-radius: 6px;">
                                No default — set when used in a flow
                              </div>
                            </div>
                          </div>
                          <!-- Footer: Required badge + Remove -->
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.15rem; border-top: 1px solid var(--border-ui); padding-top: 0.35rem;">
                            <span style="font-size: 0.65rem; color: var(--text-secondary); font-style: italic;">User must pick this when using the bundle</span>
                            <Button variant="danger" size="sm" on:click={() => removeBundleParam(input._origIdx)}>
                              <Trash2 slot="icon" size={10} />
                              Remove
                            </Button>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}

                  {#if valueParams.length === 0 && refParams.length === 0}
                    <div style="font-size: 0.7rem; color: var(--text-secondary); font-style: italic; text-align: center; padding: 1rem; border: 1px dashed var(--border-ui); border-radius: 8px;">
                      No parameters yet. Use the buttons above to add one.
                    </div>
                  {/if}
                {:else}
                  <div style="font-size: 0.7rem; color: var(--text-secondary); font-style: italic; text-align: center; padding: 1rem; border: 1px dashed var(--border-ui); border-radius: 8px;">
                    No parameters yet. Use the buttons above to add one.
                  </div>
                {/if}
              </div>

              <div class="guide-card glass" style="padding: 1.25rem; border-radius: 12px; display: flex; flex-direction: column; gap: 0.75rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui);">
                <h4 style="margin: 0; font-size: 0.8rem; font-weight: bold; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.05em;">Developer Guidance</h4>
                <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.7rem; color: var(--text-secondary); line-height: 1.45;">
                  <div>
                    <strong style="color: var(--accent); display: block; margin-bottom: 0.2rem;">1. Map & Run Referenced Nodes (Props)</strong>
                    To invoke a node passed to your bundle (e.g. invoking a node reference parameter named <code style="font-family: monospace; color: var(--text-primary);">v1</code>):
                    <ol style="margin: 0.25rem 0; padding-left: 1.25rem;">
                      <li>Drag a new <strong style="color: var(--text-primary);">Execute Node Reference</strong> node onto the canvas.</li>
                      <li>Set its parameter key config field to <code style="font-family: monospace; color: var(--accent);">v1</code>.</li>
                      <li>The subflow will execute that external subnode step-by-step in the context of the subflow.</li>
                    </ol>
                  </div>
                  <div>
                    <strong style="color: var(--accent); display: block; margin-bottom: 0.2rem;">2. Use Dynamic Expressions</strong>
                    To map string values/formulas (e.g. <code style="font-family: monospace; color: var(--text-primary);">v2</code>):
                    <div style="padding-left: 0.5rem; border-left: 2px solid var(--border-ui-heavy);">
                      Simply type <code style="font-family: monospace; color: var(--accent);">{'{v2}'}</code> inside any textboxes (e.g., Click selector, URL, Type inputs). The subflow runner resolves this dynamically.
                    </div>
                  </div>
                  <div>
                    <strong style="color: var(--accent); display: block; margin-bottom: 0.2rem;">3. Return Values to Parent Flow</strong>
                    All variables modified during subflow execution are scoped locally, but automatically copied back to parent scope on termination.
                    <div style="padding-left: 0.5rem; border-left: 2px solid var(--border-ui-heavy);">
                      For example: run a Script node executing <code style="font-family: monospace; color: var(--text-primary);">await vars.set('result', data)</code>. When the subflow exits, the parent flow can reference <code style="font-family: monospace; color: var(--accent);">{'{result}'}</code>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {:else}
            <DataTable 
              workflowId={workflowId} 
              tableId={decryptedSettings?.table_id || workflow?.settings?.table_id} 
              onImport={async (id) => { 
                if (decryptedSettings) {
                  decryptedSettings.table_id = id;
                  await saveWorkflow();
                  await loadWorkflow();
                }
              }} 
              onDataChange={async () => {
                await updateAllPreviews();
                await syncVariablesToDOM();
              }}
            />
          {/if}
        </div>

        <div class="tab-pane" class:hidden={activeTab !== 'settings'}>
          <div class="settings-wrap">
            <div class="settings-card glass">
              <div class="card-header">
                <Settings2 size={16} />
                <h3>General Configuration</h3>
              </div>
              <div class="setting-item">
                <label for="wf-name">Human Identity (Name)</label>
                <input id="wf-name" type="text" value={workflow.name} on:change={(e) => { if (workflow) { workflow.name = (e.target as HTMLInputElement).value; db.workflows.update(workflowId, { name: workflow.name }); } }} placeholder="Sequence Name" />
              </div>
              
              <div class="setting-item security-toggle-item">
                <label class="secure-flow-toggle" class:active={workflow.requires_secure_vault}>
                  <input type="checkbox" checked={workflow.requires_secure_vault || false} on:change={(e) => { if (workflow) { workflow.requires_secure_vault = (e.target as HTMLInputElement).checked; saveWorkflow(); } }} />
                  <div class="check-box"><div class="dot"></div></div>
                  <div class="check-label">
                    <strong>Explicitly Mark as Secure Flow</strong>
                    <span>Always demand Master Key before every execution attempt.</span>
                  </div>
                </label>
              </div>
            </div>

            {#if workflow.settings?.is_bundle && currentBundleManifest}
              <div class="settings-card glass test-props-card">
                <div class="card-header">
                  <Play size={16} />
                  <h3>Standalone Test Properties</h3>
                </div>
                <p class="zone-desc" style="margin-top: -0.5rem; font-size: 0.65rem; color: var(--text-muted);">
                  Set mock parameter values to test-execute this node bundle standalone.
                </p>

                {#each currentBundleManifest.inputs || [] as input}
                  <div class="setting-item" style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <label for="test-prop-{input.name}" style="font-size: 0.75rem; font-weight: 700; color: var(--text-primary);">{input.label || input.name} ({input.type})</label>
                    <input 
                      id="test-prop-{input.name}"
                      type="text" 
                      value={decryptedSettings?.test_props?.[input.name] ?? ''} 
                      on:input={(e) => updateTestProp(input.name, e.currentTarget.value)}
                      placeholder="e.g. {input.placeholder || 'mock value'}"
                      style="width: 100%; padding: 0.5rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 8px; color: var(--text-primary); font-size: 0.75rem;" 
                    />
                  </div>
                {/each}
                {#if (currentBundleManifest.inputs || []).length === 0}
                  <span style="font-size: 0.7rem; color: var(--text-muted); font-style: italic; text-align: center;">No input parameters declared in bundle manifest.</span>
                {/if}
              </div>
            {/if}

            <div class="settings-card glass security">
              <div class="card-header">
                <ShieldCheck size={16} />
                <h3>Neural Vault Security</h3>
              </div>
              {#if workflow.is_encrypted}
                <div class="security-status locked">
                  <Lock size={24} class="text-warning" />
                  <div class="status-main">
                    <strong>Sequence Encrypted</strong>
                    <p>Actions and settings are protected by AES-GCM encryption.</p>
                  </div>
                  <Button variant="scan" size="sm" on:click={handleLockToggle}>Unlock Permanently</Button>
                </div>
              {:else}
                <div class="security-status unlocked">
                  <Unlock size={24} class="text-muted" />
                  <div class="status-main">
                    <strong>Sequence Public</strong>
                    <p>Sequence data is stored in plaintext for high-speed local access.</p>
                  </div>
                  <Button variant="primary" size="sm" on:click={handleLockToggle}>Establish Encryption</Button>
                </div>
              {/if}
            </div>

            <div class="settings-card glass danger-zone">
              <div class="card-header">
                <Trash2 size={16} class="text-error" />
                <h3>Maintenance & Safety</h3>
              </div>
              <p class="zone-desc">Permanent actions that cannot be reversed. Use with extreme caution.</p>
              <div class="zone-actions">
                <Button variant="danger" size="sm" fullWidth on:click={clearSequence}>
                  <Eraser slot="icon" size={14} />
                  Purge All Steps
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <div class="loader-overlay" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 1rem; color: var(--text-muted);">
      <div class="pulse-icon"><Activity size={32} /></div>
      <p>Synchronizing Neural Sequence...</p>
    </div>
  {/if}

  {#if editingScriptId && editingNode}
    <div class="full-editor-overlay glass fade-in">
      <div class="full-editor-container">
        <header class="full-editor-header">
          <div class="header-left">
            <Code size={18} class="text-accent" />
            <div class="header-info">
              <h3>FlowScript IDE</h3>
              <span>Editing Logic for: {editingNode.metadata?.label || 'Unnamed Step'}</span>
            </div>
          </div>
          <div class="header-right">
            <div class="font-controls glass">
              <button on:click={() => editorFontSize = Math.max(8, editorFontSize - 1)} title="Decrease Font">-</button>
              <span class="font-size-val">{editorFontSize}px</span>
              <button on:click={() => editorFontSize = Math.min(32, editorFontSize + 1)} title="Increase Font">+</button>
            </div>
            <Button variant="primary" on:click={() => testAction(editingNode)}>
              <Play slot="icon" size={14} fill="currentColor" />
              Execute Test
            </Button>
            <Button variant="ghost" on:click={() => editingScriptId = null}>
              <X slot="icon" size={14} />
              Close IDE
            </Button>
          </div>
        </header>
        <div class="full-editor-body">
          <CodeEditor 
            value={editingNode.state?.code || editingNode.value || ''} 
            headers={tableHeaders} 
            bundleParams={currentBundleManifest ? (currentBundleManifest.inputs || []).map((i: any) => i.name) : []}
            localVariables={localVariables}
            fontSize={editorFontSize}
            onChange={(val) => { 
              if (editingNode.state) {
                editingNode.state.code = val;
              } else {
                editingNode.value = val;
              }
              saveWorkflow(); 
            }} 
          />
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .param-menu-item:hover {
    background: var(--bg-hover, rgba(59,130,246,0.08)) !important;
  }
  .full-editor-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 999999;
    background: var(--bg-app);
    display: flex;
    flex-direction: column;
    padding: 0;
    animation: fade-in 0.2s ease-out;
  }
  .full-editor-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--bg-card);
    overflow: hidden;
  }
  .full-editor-header {
    padding: 0.75rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-ui);
    background: var(--bg-surface-solid);
  }
  .full-editor-header .header-left {
    display: flex;
    align-items: center; gap: 1rem;
  }
  .full-editor-header .header-info {
    display: flex;
    flex-direction: column;
  }
  .full-editor-header h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 800;
    color: var(--text-primary);
  }
  .full-editor-header span {
    font-size: 0.7rem;
    color: var(--text-muted);
  }
  .full-editor-header .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .font-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    border-radius: 8px;
    background: var(--bg-surface-solid);
    border: 1px solid var(--border-ui);
  }
  .font-controls button {
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0 0.25rem;
    line-height: 1;
  }
  .font-controls button:hover {
    color: var(--accent);
  }
  .font-size-val {
    font-size: 0.7rem;
    font-weight: 800;
    color: var(--text-muted);
    min-width: 30px;
    text-align: center;
  }
  .full-editor-body {
    flex: 1;
    position: relative;
    padding: 0;
    overflow: hidden;
  }

  .editor-shell { height: 100vh; display: flex; flex-direction: column; background: var(--bg-surface); position: relative; }
  .editor-header { padding: 1.25rem 1rem; display: flex; align-items: center; gap: 1rem; border-bottom: 1px solid var(--border-ui); }
  .back-btn { background: var(--bg-card); border: 1px solid var(--border-ui); color: var(--text-muted); padding: 0.4rem; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
  .header-info h1 { font-size: 1rem; margin: 0; color: var(--text-primary); font-weight: 800; }
  .header-info .status { font-size: 0.6rem; color: var(--accent); font-weight: 900; text-transform: uppercase; }
  .header-actions { margin-left: auto; }
  .control-group { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .editor-nav { display: flex; padding: 0 1rem; gap: 1.5rem; border-bottom: 1px solid var(--border-ui); background: var(--bg-card-hover); }
  .editor-nav button { background: none; border: none; padding: 1rem 0; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; text-transform: uppercase; }
  .editor-nav button.active { color: var(--accent); border-bottom-color: var(--accent); }
  .editor-content { flex: 1; overflow: auto; padding: 1.25rem; display: flex; flex-direction: column; -webkit-user-select: none; /* Safari */ -ms-user-select: none;     /* IE 10+ and Edge */ user-select: none;         /* Standard syntax */}
  .tab-pane { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
  .tab-pane.hidden { display: none !important; }
  .steps-layout { display: flex; flex: 1; min-height: 0; min-width: 0; overflow: hidden; }
  .steps-layout.split-view { flex-direction: row; gap: 0; }
  
  .canvas-main { flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column; }

  .inspector-side { width: 450px; max-width: 100%; background: var(--bg-card); border-left: 1px solid var(--border-ui); display: flex; flex-direction: column; z-index: 10; box-shadow: var(--shadow-elite); }

  @media (max-width: 768px) {
    .steps-layout.split-view {
      flex-direction: column;
    }
    .inspector-side {
      width: 100%;
      height: 300px;
      max-height: 45%;
      border-left: none;
      border-top: 1px solid var(--border-ui);
      z-index: 10;
      box-shadow: 0 -10px 30px -10px rgba(0, 0, 0, 0.3);
    }
  }
  .inspector-header { padding: 1.25rem; border-bottom: 1px solid var(--border-ui); display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface-solid); }
  .header-main { display: flex; flex-direction: column; gap: 0.4rem; }
  .header-main h3 { margin: 0; font-size: 0.9rem; font-weight: 800; color: var(--text-primary); }
  .type-pill { font-size: 0.55rem; font-weight: 900; background: var(--accent-glow); color: var(--accent); padding: 0.2rem 0.6rem; border-radius: 20px; text-transform: uppercase; width: fit-content; border: 1px solid var(--accent); }
  
  .inspector-body { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
  .inspector-footer { padding: 1rem; border-top: 1px solid var(--border-ui); background: var(--bg-surface-solid); display: flex; gap: 0.5rem; }

  .no-config { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: var(--text-muted); opacity: 0.6; }
  .no-config p { font-size: 0.75rem; font-weight: 600; }
  
  .lock-screen { position: absolute; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
  .lock-card { background: var(--bg-card); padding: 3rem; border-radius: 2rem; border: 1px solid var(--border-ui); text-align: center; max-width: 400px; box-shadow: var(--shadow-elite); }
  .lock-input { display: flex; flex-direction: column; gap: 1rem; margin-top: 2rem; }
  .lock-input input { padding: 1rem; border: 1px solid var(--border-ui); border-radius: 1rem; background: var(--bg-surface-solid); color: var(--text-primary); text-align: center; font-size: 1rem; outline: none; }
  .error-msg { margin-top: 1rem; color: var(--status-error); font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }

  .settings-wrap { display: flex; flex-direction: column; gap: 1.5rem; height: 100%; overflow-y: auto; padding-right: 0.25rem; }
  .settings-card { padding: 1.5rem; border-radius: 1.5rem; background: var(--bg-card); border: 1px solid var(--border-ui); display: flex; flex-direction: column; gap: 1.25rem; }
  .card-header { display: flex; align-items: center; gap: 0.75rem; color: var(--accent); border-bottom: 1px solid var(--border-ui); padding-bottom: 0.75rem; margin-bottom: 0.25rem; }
  .card-header h3 { font-size: 0.8rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-primary); margin: 0; }
  
  .setting-item { display: flex; flex-direction: column; gap: 0.5rem; }
  .setting-item label { font-size: 0.65rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .setting-item input[type="text"] { padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid var(--border-ui); background: var(--bg-surface-solid); color: var(--text-primary); outline: none; font-weight: 600; }

  .security-status { display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem; border-radius: 1rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); }
  .status-main { flex: 1; }
  .status-main strong { display: block; font-size: 0.85rem; color: var(--text-primary); margin-bottom: 0.25rem; }
  .status-main p { font-size: 0.7rem; color: var(--text-secondary); margin: 0; }

  .danger-zone { border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.02); }
  .zone-desc { font-size: 0.7rem; color: var(--text-muted); margin: 0; font-style: italic; }

  .secure-flow-toggle { display: flex; align-items: center; gap: 1rem; cursor: pointer; background: var(--bg-surface-solid); padding: 1rem; border-radius: 1rem; border: 1px solid var(--border-ui); transition: all 0.2s; }
  .check-box { width: 40px; height: 20px; background: var(--border-ui); border-radius: 20px; position: relative; transition: all 0.3s; flex-shrink: 0; }
  .check-box .dot { position: absolute; left: 4px; top: 4px; width: 12px; height: 12px; background: white; border-radius: 50%; transition: all 0.3s; }
  input:checked + .check-box { background: var(--status-warning); }
  input:checked + .check-box .dot { left: 24px; }
  .check-label { display: flex; flex-direction: column; }
  .check-label strong { font-size: 0.8rem; color: var(--text-primary); }
  .check-label span { font-size: 0.65rem; color: var(--text-muted); }

  .scan-overlay { position: absolute; inset: 0; z-index: 1000; background: var(--bg-surface); display: flex; flex-direction: column; padding: 1.5rem; animation: fade-in 0.3s ease-out; }
  .scan-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
  .scan-title { display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; font-weight: 900; color: var(--text-primary); }
  .scan-actions { display: flex; gap: 0.5rem; }
  
  .bulk-toolbar { padding-bottom: 1rem; border-bottom: 1px solid var(--border-ui); margin-bottom: 1rem; }
  
  .scan-body { flex: 1; overflow-y: auto; padding-right: 0.5rem; }
  .scan-field-row { display: flex; align-items: center; gap: 1rem; padding: 0.85rem; border: 1px solid var(--border-ui); border-radius: 12px; margin-bottom: 0.5rem; transition: all 0.2s; background: var(--bg-card); }
  .scan-field-row:hover { border-color: var(--accent); background: var(--bg-card-hover); }
  .scan-field-row.selected { border-color: var(--accent); background: var(--accent-glow); }
  
  .field-info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
  .field-label { font-size: 0.8rem; font-weight: 700; color: var(--text-primary); }
  .field-type { font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; }
  
  .field-mapping { display: flex; align-items: center; gap: 0.5rem; }
  .mapping-pill { display: flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.6rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 20px; font-size: 0.65rem; font-weight: 700; color: var(--text-muted); }
  .mapping-pill.active { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }
  
  .add-btn { background: var(--bg-surface-solid); border: 1px solid var(--border-ui); color: var(--text-secondary); padding: 0.4rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
  .add-btn:hover { color: var(--accent); border-color: var(--accent); background: var(--accent-glow); }
  .add-btn.highlight:hover { color: var(--status-warning); border-color: var(--status-warning); background: rgba(245, 158, 11, 0.1); }
  
  .node-link-path { display: flex; align-items: center; gap: 0.75rem; background: var(--bg-surface-solid); padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid var(--border-ui); margin-bottom: 1.5rem; }
  .node-link-path .n-name { font-size: 0.75rem; font-weight: 800; color: var(--accent); }
  
  .label-heading { font-size: 0.65rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; display: block; }

  .mode-grid { display: flex; flex-direction: column; gap: 0.5rem; }
  .mode-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem; }
  .mode-btn { background: var(--bg-surface-solid); border: 1px solid var(--border-ui); padding: 1rem; border-radius: 12px; text-align: left; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; color: inherit; }
  .mode-btn strong { font-size: 0.75rem; font-weight: 800; color: var(--text-primary); }
  .mode-btn span { font-size: 0.6rem; color: var(--text-muted); line-height: 1.4; }
  .mode-btn:hover { border-color: var(--accent); background: var(--bg-card-hover); }
  .mode-btn.active { border-color: var(--accent); background: var(--accent-glow); box-shadow: 0 0 0 1px var(--accent); }
  .mode-btn.active strong { color: var(--accent); }

  /* Checkbox Customization */
  .checkbox-container { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; user-select: none; }
  .checkbox-container input { display: none; }
  .checkmark { width: 18px; height: 18px; border: 2px solid var(--border-ui); border-radius: 4px; position: relative; transition: all 0.2s; background: var(--bg-surface-solid); }
  .checkbox-container input:checked + .checkmark { background: var(--accent); border-color: var(--accent); }
  .checkmark:after { content: ''; position: absolute; display: none; left: 5px; top: 1px; width: 4px; height: 8px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }
  .checkbox-container input:checked + .checkmark:after { display: block; }
  .checkbox-container .label { font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); }

  @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  :global(.text-error) { color: var(--status-error); }

  @media (max-width: 500px) {
    .editor-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
    }
    .header-actions {
      margin-left: 0;
      width: 100%;
    }
    .control-group {
      width: 100%;
      justify-content: flex-start;
    }
    .security-status {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    .security-status :global(button) {
      width: 100%;
    }
    .scan-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .scan-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      width: 100%;
    }
    .scan-actions :global(button) {
      flex: 1;
      min-width: 100px;
    }
  }
</style>
