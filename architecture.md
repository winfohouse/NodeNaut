# FlowPilot: Elite Architectural Specification & Development Mandates

**Version:** v4.0 (Production Architecture)
**Status:** Source of Truth
**Project:** FlowPilot
**Type:** Cross-Browser Workflow Automation Platform

> **Senior Developer Note on Versioning:** 
> Version 4.0 signifies a shift from "Experimental Prototype" to "Hardened Production Engine." This versioning implies that the core IPC interfaces, database schemas, and the FlowScript DSL grammar are now under strict change-control. Any breaking change to these foundational elements necessitates a major version bump and a migration strategy for existing user workflows.

---

# 0. Purpose of This Document

This document defines the **authoritative architectural contract** for FlowPilot.

It is not merely documentation. 

> **Architectural Rationale:** 
> In a multi-runtime environment like a browser extension (Background, Content, Sidepanel), technical drift is the primary cause of system failure. This document acts as the "Single Source of Truth" to ensure that all modules adhere to a unified communication and state management protocol.

It acts as:

* Product Architecture: Defining the high-level structural components and their interactions.
* Engineering Contract: Establishing the required inputs, outputs, and behaviors for every engine.
* System Design Reference: Providing the blueprint for how complex edge cases (like SPA navigation) are handled.
* Coding Standards Guide: Mandating patterns (like Svelte Stores and Typed IPC) that ensure long-term maintainability.
* Long-Term Scalability Blueprint: Ensuring the system can scale to thousands of workflow steps without degrading browser performance.

Every implementation decision must follow this specification.

If implementation conflicts with architecture:

```txt
Architecture wins.
```

> **Developer Mandate:** 
> This rule is absolute. If a developer identifies a more "efficient" way to implement a feature that violates these principles (e.g., using a global variable instead of a Svelte store), the architectural principle takes precedence. Efficiency never justifies a compromise in system predictability.

Unless formally revised via a collaborative architectural review.

---

# 1. Strategic Vision

FlowPilot is an elite:

> **Programmable Browser Workflow & Smart Form Automation Platform**

> **Technical Context:** 
> "Programmable" implies that the automation is not a static set of values, but a dynamic script (FlowScript) capable of logic, loops, and conditional execution. "Smart" refers to the platform's ability to semantically understand the DOM, allowing it to recover from site updates that would break traditional automation tools.

designed for:

* normal users: Who require a friction-less "Record and Play" experience.
* repetitive form workers: Who need mass-filling capabilities and error recovery.
* data-entry professionals: Who require high-throughput batch processing from external data sources.
* developers: Who need an IDE-like environment to extend the core platform with custom logic and API integrations.
* enterprise automation: Requiring audit logs, security vaults, and standardized deployment.

FlowPilot bridges the gap between:

```txt
Simple Autofill Tools
                ↓
          FlowPilot
                ↓
Enterprise RPA Systems
```

> **The "Bridge" Strategy:** 
> Simple tools fail because they rely on fragile ID attributes and lack state logic. Enterprise RPA (like UiPath) is too heavy and expensive for daily browser tasks. FlowPilot lives in the middle—providing the robust state machine and self-healing selectors of RPA, but with the lightweight, zero-install footprint of a Chrome Sidepanel extension.

---

## 1.1 Core Product Philosophy

FlowPilot must feel like:

> **A Small Operating System Inside the Browser**

> **Senior Developer Insight:** 
> The "Operating System" metaphor is literal. The Background Script acts as the Kernel (managing processes/workflows), the Content Scripts are Drivers (interfacing with the DOM "hardware"), and the Svelte Stores are the RAM. This architecture ensures that if a tab "crashes" or reloads, the "OS" remains running, allowing the workflow to resume seamlessly.

Characteristics:

### Powerful

Capable of:

* multi-page workflows: Navigating through complex funnels (e.g., Login -> Search -> Filter -> Select -> Buy) while maintaining a persistent execution context.
* automation logic: Supporting `if/else` branching and `while` loops based on DOM values or external data.
* state persistence: Ensuring that the workflow's "Program Counter" and variable values survive browser restarts or crashes.
* custom scripting: Allowing developers to inject sandboxed JavaScript for complex data transformations or unique DOM interactions.

---

### No-Code First

Non-technical users must succeed. The UI must abstract the complexity of the modern web into simple "Actions."

Without:

```txt
CSS selectors
XPath
JavaScript
DOM knowledge
```

> **Implementation Rationale:** 
> The platform must handle the "heavy lifting" of selector generation. When a user clicks an element, the engine generates a "Selector Confidence Model"—a weighted scoring of ID, Name, Label, Placeholder, and semantic position—so the user never has to see a string of code.

---

### Developer Expandable

Developers can unlock:

* scripting: Using the FlowScript DSL or raw JS to handle complex logic.
* database access: Interfacing with IndexedDB via Dexie.js for persistent local data.
* debugging: Utilizing the built-in Timeline and Log Viewer to trace execution errors in real-time.
* custom logic: Building plugins that extend the core platform's capabilities.

---

### Privacy First

All processing:

```txt
Local First
```

No unnecessary cloud dependency.

> **Privacy Rationale:** 
> In an era of rampant data harvesting, FlowPilot's "Local-First" mandate is its strongest security feature. This means that sensitive data—like passwords, SSNs, or API keys—never leave the user's machine unless explicitly requested by a user-configured webhook. All encryption happens via the WebCrypto API using a locally-derived key, ensuring that even if the extension's storage were physically accessed, the data remains a useless blob.

---

### Lightweight

Heavy modules load:

```txt
Only when needed
```

Never bloat baseline experience.

> **Performance Strategy:** 
> Browser extensions share resources with the host page. A "heavy" extension can degrade the user's browsing experience. To prevent this, we utilize "Dynamic Lazy Loading" (via ES6 `import()`). The Monaco Editor (3MB+), the Formula Engine (1MB+), and AI modules are only fetched and initialized when the user enters the "Developer IDE" or "Mapping" views. This keeps the "Cold Start" memory footprint under 80MB.

