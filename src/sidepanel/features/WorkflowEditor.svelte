<script lang="ts">
  import { db } from '$shared/services/db';
  import { VaultService, type VaultState } from '$shared/services/vault';
  import { 
    Play, Save, ChevronLeft, Plus, Trash2, Search, MousePointer2, Type, Clock, Globe,
    Code, Settings2, Database, Lock, Unlock, UserCircle, ShieldCheck, CheckCircle2,
    XCircle, RotateCcw, RotateCw, GripVertical, ShieldAlert, Eraser, Zap, Pause, Square,
    Activity, Layers, Timer, Link2, Scissors, MousePointer2 as CursorIcon, X, Circle, List
  } from '@lucide/svelte';
  import { Messenger } from '$shared/api/messenger';
  import { MessageType } from '$shared/constants/messages';
  import type { Workflow, WorkflowAction } from '$shared/types/workflow';
  import type { ScannedField } from '$shared/types/scanner';
  import CodeEditor from '../components/CodeEditor.svelte';
  import DataTable from '../components/DataTable.svelte';
  import ExpressionInput from '../components/ExpressionInput.svelte';
  import Button from '../components/Button.svelte';
  import { onMount } from 'svelte';
  import EditableLabel from '../components/EditableLabel.svelte';
  import SearchableSelect from '../components/SearchableSelect.svelte';
  import ConditionBuilder from '../components/ConditionBuilder.svelte';
  import { ConditionEngine } from '$shared/utils/ConditionEngine';

  export let workflowId: string;
  export let onBack: () => void;

  let workflow: any = null;
  let decryptedGraph: { nodes: any[], edges: any[] } | null = null;
  let decryptedSettings: any | null = null;
  
  // Canvas State
  let panX = 0;
  let panY = 0;
  let zoom = 1;
  let draggingNodeId: string | null = null;
  let isPanning = false;
  let lastMouse = { x: 0, y: 0 };
  let connectingFromId: string | null = null;
  let connectingMousePos: { x: number, y: number } | null = null;
  
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
  let showScanResults = false;
  let allSelected = false;
  let activeTab: 'steps' | 'data' | 'settings' = 'steps';
  let editingScriptId: string | null = null;
  let previews: Record<string, string> = {};
  let currentStatus: 'IDLE' | 'RUNNING' | 'PAUSED' | 'SUCCESS' | 'FAILED' | 'WAITING';
  let currentStepIndex: number | null = null;
  let selectedNodeId: string | null = null;
  let isWiring = false;
  let wireSourceId: string | null = null;
  let activeWiringSource: string | null = null;
  let mousePos = { x: 0, y: 0 };

  // History Engine
  let historyStack: string[] = [];
  let redoStack: string[] = [];
  const MAX_HISTORY = 50;

  // Drag & Drop State
  let draggedStepIndex: number | null = null;
  let dragOverStepIndex: number | null = null;

  let allWorkflows: any[] = [];
  let editorFontSize = 14;

  const interactionOptions = [
    { label: 'Left Click', value: 'click', category: 'Mouse', icon: MousePointer2 },
    { label: 'Double Click', value: 'dblclick', category: 'Mouse', icon: MousePointer2 },
    { label: 'Right Click', value: 'right-click', category: 'Mouse', icon: MousePointer2 },
    { label: 'Mouse Hover', value: 'hover', category: 'Mouse', icon: MousePointer2 },
    { label: 'Mouse Down', value: 'mousedown', category: 'Mouse', icon: MousePointer2 },
    { label: 'Mouse Up', value: 'mouseup', category: 'Mouse', icon: MousePointer2 },
    { label: 'Mouse Move', value: 'mousemove', category: 'Mouse', icon: MousePointer2 },
    { label: 'Context Menu', value: 'contextmenu', category: 'Mouse', icon: MousePointer2 },
    
    { label: 'Press Enter', value: 'press-enter', category: 'Keyboard', icon: Type },
    { label: 'Press Escape', value: 'press-escape', category: 'Keyboard', icon: Type },
    { label: 'Key Down', value: 'keydown', category: 'Keyboard', icon: Type, requiresValue: true, valueLabel: 'Key to Press', valuePlaceholder: 'e.g. Enter, Escape, a, b' },
    { label: 'Key Up', value: 'keyup', category: 'Keyboard', icon: Type, requiresValue: true, valueLabel: 'Key to Release', valuePlaceholder: 'e.g. Shift, Control' },
    
    { label: 'Scroll Into View', value: 'scroll-into-view', category: 'Scroll', icon: Globe },
    { label: 'Scroll Top', value: 'scroll-top', category: 'Scroll', icon: Globe },
    { label: 'Scroll By', value: 'scroll-by', category: 'Scroll', icon: Globe, requiresValue: true, valueLabel: 'Scroll Distance (px)', valuePlaceholder: 'e.g. 500' },
    
    { label: 'Select Option', value: 'select', category: 'Form', icon: List, requiresValue: true, valueLabel: 'Option to Select', valuePlaceholder: 'Value or Label of the option' },
    { label: 'Check Box', value: 'check', category: 'Form', icon: CheckCircle2 },
    { label: 'Uncheck Box', value: 'uncheck', category: 'Circle', icon: Circle },
    { label: 'Form Submit', value: 'submit', category: 'Form', icon: Play },
    { label: 'Form Reset', value: 'reset', category: 'Form', icon: RotateCcw },
    
    { label: 'Copy to Clipboard', value: 'copy', category: 'Clipboard', icon: Save },
    { label: 'Cut to Clipboard', value: 'cut', category: 'Scissors', icon: Scissors },
    { label: 'Paste from Clipboard', value: 'paste', category: 'Clipboard', icon: Save },
    
    { label: 'Focus Element', value: 'focus', category: 'State', icon: Search },
    { label: 'Blur Element', value: 'blur', category: 'State', icon: Search },
    { label: 'Extract Text', value: 'extract-text', category: 'Data', icon: Layers },
    { label: 'Extract HTML', value: 'extract-html', category: 'Data', icon: Code },
    { label: 'Extract Attribute', value: 'extract-attr', category: 'Data', icon: Database },
    { label: 'Assert Visible', value: 'assert-visible', category: 'Condition', icon: ShieldCheck },
    { label: 'Assert Hidden', value: 'assert-hidden', category: 'Condition', icon: ShieldCheck },
  ];
  
  $: editingNode = activeGraph.nodes.find(n => n.id === editingScriptId);

  onMount(() => {
    const init = async () => {
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
        if (pickerMode === 'condition') return; // Handled by ConditionBuilder's local listener
        
        const payload = request.payload;
        if (payload.isBatch) {
          scannedFields = payload.fields.map((f: any) => ({
            ...f,
            selected: true
          }));
          showScanResults = true;
        } else {
          // UNIFY: Map picker type to InteractType
          const interactType = payload.type === 'TYPE' ? 'type' : 'click';
          
          const newAction: any = {
            id: crypto.randomUUID(),
            type: 'INTERACT', // Always use polymorphic INTERACT
            interactType,
            selector: payload.selector,
            candidates: payload.candidates,
            timestamp: Date.now(),
            value: '',
            metadata: payload.metadata,
            position: { x: 250 - panX, y: 100 - panY }
          };
          decryptedGraph = {
            nodes: [...(decryptedGraph?.nodes || []), newAction],
            edges: [...(decryptedGraph?.edges || [])]
          };
          saveWorkflow();
        }
        isPicking = false;
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      clearInterval(statusInterval);
      chrome.runtime.onMessage.removeListener(listener);
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
    } else {
      currentStatus = 'IDLE';
      currentStepIndex = null;
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

  async function resolveExpression(val: string): Promise<string> {
    if (!val || !val.includes('{')) return val;
    const response = await Messenger.send('RESOLVE_EXPRESSION' as any, { 
      expression: val,
      tableId: decryptedSettings?.table_id
    });
    return response.success ? response.data : val;
  }

  async function updateAllPreviews() {
    if (!decryptedGraph?.nodes) return;
    const newPreviews: Record<string, string> = {};
    for (const action of decryptedGraph.nodes) {
      if (action.value && action.value.includes('{')) {
        newPreviews[action.id] = await resolveExpression(action.value);
      }
    }
    previews = newPreviews;
  }

  /**
   * Neural Sync: Immediately push variable changes to the browser DOM
   */
  async function syncVariablesToDOM() {
    if (!decryptedGraph?.nodes) return;
    
    for (const node of decryptedGraph.nodes) {
      // Only sync TYPE nodes or INTERACT nodes set to 'type' that use variables
      if ((node.type === 'TYPE' || (node.type === 'INTERACT' && node.interactType === 'type')) && node.value?.includes('{')) {
        const resolvedValue = await resolveExpression(node.value);
        const resolvedSelector = await resolveExpression(node.selector);
        
        if (resolvedSelector) {
          // Send silent sync message
          await Messenger.send(MessageType.DOM_INTERACT, {
            action: 'type',
            selector: resolvedSelector,
            value: resolvedValue,
            candidates: node.candidates,
            metadata: { ...node.metadata, skipHUD: true } 
          });
        }
      }
    }
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

  // --- Canvas Logic ---
  let draggingNode: any = null;

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      zoom = Math.max(0.2, Math.min(3, zoom - e.deltaY * 0.005));
    } else {
      panX -= e.deltaX;
      panY -= e.deltaY;
    }
  }

  function startPan(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.step-card')) return;
    isPanning = true;
    selectedNodeId = null; // Clear selection when clicking canvas
    lastMouse = { x: e.clientX, y: e.clientY };
  }

  function startNodeDrag(node: any, e: MouseEvent) {
    if ((e.target as HTMLElement).closest('input, button, select, .script-box, .step-tools')) return;
    draggingNode = node;
    selectedNodeId = node.id; // Set selection on drag start
    lastMouse = { x: e.clientX, y: e.clientY };
  }

  function doCanvasMousemove(e: MouseEvent) {
    if (isPanning) {
      panX += e.clientX - lastMouse.x;
      panY += e.clientY - lastMouse.y;
      lastMouse = { x: e.clientX, y: e.clientY };
    } else if (draggingNode) {
      draggingNode.position.x += (e.clientX - lastMouse.x) / zoom;
      draggingNode.position.y += (e.clientY - lastMouse.y) / zoom;
      decryptedGraph = { ...decryptedGraph! };
      lastMouse = { x: e.clientX, y: e.clientY };
    }
    
    if (activeWiringSource) {
      mousePos = { 
        x: (e.clientX - panX) / zoom, 
        y: (e.clientY - panY) / zoom 
      };
    }
  }

  function stopCanvasMouseup() {
    isPanning = false;
    if (draggingNode) {
      saveWorkflow();
      draggingNode = null;
    }
    cancelWire();
  }

  function getEdgePath(edge: any) {
    if (!activeGraph.nodes) return '';
    const source = activeGraph.nodes.find(n => n.id === edge.sourceNodeId);
    const target = activeGraph.nodes.find(n => n.id === edge.targetNodeId);
    if (!source || !target) return '';
    
    let sx = source.position.x + 300;
    if (source.type === 'IF_BRANCH') {
      sx = source.position.x + (edge.type === 'MAIN' ? 210 : 390);
    }
    
    const sy = source.position.y + 120;
    const tx = target.position.x + 300;
    const ty = target.position.y;
    return `M ${sx} ${sy} C ${sx} ${sy + 50}, ${tx} ${ty - 50}, ${tx} ${ty}`;
  }

  // --- DND Logic ---
  function handleStepDragStart(index: number, e: DragEvent) {
    draggedStepIndex = index;
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  function handleStepDrop(targetIndex: number) {
    if (draggedStepIndex === null || draggedStepIndex === targetIndex) {
      dragOverStepIndex = null;
      return;
    }
    const nodes = [...(decryptedGraph?.nodes || [])];
    const [moved] = nodes.splice(draggedStepIndex, 1);
    nodes.splice(targetIndex, 0, moved);
    if (decryptedGraph) {
      decryptedGraph.nodes = nodes;
      decryptedGraph = { ...decryptedGraph };
    }
    draggedStepIndex = null;
    dragOverStepIndex = null;
    saveWorkflow();
  }

  // --- Actions ---
  async function startPicker() {
    isPicking = true;
    pickerMode = 'step';
    const response = await Messenger.send(MessageType.PICKER_START, {});
    if (!response.success) isPicking = false;
  }

  function addManualStep(type: 'WAIT' | 'NAVIGATE' | 'SCRIPT' | 'WAIT_USER' | 'WAIT_STABILITY' | 'SPAWN' | 'WAIT_UNTIL' | 'CLOSE_TAB' | 'CLICK' | 'TYPE' | 'INTERACT' | 'IF_BRANCH', overrides: any = {}) {
    const id = crypto.randomUUID();
    const currentNodes = activeGraph?.nodes || [];
    const currentEdges = activeGraph?.edges || [];

    // Default positioning in the center of the viewport
    let x = (400 - panX) / zoom;
    let y = (250 - panY) / zoom;

    const newNode: any = {
      id,
      type: type as any,
      interactType: type === 'INTERACT' ? 'click' : undefined,
      selector: '',
      timestamp: Date.now(),
      value: type === 'WAIT' ? '2000' : (type === 'SCRIPT' ? '// Write logic' : (type === 'WAIT_USER' ? 'Wait for Human Interaction' : (type === 'WAIT_UNTIL' ? '{{GLOBAL.auth.otp}} !== \'\'' : (type === 'NAVIGATE' ? undefined : '')))),
      url: type === 'NAVIGATE' || type === 'SPAWN' ? 'https://' : undefined,
      spawnWorkflowId: type === 'SPAWN' ? '' : undefined,
      candidates: [],
      timeout: type === 'WAIT_STABILITY' ? 10000 : undefined,
      position: { x, y },
      metadata: type === 'IF_BRANCH' ? { conditionModel: ConditionEngine.createDefaultModel() } : {},
      ...overrides
    };
    
    decryptedGraph = { 
      nodes: [...currentNodes, newNode], 
      edges: currentEdges // NO AUTO-LINKING
    };

    selectedNodeId = id;
    saveWorkflow();
  }

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

  function clearNodeEdges(id: string) {
    if (!decryptedGraph) return;
    decryptedGraph.edges = decryptedGraph.edges.filter(e => e.sourceNodeId !== id && e.targetNodeId !== id);
    decryptedGraph = { ...decryptedGraph };
    saveWorkflow();
  }

  function toggleWiring() {
    isWiring = !isWiring;
    wireSourceId = null;
  }

  function handleNodeClick(nodeId: string) {
    if (isWiring) {
      if (!wireSourceId) {
        wireSourceId = nodeId;
      } else if (wireSourceId === nodeId) {
        wireSourceId = null;
      } else {
        // Create manual edge
        if (decryptedGraph) {
           // Prevent duplicates
           if (!decryptedGraph.edges.some(e => e.sourceNodeId === wireSourceId && e.targetNodeId === nodeId)) {
              decryptedGraph.edges.push({
                id: crypto.randomUUID(),
                sourceNodeId: wireSourceId!,
                targetNodeId: nodeId
              });
              decryptedGraph = { ...decryptedGraph };
              saveWorkflow();
           }
        }
        wireSourceId = null;
      }
    } else {
      selectedNodeId = nodeId;
    }
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

  async function testAction(action: WorkflowAction) {
    const resolvedValue = await resolveExpression(action.value || '');
    const resolvedSelector = await resolveExpression(action.selector || '');

    const payload = { 
      selector: resolvedSelector, 
      value: resolvedValue || '', 
      candidates: action.candidates, 
      timeout: action.timeout 
    };

    if (action.type === 'CLICK') {
      await Messenger.send(MessageType.DOM_CLICK, payload);
    } else if (action.type === 'TYPE') {
      await Messenger.send(MessageType.DOM_FILL, payload);
    } else if (action.type === 'INTERACT') {
      await Messenger.send(MessageType.DOM_INTERACT, {
        ...payload,
        action: action.interactType,
        metadata: action.metadata
      });
    } else if (action.type === 'IF_BRANCH') {
      let testData = {};
      const targetTableId = decryptedSettings?.table_id || workflow?.settings?.table_id;
      if (targetTableId) {
        const table = await db.data_tables.get(targetTableId);
        if (table && table.rows?.length) testData = table.rows[0];
      }
      
      let conditionModel = action.metadata?.conditionModel;
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
          if (conditionModel?.mode === 'CUSTOM') codeToEval = conditionModel.customCode;
          
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
        code: action.value, 
        data: testData, 
        tableId: targetTableId
      });
    }
  }

  async function highlightAction(nodeOrSelector: any) {
    const selector = typeof nodeOrSelector === 'string' ? nodeOrSelector : nodeOrSelector.selector;
    const candidates = typeof nodeOrSelector === 'string' ? null : nodeOrSelector.candidates;
    
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
    allSelected = !allSelected;
    scannedFields = scannedFields.map(f => ({ ...f, selected: allSelected }));
  }

  async function autoMapFields() {
    if (!decryptedSettings?.table_id) return;
    const table = await db.data_tables.get(decryptedSettings.table_id);
    if (!table) return;

    scannedFields = scannedFields.map(field => {
      if (field.type === 'SUBMIT' || field.type === 'BUTTON') return field;
      const label = field.label.toLowerCase().trim();
      const placeholder = (field.placeholder || '').toLowerCase().trim();
      const match = table.headers.find(h => label.includes(h.toLowerCase()) || h.toLowerCase().includes(label));
      if (match) {
        field.mappedValue = `{${match}}`;
        field.selected = true;
      }
      return field;
    });
  }

  function addSelectedScanned() {
    const selectedFields = scannedFields.filter(f => f.selected);
    if (selectedFields.length === 0) return;

    let currentNodes = [...(activeGraph?.nodes || [])];
    let currentEdges = [...(activeGraph?.edges || [])];

    let startX = (400 - panX) / zoom;
    let startY = (250 - panY) / zoom;

    selectedFields.forEach((f, index) => {
      const interactType = f.type === 'BUTTON' || f.type === 'SUBMIT' ? 'click' : 'type';
      const newNodeId = crypto.randomUUID();
      
      const newNode: any = {
        id: newNodeId,
        type: 'INTERACT',
        interactType,
        selector: f.selectors?.[0]?.selector || '',
        timestamp: Date.now() + index,
        value: f.mappedValue || '',
        candidates: f.selectors || [],
        metadata: { ...f.metadata, label: f.label, placeholder: f.placeholder },
        position: { x: startX, y: startY + (index * 150) }
      };

      currentNodes.push(newNode);
    });

    decryptedGraph = { nodes: currentNodes, edges: currentEdges };
    saveWorkflow();
    showScanResults = false;
  }

  // --- Manual Wiring Logic ---
  let activeWiringType: 'MAIN' | 'ALT' = 'MAIN';

  function startWireDrag(nodeId: string, e: MouseEvent, type: 'MAIN' | 'ALT' = 'MAIN') {
    e.stopPropagation();
    activeWiringSource = nodeId;
    activeWiringType = type;
    mousePos = { x: (e.clientX - panX) / zoom, y: (e.clientY - panY) / zoom };
  }

  function finalizeWire(targetId: string) {
    if (!activeWiringSource || activeWiringSource === targetId) {
      activeWiringSource = null;
      return;
    }

    if (decryptedGraph) {
      // Prevent exact duplicates (same source, same target, same type)
      if (decryptedGraph.edges.some(e => e.sourceNodeId === activeWiringSource && e.targetNodeId === targetId && e.type === activeWiringType)) {
        activeWiringSource = null;
        return;
      }

      decryptedGraph.edges.push({
        id: crypto.randomUUID(),
        sourceNodeId: activeWiringSource,
        targetNodeId: targetId,
        type: activeWiringType
      });
      decryptedGraph = { ...decryptedGraph };
      saveWorkflow();
    }
    activeWiringSource = null;
  }

  function toggleEdgeType(edgeId: string) {
    if (!decryptedGraph) return;
    const edge = decryptedGraph.edges.find(e => e.id === edgeId);
    if (!edge) return;

    const sourceNode = decryptedGraph.nodes.find(n => n.id === edge.sourceNodeId);

    if (sourceNode?.type === 'IF_BRANCH') {
      edge.type = edge.type === 'MAIN' ? 'ALT' : 'MAIN';
    } else {
      if (edge.type === 'MAIN') return;
      edge.type = edge.type === 'CLONE' ? 'FRESH' : 'CLONE';       
    }

    decryptedGraph = { ...decryptedGraph };
    saveWorkflow();
  }

  function cancelWire() {
    activeWiringSource = null;
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
            {#if currentStatus !== 'IDLE'}
              <Button variant="ghost" size="sm" on:click={handleStop} title="Stop Workflow">
                <Square slot="icon" size={14} fill="currentColor" class="text-error" />
              </Button>
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
          <div class="steps-layout">
            <!-- Scan Overlay -->
            {#if showScanResults}
              <div class="scan-overlay glass">
                <div class="scan-header">
                  <div class="scan-title"><Search size={16} />Nodes Detected ({scannedFields.length})</div>
                  <div class="scan-actions">
                    <Button variant="ghost" size="sm" on:click={autoMapFields}>
                      <Database slot="icon" size={12} />
                      Neural Map
                    </Button>
                    <Button variant="ghost" size="sm" on:click={() => showScanResults = false}>Dismiss</Button>
                  </div>
                </div>
                <div class="bulk-toolbar">
                  <label class="checkbox-container">
                    <input type="checkbox" checked={allSelected} on:change={toggleSelectAll} />
                    <span class="checkmark"></span><span class="label">Select All Nodes</span>
                  </label>
                </div>
                <div class="scan-body">
                  {#each scannedFields as field}
                    <div class="scan-field-row glass" class:selected={field.selected}>
                      <label class="checkbox-container">
                        <input type="checkbox" bind:checked={field.selected} />
                        <span class="checkmark"></span>
                      </label>
                      <div class="field-info"><span class="field-label">{field.label}</span><span class="field-type">{field.type}</span></div>
                      <div class="field-mapping">
                        {#if field.mappedValue}<span class="mapping-pill active"><Database size={10} />{field.mappedValue}</span>{/if}
                        <button class="add-btn highlight" on:click={() => highlightAction({ selector: field.selectors[0]?.selector, candidates: field.selectors })} title="Locate"><Search size={12} /></button>
                      </div>
                    </div>
                  {/each}
                </div>
                <div class="scan-footer">
                  <Button variant="primary" glow fullWidth on:click={addSelectedScanned}>
                    Add {scannedFields.filter(f => f.selected).length} Selected
                  </Button>
                </div>
              </div>
            {/if}

            <!-- Canvas Action Bar and Modals... -->
            <div class="action-bar">
              <div class="bar-title">
                <h3>2D Workflow Canvas</h3>
                <div class="history-tools">
                  <button class="icon-btn" on:click={undo} disabled={historyStack.length <= 1} title="Undo"><RotateCcw size={14} /></button>
                  <button class="icon-btn" on:click={redo} disabled={redoStack.length === 0} title="Redo"><RotateCw size={14} /></button>
                </div>
              </div>
              <div class="quick-add">
                <button class="icon-add" title="Interact (Universal)" on:click={() => addManualStep('INTERACT')}><Zap size={14} /></button>
                <button class="icon-add" title="Logic Branch (IF)" on:click={() => addManualStep('IF_BRANCH')}><Layers size={14} style="transform: rotate(90deg)" /></button>
                <button class="icon-add" title="Assert State" on:click={() => addManualStep('INTERACT', { interactType: 'assert-visible' })}><ShieldCheck size={14} /></button>
                <div class="tool-divider"></div>
                <button class="icon-add" title="Wait" on:click={() => addManualStep('WAIT')}><Clock size={14} /></button>
                <button class="icon-add" title="Page Stability" on:click={() => addManualStep('WAIT_STABILITY')}><Activity size={14} /></button>
                <button class="icon-add" title="Script" on:click={() => addManualStep('SCRIPT')}><Code size={14} /></button>
                <button class="icon-add" title="Navigate" on:click={() => addManualStep('NAVIGATE')}><Globe size={14} /></button>
                <button class="icon-add" title="Halt for Human" on:click={() => addManualStep('WAIT_USER')}><UserCircle size={14} /></button>
                <button class="icon-add" title="Start New Tab" on:click={() => addManualStep('SPAWN')}><Layers size={14} /></button>
                <button class="icon-add" title="Close Current Tab" on:click={() => addManualStep('CLOSE_TAB')}><XCircle size={14} /></button>
                
                <div class="tool-divider"></div>
                
                <button class="icon-add" class:active={isWiring} title="Neural Wire Tool (Connect Nodes)" on:click={toggleWiring}>
                  <Link2 size={14} />
                </button>
                <button class="icon-add" title="Cut All Connections" on:click={() => selectedNodeId && clearNodeEdges(selectedNodeId)} disabled={!selectedNodeId}>
                  <Scissors size={14} />
                </button>

                <Button variant="picker" active={isPicking} on:click={startPicker} size="sm">
                  <MousePointer2 slot="icon" size={14} />
                  Picker
                </Button>
                <Button variant="scan" disabled={isScanning} on:click={scanPage} size="sm">
                  <Search slot="icon" size={14} />
                  Scan
                </Button>
              </div>
            </div>

            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <div class="canvas-viewport" 
                 role="application"
                 aria-label="Workflow Canvas"
                 tabindex="0"
                 on:wheel|preventDefault={handleWheel} 
                 on:mousedown={startPan} 
                 on:mousemove={doCanvasMousemove} 
                 on:mouseup={stopCanvasMouseup} 
                 on:mouseleave={stopCanvasMouseup}
                 on:keydown={(e) => {
                   if (e.key === '+' || e.key === '=') zoom = Math.min(3, zoom + 0.1);
                   if (e.key === '-' || e.key === '_') zoom = Math.max(0.2, zoom - 0.1);
                 }}>
              
              <svg class="edges-layer" width="100%" height="100%" role="presentation">
                <g transform="translate({panX}, {panY}) scale({zoom})">
                  {#if activeGraph.edges}
                     {#each activeGraph.edges as edge (edge.id)}
                       {@const sourceNode = activeGraph.nodes.find(n => n.id === edge.sourceNodeId)}
                       <g class="edge-group">
                         <path 
                          d={getEdgePath(edge)} 
                          stroke={edge.type === 'MAIN' ? 'var(--text-muted)' : (edge.type === 'CLONE' ? 'var(--accent)' : 'var(--status-warning)')} 
                          stroke-width="3" 
                          fill="none" 
                          opacity="0.6" 
                         />
                         
                         {#if sourceNode?.type !== 'IF_BRANCH' && edge.type !== 'MAIN'}
                          <foreignObject 
                            x={(sourceNode?.position.x || 0) + 225} 
                            y={(sourceNode?.position.y || 0) + 130} 
                            width="150" height="30"
                            style="pointer-events: auto;"
                          >
                            <div 
                              class="edge-label {edge.type?.toLowerCase()}" 
                              role="button"
                              tabindex="0"
                              on:click|stopPropagation={() => toggleEdgeType(edge.id)}
                              on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleEdgeType(edge.id)}
                            >
                              {edge.type === 'CLONE' ? 'Clone Tab' : 'Fresh Tab'}
                            </div>
                          </foreignObject>
                         {/if}
                       </g>
                     {/each}
                  {/if}

                  {#if activeWiringSource}
                    <path 
                      d={`M ${(activeGraph.nodes.find(n => n.id === activeWiringSource)?.position.x || 0) + 300} ${(activeGraph.nodes.find(n => n.id === activeWiringSource)?.position.y || 0) + 150} C ${(activeGraph.nodes.find(n => n.id === activeWiringSource)?.position.x || 0) + 300} ${(activeGraph.nodes.find(n => n.id === activeWiringSource)?.position.y || 0) + 200}, ${mousePos.x} ${mousePos.y - 50}, ${mousePos.x} ${mousePos.y}`}
                      stroke="var(--accent)"
                      stroke-width="2"
                      stroke-dasharray="5,5"
                      fill="none"
                    />
                  {/if}
                </g>
              </svg>

              <div class="nodes-layer" style="transform: translate({panX}px, {panY}px) scale({zoom})">
                {#if activeGraph.nodes.length > 0}
                  {#each activeGraph.nodes as node (node.id)}
                    <div 
                      class="step-card glass" 
                      role="button"
                      tabindex="0"
                      style="position: absolute; left: {node.position.x}px; top: {node.position.y}px;"
                      class:editing={editingScriptId === node.id}
                      class:active-execution={currentStepIndex === node.id}
                      class:selected={selectedNodeId === node.id}
                      class:wire-source={wireSourceId === node.id}
                      class:wiring-mode={isWiring}
                      on:mousedown|stopPropagation={() => handleNodeClick(node.id)}
                      on:keydown={(e) => {
                        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).closest('.monaco-editor')) {
                          return;
                        }
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleNodeClick(node.id);
                        }
                        if (e.key === 'Delete' || e.key === 'Backspace') {
                          removeAction(node.id);
                        }
                      }}
                    >
                      <!-- Connection Ports -->
                      <div 
                        class="port input-port" 
                        role="button"
                        tabindex="0"
                        on:mouseup|stopPropagation={() => finalizeWire(node.id)}
                        on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && finalizeWire(node.id)}
                        title="Link Target"
                      ></div>
                      
                      {#if node.type === 'IF_BRANCH'}
                        <div 
                          class="port output-port if-true" 
                          role="button"
                          tabindex="0"
                          on:mousedown|stopPropagation={(e) => startWireDrag(node.id, e, 'MAIN')}
                          on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && startWireDrag(node.id, e as any, 'MAIN')}
                          title="If True"
                        >
                          <div class="port-label">T</div>
                        </div>
                        <div 
                          class="port output-port if-false" 
                          role="button"
                          tabindex="0"
                          on:mousedown|stopPropagation={(e) => startWireDrag(node.id, e, 'ALT')}
                          on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && startWireDrag(node.id, e as any, 'ALT')}
                          title="If False"
                        >
                          <div class="port-label">F</div>
                        </div>
                      {:else}
                        <div 
                          class="port output-port" 
                          role="button"
                          tabindex="0"
                          on:mousedown|stopPropagation={(e) => startWireDrag(node.id, e)}
                          on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && startWireDrag(node.id, e as any)}
                          title="Link Source"
                        ></div>
                      {/if}

                      <div class="step-num" role="button" tabindex="0" on:mousedown|stopPropagation={(e) => !isWiring && startNodeDrag(node, e)} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && !isWiring && (selectedNodeId = node.id)}>
                        <GripVertical size={12} class="drag-handle" />
                        <div class="node-dot">
                          {#if currentStepIndex === node.id}
                            <div class="pulse"></div>
                          {/if}
                        </div>
                      </div>
                      <div class="step-main">
                        <div class="step-type-row">
                          <span class="type-badge {node.type.toLowerCase()}">
                            {#if node.type === 'INTERACT'}<Zap size={10} />{/if}
                            {#if node.type === 'IF_BRANCH'}<Layers size={10} style="transform: rotate(90deg)" />{/if}
                            {#if node.type === 'CLICK'}<MousePointer2 size={10} />{/if}
                            {#if node.type === 'TYPE'}<Type size={10} />{/if}
                            {#if node.type === 'WAIT'}<Clock size={10} />{/if}
                            {#if node.type === 'WAIT_STABILITY'}<Activity size={10} />{/if}
                            {#if node.type === 'NAVIGATE'}<Globe size={10} />{/if}
                            {#if node.type === 'SCRIPT'}<Code size={10} />{/if}
                            {#if node.type === 'WAIT_USER'}<UserCircle size={10} />{/if}
                            {#if node.type === 'SPAWN'}<Layers size={10} />{/if}
                            {#if node.type === 'CLOSE_TAB'}<XCircle size={10} />{/if}
                            {node.type.replace('_', ' ')}
                          </span>
                          <div class="step-tools">
                            {#if node.selector}
                              <button on:click={() => highlightAction(node)} title="Highlight Node"><Search size={12} /></button>
                              <button on:click={() => testAction(node)} title="Test Step"><Play size={12} /></button>
                            {/if}
                            <button class="delete" on:click={() => removeAction(node.id)} title="Remove Step"><Trash2 size={12} /></button>
                          </div>
                        </div>
                        
                      <div class="step-config">
                        {#if node.type === 'IF_BRANCH'}
                          <div class="if-config">
                            {#if node.metadata?.conditionModel}
                              <div class="mode-toggle">
                                <label class="radio-label">
                                  <input type="radio" value="BUILDER" bind:group={node.metadata.conditionModel.mode} on:change={() => saveWorkflow()} />
                                  Builder Mode
                                </label>
                                <label class="radio-label">
                                  <input type="radio" value="CUSTOM" bind:group={node.metadata.conditionModel.mode} on:change={() => saveWorkflow()} />
                                  Custom JS
                                </label>
                              </div>

                              <div class="wait-settings">
                                <div class="input-row">
                                  <Timer size={12} class="icon-muted" />
                                  <span class="wait-label">Wait up to (ms):</span>
                                  <input type="number" bind:value={node.metadata.conditionModel.timeout} on:change={() => saveWorkflow()} />
                                </div>
                              </div>

                              {#if node.metadata.conditionModel.mode === 'BUILDER'}
                                <ConditionBuilder 
                                  bind:model={node.metadata.conditionModel.rootGroup} 
                                  {tableHeaders}
                                  startPicker={(cb) => {
                                    isPicking = true;
                                    pickerMode = 'condition';
                                    const listener = (req: any) => {
                                      if (req.type === MessageType.PICKER_SELECT) {
                                        const field = req.payload.fields ? req.payload.fields[0] : req.payload;
                                        cb({
                                          selector: field.selectors?.[0]?.selector || field.selector,
                                          candidates: field.selectors || field.candidates,
                                          metadata: { label: field.label }
                                        });
                                        chrome.runtime.onMessage.removeListener(listener);
                                        isPicking = false;
                                        pickerMode = 'step';
                                      }
                                    };
                                    chrome.runtime.onMessage.addListener(listener);
                                    Messenger.send(MessageType.PICKER_START, {});
                                  }}
                                  highlightSelector={(selector) => highlightAction({ selector })}
                                  testRule={async (rule) => {
                                    let testData: any = {};
                                    const targetTableId = decryptedSettings?.table_id || workflow?.settings?.table_id;
                                    if (targetTableId) {
                                      const table = await db.data_tables.get(targetTableId);
                                      if (table && table.rows?.length) testData = table.rows[0];
                                    }

                                    // Resolve variables in the single rule for testing
                                    const resolvedRule = JSON.parse(JSON.stringify(rule));
                                    if (resolvedRule.value1) resolvedRule.value1 = await resolveExpression(resolvedRule.value1);
                                    if (resolvedRule.value2) resolvedRule.value2 = await resolveExpression(resolvedRule.value2);
                                    if (resolvedRule.selector) resolvedRule.selector = await resolveExpression(resolvedRule.selector);

                                    const dummyModel: any = { 
                                      mode: 'BUILDER', 
                                      rootGroup: { id: 'test', type: 'group', operator: 'ALL', conditions: [resolvedRule] }, 
                                      timeout: 0, 
                                      poll: 500 
                                    };

                                    const response = await Messenger.send(MessageType.DOM_EVAL, { model: dummyModel });
                                    
                                    if (response.success) {
                                      alert(`Rule Test Result: ${response.data === true || response.data === 'true' ? 'TRUE' : 'FALSE'}`);
                                    } else {
                                      alert(`Rule Test Failed!\nError: ${response.error?.message || 'Unknown error'}`);
                                    }
                                  }}
                                  onChange={() => {
                                    decryptedGraph = { ...decryptedGraph } as any;
                                    saveWorkflow();
                                  }}
                                />
                              {:else}
                                <div class="input-row custom-code-row">
                                  <Code size={12} class="icon-muted" />
                                  <ExpressionInput 
                                    value={node.metadata.conditionModel.customCode || ''} 
                                    headers={tableHeaders} 
                                    placeholder="e.g. &#123;Price&#125; > 100" 
                                    onChange={(val) => { node.metadata.conditionModel.customCode = val; saveWorkflow(); }} 
                                  />
                                  <button class="icon-btn test-btn" on:click={() => testAction(node)} title="Test Custom Logic">
                                    <Play size={12} />
                                  </button>
                                </div>
                              {/if}
                            {:else}
                              <div class="input-row">
                                <Timer size={12} class="icon-muted" />
                                <ExpressionInput 
                                  value={node.value || ''} 
                                  headers={tableHeaders} 
                                  placeholder="e.g. (Price) > 100" 
                                  onChange={(val) => { node.value = val; saveWorkflow(); }} 
                                />
                              </div>
                            {/if}
                            <span class="hint-text">Flow will follow the Green path if true, Red if false.</span>
                          </div>
                        {:else if node.type === 'TYPE'}
                          <div class="type-config">
                            <div class="selector-row">
                              <EditableLabel value={node.metadata?.label || 'Target Input'} onSave={(nv) => { node.metadata = { ...node.metadata, label: nv }; saveWorkflow(); }} />
                              <div class="selector-input-shell">
                                <input type="text" bind:value={node.selector} placeholder="Input Selector" on:change={() => saveWorkflow()} />
                                {#if node.candidates?.length}
                                  <div class="selector-stack-popover">
                                    <button class="shield-btn" title="Tune Resilience Stack">
                                      <ShieldCheck size={12} />
                                      <span>{node.candidates.length} Fallbacks</span>
                                    </button>
                                    <div class="stack-dropdown glass">
                                      <div class="stack-header">Resilience Hierarchy</div>
                                      {#each node.candidates as cand, ci}
                                        <div class="stack-item">
                                          <select class="cand-type-select" bind:value={cand.type} on:change={() => saveWorkflow()}>
                                            <option value="ID">ID</option>
                                            <option value="CLASS">CLASS</option>
                                            <option value="XPATH">XPATH</option>
                                            <option value="NAME">NAME</option>
                                            <option value="ARIA">ARIA</option>
                                            <option value="LABEL">LABEL</option>
                                            <option value="PLACEHOLDER">HLD</option>
                                            <option value="RELATIVE">REL</option>
                                          </select>
                                          <input type="text" class="sel-inp" bind:value={cand.selector} on:change={() => saveWorkflow()} placeholder="Selector string..." />
                                          <div class="index-wrap">
                                            <span>#</span>
                                            <input type="number" class="idx-inp" bind:value={cand.index} min="0" on:change={() => saveWorkflow()} />
                                          </div>
                                          <button class="cand-del" on:click={() => { node.candidates.splice(ci, 1); node.candidates = node.candidates; saveWorkflow(); }}><Plus size={10} style="transform: rotate(45deg)" /></button>
                                        </div>
                                      {/each}
                                      <button class="add-cand" on:click={() => { node.candidates = [...(node.candidates || []), { type: 'XPATH', selector: '', confidence: 10 }]; saveWorkflow(); }}><Plus size={10} /> Add Fallback</button>
                                    </div>
                                  </div>
                                {/if}
                              </div>
                            </div>
                            <div class="input-with-preview" style="margin-top: 0.75rem;">
                              <div class="payload-header"><Type size={10} /> <span>Text to Type</span></div>
                              <ExpressionInput 
                                value={node.value || ''} 
                                headers={tableHeaders} 
                                placeholder="Value, &#123;Column&#125;, or &#123;&#123;script&#125;&#125;" 
                                onChange={(val) => { node.value = val; saveWorkflow(); }} 
                              />
                            </div>
                          </div>
                        {:else if node.type === 'CLICK' || node.type === 'INTERACT'}
                          <div class="selector-row">
                            <EditableLabel value={node.metadata?.label || 'Target Node'} onSave={(nv) => { node.metadata = { ...node.metadata, label: nv }; saveWorkflow(); }} />
                            
                            {#if node.type === 'CLICK' || node.type === 'INTERACT'}
                              <div class="interact-picker-wrap" style="margin-bottom: 0.5rem;">
                                <SearchableSelect 
                                  options={interactionOptions} 
                                  bind:value={node.interactType} 
                                  on:change={() => {
                                    node.type = 'INTERACT';
                                    saveWorkflow();
                                  }} 
                                />
                              </div>
                            {/if}
                            
                            {#if node.interactType === 'extract-attr' && node.type !== 'TYPE'}
                              <div class="attr-input-wrap" style="margin-bottom: 0.5rem;">
                                <div class="input-row">
                                  <Search size={12} class="icon-muted" />
                                  <input 
                                    type="text" 
                                    placeholder="Attribute Name (e.g. href, src)" 
                                    bind:value={node.metadata.attribute} 
                                    on:change={() => saveWorkflow()} 
                                  />
                                </div>
                              </div>
                            {/if}

                            <div class="selector-input-shell">
                              <input type="text" bind:value={node.selector} placeholder="Primary Selector" on:change={() => saveWorkflow()} />
                              {#if node.candidates?.length}
                                <div class="selector-stack-popover">
                                  <button class="shield-btn" title="Tune Resilience Stack">
                                    <ShieldCheck size={12} />
                                    <span>{node.candidates.length} Fallbacks</span>
                                  </button>
                                  <div class="stack-dropdown glass">
                                    <div class="stack-header">Resilience Hierarchy</div>
                                    {#each node.candidates as cand, ci}
                                      <div class="stack-item">
                                        <select class="cand-type-select" bind:value={cand.type} on:change={() => saveWorkflow()}>
                                          <option value="ID">ID</option>
                                          <option value="CLASS">CLASS</option>
                                          <option value="XPATH">XPATH</option>
                                          <option value="NAME">NAME</option>
                                          <option value="ARIA">ARIA</option>
                                          <option value="LABEL">LABEL</option>
                                          <option value="PLACEHOLDER">HLD</option>
                                          <option value="RELATIVE">REL</option>
                                        </select>
                                        <input type="text" class="sel-inp" bind:value={cand.selector} on:change={() => saveWorkflow()} placeholder="Selector string..." />
                                        <div class="index-wrap">
                                          <span>#</span>
                                          <input type="number" class="idx-inp" bind:value={cand.index} min="0" on:change={() => saveWorkflow()} />
                                        </div>
                                        <button class="cand-del" on:click={() => { node.candidates.splice(ci, 1); node.candidates = node.candidates; saveWorkflow(); }}><Plus size={10} style="transform: rotate(45deg)" /></button>
                                      </div>
                                    {/each}
                                    <button class="add-cand" on:click={() => { node.candidates = [...(node.candidates || []), { type: 'XPATH', selector: '', confidence: 10 }]; saveWorkflow(); }}><Plus size={10} /> Add Fallback</button>
                                  </div>
                                </div>
                              {/if}
                            </div>
                          </div>

                          {#if interactionOptions.find(o => o.value === node.interactType)?.requiresValue}
                            {@const opt = interactionOptions.find(o => o.value === node.interactType)}
                            <div class="action-payload-wrap" style="margin-top: 0.75rem;">
                              <div class="payload-header">
                                <Zap size={10} class="icon-muted" />
                                <span>{opt?.valueLabel || 'Action Parameter'}</span>
                              </div>
                              <ExpressionInput 
                                value={node.value || ''} 
                                headers={tableHeaders} 
                                placeholder={opt?.valuePlaceholder || 'Parameter for this action...'} 
                                onChange={(val) => { node.value = val; saveWorkflow(); }} 
                              />
                            </div>
                          {/if}
                        {/if}
                        
                        {#if node.type === 'SCRIPT'}
                          <div class="script-box">
                              <div 
                                class="script-preview" 
                                role="button" 
                                tabindex="0" 
                                on:click={() => editingScriptId = node.id}
                                on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (editingScriptId = node.id)}
                              >
                                <code style="color: var(--text-primary);">{(node.value || '').split('\n')[0]}...</code>
                                <div class="edit-hint">Click to expand IDE</div>
                              </div>
                            </div>
                          {:else if node.type === 'CLICK'}
                            <div class="click-config">
                              <div class="timeout-wrap">
                                <Clock size={12} class="icon-muted" />
                                <input type="number" value={node.timeout ?? 5000} on:change={(e) => { node.timeout = parseInt((e.target as HTMLInputElement).value); saveWorkflow(); }} />
                                <span class="unit">ms timeout</span>
                              </div>
                            </div>
                          {:else if node.type === 'WAIT_STABILITY'}
                            <div class="click-config">
                              <div class="timeout-wrap">
                                <Activity size={12} class="icon-muted" />
                                <input type="number" value={node.timeout ?? 10000} on:change={(e) => { node.timeout = parseInt((e.target as HTMLInputElement).value); saveWorkflow(); }} />
                                <span class="unit">ms max wait</span>
                              </div>
                              <span class="hint-text">Waits for DOM mutations to settle</span>
                            </div>
                          {:else if node.type === 'SPAWN'}
                            <div class="spawn-config">
                              <div class="input-row">
                                <Layers size={12} class="icon-muted" />
                                <select value={node.spawnWorkflowId || ''} on:change={(e) => { node.spawnWorkflowId = (e.target as HTMLSelectElement).value; saveWorkflow(); }}>
                                  <option value="">-- Select Sequence --</option>
                                  {#each allWorkflows.filter(w => w.id !== workflowId) as wf}
                                    <option value={wf.id}>{wf.name}</option>
                                  {/each}
                                </select>
                              </div>
                              <div class="input-row">
                                <Globe size={12} class="icon-muted" />
                                <input type="text" placeholder="https://..." bind:value={node.url} on:change={() => saveWorkflow()} />
                              </div>
                              <span class="hint-text">Spawns a new tab and starts the selected sequence</span>
                            </div>
                          {:else if node.type === 'CLOSE_TAB'}
                            <div class="close-tab-config">
                              <span class="hint-text">Neural pulse: Terminate the active tab in this execution context.</span>
                            </div>
                          {:else if node.type === 'WAIT_UNTIL'}
                            <div class="wait-until-config">
                              <div class="input-row">
                                <Timer size={12} class="icon-muted" />
                                <input type="text" placeholder="e.g. &#123;&#123;GLOBAL.auth.otp&#125;&#125; !== ''" bind:value={node.value} on:change={() => saveWorkflow()} />
                              </div>
                              <span class="hint-text">Polls every 1s until expression is true</span>
                            </div>
                          {:else}
                            <div class="input-with-preview">
                              {#if previews[node.id] && node.value !== previews[node.id]}
                                <div class="live-preview fade-in">
                                  <Zap size={10} />
                                  <span>Live Result: <strong>{previews[node.id]}</strong></span>
                                </div>
                              {/if}
                            </div>
                          {/if}
                        </div>
                      </div>
                    </div>
                  {/each}
                {:else}
                  <div class="empty-steps" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);"><Plus size={32} /><p>Canvas Empty</p><span>Right-click or use toolbar to add nodes.</span></div>
                {/if}
              </div>
            </div>
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
            value={editingNode.value || ''} 
            headers={tableHeaders} 
            fontSize={editorFontSize}
            onChange={(val) => { editingNode.value = val; saveWorkflow(); }} 
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
    align-items: center;
    gap: 1rem;
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
  .control-group { display: flex; align-items: center; gap: 0.5rem; }
  .editor-nav { display: flex; padding: 0 1rem; gap: 1.5rem; border-bottom: 1px solid var(--border-ui); background: var(--bg-card-hover); }
  .editor-nav button { background: none; border: none; padding: 1rem 0; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; text-transform: uppercase; }
  .editor-nav button.active { color: var(--accent); border-bottom-color: var(--accent); }
  .editor-content { flex: 1; overflow: auto; padding: 1.25rem; display: flex; flex-direction: column; -webkit-user-select: none; /* Safari */ -ms-user-select: none;     /* IE 10+ and Edge */ user-select: none;         /* Standard syntax */}
  .tab-pane { display: flex; flex-direction: column; flex: 1; }
  .tab-pane.hidden { display: none !important; }
  .steps-layout { display: flex; flex-direction: column; flex: 1; min-height: 600px; min-width: 1000px; }
  
  .lock-screen { position: absolute; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
  .lock-card { background: var(--bg-card); padding: 3rem; border-radius: 2rem; border: 1px solid var(--border-ui); text-align: center; max-width: 400px; box-shadow: var(--shadow-elite); }
  .lock-input { display: flex; flex-direction: column; gap: 1rem; margin-top: 2rem; }
  .lock-input input { padding: 1rem; border: 1px solid var(--border-ui); border-radius: 1rem; background: var(--bg-surface-solid); color: var(--text-primary); text-align: center; font-size: 1rem; outline: none; }
  .error-msg { margin-top: 1rem; color: var(--status-error); font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }

  .action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
  .bar-title { display: flex; align-items: center; gap: 1rem; }
  .bar-title h3 { font-size: 0.65rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; }
  .history-tools { display: flex; gap: 0.25rem; border-left: 1px solid var(--border-ui); padding-left: 0.75rem; }
  
  .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 0.3rem; border-radius: 4px; }
  .icon-btn:hover:not(:disabled) { background: var(--accent-glow); color: var(--accent); }
  .quick-add { display: flex; gap: 0.5rem; align-items: center; }
  .icon-add { background: var(--bg-card); border: 1px solid var(--border-ui); color: var(--text-secondary); padding: 0.5rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .icon-add:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }
  .icon-add.active { background: var(--accent); color: white; border-color: var(--accent); box-shadow: 0 0 10px var(--accent-glow); }
  .icon-add:disabled { opacity: 0.3; cursor: not-allowed; }

  .tool-divider { width: 1px; height: 24px; background: var(--border-ui-heavy); margin: 0 0.5rem; }
  
  /* Neural Canvas Flow */
  .canvas-viewport { position: relative; flex: 1; overflow: hidden; background: var(--bg-surface); cursor: grab; background-image: radial-gradient(var(--border-ui-heavy) 1px, transparent 1px); background-size: 20px 20px; }
  .canvas-viewport:active { cursor: grabbing; }
  .edges-layer { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
  .edges-layer path { pointer-events: none; }
  .nodes-layer { position: absolute; inset: 0; transform-origin: top left; z-index: 1; pointer-events: none; }

  .step-card { display: flex; min-width: 600px; width: max-content; border: 1px solid var(--border-ui); border-radius: 1.25rem; background: var(--bg-card); overflow: visible !important; transition: border-color 0.3s, box-shadow 0.3s; box-shadow: var(--shadow-elite); position: absolute; z-index: 1; pointer-events: auto; max-width: 90vw; }
  .step-card:hover { border-color: var(--accent); z-index: 100; }
  .step-card.selected { border-color: var(--status-warning); box-shadow: 0 0 0 2px var(--status-warning), var(--shadow-elite); }
  .step-card.wire-source { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent), var(--shadow-elite); }
  .step-card.wiring-mode { cursor: crosshair; }
  .step-card.active-execution { border-color: var(--accent); box-shadow: 0 0 20px var(--accent-glow); border-width: 2px; }
  .step-card.completed { opacity: 0.7; border-color: var(--status-success); }

  .step-num { width: 50px; background: var(--bg-surface-solid); border-right: 1px solid var(--border-ui); display: flex; flex-direction: column; align-items: center; padding-top: 1rem; gap: 0.5rem; flex-shrink: 0; cursor: grab; border-top-left-radius: 1.25rem; border-bottom-left-radius: 1.25rem; }
  .step-num:active { cursor: grabbing; }
  .drag-handle { opacity: 0.2; pointer-events: none; }
  .step-card:hover .drag-handle { opacity: 0.5; }
  
  .node-dot { width: 24px; height: 24px; background: var(--bg-surface-solid); border: 2px solid var(--text-muted); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 900; color: var(--text-primary); position: relative; z-index: 2; transition: all 0.3s; }
  .active-execution .node-dot { border-color: var(--accent); color: var(--accent); background: var(--bg-surface-solid); transform: scale(1.2); }
  
  .pulse { position: absolute; inset: -4px; border-radius: 50%; background: var(--accent); opacity: 0; animation: pulse-ring 1.5s infinite; }
  @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.8); opacity: 0; } }

  /* Neural Ports */
  .port { position: absolute; left: 50%; transform: translateX(-50%); width: 12px; height: 12px; background: var(--bg-surface-solid); border: 2px solid var(--text-muted); border-radius: 50%; z-index: 10; cursor: crosshair; transition: all 0.2s; }
  .port:hover { border-color: var(--accent); background: var(--accent-glow); transform: translateX(-50%) scale(1.3); }
  .input-port { top: -6px; }
  .output-port { bottom: -6px; }
  
  /* IF Branch Ports */
  .output-port.if-true { left: 35%; border-color: var(--status-success); }
  .output-port.if-false { left: 65%; border-color: var(--status-error); }
  .port-label { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); font-size: 0.45rem; font-weight: 900; color: var(--text-muted); }
  .if-true .port-label { color: var(--status-success); }
  .if-false .port-label { color: var(--status-error); }
  
  .wiring-mode .port { border-color: var(--accent); box-shadow: 0 0 5px var(--accent-glow); }

  /* Edge Labels */
  .edge-label { background: var(--bg-surface-solid); border: 1px solid var(--border-ui-heavy); border-radius: 20px; padding: 0.2rem 0.6rem; font-size: 0.55rem; font-weight: 800; text-transform: uppercase; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-elite); transition: all 0.2s; white-space: nowrap; width: fit-content; }
  .edge-label:hover { border-color: var(--accent); color: var(--accent); transform: scale(1.05); }
  .edge-label.clone { border-color: var(--accent); color: var(--accent); }
  .edge-label.fresh { border-color: var(--status-warning); color: var(--status-warning); }

  .step-main { flex: 1; padding: 1.25rem; overflow: visible !important; }
  .step-type-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
  .type-badge { font-size: 0.55rem; font-weight: 900; padding: 0.25rem 0.6rem; border-radius: 6px; text-transform: uppercase; display: flex; align-items: center; gap: 0.3rem;  background: var(--bg-surface-solid); color: var(--accent); border: 1px solid var(--accent);}
  .type-badge.click { background: var(--bg-surface-solid); color: var(--accent); border: 1px solid var(--accent); }
  .type-badge.type { background: var(--bg-surface-solid); color: var(--status-success); border: 1px solid var(--status-success); }
  .type-badge.navigate { background: var(--bg-surface-solid); color: var(--accent); border: 1px solid var(--accent); }
  .type-badge.wait_stability { background: var(--bg-surface-solid); color: var(--text-primary); border: 1px solid var(--border-ui-heavy); }
  .type-badge.spawn { background: var(--bg-surface-solid); color: var(--text-primary); border: 1px solid var(--border-ui-heavy); border-left: 3px solid var(--status-warning); }
  .type-badge.wait_until { background: var(--bg-surface-solid); color: var(--status-warning); border: 1px solid var(--status-warning); }
  .type-badge.script { background: var(--accent); color: white; border: 1px solid var(--accent); }
  
  .selector-row { display: flex; flex-direction: column; gap: 0.25rem; }
  .selector-input-shell { position: relative; display: flex; align-items: center; }
  .selector-input-shell input { width: 100%; padding-right: 6rem; padding: 0.6rem; border: 1px solid var(--border-ui); border-radius: 10px; background: var(--bg-surface-solid); color: var(--text-primary); outline: none; }
  .selector-stack-popover { position: absolute; right: 0.5rem; height: 100%; display: flex; align-items: center; }
  .shield-btn { display: flex; align-items: center; gap: 0.3rem; background: var(--status-success); color: white; border: none; border-radius: 6px; padding: 0.2rem 0.5rem; font-size: 0.55rem; font-weight: 800; cursor: pointer; }
  .stack-dropdown { position: absolute; top: 110%; right: 0; width: 320px; z-index: 1000; border: 1px solid var(--border-ui-heavy); border-radius: 1rem; padding: 0.75rem; display: none; flex-direction: column; gap: 0.5rem; box-shadow: var(--shadow-elite); background: var(--bg-card); }
  .selector-stack-popover:hover .stack-dropdown { display: flex; }
  .stack-item { display: flex; align-items: center; gap: 0.5rem; background: var(--bg-surface-solid); padding: 0.4rem 0.6rem; border-radius: 8px; border: 1px solid var(--border-ui); }
  .cand-type-select { background: none; border: none; font-size: 0.5rem; font-weight: 900; color: var(--accent); width: 60px; flex-shrink: 0; outline: none; cursor: pointer; text-transform: uppercase; }
  .cand-type-select option { background: var(--bg-card); color: var(--text-primary); font-size: 0.7rem; }
  .stack-item .sel-inp { flex: 1; font-size: 0.65rem; border: none; background: transparent; color: var(--text-primary); outline: none; min-width: 0; }
  .index-wrap { display: flex; align-items: center; gap: 0.1rem; background: var(--bg-card-hover); padding: 0.1rem 0.3rem; border-radius: 4px; border: 1px solid var(--border-ui-heavy); flex-shrink: 0; }
  .index-wrap span { font-size: 0.55rem; font-weight: 900; color: var(--text-muted); }
  .idx-inp { width: 22px; border: none; background: transparent; font-size: 0.65rem; color: var(--accent); font-weight: 800; outline: none; text-align: center; }
  .idx-inp::-webkit-inner-spin-button { display: none; }
  .cand-del { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center; }
  .cand-del:hover { color: var(--status-error); }
  .add-cand { margin-top: 0.25rem; background: var(--accent-glow); border: 1px dashed var(--accent); color: var(--accent); border-radius: 8px; padding: 0.4rem; font-size: 0.6rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem; }
  .add-cand:hover { background: var(--accent); color: white; }
  .click-config, .spawn-config, .wait-until-config { display: flex; flex-direction: column; gap: 0.5rem; }
  .input-row { display: flex; align-items: center; gap: 0.5rem; background: var(--bg-surface-solid); padding: 0.4rem 0.75rem; border-radius: 10px; border: 1px solid var(--border-ui); }
  .input-row input, .input-row select { flex: 1; border: none; background: transparent; font-size: 0.75rem; color: var(--text-primary); outline: none; }
  .hint-text { font-size: 0.65rem; color: var(--text-muted); font-style: italic; }
  .timeout-wrap { display: flex; align-items: center; gap: 0.4rem; background: var(--bg-surface-solid); padding: 0.4rem 0.75rem; border-radius: 10px; border: 1px solid var(--border-ui); }
  .timeout-wrap input { width: 60px; border: none; background: transparent; font-size: 0.75rem; font-weight: 800; color: var(--accent); outline: none; }
  .unit { font-size: 0.6rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }

  .action-payload-wrap { background: var(--bg-surface-solid); border: 1px solid var(--border-ui); border-radius: 12px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .payload-header { display: flex; align-items: center; gap: 0.5rem; font-size: 0.55rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  
  .script-box { border: 1px solid var(--border-ui); border-radius: 0.75rem; overflow: hidden; background: var(--bg-surface-solid); width: 100%; box-sizing: border-box; display: flex; flex-direction: column; }
  .script-editor-wrap { flex: 1; min-height: 250px; width: 100%; overflow: hidden; box-sizing: border-box; }
  .script-preview { padding: 1rem; cursor: pointer; position: relative; width: 100%; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .script-preview code { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }
  .edit-hint { position: absolute; top: 0.5rem; right: 0.75rem; font-size: 0.5rem; font-weight: 800; color: var(--accent); opacity: 0; }
  .script-preview:hover .edit-hint { opacity: 1; }

  .input-with-preview { display: flex; flex-direction: column; gap: 0.4rem; }
  .live-preview { display: flex; align-items: center; gap: 0.4rem; font-size: 0.65rem; color: var(--accent); background: var(--accent-glow); padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid var(--accent); width: fit-content; }
  .live-preview strong { color: var(--text-primary); }

  .settings-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
  .settings-card { padding: 1.5rem; border-radius: 1.5rem; background: var(--bg-card); border: 1px solid var(--border-ui); display: flex; flex-direction: column; gap: 1.25rem; }
  .card-header { display: flex; align-items: center; gap: 0.75rem; color: var(--accent); border-bottom: 1px solid var(--border-ui); padding-bottom: 0.75rem; margin-bottom: 0.25rem; }
  .card-header h3 { font-size: 0.8rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-primary); margin: 0; }
  
  .setting-item { display: flex; flex-direction: column; gap: 0.5rem; }
  .setting-item label { font-size: 0.65rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .setting-item input[type="text"] { padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid var(--border-ui); background: var(--bg-surface-solid); color: var(--text-primary); outline: none; font-weight: 600; }
  .setting-item input:focus { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-glow); }

  .security-status { display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem; border-radius: 1rem; background: var(--bg-surface-solid); border: 1px solid var(--border-ui); }
  .status-main { flex: 1; }
  .status-main strong { display: block; font-size: 0.85rem; color: var(--text-primary); margin-bottom: 0.25rem; }
  .status-main p { font-size: 0.7rem; color: var(--text-secondary); margin: 0; }

  .danger-zone { border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.02); }
  .zone-desc { font-size: 0.7rem; color: var(--text-muted); margin: 0; font-style: italic; }

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
  
  .scan-footer { margin-top: 1.5rem; }

  /* Checkbox Customization */
  .checkbox-container { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; user-select: none; }
  .checkbox-container input { display: none; }
  .checkmark { width: 18px; height: 18px; border: 2px solid var(--border-ui); border-radius: 4px; position: relative; transition: all 0.2s; background: var(--bg-surface-solid); }
  .checkbox-container input:checked + .checkmark { background: var(--accent); border-color: var(--accent); }
  .checkmark:after { content: ''; position: absolute; display: none; left: 5px; top: 1px; width: 4px; height: 8px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }
  .checkbox-container input:checked + .checkmark:after { display: block; }
  .checkbox-container .label { font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); }

  .secure-flow-toggle { display: flex; align-items: center; gap: 1rem; cursor: pointer; background: var(--bg-surface-solid); padding: 1rem; border-radius: 1rem; border: 1px solid var(--border-ui); transition: all 0.2s; }
  .secure-flow-toggle:hover { border-color: var(--status-warning); }
  .secure-flow-toggle.active { border-color: var(--status-warning); background: rgba(245, 158, 11, 0.05); }
  
  .check-box { width: 40px; height: 20px; background: var(--border-ui); border-radius: 20px; position: relative; transition: all 0.3s; flex-shrink: 0; }
  .check-box .dot { position: absolute; left: 4px; top: 4px; width: 12px; height: 12px; background: white; border-radius: 50%; transition: all 0.3s; }
  input:checked + .check-box { background: var(--status-warning); }
  input:checked + .check-box .dot { left: 24px; }
  .check-label { display: flex; flex-direction: column; }
  .check-label strong { font-size: 0.8rem; color: var(--text-primary); }
  .check-label span { font-size: 0.65rem; color: var(--text-muted); }
  input[type="checkbox"] { display: none; }

  @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  :global(.text-error) { color: var(--status-error); }
</style>
