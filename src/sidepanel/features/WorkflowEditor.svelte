<script lang="ts">
  import { db } from '$shared/services/db';
  import { VaultService, type VaultState } from '$shared/services/vault';
  import { 
    Play, ChevronLeft, Trash2, Code, Settings2, Lock,
    Unlock, ShieldCheck, ShieldAlert, Eraser, Pause, Square,
    Activity,X,Search, Database, Activity as ActivityIcon, Scissors, Link2,
    Zap, Layers, Globe
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
  let selectedEdgeId: string | null = null;
  let isWiring = false;
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
    };
    init();

    // Poll for status or use a more reactive approach
    const statusInterval = setInterval(checkEngineStatus, 1000);

    const listener = (request: any) => {
      if (request.type === MessageType.HUD_UPDATE) {
        if (request.payload.status) currentStatus = request.payload.status;
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

  async function decryptWorkflowData() {
    if (!workflow.is_encrypted) {
      decryptedGraph = workflow.graph || { nodes: [], edges: [] };
      decryptedSettings = workflow.settings || {};
    } else {
      try {
        const decryptedStr = await VaultService.decrypt(workflow.encrypted_blob!);
        const data = JSON.parse(decryptedStr);
        decryptedGraph = data.graph || { nodes: [], edges: [] };
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
    saveWorkflow();
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
    // UNIFY: Support both legacy (root props) and modular (action.state)
    const rawValue = action.state?.value || action.value || '';
    const rawSelector = action.state?.selector || action.selector || '';
    const candidates = action.state?.candidates || action.candidates || [];
    const interactType = action.state?.interactType || action.interactType || 'click';
    const timeout = action.state?.timeout || action.timeout || 5000;

    let resolvedValue = await resolveExpression(rawValue);
    const spec = action.state?.spec || {};
    
    // If the value is a reference to a file stored in IndexedDB, fetch it!
    if (typeof resolvedValue === 'string' && resolvedValue.startsWith('dbfile:')) {
      const id = resolvedValue.split(':')[1];
      if (id) {
        try {
          const fileData = await FileStore.getFile(id);
          if (fileData) {
            resolvedValue = new File([fileData.blob], fileData.name, { type: fileData.type }) as any;
          }
        } catch (err) {
          console.error('[FlowPilot] Failed to load large file from FileStore', err);
        }
      }
    }

    // If the value is a remote file URL, fetch and inject it!
    if (typeof resolvedValue === 'string' && (resolvedValue.startsWith('http://') || resolvedValue.startsWith('https://'))) {
      const isFileInput = spec.type === 'file' || interactType === 'paste';
      if (isFileInput) {
        try {
          const res = await fetch(resolvedValue);
          if (res.ok) {
            const blob = await res.blob();
            const urlParts = resolvedValue.split('/');
            const name = urlParts[urlParts.length - 1] || 'downloaded_file';
            resolvedValue = new File([blob], name, { type: blob.type }) as any;
          }
        } catch (err) {
          console.error('[FlowPilot] Failed to fetch remote file for upload', err);
        }
      }
    }

    const resolvedSelector = await resolveExpression(rawSelector);

    const payload = {
      selector: resolvedSelector,
      value: resolvedValue || '',
      candidates,
      timeout
    };

    console.log(`[FlowPilot] Testing Node [${action.type}]`, payload);

    if (action.type === 'CLICK') {
      await Messenger.send(MessageType.DOM_CLICK, payload);
    } else if (action.type === 'TYPE') {
      await Messenger.send(MessageType.DOM_FILL, payload);
    } else if (action.type === 'INTERACT') {
      await Messenger.send(MessageType.DOM_INTERACT, {
        ...payload,
        action: interactType,
        metadata: action.metadata
      });
    } else if (action.type === 'NAVIGATE') {
      const url = action.state?.url || action.url;
      const resolvedUrl = await resolveExpression(url);
      await Messenger.send(MessageType.NAVIGATE as any, { url: resolvedUrl });
    } else if (action.type === 'IF_BRANCH') {
      let testData = {};
      const targetTableId = decryptedSettings?.table_id || workflow?.settings?.table_id;
      if (targetTableId) {
        const table = await db.data_tables.get(targetTableId);
        if (table && table.rows?.length) testData = table.rows[0];
      }
      
      let conditionModel = action.metadata?.conditionModel || action.state?.conditionModel;
      let isTrue = false;
      let elapsed = 0;
      const timeoutMs = conditionModel?.timeout || 0;
      const pollMs = conditionModel?.poll || 500;

      while (true) {
        let response;
        
        if (conditionModel && conditionModel.mode === 'BUILDER') {
          // RESOLVE: Deep resolve variables in the model
          const resolvedModel = JSON.parse(JSON.stringify(conditionModel));
          const resolveInGroup = async (group: any) => {
            for (const c of group.conditions) {
              if (c.type === 'group') await resolveInGroup(c);
              else {
                if (c.value1) c.value1 = await resolveExpression(c.value1);
                if (c.value2) c.value2 = await resolveExpression(c.value2);
                if (c.selector) c.selector = await resolveExpression(c.selector);
              }
            }
          };
          await resolveInGroup(resolvedModel.rootGroup);
          response = await Messenger.send(MessageType.DOM_EVAL, { model: resolvedModel });
        } else {
          let codeToEval = resolvedValue;
          if (conditionModel?.mode === 'CUSTOM') {
            codeToEval = await resolveExpression(conditionModel.customCode);
          }
          
          const needsTab = codeToEval.includes('querySelectorDeep') || codeToEval.includes('isVisible') || codeToEval.includes('findElement');

          if (needsTab) {
            response = await Messenger.send(MessageType.DOM_EVAL, { code: codeToEval });
          } else {
            response = await Messenger.send('DOM_SCRIPT' as any, { 
              code: `return (${codeToEval})`, 
              data: testData 
            });
          }
        }

        if (response.success && (response.data === true || response.data === 'true')) {
          isTrue = true;
          break;
        }

        if (elapsed >= timeoutMs) break;

        await new Promise(r => setTimeout(r, pollMs));
        elapsed += pollMs;
      }

      alert(`Logic Test Result: ${isTrue ? 'TRUE (FOLLOW GREEN)' : 'FALSE (FOLLOW RED)'}`);
    } else if (action.type === 'WAIT_STABILITY') {
      await Messenger.send(MessageType.DOM_WAIT_STABILITY, { timeout: action.timeout });
    } else if (action.type === 'SCRIPT') {
      let testData = {};
      const targetTableId = decryptedSettings?.table_id || workflow?.settings?.table_id;
      
      if (targetTableId) {
        const table = await db.data_tables.get(targetTableId);
        if (table && table.rows?.length) {
          testData = table.rows[0];
        }
      }
      
      await Messenger.send('DOM_SCRIPT' as any, { 
        code: action.state?.code || action.value, 
        data: testData, 
        tableId: targetTableId
      });
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

  $: activeGraph = decryptedGraph || { nodes: [], edges: [] };
  $: activeSettings = decryptedSettings || {};
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
                selectedNodeId={selectedNodeId}
                selectedEdgeId={selectedEdgeId}
                onNodeClick={(id) => { selectedNodeId = id; selectedEdgeId = null; }}
                onEdgeClick={(id) => { selectedEdgeId = id; selectedNodeId = null; }}
                onNodeDblClick={(id) => {
                  const node = activeGraph.nodes.find(n => n.id === id);
                  if (node?.type === 'SCRIPT') {
                    editingScriptId = node.id;
                  }
                }}
                onDeleteNode={(id) => removeAction(id)}
                onDeleteEdge={(id) => removeEdge(id)}
                onToggleEdgeMode={(id) => toggleEdgeMode(id)}
                onDeselectAll={() => { selectedNodeId = null; selectedEdgeId = null; }}
                onDrop={handleDropNode}
                onConnect={handleConnectNode}
                onSave={() => saveWorkflow()}
                />
              
              <Launcher 
                onDragStart={(type, e) => {
                  if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'copy';
                  }
                }} 
                onScan={scanPage}
                onPicker={() => startPicker()}
              />
            </div>

            {#if selectedNodeId}
              {@const selectedNode = activeGraph.nodes.find(n => n.id === selectedNodeId)}
              <div class="inspector-side glass fade-in">
                <header class="inspector-header">
                  <div class="header-main">
                    <span class="type-pill">{selectedNode?.type}</span>
                    <h3>{selectedNode?.metadata?.label || 'Node Configuration'}</h3>
                  </div>
                  <div class="header-tools">
                    <button class="icon-btn" on:click={() => selectedNodeId = null} title="Close Inspector"><X size={16} /></button>
                  </div>
                </header>

                <div class="inspector-body">
                  {#if selectedNode}
                    {@const ConfigComponent = registry.getConfig(selectedNode.type)}
                    {#if ConfigComponent}
                      <svelte:component 
                        this={ConfigComponent} 
                        node={selectedNode}
                        {tableHeaders}
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
                   <Button variant="picker" size="sm" on:click={() => clearNodeEdges(selectedNodeId!)} title="Detach node from all connections">
                     <Scissors slot="icon" size={14} />
                     Cut All Links
                   </Button>
                   <Button variant="danger" size="sm" on:click={() => removeAction(selectedNodeId!)}>
                     <Trash2 slot="icon" size={14} />
                     Delete Node
                   </Button>
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

  .settings-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
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