---

# 2. Core Product Goals

FlowPilot must solve:

## Repetitive Multi-Step Form Filling

Example:

```txt
Job Applications
Government Forms
University Admission
CRM Entry
Invoices
Procurement Forms
```

> **The Technical Challenge:** 
> Modern forms are often built with React, Vue, or Angular, using obfuscated class names (e.g., `css-1v8j2xl`) and complex Shadow DOM structures. Our engine doesn't just "set the value"; it simulates a full human interaction—focusing the field, dispatching `input` and `change` events, and potentially waiting for asynchronous "validation" spinners to clear before proceeding.

---

## Multi-Page Workflow Automation

Example:

```txt
Page 1
Personal Info

↓ Continue

Page 2
Education

↓ Continue

Page 3
Verification

↓ Submit
```

> **Architectural Solution:** 
> Multi-page automation requires a "State Handoff" protocol. When a "Continue" button is clicked, the Background Script (the Kernel) serializes the current workflow progress to IndexedDB. Once the new page loads, the SPA Navigation Engine detects the route change, re-injects the Content Script, and restores the workflow state, picking up exactly where it left off.

---

## Dynamic Data Mapping

Support:

```txt
CSV
JSON
Database
Variables
Formula values
```

> **Data Engine Rationale:** 
> Mapping is the process of binding a data source (e.g., a CSV row) to a DOM element. Our engine supports "Template Literals" (e.g., `{firstname} {lastname}`) and a "Formula Engine" (e.g., `{salary * 0.12}`). This allows users to perform data transformations on-the-fly without needing an external pre-processing tool.

---

## Human-In-The-Loop Automation

When automation fails:

FlowPilot pauses.

User intervenes.

Workflow resumes.

> **HITL Mandate:** 
> Automation should never be a "black box" that crashes when it hits a snag. FlowPilot implements a "Heads-Up Display" (HUD) in the Content Script. If a selector isn't found or a CAPTCHA appears, the engine enters a `WAIT_USER` state, highlighting the problem area for the user. Once the user provides the missing info, the engine re-scans the DOM and resumes execution.

---

# 3. Architectural Principles

Every engineering decision must follow these principles.

---

## 3.1 Local-First Architecture

User data remains local.

Examples:

```txt
CSV files
Credentials
Workflow history
Logs
Snapshots
```

stored locally.

Cloud sync:

```txt
optional only
```

> **Data Residency Mandate:** 
> FlowPilot operates on a "Zero-Trust Cloud" model. All user-generated content—including workflow logic and batch data—is stored in a local **IndexedDB** instance managed by **Dexie.js**. This ensures sub-millisecond data retrieval and total privacy. If cloud sync is enabled, it must utilize **End-to-End Encryption (E2EE)** where the decryption key never leaves the local extension storage.

---

## 3.2 Recoverability > Perfection

FlowPilot prioritizes:

```txt
Resume after failure
```

over:

```txt
Perfect uninterrupted execution
```

If uncertain:

```txt
pause
ask user
resume
```

Never silently fail.

> **The "Resilient Execution" Strategy:** 
> Web automation is inherently volatile. Sites update, network latency fluctuates, and DOM elements shift. Our architecture assumes that **failure is inevitable**. Instead of trying to prevent every possible error, we focus on "Context Serialization." Before every action, the engine snapshots the current state. If a failure occurs, the engine doesn't crash; it provides the user with a "Resume Point" that includes the full execution log and current variable values.

---

## 3.3 Fail Softly

Never:

```txt
hard crash workflow
```

Instead:

```txt
retry
fallback
pause
recover
```

Example:

```txt
Selector not found
↓
Retry
↓
Fallback selector
↓
Ask user
↓
Resume
```

> **The Resiliency Chain:** 
> 1. **Retry (Exponential Backoff):** Re-scan the DOM with increasing delays to account for slow hydration.
> 2. **Fallback (Self-Healing):** Attempt to locate the element using alternative heuristics (e.g., Label-to-Input mapping).
> 3. **Pause (HUD Intervention):** If heuristics fail, the HUD (Heads-Up Display) highlights the target area and asks the user to "Confirm or Re-select."
> 4. **Recover:** Once the user corrects the state, the engine updates its internal Confidence Model for that selector and resumes.

---

## 3.4 Human Always Wins

Automation never overrides user authority.

Examples:

Never auto-confirm:

```txt
bank payments
legal forms
dangerous actions
```

without confidence.

> **Safety Protocol:** 
> Certain action types are flagged as "High Sensitivity." These steps require an explicit `user_confirmation: true` flag in the workflow configuration. Even if the automation is in "Auto-Run" mode, it will halt and wait for a manual click before executing a high-stakes action like a bank transfer or a final "Submit" on a legal document.

---

## 3.5 Lite-weight by Design

Cold start must remain fast.

Heavy modules:

```txt
Monaco IDE
Formula Engine
AI Mapper
OCR
```

must be:

```txt
lazy-loaded
```

> **Module Orchestration:** 
> We use a "Just-In-Time" (JIT) module injection pattern. For instance, the **OCR Engine** (often a 5MB+ WASM blob) is never loaded unless a workflow step explicitly calls a `VISUAL.FindText` action. This ensures that FlowPilot remains a "Background Tenant" in the browser, consuming near-zero resources when not actively automating.

---

## 3.6 Progressive Complexity

Beginner users:

simple UI.

Advanced users:

full power.

> **The "Layered UI" Architecture:** 
> The Sidepanel UI adapts its complexity based on the user's "Level" setting. 
> * **Standard Mode:** Focused on the Step List, Logs, and Data Input.
> * **Expert Mode:** Unlocks the YAML/JSON editor, Variable Watcher, and the DSL Debugger.
> This prevents "Feature Shock" for non-technical users while providing the "Low-Level Access" required by developers.

---

# 4. Runtime Architecture

