# FlowPilot: Elite Architectural Specification & Development Mandates

This document is the definitive technical authority for FlowPilot. It transcends basic organization, defining a high-performance, secure, and resilient ecosystem designed for maximum scalability and maintainability.

---

## 1. Advanced Directory Structure (Enterprise Grade)

The project follows a **Domain-Driven Design (DDD)** approach within the constraints of a Chrome Extension.

```text
FlowPilot/
├── src/
│   ├── background/             # "The Brain" (Service Worker)
│   │   ├── core/               # Main orchestration logic (WorkflowRunner, StateSync)
│   │   ├── engines/            # Stateless logic units (Scanner, LogicEngine)
│   │   ├── services/           # DB (Dexie), Auth, and external API connectors
│   │   └── index.ts            # Bootstrapper (Event listeners & message routing)
│   ├── content/                # "The Hands" (DOM Interaction)
│   │   ├── scripts/            # Script entry points (isolated & main world)
│   │   ├── modules/            # Reusable DOM units (SelectorBuilder, FormFiller)
│   │   └── ui/                 # Injected UI elements (Overlays, Pointers)
│   ├── sidepanel/              # "The Control Center" (Main Dashboard)
│   │   ├── components/         # Atomic UI components (Svelte)
│   │   ├── features/           # Feature-specific logic (IDE, Mapper, LogViewer)
│   │   └── stores/             # View-specific reactive state
│   ├── shared/                 # "The DNA" (Universal logic)
│   │   ├── api/                # Typed IPC message definitions & Request/Response schemas
│   │   ├── constants/          # Enums, ActionTypes, Config defaults
│   │   ├── types/              # Strict TypeScript Interfaces & Type Guards
│   │   └── utils/              # Pure functions (DOM-less helpers)
│   ├── store/                  # Global State Management (Zustand + Persistence)
│   └── infra/                  # Infrastructure (Migrations, Custom Linters)
├── lib/                        # "The Heavy Machinery" (Lazy-loaded chunks)
├── tests/                      # Multi-tier testing (Unit, Integration, E2E)
├── assets/                     # Static assets (Optimized SVGs, Scoped CSS)
├── build/                      # Build config (Vite/Esbuild/Rollup)
├── manifest.json               # v3 Compliant Manifest
└── architecture.md             # This document
```

---

## 2. Communication Architecture (The Message Bus)

### 2.1. Typed IPC Pattern
Never use raw strings for messaging. Use a **Request-Response** pattern with central routing:
1.  **Define:** Every message must be part of an `ExtMessage` union in `shared/api`.
2.  **Dispatch:** Use a wrapper `Messenger.send(type, payload)` that returns a Typed Promise.
3.  **Route:** The Background script uses a `MessageRouter` to delegate to specific services.

### 2.2. State Synchronization
*   **Reactive Flow:** UI changes -> Zustand Store -> Persistence (Dexie) -> Message to Background.
*   **Background Sync:** Background observes DB changes (Dexie Hooks) to update its internal state machine without manual polling.

---

## 3. Core Development Mandates (The "Iron" Rules)

### 3.1. Performance & "Lite-Weight" Execution
*   **Cold Start Optimization:** The Service Worker must not perform heavy logic on boot. Use lazy imports for all engines.
*   **DOM Impact:** Content scripts must be passive. Use `MutationObserver` sparingly; disconnect immediately when a target is found.
*   **Memory Management:** Explicitly clear caches and large state objects when a workflow completes.

### 3.2. Security & Content Security Policy (CSP)
*   **No `eval()`:** All dynamic logic must use the **Developer Sandbox** (offscreen document or sandboxed iframe) if standard extension CSP forbids execution.
*   **Minimal Permissions:** Only request host permissions as needed. Use `activeTab` whenever possible.
*   **Sanitization:** All data from the page (DOM) must be sanitized before being displayed in the sidepanel to prevent XSS.

### 3.3. Resilience & Self-Healing
*   **Selector Fallback Chain:** Implement a weighted scoring system for selectors (e.g., ID=100, Name=80, Class=20).
*   **Workflow Recovery:** Every step status is committed to IndexedDB. If the browser crashes, FlowPilot must offer a "Resume from Step X" prompt.
*   **Error Boundaries:** Every major component (Scanner, IDE) must have a global `try-catch` that logs to the persistent `execution_logs`.

### 3.4. Scalability (Module Isolation)
*   **Dependency Injection:** Services should be injected into engines to allow for easy mocking in tests.
*   **No Circular Dependencies:** Use the `shared/` layer strictly for leaf-node dependencies.

---

## 4. Observability & Debugging

*   **Audit Log:** Every state transition (e.g., `IDLE` -> `SCANNING`) must be logged.
*   **Process Console:** A dedicated "Developer Console" in the sidepanel that visualizes Background logs in real-time.
*   **Telemetry (Local):** Track performance metrics (e.g., "Scan Time", "Fill Time") for local optimization.

---

## 5. Deployment & Maintenance Lifecycle

### 5.1. Schema Migrations
*   Never make breaking changes to the Dexie schema without a corresponding migration script in `infra/migrations`.

### 5.2. Automated Validation
*   **Pre-commit:** Linting, Type-checking, and Unit Tests.
*   **E2E:** Critical path testing (Record -> Map -> Fill) must be verified before every release.

---

## 6. Maintenance Checklist for Agent
1.  **Strict Typing:** Is every `any` replaced with a concrete type or generic?
2.  **Lazy Chunking:** Is this new library bundled or dynamically imported?
3.  **IPC Safety:** Is the new message type added to the `shared/api` registry?
4.  **Security:** Does this handle user-provided strings safely?
5.  **Auditability:** Does this action generate a meaningful `execution_log` entry?
