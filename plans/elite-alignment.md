# Plan: Elite Architecture Realization & Global Data Stratagem

## Objective
Implement the remaining "Elite" features from the architectural roadmap: High-Resilience Healing, Secured Workflows, Versioning, and a Global Data Engine.

## Phase 1: Security & Global Data (Moat)
### 1.1 Password-Protected Vault
- **Vault Upgrade:** Enhance `VaultService` to derive keys from user-provided passwords (using PBKDF2).
- **Workflow Encryption:** 
    - Update `Workflow` schema to include `is_encrypted` and `encrypted_blob`.
    - If encrypted, the `actions` and `settings` arrays will be empty until decrypted.
- **UI Intervention:** Add a "Decryption Challenge" modal that blocks editing, running, or deleting a protected workflow without the password.
- **Force Deletion Check:** Implement a mandatory "Confirm Name" or "Delete Verification" prompt for all workflow deletions.

### 1.2 Global Tables
- **Schema:** Add `global_tables` table to Dexie.
- **Service:** Create `GlobalDataService` for CRUD operations on data accessible to all workflows.
- **UI:** Implement a "Global Vault" feature in the Sidepanel.
- **Interpolation:** Update `processExpression` to support global variables (e.g., `{{GLOBAL.address}}`).

## Phase 2: Advanced Resilience & Healing
### 2.1 Multi-Tier Selector Healer
- **Structure:** Update `WorkflowAction` to hold an array of `candidates` with explicit weights: `ID (100) -> Name (80) -> Label (70) -> XPath (30)`.
- **UI Enhancement:** Add a "Selector Stack" dropdown to each step in the `WorkflowEditor`. This allows power users to manually tune the fallback hierarchy.
- **Healer Logic:** Refactor `SelectorHealer` to perform a sequential search through the stack if the primary selector fails.

### 2.2 File Mapping System
- **Capability:** Add `UPLOAD` action type support.
- **Logic:** Implement a file-to-blob cache. When a CSV contains a local path (or reference), the engine will prompt the user to "Authorize File Access" or use a pre-uploaded cache for batch processing.

## Phase 3: Observability & Ops
### 3.1 Versioning & Rollback
- **Schema:** Add `workflow_versions` table.
- **Engine:** Implement an `auto-save` hook that increments the version and snapshots the workflow state.
- **UI:** Add a "Timeline" view in the editor to compare and restore previous versions.

### 3.2 Granular Debugging Timeline
- **Feature:** Enhance the `Logs` view to show a visual timeline of execution.
- **DOM Snapshots:** Implement a "Snapshotter" module that captures a mini-HTML fragment of the target element during both success and failure for later inspection.

### 3.3 Telemetry & Performance
- **Local Metrics:** Track average execution time per step and "Heal Rate" (how often fallbacks are used).
- **Budgeting:** Show a "Performance Meter" in the settings to monitor local storage and memory footprint.

## Phase 4: Tab Coordination
- **Engine:** Implement `TabCoordinator` to track multiple open tabs involved in a single sequence (e.g., clicking a link that opens a new tab).
- **State Handoff:** Allow the runner to shift focus and execution context between tabs based on URL patterns or tab IDs.

## Verification & Validation
- **Security Test:** Attempt to edit a locked workflow via the console/db without a password.
- **Healing Test:** Break a site's ID attribute and verify if the Label fallback automatically takes over.
- **Rollback Test:** Delete all steps in a workflow and restore them from Version History.
- **Global Data Test:** Use a global variable in a workflow and verify it resolves correctly across different sequences.