FlowPilot runs in multiple isolated execution environments. 

> **Architectural Overview:** 
> Modern browser extensions are not single applications; they are **Distributed Systems** running across multiple security boundaries. FlowPilot leverages this by isolating the "Business Intelligence" from the "DOM Manipulation." This prevents a malicious or poorly designed website from accessing the extension's internal state or database.

This separation is mandatory.

---

## 4.1 Runtime Boundary Diagram

```txt
Service Worker (Brain)
          ↓
Content Script (Hands)
          ↓
Injected Script (Native Access)
          ↓
Website DOM
```

Parallel:

```txt
Sidepanel UI
Popup UI
HUD Overlay
```

> **The Boundary Rationale:** 
> * **Service Worker:** Operates in the extension's privileged context. It has full access to `chrome.*` APIs but **zero** access to the DOM.
> * **Content Script:** Operates in an "Isolated World." It can see the DOM but cannot access the page's JavaScript variables (e.g., `window.React`).
> * **Injected Script:** Operates in the "Main World." It has full access to the page's JS context, allowing us to bypass security restrictions that would otherwise prevent us from triggering framework-level events.

---

## 4.2 Service Worker (The Brain)

Location:

```txt
src/background/
```

Purpose:

```txt
Orchestration Layer
```

Responsibilities:

* workflow execution: Managing the queue of steps and their timing.
* state machine: Tracking the `current_status` (IDLE, RUNNING, PAUSED).
* database: The only runtime with direct access to IndexedDB/Dexie.
* runtime persistence: Ensuring that the workflow survives the Service Worker's ephemeral lifecycle.
* recovery: Auto-resuming workflows after a browser restart.
* messaging: Acting as the central "Message Bus" for the entire system.
* licensing: Validating tier-based feature access.
* authentication coordination: Detecting and handling 401/403 redirects.

Allowed:

```txt
business logic
workflow control
database access
```

Forbidden:

```txt
DOM access
```

Service Worker MUST NEVER:

```txt
querySelector()
```

> **Manifest V3 Note:** 
> Because Service Workers are ephemeral (they can be terminated by the browser at any time), the Brain must be **Stateless**. Every state change must be committed to the "Disk" (IndexedDB) or the "Shared Store" (chrome.storage.session) so that the Brain can "Rehydrate" instantly upon waking.

---

## 4.3 Content Script (The Hands)

Location:

```txt
src/content/
```

Responsibilities:

* DOM scanning: Reading the current state of the page.
* field detection: Identifying inputs, buttons, and custom components.
* form filling: Injecting values into the DOM.
* event dispatch: Triggering `click`, `change`, and `submit` events.
* selector finding: Generating confidence-based selectors during recording.
* mutation observing: Watching for DOM changes to signal "Page Stability."

Allowed:

```txt
DOM read/write
```

Forbidden:

```txt
business logic
workflow orchestration
```

Content scripts must remain:

```txt
thin
```

> **The "Thin Driver" Philosophy:** 
> The Content Script should be treated like a hardware driver. It doesn't know *why* it's clicking a button; it only knows *how* to find that button and click it safely. This keeps the Content Script's memory footprint low and reduces the attack surface for malicious websites.

---

---

## 4.4 Injected Script (Native Layer)

Purpose:

Access:

```txt
window
React internals
Vue internals
Page JS context
```

Responsibilities:

* native event dispatch: Bypassing synthetic event restrictions by triggering events directly in the page's event loop.
* framework interaction: Inspecting the state of modern UI frameworks (React Fiber, Vue instances) to ensure "Data-Binding" synchronization.
* shadow DOM assistance: Piercing encapsulated Shadow roots that are inaccessible to standard Content Scripts.

Forbidden:

```txt
database access
extension secrets
credentials
```

> **The Bridge Protocol:** 
> The Injected Script is a "Trusted Guest" in the website's execution context. It communicates with the Content Script via a secure **Window.postMessage** bridge. It must never store data or perform logic; its sole purpose is to act as a "Native Proxy" for actions that require main-world privileges (like triggering a React `onChange` handler).

---

## 4.5 Sidepanel (Control Center)

Purpose:

Primary user interface.

Responsibilities:

* workflow editor: A high-fidelity Svelte-based UI for managing step logic.
* recorder UI: Providing real-time feedback during "Record" mode.
* mapping UI: The visual interface for binding CSV headers to DOM selectors.
* logs: A reactive execution timeline with deep-link debugging.
* developer console: Direct access to the FlowScript DSL and variable state.
* templates: A library of pre-built workflow patterns.
* settings: Global configuration for security, performance, and plugins.

Forbidden:

```txt
core execution logic
```

UI must never own business logic.

> **Sidepanel Resilience:** 
> Unlike the Popup UI, the Sidepanel remains open during page navigations. This makes it the ideal "Flight Deck" for multi-page workflows. The Sidepanel UI is a "Reactive View" of the Background State; it subscribes to Svelte Stores that are synchronized across runtime boundaries via our Typed IPC system.

---

# 5. Enterprise Folder Structure

