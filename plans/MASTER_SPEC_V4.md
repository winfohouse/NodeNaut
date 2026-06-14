# FlowPilot: Master Specification & Engineering Protocol (v4.0)

This is the **Single Source of Truth** for the FlowPilot platform. It encompasses the vision, technical architecture, engineering mandates, and the "Elite Alignment" roadmap. Any developer starting on this project should read this document to understand the "OS inside the Browser" philosophy.

---

## 1. Strategic Vision: The "Small OS" Philosophy

FlowPilot is an elite **Programmable Browser Workflow & Smart Form Automation Platform**. It bridges the gap between linear "autofill" tools and massive enterprise RPA systems (like UiPath).

### The Competitive Moat:
1.  **Programmable Intelligence:** A VSCode-like IDE within the browser for deep, logical customization.
2.  **Resilient Automation:** A "Self-Healing" selector engine that survives website DOM updates.
3.  **Privacy-First Moat:** Local-first processing; credentials and data never leave the machine.
4.  **Specialized Resilience:** Sequences that pause for user intervention rather than crashing.

---

## 2. Runtime Architecture (Security Contexts)

FlowPilot operates across four isolated execution environments. Strict boundary separation is mandatory.

### 2.1 Service Worker (The Brain) - `src/background/`
- **Role:** Orchestration, state machine management, database ownership (Dexie).
- **Mandate:** MUST remain stateless (ephemeral SW). MUST NEVER access the DOM directly.

### 2.2 Content Script (The Hands) - `src/content/`
- **Role:** DOM discovery (Scanner), Form filling (Filler), and event capturing (Recorder).
- **Mandate:** Treat as a "driver." It only knows *how* to find/click, not *why*.

### 2.3 Injected Script (Native Layer) - `src/injected/`
- **Role:** Bypassing synthetic event restrictions, interacting with React/Vue internals.
- **Protocol:** Communicates with Content Script via `window.postMessage`.

### 2.4 Sidepanel (Control Center) - `src/sidepanel/`
- **Role:** Svelte-powered dashboard for workflow management, logs, and global configuration.

---

## 3. Scalable Directory Structure

This hierarchy is designed for thousands of steps and complex module lazy-loading.

```text
FlowPilot/
├── src/
│   ├── background/
│   │   ├── core/           # Workflow Engine, Message Router
│   │   ├── engines/        # Scanner Service, TabCoordinator, Recovery
│   │   └── services/       # VaultService (Password Layer), GlobalData
│   │
│   ├── content/
│   │   ├── modules/        # Picker, Scanner, Recorder, HUD, SPAWatcher
│   │   └── ui/             # HUD Overlay, Intervention Modals
│   │
│   ├── shared/             # ZERO SIDE-EFFECTS (Pure logic only)
│   │   ├── api/            # Typed IPC (Messenger)
│   │   ├── constants/      # MessageTypes, ErrorCodes
│   │   ├── types/          # Global TS Interfaces
│   │   └── utils/          # Selectors, Expressions, Sanitization
│   │
│   ├── sidepanel/
│   │   ├── components/     # Atomic (DataTable, ExpressionInput)
│   │   ├── features/       # Views (WorkflowEditor, Library, Settings)
│   │   └── stores/         # UI-specific reactive state
│   │
│   ├── lazy/               # LAZY-LOADED MODULES (>200kb)
│   │   ├── monaco/         # IDE Engine
│   │   ├── formula/        # Complex Math Engine
│   │   └── ai/             # Field Discovery Heuristics
│   │
│   └── plugins/            # Third-party extensions (Google Sheets, OCR)
│
├── public/                 # Manifest, Assets, Icons
├── architecture.md         # Detailed engine specifications
└── MASTER_SPEC_V4.md       # THIS DOCUMENT (The Master Protocol)
```

---

## 4. Elite Engineering Mandates

### 4.1 "Fail-Soft" Resilience Chain
If a step fails (element not found):
1.  **Retry:** 3 attempts with exponential backoff.
2.  **Heal:** sequential scan of the **Selector Stack** (ID -> Name -> Label -> XPath).
3.  **Pause:** If still not found, trigger `WAIT_USER` state.
4.  **HUD Intervention:** Show diagnostic tooltip and "Resume" button on the webpage.

### 4.2 Secure Credential Vault (Tiered Security)
- **Standard:** Locally encrypted keys (master-derived).
- **Elite:** User-defined passwords using PBKDF2. 
- **Mandate:** Locked workflows cannot be edited, run, or deleted without the password.

### 4.3 Global Tables (Cross-Sequence Memory)
- Persistent data pool for static info (Address, Payments).
- Reference via `{{GLOBAL.field}}`.
- Can be flagged as "Secure" (encrypted).

### 4.4 High-Intelligence Autocomplete
- Support for `{{JS_LOGIC}}`, `{COLUMN_DATA}`, and `calc(MATH)`.
- Real-time "Red Undermark" diagnostics with position-aware hover tooltips.

---

## 5. Roadmap: The "Elite Alignment" Plan

### [IN PROGRESS] Phase 1: Security & Global Tables
- Upgrade Vault to support passwords.
- Implement `global_tables` schema and reference logic.

### [TODO] Phase 2: Multi-Tier Healing UI
- Add "Selector Stack" dropdown to step config.
- Refactor `SelectorHealer` to Sequential-Fallback mode.

### [TODO] Phase 3: Ops & Observability
- **Versioning:** Automatic snapshotting of every workflow save.
- **Timeline:** Log view with millisecond-precision and DOM snapshots.
- **File Mapping:** CSV path to file-input UPLOAD automation.

---

## 6. IPC Protocol (Messenger)

RAW MESSAGING IS FORBIDDEN. All communication must use the typed `Messenger`:

```ts
// Example: Correct pattern
await Messenger.send(MessageType.DOM_CLICK, { selector: "#id" });
```

Correlation IDs are required for all request-response pairs to ensure state consistency across the Service Worker's lifecycle.
