# FlowPilot Phase-by-Phase Roadmap

## Phase 1: Core Architecture & Persistence (Foundation)
- [x] Svelte 5 + Vite 8 Setup.
- [x] Manifest V3 Setup with permissions.
- [x] Dexie.js Schema (Version 3 with Data Tables).
- [x] IIFE Content Script Bundling.
- [x] IPC Messenger with Correlation IDs.

## Phase 2: Orchestration & Resilience (The Brain)
- [x] **Durable State Machine:** Context persistence.
- [x] **Inter-page Persistence:** Re-hydration after refresh.
- [x] **Smart Wait Logic:** Implicit/Explicit waits.
- [x] **Navigation Handling:** Graceful transitions and load detection.

## Phase 3: Developer Infrastructure (The HUD & IDE)
- [x] **Floating HUD:** Real-time status overlay.
- [x] **Visual Pulse:** Element highlighting.
- [x] **Workflow Editor:** Visual sequence builder.
- [x] **Monaco IDE Integration:** Custom script support with `FLOW` helper.

## Phase 4: Intelligence & Discovery (The Senses)
- [x] **Smart Scanner:** DOM discovery.
- [x] **Selector Heuristics:** Weighted scoring.
- [x] **Event Recorder:** Action capture.
- [x] **Self-Healing Selectors:** `SelectorHealer` utility.

## Phase 5: Data Engine (The Fuel)
- [x] **CSV/JSON Import:** PapaParse integration.
- [x] **Table View:** Grid management in sidepanel.
- [x] **Variable Mapping:** `{column}` interpolation in steps.
- [x] **Transformation Logic:** Variable resolution in background.

## Phase 6: Execution Engine (The Muscle)
- [x] **Batch Processing:** Sequential row execution.
- [x] **Error Recovery:** Retry logic with backoff.
- [x] **Human-in-the-Loop:** Status updates via HUD.
- [x] **Execution Dashboard:** Live logs and audit trail.

## Phase 7: Advanced Polish
- [ ] **Scripting API:** Full `FLOW` global documentation.
- [ ] **Export/Import:** Workflow sharing.
- [ ] **Dark Mode / UI Refinement.**

## Phase 8: Elite Resilience & Security (The Moat) - COMPLETED
- [x] **Self-Healing Execution:** Integrating `SelectorHealer` into the core runner for auto-repairing broken steps.
- [x] **Secure Vault:** WebCrypto encryption for credentials (passwords/API keys).
- [x] **Shadow DOM Piercing:** Enhancing Scanner and Filler to reach deep into encapsulated components.
- [x] **Formula Engine:** Sandboxed expression evaluation for dynamic data transformations.
- [x] **Human-in-the-Loop:** Formalized `WAIT_USER` states with interactive HUD prompts.
- [ ] **Tab Synchronization:** Coordinating state across multiple open workflow tabs.