```txt
FlowPilot/
├── src/
│
│   ├── background/
│   │   ├── core/           # Workflow Engine, Message Router
│   │   ├── engines/        # Scanner, SPA Watcher, Recovery
│   │   ├── services/       # AuthVault, TabCoordinator, Licensing
│   │   └── index.ts        # Entry point
│
│   ├── content/
│   │   ├── scripts/        # Entry points (Isolated World)
│   │   ├── modules/        # SelectorBuilder, FormFiller, Snapshotter
│   │   └── ui/             # HUD Overlay, Intervention Modals
│
│   ├── injected/
│   │   └── page-bridge/    # Main World native access scripts
│
│   ├── sidepanel/
│   │   ├── components/     # Atomic UI elements
│   │   ├── features/       # WorkflowEditor, MappingUI, LogViewer
│   │   └── stores/         # UI-specific reactive state
│
│   ├── popup/
│   │   └── quick-actions/  # Lightweight start/stop UI
│
│   ├── shared/
│   │   ├── api/            # Typed IPC definitions, Messenger
│   │   ├── constants/      # ErrorCodes, Tiers, MessageTypes
│   │   ├── types/          # Global TS Interfaces (FlowPilot.*)
│   │   └── utils/          # Crypto, Sanitization, DateHelpers
│
│   ├── store/              # Global state definitions
│
│   ├── infra/
│   │   ├── migrations/     # DB Schema updates
│   │   ├── lint/           # Custom ESLint rules for extension safety
│   │   └── versioning/     # Manifest versioning logic
│
│   ├── lazy/
│   │   ├── monaco/         # Dynamically loaded editor
│   │   ├── formula-engine/ # Math/Logic parsing engine
│   │   ├── ai-mapper/      # Heuristic field detection
│   │   └── ocr/            # Tesseract/WASM modules
│
│   └── plugins/            # Third-party integrations (Sheets, API)
│
├── tests/
├── assets/
├── build/
├── architecture.md
└── manifest.json
```

> **The Modular Monolith:** 
> We adopt a "Modular Monolith" directory structure. Each top-level folder in `src/` represents a unique **Security Context**. 
> * **The `shared/` folder** is the most critical; it must be "Side-Effect Free." No module in `shared/` can import from `background/` or `sidepanel/`. 
> * **The `lazy/` folder** acts as a "Quarantine" for heavy dependencies, ensuring they are excluded from the main extension bundle to maintain the <200ms cold-start mandate.

---

# 6. Dependency Rules

Strict dependency hierarchy. 

> **Architectural Integrity:** 
> In a large-scale TypeScript project, circular dependencies are a leading cause of memory leaks and difficult-to-trace bugs. We enforce a **Directed Acyclic Graph (DAG)** dependency model. Modules can only import from their own level or lower.

Mandatory.

---

## Allowed

```txt
sidepanel → shared
background → shared
content → shared
popup → shared
```

---

## Forbidden

```txt
shared → sidepanel
shared → background
content → sidepanel
```

Rule:

```txt
Lower-level modules
must never depend upward.
```

> **The "Pure Shared" Mandate:** 
> The `shared/` folder is the bedrock of the project. It must be **Pure Logic**—free of any extension runtime assumptions (e.g., no `chrome.*` calls). This allows shared utilities to be unit-tested in a standard Node.js/Jest environment without mocking the entire browser API.

---

## Circular Dependency Policy

Circular imports are:

```txt
forbidden
```

Shared layer must remain:

```txt
pure
```

> **Enforcement Strategy:** 
> We utilize the `madge` tool and strict ESLint rules (`import/no-cycle`) to prevent circularities. If a circular dependency is detected, the "Core" module must be refactored into smaller, functional components, or the shared logic must be moved down to the `shared/` layer.

---

# 7. Communication Architecture (Typed IPC System)

FlowPilot operates across multiple runtime boundaries.

Because Chrome/Firefox extensions are distributed systems disguised as browser features, communication MUST be standardized.

Raw messaging is forbidden.

---

## 7.1 Messaging Philosophy

Never use:

```ts
chrome.runtime.sendMessage({
  type: "some-random-string"
});
```

This becomes unmaintainable. 

Instead:

Use:

```ts
Messenger.send(
  type,
  payload
)
```

with strict typing.

> **The "Typed Messenger" Rationale:** 
> Raw Chrome messaging is "Fire and Forget" and untyped. Our `Messenger` wrapper provides:
> 1. **Compile-Time Safety:** TypeScript ensures that a `WORKFLOW_RUN` message always includes a `Workflow` object in the payload.
> 2. **Correlation IDs:** Every request is assigned a unique ID, allowing the Background script to match responses to specific requests across asynchronous boundaries.
> 3. **Error Serialization:** Standardizes how errors are caught in one context (e.g., Content Script) and reported in another (e.g., Sidepanel).

---

## 7.2 Typed Request-Response Pattern

All messages must follow:

```ts
type Request<T> = {
  id: string;      // Correlation ID
  type: string;    // Enum-based MessageType
  payload: T;      // Typed Payload
};

type Response<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
};
```

Every message:

* typed: Via the `MessageType` enum.
* validated: Payloads are checked against their expected schema.
* logged: For real-time debugging in the Timeline.
* traceable: Allowing us to see the "Life of a Message" across contexts.

---

## 7.3 IPC Architecture

Communication layers:

```txt
Sidepanel
    ↓
Background
    ↓
Content Script
    ↓
Injected Script
```

Never:

```txt
Sidepanel → DOM directly
```

Forbidden.

Everything routes through:

```txt
Background Service
```

> **The "Central Dispatch" Model:** 
> The Sidepanel never talks to the Content Script directly. This "Star Topology" ensures that the Background script (the Kernel) is always aware of every interaction. This is critical for **Log Integrity** and **State Consistency**.

---

## 7.4 Message Router

Background owns routing.

Location:

```txt
src/background/core/MessageRouter.ts
```

Example:

```ts
router.register(
  "WORKFLOW_RUN",
  workflowRunner.run
);
```

Benefits:

* centralized debugging: One place to watch all system-wide traffic.
* type safety: Centralized schema validation.
* scalability: Easy to add new engines without touching existing IPC logic.
* permission control: The Router can block messages based on the sender's context.

---

## 7.5 Standard Event Types

Examples:

```ts
WORKFLOW_RUN
WORKFLOW_PAUSE
WORKFLOW_RESUME
WORKFLOW_STOP

SCAN_PAGE

FIELD_FILL
FIELD_CLICK

WAIT_SELECTOR

LOG_CREATE

AUTH_REQUIRED
OTP_REQUIRED
CAPTCHA_DETECTED
```

All enums must exist in:

```txt
shared/constants/
```

---

# 8. Internal Event Bus

Internal events are different from IPC. 

> **Architectural Decoupling:** 
> While IPC (Section 7) handles communication *between* runtimes, the Internal Event Bus handles communication *within* a single runtime (primarily the Background Script). This allows us to follow the **Observer Pattern**, where the core Workflow Engine doesn't need to know about the Logger, the HUD, or the Analytics engine.

Purpose:

Synchronize:

* HUD: Real-time visual updates of the current action.
* Logs: Persistent execution history.
* Runtime: State transitions (e.g., IDLE -> RUNNING).
* UI: Reactive updates in the Sidepanel.
* Plugins: Third-party triggers based on system events.

---

## 8.1 Event Philosophy

Everything important becomes an event. 

Example:

```txt
StepCompleted
```

should notify:

```txt
Logs
HUD
Analytics
Debugger
```

without hard coupling.

> **The "Event-Driven" Advantage:** 
> By making the system event-driven, we can add new features (like an "AI Debugger") by simply subscribing to existing events without modifying the core Workflow Engine. This adheres to the **Open/Closed Principle** of software design.

---

## 8.2 Standard Events

```ts
WorkflowStarted
WorkflowPaused
WorkflowRecovered
WorkflowCompleted

StepStarted
StepCompleted
StepFailed

SelectorHealed

CaptchaDetected
OtpRequested

UserInterventionRequired

SnapshotCaptured
```

---

## 8.3 Event Flow Example

```txt
StepStarted
↓
HUD Update (Visual Highlight)

↓
Logger Write (Persist Start Time)

↓
Timeline Update (Reactive UI Refresh)
```

No direct coupling.

---

# 9. State Management Architecture

Framework:

```txt
Svelte Stores
```

Only.

Never introduce:

```txt
Redux
Zustand
MobX
```

No framework mixing.

> **The "Svelte-Native" Choice:** 
> Svelte Stores are chosen for their simplicity and "Zero-Boilerplate" reactivity. They are effectively **Observable Objects** that integrate perfectly with Svelte's compiler. Using a single state management paradigm across the Sidepanel and Background (via our IPC Bridge) ensures a "Cognitive Load" reduction for developers.

---

## 9.1 State Philosophy

Reactive:

```txt
UI
↓
Store
↓
Persistence
↓
Background
```

Everything should derive from:

```txt
single source of truth
```

> **State Consistency Mandate:** 
> Component-local state (e.g., `let x = 0` inside a Svelte component) should only be used for trivial UI transitions. Any data that represents the **Project State** (Workflows, Variables, Settings) must reside in a Store. This ensures that the UI is always a predictable reflection of the underlying data model.

---

## 9.2 Store Categories

### App Store

Global UI state. 

Example:

```ts
{
  activeWorkflowId,
  activeTabId,
  currentMode: "RECORD" | "PLAY" | "EDIT"
}
```

---

### Runtime Store

Workflow execution. 

Example:

```ts
{
  currentStepIndex,
  workflowStatus: "RUNNING",
  waitingReason: "SELECTOR_HIDDEN"
}
```

---

### Logs Store

Execution history. Reactive stream of `LogEntry` objects.

---

### Settings Store

User preferences (e.g., `auto_retry`, `theme`, `api_keys`).

---

### Licensing Store

Tier restrictions and feature-flag states.

---

## 9.3 Persistence Strategy

Critical state persists:

```txt
IndexedDB
```

UI-only state:

```txt
memory only
```

Example:

Persist:

```txt
workflow progress
logs
variables
```

Do not persist:

```txt
sidebar width
hover state
temporary modals
```

> **The "Persistence Middleware":** 
> Stores that require persistence are wrapped in a custom `persistedStore` factory. This factory automatically subscribes to store changes and debounces writes to **IndexedDB**, ensuring that the "Disk" state is never more than 100ms behind the "Memory" state.

---

# 10. Workflow Engine (The Orchestrator)

Location:

```txt
src/background/core/
```

This is:

```txt
The Brain
```

of FlowPilot. 

> **Architectural Mandate:** 
> The Workflow Engine is a **Durable State Machine**. Its primary responsibility is to execute a sequence of instructions (Steps) while maintaining total system integrity across reloads, crashes, and network failures. It must be "Environment-Agnostic," meaning it issues commands to the "Hands" (Content Scripts) and doesn't care about the specific DOM structure.

---

## 10.1 Workflow Philosophy

Workflow =

```txt
Step
↓
Action
↓
Wait
↓
Continue
```

Everything becomes executable steps.

> **Atomic Execution:** 
> Every step in a workflow is an **Atomic Operation**. If a step fails, the engine enters a recovery state rather than continuing with corrupted data. This "Fail-Fast" approach prevents the automation from making irreversible mistakes on the website.

---

## 10.2 Workflow Lifecycle

```txt
IDLE
↓
STARTING
↓
RUNNING
↓
WAITING
↓
USER_INTERVENTION
↓
RESUME
↓
RUNNING
↓
COMPLETE
```

Failure path:

```txt
RUNNING
↓
ERROR
↓
RETRY
↓
FAILED
```

---

## 10.3 Workflow Object Model

```ts
type Workflow = {
  id: string;            // UUID
  name: string;          // Human-readable name
  version: number;       // For schema migrations

  steps: WorkflowStep[]; // Ordered instruction set

  settings: WorkflowSettings; // e.g., { autoRetry: boolean, timeout: number }
};
```

---

## 10.4 Workflow Step Model

```ts
type WorkflowStep = {
  id: string;           // Step correlation ID
  type: StepType;       // e.g., "FILL", "CLICK", "NAVIGATE"
  config: unknown;      // Type-specific configuration (e.g., { selector: string, value: string })
  retryCount?: number;  // Tracks current attempt number
};
```

---

## 10.5 Supported Step Types

```txt
fill          # Inject data into inputs
click         # Trigger DOM interactions
wait          # Pause for a specific time
wait-user     # Pause for manual intervention
wait-selector # Wait for element to appear/become stable
wait-url      # Wait for navigation to complete

navigate      # Change page URL

upload-file   # Handle file input simulations

condition     # If/Else logic based on DOM state
loop          # Repeat steps for batch data

custom-js     # Execute sandboxed JavaScript
```

---

## 10.6 Retry System

Every step supports:

```ts
{
  retryCount: 3
}
```

Strategy:

```txt
Try
↓
Retry
↓
Fallback
↓
Pause User
```

Never:

```txt
hard fail immediately
```

> **Exponential Backoff:** 
> Retries are not immediate. The engine implements an exponential backoff (e.g., 500ms -> 2000ms -> 5000ms) to allow the target website to "Stabilize" (e.g., finish loading heavy React components or processing a network request).

---

# 11. Workflow Recorder Engine

Purpose:

No-code automation creation. 

> **The "Observer" Pattern:** 
> The Recorder lives in the Content Script but is orchestrated by the Background Script. It "Listens" to native browser events and translates them into high-level FlowScript instructions.

---

## 11.1 Recorder Philosophy

Users should automate by:

```txt
doing
```

not configuring.

---

## 11.2 Recorder Tracks

Monitor:

```txt
typing: Captured as "FILL" actions.
clicks: Captured as "CLICK" actions.
dropdown selection: Captured as "SELECT" actions.
checkbox: Captured as "TOGGLE" actions.
navigation: Captured as "NAVIGATE" or "WAIT_URL" actions.
popup opening: Monitored via the TabCoordinator.
tab switching: Automatically tracked to maintain workflow continuity.
```

---

## 11.3 Recorder Output

Raw events become:

```txt
normalized workflow steps
```

Example:

User action:

```txt
typed name
```

Becomes:

```json
{
  "type": "fill",
  "selector": "#name",
  "value": "{firstname}"
}
```

> **Smart Variable Suggestion:** 
> If the recorder detects that the user is typing into a field labeled "First Name," it automatically suggests a variable binding (e.g., `{firstname}`) instead of hardcoding the literal text.

---

## 11.4 Noise Filtering

Recorder ignores:

```txt
mousemove: Too high frequency, irrelevant for most automations.
scroll: Usually non-functional for data entry.
hover: Only recorded if it triggers a critical DOM mutation (e.g., showing a menu).
random clicks: Clicks on non-interactive elements (like whitespace) are filtered out.
```

unless intentional.

---

## 11.5 Recorder Editability

Generated workflows must be:

```txt
editable
```

No black-box recordings.

> **Transparency Mandate:** 
> Every recorded step is immediately visible in the Sidepanel. The user can delete, reorder, or modify the configuration of any step *while* recording is still active. This provides a "Live Preview" of the resulting automation.

---

# 12. Smart Scanner Engine

Purpose:

Understand websites automatically. 

> **Semantic Analysis Mandate:** 
> The Smart Scanner is not a simple DOM crawler; it is a **Heuristic Discovery Engine**. It must be able to distinguish between a "Search Input" and a "Login Email Input" based on surrounding context, metadata, and accessibility labels.

---

## 12.1 Detection Targets

Native:

```html
<input>
<textarea>
<select>
```

Groups:

```txt
checkboxes: Identifying logical groups (e.g., "Interests" list).
radio groups: Ensuring only one value is mapped to the group.
```

Custom:

```txt
React: Detection of framework-specific controlled components.
Vue: Mapping to v-model bound inputs.
Angular: Handling ReactiveForms metadata.
Headless UI: Understanding Radix, Headless UI, and Aria-compliant components.
Shadow DOM: Recursive piercing of encapsulated components.
```

---

## 12.2 Scanner Responsibilities

Detect:

* field label: Finding the `<label>` or `aria-label` associated with an input.
* field type: Distinguishing between `text`, `password`, `number`, and `date`.
* selector: Generating a prioritized list of candidate selectors.
* validation rules: Detecting `required`, `pattern`, or `maxlength` attributes.
* placeholder: Using the placeholder text as a semantic fallback.
* default values: Recording the initial state of the form.
* dropdown options: Extracting and normalizing the values and labels from `<select>` or custom dropdowns.

---

## 12.3 Scanner Output

```ts
type ScannedField = {
  label: string;          // e.g., "Date of Birth"
  type: FieldType;        // e.g., "DATE"
  selector: string;       // The most confident CSS/XPath
  confidence: number;     // 0-100 score
  metadata: {
    placeholder?: string;
    isRequired: boolean;
    options?: string[];   // For dropdowns
  }
};
```

---

## 12.4 Selector Confidence Score

Every selector gets:

```txt
confidence score
```

Example:

```txt
95%
```

based on:

* id: The gold standard for stability (Score: 100).
* name: Highly reliable for form submissions (Score: 80).
* label: Critical for accessibility and semantic meaning (Score: 70).
* placeholder: Useful but often ephemeral (Score: 60).
* position: Fragile, used only as a last resort (Score: 20).
* similarity: Using Levenshtein distance to match similar IDs across site updates.

---

# 13. Dynamic Data Engine

Purpose:

Convert user data into filled forms. 

> **Binding Rationale:** 
> The Dynamic Data Engine acts as the "Controller" in an MVC model. It binds the "Model" (the user's CSV/JSON data) to the "View" (the website's DOM). It must handle data type coercion, template interpolation, and mathematical transformations.

---

## 13.1 Supported Sources

* CSV: The primary format for batch data entry.
* JSON: For structured developer-level data.
* Database: Integration with local IndexedDB tables.
* Variables: Ephemeral state shared across workflow steps.
* Formulas: Calculated values derived at runtime.

---

## 13.2 Variable Syntax

Example:

```txt
{name}
```

Combined:

```txt
{firstname} {lastname}
```

Expression:

```txt
{city}, {country}
```

> **Template Interpolation:** 
> At runtime, the engine performs a "Regex Search and Replace" on all string values in a step's configuration. It pulls the current row's data and injects it into the workflow instruction before sending it to the Content Script.

---

## 13.3 Auto Incrementers

Example:

```txt
INV-{AUTO+1}
```

Result:

```txt
INV-1001
INV-1002
INV-1003
```

Persistent counters required. 

> **Counter Persistence:** 
> "Auto-Incrementers" are stored in a dedicated table in IndexedDB. This ensures that even if a workflow is stopped and restarted, the counter continues from its last known value, preventing duplicate ID generation.

---

## 13.4 Formula Mode

Supports:

```txt
JavaScript expression
```

Example:

```js
row.salary * 0.12
```

> **The Sandboxed Evaluator:** 
> Formulas are executed in a **Safe Sandbox** (using a library like `jexl`). This allows users to perform complex math and string manipulation without exposing the extension to Cross-Site Scripting (XSS) or arbitrary code execution vulnerabilities associated with `eval()`.

---

# 14. FLOW DSL (Flow Language)

Purpose:

Human-readable automation language.

---

## 14.1 Design Goals

Must be:

```txt
recordable
editable
debuggable
executable
```

---

## 14.2 Example

```js
FLOW.Fill(
  "#name",
  "{firstname}"
);

FLOW.Click(
  "#continue"
);

FLOW.WaitFor(
  "#otp"
);

FLOW.PauseUser(
  "Enter OTP"
);
```

---

## 14.3 DSL Principles

Readable.

Versionable.

Exportable.

Recorder-generated.

Developer-editable.

---

# 15. Database Schema

Storage:

```txt
IndexedDB
+
Dexie.js
```

---

## Tables

### workflows

```txt
id
name
version
settings
created_at
updated_at
```

---

### workflow_steps

```txt
id
workflow_id
step_order
type
config_json
```

---

### field_mappings

```txt
workflow_id
selector
template
mode
js_code
```

---

### workflow_context

```txt
workflow_id
current_step
runtime_state
variables
```

---

### execution_logs

```txt
id
workflow_id
step_id
status
message
timestamp
retry_count
```

---

### credentials

Encrypted.

```txt
domain
encrypted_blob
created_at
```

---

### snapshots

```txt
selector
html_fragment
attributes
timestamp
```

# 16. Authentication & Session Engine

Modern workflows frequently involve authentication interruptions.

FlowPilot must recover intelligently.

Never restart a workflow unnecessarily.

---

## 16.1 Authentication Philosophy

Authentication is:

```txt id="m2l1eu"
part of workflow state
```

not an external interruption.

Example:

```txt id="yz8wyj"
Workflow Running
↓
Session Expired
↓
Login Required
↓
Authenticate
↓
Resume Automatically
```

---

## 16.2 Login Detection

FlowPilot detects authentication through:

### URL Signals

Examples:

```txt id="sd9dbe"
/login
/signin
/auth
/oauth
```

---

### DOM Signals

Detected:

```txt id="ny5cb0"
password field
login form
auth modal
```

---

### Response Signals

Example:

```txt id="07ay7k"
401 Unauthorized
403 Redirect
```

---

## 16.3 Credential Vault

Sensitive credentials MUST be encrypted.

Storage:

```txt id="1gij6w"
WebCrypto API
```

Only.

Never plaintext.

---

### Supported Credentials

```txt id="x8a75j"
username
email
password
api key
session token
cookie
```

---

### Encryption Policy

Credentials stored as:

```ts id="nknm5d"
encrypted_blob
```

Never readable directly.

---

## 16.4 Session Recovery

If auth expires:

```txt id="ibw51n"
pause workflow
↓
save context
↓
re-authenticate
↓
restore state
↓
resume execution
```

---

# 17. Human Verification Policy

FlowPilot supports:

```txt id="fyzkgm"
human-assisted automation
```

Not bypass automation.

---

## 17.1 Supported Verification

```txt id="vvtg9w"
OTP
SMS Verification
Email Verification
Captcha
reCAPTCHA
Cloudflare Challenge
2FA
```

---

## 17.2 Policy

FlowPilot MUST NOT bypass:

```txt id="x6eb0r"
captcha
```

Ever.

Instead:

```txt id="s1ax68"
pause
notify user
resume after completion
```

HUD Example:

```txt id="pn0e8g"
Verification Required

Please complete captcha

[Continue Workflow]
```

---

# 18. Recovery Engine

Purpose:

Prevent workflow loss.

---

## 18.1 Recovery Philosophy

No progress should disappear.

Even after:

```txt id="4q52lf"
browser crash
tab close
restart
internet outage
```

---

## 18.2 Persistent Recovery

Every step mirrors to:

```txt id="xt0k2n"
IndexedDB
```

Example:

```txt id="5i1snc"
Step 4 completed
↓
saved immediately
```

---

## 18.3 Resume Workflow

On restore:

```txt id="s0k18j"
Resume Workflow?

Job Apply
Step 6/14

Waiting:
OTP
```

---

## 18.4 Recovery Guarantees

FlowPilot must preserve:

```txt id="lbjlwm"
workflow progress
variables
tab state
runtime context
retry count
waiting reason
```

---

# 19. SPA Navigation Engine

Modern websites rarely reload.

FlowPilot must understand:

```txt id="mld2sy"
virtual navigation
```

---

## 19.1 SPA Detection

Watch:

```txt id="q2lqrr"
pushState
replaceState
popstate
```

---

## 19.2 DOM Stabilization

Workflow waits until:

```txt id="9h0s11"
DOM idle
```

before action.

Detected by:

```txt id="a4gbz4"
MutationObserver
```

plus timeout strategy.

---

## 19.3 Render Safety

Never:

```txt id="zy40hh"
click immediately after route change
```

Wait:

```txt id="yskwb5"
selector stable
```

---

# 20. Selector Self-Healing Engine

This is a major competitive moat.

---

## 20.1 Selector Confidence Model

Every selector gets:

```txt id="m7m4h6"
confidence score
```

Example:

```txt id="nmf6do"
#submit = 96%
```

---

## 20.2 Weighted Strategy

Scoring:

```txt id="m9ib24"
ID = 100
Name = 80
Label = 70
Placeholder = 60
Data Attributes = 50
XPath = 30
Relative Path = 10
```

---

## 20.3 Healing Strategy

Example:

Old:

```txt id="04i4ja"
#submitBtn
```

New:

```txt id="mqmglx"
#submitButton
```

Engine compares:

```txt id="24vow5"
label
position
similarity
semantic meaning
```

then repairs automatically.

---

## 20.4 Healing Audit

Every healed selector creates:

```txt id="d7fxzm"
execution log
```

Example:

```txt id="tp8o6y"
Selector healed:
#submitBtn
→ #submitButton
```

---

# 21. Fill / Click / Wait Engine

Core automation actions.

---

## 21.1 Fill System

Supports:

```txt id="t6m8tz"
input
textarea
select
checkbox
radio
custom component
```

Methods:

```txt id="8gwn0m"
native event
framework event
manual dispatch
```

---

## 21.2 Click System

Supports:

```txt id="4eq7eo"
button
anchor
div buttons
framework actions
```

Fallback:

```txt id="f96k8h"
dispatch click
↓
mouse event
↓
manual trigger
```

---

## 21.3 Wait System

Supported waits:

```txt id="2n2q10"
wait-url
wait-selector
wait-disappear
wait-time
wait-user
```

---

## 21.4 Wait Timeout

Every wait:

```txt id="b89jry"
timeout required
```

Example:

```txt id="xq2kdo"
30 seconds
```

Fallback:

```txt id="kkq07y"
retry
pause user
```

---

# 22. Batch Execution Engine

Purpose:

Mass automation.

---

## 22.1 Batch Modes

### Single Row

Manual execution.

---

### Sequential

```txt id="4ir9ut"
Row1
↓ Submit
Row2
↓ Submit
```

---

### Retry Failed

Only failed rows rerun.

---

### Parallel (Future)

Multi-tab.

---

## 22.2 Queue Tracking

Runtime:

```txt id="ym1tlg"
Success
Pending
Failed
Skipped
```

---

## 22.3 Control Center

Users can:

```txt id="gwxgdi"
pause
resume
stop
retry
skip row
```

---

# 23. Tab Coordination Engine

Modern workflows may require:

```txt id="psnwxu"
multiple tabs
popups
oauth redirects
email verification
```

---

## 23.1 Tab Roles

```txt id="fj9x7s"
Primary Tab
Helper Tab
Verification Tab
Background Tab
```

---

## 23.2 Coordination Rules

Workflow context must survive:

```txt id="my8k0y"
tab switching
popup close
navigation
```

---

## 23.3 Smart Focus

FlowPilot can:

```txt id="aqtgbh"
switch tabs
restore tabs
track active workflow
```

---

# 24. Runtime Permission System

Default permissions minimal.

---

## 24.1 Core Permissions

```json id="n7w2t7"
[
  "storage",
  "tabs",
  "scripting"
]
```

---

## 24.2 Runtime Escalation

Never default:

```txt id="a2bzvv"
<all_urls>
```

Instead:

```txt id="r9xv4m"\
request domain permission
```

only when needed.

---

# 25. Security & Sandbox Model

Security first.

---

## 25.1 Sandbox Rules

Custom JS forbidden from:

```txt id="u6zjzk"
chrome.storage.clear()
unrestricted APIs
remote script execution
```

---

## 25.2 Isolation

Developer JS executes:

```txt id="7k3d7k"
isolated runtime
```

Never directly inside extension core.

---

## 25.3 Sensitive Data Policy

Sensitive fields:

```txt id="clz22t"
password
banking
passport
ssn
```

auto-delete after run.

---

# 26. Plugin Architecture

Feature expansion system.

---

## Plugin Types

```txt id="3lm7k9"
OCR
AI Mapper
Google Sheets
REST API
Webhook
Email OTP
```

---

## Plugin Rules

Plugins must:

```txt id="fyvp2f"
declare permissions
sandbox execution
version compatible
```

---

# 27. Observability & Debugging

Automation must be explainable.

---

## 27.1 Timeline

Example:

```txt id="n9aq4v"
10:12 Fill Name
10:13 Click Continue
10:15 Wait OTP
```

---

## 27.2 Log Metadata

Each log includes:

```txt id="r7kc0g"
duration
retry_count
dom_snapshot
confidence
```

---

## 27.3 Error Codes

Examples:

```txt id="g7z83p"
FP-1001 SelectorNotFound
FP-2001 PermissionDenied
FP-3001 CaptchaDetected
```

---

# 28. Failure Philosophy

Principles:

### Fail Softly

Never crash workflow.

---

### User Wins

If confidence low:

ask user.

---

### Recoverability > Perfection

Resume matters more than flawless execution.

---

# 29. Testing Strategy

---

## Unit Testing

Test:

```txt id="oqb0ow"
selector scoring
template parser
dsl parser
formula engine
```

Target:

```txt id="9gn7l8"
90%+
```

---

## Integration

Test:

```txt id="ux0n6d"
background ↔ content
routing
persistence
```

---

## E2E

Tool:

```txt id="a1j8zv"
Playwright
```

Test:

```txt id="m84g5s"
multi-page
otp wait
resume
reload recovery
```

---

# 30. Performance Budget

Hard limits.

---

## Startup

```txt id="o0i5tp"
<200ms
```

---

## Memory

```txt id="aehvth"
<80MB
```

normal mode.

---

## Idle CPU

```txt id="9ymbnm"
≈0%
```

---

## Lazy Loading

Heavy modules never preload.

---

# 31. Product Tiers

### Free

Basic automation.

---

### Pro

Unlimited workflows.

---

### Enterprise

Audit logs.

Shared workflows.

Vault.

---

# 32. Maintenance Checklist

Before shipping:

```txt id="mj5r9p"
Svelte store used?
Sensitive data encrypted?
SPA stabilized?
Snapshot captured?
Execution log created?
Permission valid?
Feature gated?
```
