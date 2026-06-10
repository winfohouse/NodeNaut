# FlowPilot: Lossless Strategic Master Blueprint (v3.4)

FlowPilot is an elite **Programmable Browser Workflow & Smart Form Automation Platform**. This document is the absolute authority on the project's vision, technical specifications, and implementation roadmap.

---

## 0. Strategic Vision & Competitive "Moat"

FlowPilot bridges the gap between simple autofill tools and complex RPA:
*   **Programmable Intelligence:** A VSCode-like IDE within the browser for deep customization.
*   **Resilient Automation:** A "Self-Healing" selector engine that survives site updates.
*   **Privacy-First Architecture:** Local-first processing with zero data leakage, optimized for enterprise-grade security.

**Core Capabilities:**
*   **Smart Form Autofill:** Supports all form types (Inputs, Dropdowns, Checklists).
*   **Multi-Page Workflow Automation:** Chain multiple URLs into a single "Context."
*   **CSV/Data-Driven Filling:** Map dynamic table headers to form fields.
*   **DOM Scripting:** Direct access to document objects.
*   **Developer Sandbox:** A tabbed, VSCode-like IDE for persistent JS execution.
*   **Visual Mapping System:** No-code interface for complex element selection.
*   **Rule Engine:** Conditional logic for dynamic form paths.

---

## 1. Product UX/UI Philosophy

To feel like a "Small OS inside Chrome," the UI follows these principles:
*   **Density & Utility:** Information-rich views (Svelte-powered) that prioritize speed for power users.
*   **Visual Feedback:** Every scan, fill, and click has a corresponding "Ghost Highlight" or "Pulse" on the page.
*   **Contextual Awareness:** The sidepanel dynamically morphs based on the active tab's workflow state.

---

## 2. The 8-Engine Framework: Deep Specification

To ensure the extension remains **super lite-weight**, it uses a "Feature Flag" and "Lazy Loading" system. Heavy modules (IDE, Formula Engine) only load when the user enables them.

### 2.1. Workflow Engine (The Orchestrator)
*   **State Machine:** Every workflow is a sequence of `Step → Action → Wait → Continue`.
*   **Supported Actions:**
    *   `fill-page` / `fill`: Automatically populate fields.
    *   `click`: Execute button events (e.g., `Continue`, `Next`, `Submit`).
    *   `wait-page` / `wait`: Pause until URL match or specific time/selector.
    *   `wait-user`: Explicitly pause for manual input (OTP, CAPTCHA).
    *   `visit-url`: Navigate to a new address.
    *   `if`: Conditional logic (e.g., `if country == Bangladesh`).
    *   `upload-file`: Support for file inputs (e.g., `resume.pdf`).
    *   `loop`: Iterate over data to fill multiple entries.
    *   `custom-js`: Run sandboxed JavaScript (Advanced Mode).
*   **Context Persistence:** Shared context survives reloads/restarts with a "Resume Workflow" feature.
*   **Logic Example:**
    ```json
    {
      "workflowId": "job_apply",
      "steps": [
        { "type": "fill-page", "url": "*apply/personal*" },
        { "type": "click", "selector": "#continue" },
        { "type": "wait-page", "url": "*education*" },
        { "type": "fill-page" },
        { "type": "wait-user", "reason": "OTP Required" },
        { "type": "click", "selector": "#submit" }
      ]
    }
    ```

### 2.2. Smart Scanner Engine (The Deep Eyes)
*   **Deep Scan:** Pierces Shadow DOM and Iframes (Same-origin).
*   **Detectable Elements:**
    *   **Native Inputs:** `<input>`, `<textarea>`, `<select>`.
    *   **Groups:** Checkbox groups, Radio button sets.
    *   **Custom Widgets:** Handles React/Angular/Vue "UI hell" (e.g., `<div role="combobox">`).
*   **Capabilities:**
    *   **Auto-Table Creation:** Creates dynamic table structure based on detected elements.
    *   **Full Value Extraction:** Extracts all values for dropdowns (e.g., `["Male", "Female", "Other"]`).
*   **Scanner Output Example:**
    ```json
    {
      "field": "Gender",
      "type": "dropdown",
      "selector": "#gender",
      "values": ["Male", "Female", "Other"]
    }
    ```

### 2.3. Workflow Recorder (The Generator)
*   **Interactive Recording:** Watches user interactions in real-time.
*   **Tracked Interactions:** Clicks, Typing, Selections, and Navigation.
*   **Action Normalization:** Converts raw user events into high-level "FlowSteps".

### 2.4. Dynamic Data & Table Engine (The Transformer)
*   **Mapping Modes:**
    *   **Simple Mode:** Direct mapping (e.g., `{name}`).
    *   **Combined Mode:** Merging columns (e.g., `{firstname} {lastname}`).
    *   **Expression Mode:** Formatted strings (e.g., `{city}, {country}`).
    *   **Formula Mode:** Dynamic calculations (e.g., `INV-{AUTO+1}`).
*   **Formula Engine:** Lazy-loaded module for complex calculations (Excel-like).

### 2.5. Visual Mapping UI (The Bridge)
*   **Visual Selector Picker:** DevTools-style picker with real-time highlighting.
*   **Selector Fallback Strategy (Weighted Scoring):**
    1.  `ID` (100)
    2.  `Name` (80)
    3.  `Label` (70)
    4.  `Placeholder` (60)
    5.  `Data-Attributes` (50)
    6.  `XPath` (30)
    7.  `Relative Path` (10)

### 2.6. Developer JS Runtime & Tabbed IDE (The Mind)
*   **Monaco IDE:** Tabbed interface with Console, Editor, DOM Viewer, and Logs.
*   **Expanded Developer API:**
    *   `FillWith(value)`: Populates a field.
    *   `Click(selector)`: Triggers a click event.
    *   `WaitFor(selector)`: Dynamic wait for elements.
    *   `GetField(selector)`: Retrieves field metadata.
    *   `SetVar(name, value)` / `GetVar(name)`: Persistent workflow variables.
    *   `Log(message)`: Outputs to the IDE console.
    *   `DB.query()`: Direct access to IndexedDB/SQLite.

### 2.7. Smart Waiting & Intervention System (The Guard)
*   **Wait States:** 
    *   **Wait-for-Page:** URL match.
    *   **Wait-for-Selector:** Element appears (Essential for AJAX/React).
    *   **Wait-for-Disappear:** Loading spinner vanishes.
*   **Human Intervention (Wait-for-User):** UI prompt with a **Reason** (e.g., "OTP Required").

### 2.8. Persistent Data Layer (The Ledger)
*   **Storage Strategy:** IndexedDB + Dexie.js (Primary).
*   **Log Engine:** Comprehensive history with Timestamps and Statuses (`Success`, `Error`, `Pending`, etc.).
*   **Export:** One-click export to CSV, JSON, or TXT.

---

## 3. Technical Risk & Mitigation Matrix

| Table | Fields | Purpose |
| :--- | :--- | :--- |
| **workflows** | `id`, `name`, `created_at`, `updated_at`, `settings` | Multi-page definitions. |
| **workflow_steps** | `id`, `workflow_id`, `order`, `type`, `config_json` | Actions (Fill, Click, Wait, etc.). |
| **field_mappings** | `id`, `workflow_id`, `field_name`, `selector`, `mode`, `template`, `js_code` | Field-to-Data logic. |
| **csv_sources** | `id`, `name`, `headers`, `data` | CSV storage. |
| **workflow_context** | `workflow_id`, `current_step`, `runtime_state`, `variables` | Survivable runtime state. |
| **execution_logs**| `id`, `workflow_id`, `step_id`, `type`, `status`, `message`, `timestamp` | Audit history. |

---


| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Chrome MV3 Constraints** | High | Use Offscreen Documents for logic and Sidepanel API. |
| **Anti-Bot Detection** | Medium | Human-like typing with randomized delays. |
| **DOM Volatility** | High | Self-healing weighted selector fallback chain. |
| **Memory Leaks** | Medium | Strict lifecycle management of Svelte and MutationObservers. |

---

## 4. Implementation Roadmap (Granular)

### Phase 1: Core Alpha (Foundation)
*   [ ] Manifest v3 Setup with Sidepanel & Background Service Worker.
*   [ ] Dexie.js Schema implementation for Workflows and Logs.
*   [ ] Basic Scanner: Identify inputs and generate stable selectors.
*   [ ] CSV Sourcing: PapaParse integration with visual column mapping.

### Phase 2: Beta - Multi-Page Orchestration
*   [ ] Workflow State Machine: Sequential step execution logic.
*   [ ] Inter-page persistence: Saving state between navigation.
*   [ ] Floating HUD: In-page status overlays and user intervention prompts.
*   [ ] Smart Wait: Implementation of "Wait-for-Selector" and "Wait-for-URL".

### Phase 3: Developer Power Features
*   [ ] Monaco IDE integration (Lazy-loaded).
*   [ ] Offscreen Document logic execution sandbox.
*   [ ] Extended API implementation (`FillWith`, `Click`, `WaitFor`).
*   [ ] Real-time "Bug in Process" console.

### Phase 4: Intelligence & Polishing
*   [ ] Self-Healing Selectors: Scoring and auto-repair logic.
*   [ ] AI Integration: ML-based field detection.
*   [ ] Performance Profiling: 60fps UI and minimal memory footprint.

---

## 5. Technology Stack
*   **Frontend:** Svelte (Lite-weight UI).
*   **State:** Svelte Stores (Efficient reactive state, replaces Zustand for Svelte compatibility).
*   **Storage:** IndexedDB via Dexie.js.
*   **Editor:** Monaco Editor (Lazy-loaded).
*   **Parsing:** PapaParse.
*   **Monitoring:** MutationObserver.

---

## 6. Suggested Internal Data Structure
```js
workflow = {
  id: "job_apply",
  pages: [
    {
      urlPattern: "*example.com/profile*",
      fields: [
        {
          selector: "#name",
          type: "input",
          value: "{full_name}" // Mapped column
        },
        {
          selector: "#gender",
          type: "dropdown",
          value: "{gender}"
        }
      ]
    }
  ]
}
```

---

## 7. Non-Technical User Experience (No-Code Layer)

FlowPilot is designed to be accessible to everyone, not just developers. The UI provides a clear separation between simple and advanced tasks to prevent overwhelming non-technical users.

### 7.1. Beginner Mode
A very simplified UI for daily users who want to automate repetitive tasks without touching code.
1. **Record Workflow:** Hit record and perform the task manually.
2. **Scan Form:** Auto-detect all inputs and elements.
3. **Upload CSV:** Sourcing data from a simple spreadsheet.
4. **Match Fields:** Drag-and-drop or simple dropdown mapping.
5. **Run:** Execute with one click.
*   **Constraints:** No selectors visible, no JS editing, no advanced settings to avoid overwhelm.

### 7.2. Advanced Mode
Unlocks the full engineering suite for power users and developers.
*   **JS/Flow Language:** Direct script editing.
*   **DB Explorer:** Query and modify internal tables.
*   **Logs:** Detailed execution tracing.
*   **Selector Editor:** Manual stability tuning.
*   **Conditions:** Complex branching logic.
*   **Runtime Console:** Live debugging.

---

## 8. Workflow Templates

To improve adoption, FlowPilot provides prebuilt "already works" templates for common repeat tasks.
*   **Job Application:** Prebuilt steps for Personal Info, Education, CV Upload, and Review.
*   **Government Form:** Standard templates for common civic portals.
*   **University Admission:** Academic-focused flow templates.
*   **E-commerce Checkout:** Automated purchasing flows.
*   **CRM Entry:** Sales and data entry templates.
*   **Invoice Submission:** Financial automation templates.

---

## 9. Recovery Engine (Workflow Recovery System)

A dedicated system to handle crashes, internet death, or dramatic laptop failures.
*   **Immortal State:** Every step progress is mirrored to persistent storage.
*   **Resume Workflow:** A "Resume?" popup appears after a crash.
*   **Context Restoration:** Automatically restores variables and progress (e.g., "Step 6/12 - Waiting for OTP").

---

## 10. Row Processing Strategy

Defines how FlowPilot handles multiple entries from a data source.
*   **Single Row:** Fill the current row only (Manual trigger).
*   **Sequential:** Process Row 1 → Submit → Row 2 → Submit automatically.
*   **Retry Failed:** Specifically target and rerun only failed rows from a previous batch.
*   **Parallel (Future):** Multi-tab processing for maximum speed.

---

## 11. Batch Execution Engine

A queue system for handling massive datasets (e.g., 500+ rows).
*   **Real-time Tracking:** UI shows "Running: 23/500" with status counts (Success: 20, Pending: 2, Failed: 1).
*   **Control Center:** Pause, Resume, Stop, or Retry specific rows in the batch.

---

## 12. Error Recovery Strategy

Moving beyond "Error → Fail" to a resilient automation model.
*   **Retry:** Configurable retry logic (default 3 attempts) for transient page errors.
*   **Selector Fallback:** Intelligent rotation through ID → Name → Label → XPath if the primary selector fails.
*   **Human Intervention:** If automation is stuck, a HUD prompt appears: "Can't find Continue button. Please click manually then click [Resume]".

---

## 13. Plugin Architecture

A future-proof modular system for extending capabilities.
*   **OCR Plugin:** Read OTPs or text directly from screen captures.
*   **AI Mapper Plugin:** Automatic field matching using ML.
*   **Email OTP Plugin:** Read OTPs directly from a linked email inbox.
*   **Google Sheets Plugin:** Direct sync with cloud spreadsheets.
*   **REST API Plugin:** Fetch remote data for form filling.
*   **Webhook Plugin:** Trigger workflows via external events.

---

## 14. Permission Model

Strategic permission management for Chrome Web Store compliance.
*   **Minimalist Core:** Only request `storage`, `tabs`, `scripting`, and `sidePanel` by default.
*   **Optional Hosts:** Request specific host permissions only when a user adds a domain, rather than asking for `<all_urls>` upfront.

---

## 15. JS Sandbox Security

Strict rules for custom developer logic to ensure safety.
*   **Sandboxed Runtime:** Execution in an isolated context with limited API exposure.
*   **Forbidden Actions:** No `chrome.storage.clear()`, no unrestricted extension API access, no remote script execution.

---

## 16. File Mapping System

Advanced handling for file uploads (e.g., resumes, PDFs).
*   **Data Mapping:** CSV path `resume1.pdf` → Map to file input.
*   **Strategy:** Handles local paths, secure caching, and upload events reliably.

---

## 17. Floating HUD (Head-Up Display)

Critical UX element that makes automation feel alive and trustworthy.
*   **Live Status:** Small overlay showing "Step 4/9: Filling Personal Info".
*   **On-Page Controls:** Pause, Resume, and Stop buttons right on the target site.

---

## 18. Telemetry (Local Only)

Internal performance metrics stored locally for debugging and optimization.
*   **Metrics:** Average fill speed, Workflow success rate, Selector failure counts.
*   **Privacy:** Never sent to servers; used solely for local performance tuning.

---

## 19. Sync Strategy

Defines how data moves across devices.
*   **Local Only (Default):** Maximum privacy and speed.
*   **Optional Sync:** Export/Import `.flowpilot` files or use native browser sync.

---

## 20. Folder Architecture (Engineering Blueprint)

```text
src/
├── background/         # Service worker orchestration
├── content/            # DOM interaction & Bridges
├── injector/           # Page script injection
├── scanner/            # DOM analysis engine
├── workflow/           # Logic execution & Recovery
├── database/           # Dexie/IndexedDB services
├── runtime/            # JS Sandbox
├── ui/                 # Sidepanel, Popup, HUD
├── modules/            # Feature flags (CSV, Formula)
├── plugins/            # OCR, AI, API connectors
├── shared/             # Constants, Types, Utils
└── devtools/           # Debugging tools
```

---

## 21. Browser Compatibility Matrix

| Feature | Chrome | Firefox |
| :--- | :--- | :--- |
| SidePanel | Yes (Native) | Partial (Emulated) |
| Offscreen | Yes (Native) | No (Fallback) |
| MV3 | Yes | Partial (Quirks) |
| IndexedDB | Yes | Yes |

---

## 22. Flow Language (The DSL)

FlowPilot's "Secret Sauce" is its internal Domain Specific Language.
*   **Recordable:** Generated by the recorder.
*   **Editable:** Readable and modifiable by developers.
*   **Executable:** The source of truth for the workflow engine.

**Example:**
```javascript
FLOW.Fill("#name", "{firstname}");
FLOW.Click("#continue");
FLOW.WaitFor("#otp");
FLOW.PauseUser("Enter OTP");
```

---

## 23. SPA Navigation Engine (The Modern Web Guard)

Modern Single-Page Applications (React, Vue, Angular) often change URLs without a full page reload. FlowPilot handles this via a dedicated observation engine.
*   **URL Observer:** Tracks `popstate`, `pushState`, and `replaceState` events.
*   **DOM Transition Detection:** Monitors major DOM changes to identify "virtual" page loads.
*   **Rendering Wait:** FlowPilot waits until the new page has finished rendering (detected via MutationObserver and idle periods) before attempting the next action.

---

## 24. Selector Self-Healing Details (Confidence Scoring)

To maintain a "moat" of reliability, FlowPilot uses a scoring model for element detection.
*   **Confidence Score:** Each detected element is assigned a score (e.g., `#submit` = 95%).
*   **Healing Mechanism:** If `#submitBtn` disappears but an element with label "Submit" or an ID `#submitButton` appears with high semantic similarity, FlowPilot "heals" the selector and continues.
*   **Fallback Logic:** ID → Name → Label Proximity → Similar Element Heuristics → XPath.

---

## 25. .flowpilot File Format

A standardized format for sharing, backups, and marketplace integration.
*   **Format:** JSON-based `.flowpilot` file.
*   **Contents:** `{ workflow, mappings, settings, logs, variables }`.
*   **Portability:** Allows users to download and share complex flows instantly.

---

## 26. Marketplace & Community Vision

A strategic growth loop where users can share and download workflows.
*   **Prebuilt Solutions:** Community-contributed flows for LinkedIn Job Apply, Government Tax Forms, etc.
*   **One-Click Import:** Users can download a `.flowpilot` file and start automating immediately.

---

## 27. Versioning & Rollback System

Protects users from breaking changes when websites update.
*   **Workflow Versions:** Every save creates a new version (v1, v2, v3...).
*   **Rollback:** If a website update breaks a workflow, users can restore a previous version to see if it was a logic error or a DOM change.

---

## 28. Observability & Debugging Timeline

A "detective" UI for developers to troubleshoot automation.
*   **Timeline View:** `10:22:10 Fill Name` → `10:22:12 Click Continue` → `10:22:15 Wait Selector` → `10:22:18 Success`.
*   **Granular Data:** Duration, retry count, and DOM snapshots for every step.

---

## 29. Performance Budget (Lite-weight Hard Limits)

To prevent FlowPilot from becoming "bloatware," strict performance limits are enforced.
*   **Cold Start:** < 200ms.
*   **Memory:** < 80MB in normal mode.
*   **Idle CPU:** ≈ 0%.
*   **Lazy Loading:** Heavy components (Monaco, Formula engine) are never loaded until requested.

---

## 30. State Machine Transition Diagram

Detailed visual/logical model for developer reference:
*   `IDLE` → `RUNNING`
*   `RUNNING` → `WAITING` (AJAX/Navigation)
*   `RUNNING` → `USER_INTERVENTION` (OTP/Captcha)
*   `WAITING` / `USER_INTERVENTION` → `RESUME` → `RUNNING`
*   `RUNNING` → `ERROR` → `RETRY` → `FAILED` / `SUCCESS`
*   `RUNNING` → `COMPLETE`

---

## 31. UI Surface Layout Plan

Explicit layout roles to prevent UI chaos:
*   **Sidepanel:** The primary workplace. Contains Workflows, Logs, Data, Templates, Recorder, Developer tools, and Settings.
*   **Popup:** Quick actions only (Run current, Stop, Recent logs).
*   **HUD:** Runtime-only overlay on the webpage for progress and intervention.

## 32. Authentication & Session Engine

Modern workflows frequently involve authentication, session expiration, and multi-step verification. FlowPilot must handle these interruptions gracefully.

### 32.1 Login Detection

FlowPilot continuously monitors for authentication interruptions.

**Detection Signals:**

* Redirect to known login URLs (`/login`, `/signin`, `/auth`)
* Presence of login form selectors
* Session timeout banners
* HTTP auth redirects

**Example Flow:**

```text
Workflow Running
↓
Session Expired
↓
Login Page Detected
↓
Pause or Auto-Reauthenticate
↓
Resume Previous Step
```

### 32.2 Secure Credential Vault

A local encrypted vault stores reusable credentials.

**Supported Credentials:**

* Username / Email
* Password
* API Keys
* Session Tokens
* Cookies (Optional)

**Security Model:**

* Encryption via WebCrypto API
* Device-local encryption
* No cloud sync by default
* Optional biometric unlock (future)

**Storage Example:**

```json
{
  "domain": "linkedin.com",
  "username": "user@email.com",
  "encrypted": true
}
```

### 32.3 Session Recovery

If authentication expires:

1. Detect interruption.
2. Save workflow state.
3. Trigger login flow.
4. Restore tab context.
5. Continue execution.

---

## 33. Human Verification Policy (Captcha & OTP)

FlowPilot supports legitimate human-assisted automation.

### Supported Verification Types

* OTP (SMS / Email)
* reCAPTCHA
* Cloudflare Challenge
* Image Captcha
* MFA Screens

### Policy

FlowPilot never bypasses human verification.

Instead:

```text
Verification Required

Please complete the captcha

[Continue Workflow]
```

### Workflow Behavior

```text
Running
↓
Captcha Detected
↓
Pause Workflow
↓
Wait User
↓
Continue
```

This ensures:

* legal compliance
* ethical automation
* reduced account bans

---

## 34. Runtime Permission Escalation Model

To maximize trust and browser store approval, FlowPilot uses minimal permissions by default.

### Permission Philosophy

Request only what is needed, when needed.

### Default Permissions

```json
[
  "storage",
  "tabs",
  "scripting"
]
```

### Dynamic Host Permissions

Instead of:

```text
<all_urls>
```

FlowPilot requests:

```text
linkedin.com
indeed.com
government-site.gov
```

only after user approval.

### Permission Escalation Example

```text
User Adds Workflow
↓
New Domain Detected
↓
Permission Request Popup
↓
Grant Access
↓
Workflow Enabled
```

---

## 35. Tab Coordination Engine

Modern workflows frequently involve multiple tabs, popups, and OAuth redirects.

### Supported Scenarios

* Login popup windows
* Email verification tabs
* Payment redirects
* OAuth authentication
* Multi-tab workflows

### Coordination System

Each workflow maintains:

```json
{
  "workflowId": "job_apply",
  "activeTabs": [
    {
      "tabId": 221,
      "purpose": "main_form"
    },
    {
      "tabId": 222,
      "purpose": "otp_email"
    }
  ]
}
```

### Tab Roles

* Primary Tab
* Helper Tab
* Verification Tab
* Background Tab

### Smart Focus Handling

FlowPilot can:

* auto-switch tabs
* reopen closed tabs
* restore context
* wait for popup completion

---

## 36. DOM Snapshot Strategy

FlowPilot stores lightweight DOM snapshots for debugging and self-healing.

### Snapshot Model

Instead of saving entire pages, store:

```json
{
  "selector": "#submit",
  "tag": "button",
  "text": "Submit",
  "attributes": {
    "id": "submitBtn",
    "class": "btn-primary"
  },
  "position": {
    "x": 450,
    "y": 320
  }
}
```

### Use Cases

* selector healing
* debugging failures
* rollback comparison
* visual diffing

### Snapshot Policy

* lightweight only
* no full-page storage
* compressed format
* capped retention

---

## 37. Data Sensitivity & Privacy Levels

Not all user data should be treated equally.

### Sensitivity Classes

#### Standard

Regular workflow data.

Examples:

* names
* cities
* dropdown choices

Retention:

```text
persistent
```

#### Sensitive

Private personal information.

Examples:

* passwords
* SSN
* passport numbers
* banking info

Retention:

```text
temporary memory only
```

Auto-delete after workflow completion.

#### Highly Sensitive

Protected credentials.

Examples:

* tokens
* API keys
* session cookies

Retention:

```text
encrypted vault only
```

### User Controls

Users can configure:

```text
Auto Delete After Run
Mask Sensitive Fields
Export Restrictions
```

---

## 38. Workflow Testing / Dry Run Mode

Before executing automation, users can validate workflows safely.

### Dry Run Behavior

FlowPilot simulates execution without changing data.

Example:

```text
Would Fill:
First Name → Hasan

Would Click:
Continue Button

Would Wait:
OTP Screen
```

### Visual Preview

Fields are highlighted.

No actual typing occurs.

### Benefits

* safer testing
* easier debugging
* fewer mistakes
* confidence before execution

---

## 39. Workflow Diff Viewer

Since workflows are versioned, FlowPilot provides change comparison.

### Diff Example

```text
v4 → v5

Changed:
Continue Selector
#nextBtn → #continueBtn

Added:
OTP Step

Removed:
2-second delay
```

### Diff Categories

* selector changes
* action changes
* wait condition changes
* field mapping changes
* JS logic changes

### Recovery

Users can:

* restore previous versions
* compare behavior
* merge configurations

---

## 40. Command Palette (Quick Actions)

FlowPilot includes a VSCode-style command palette.

### Shortcut

```text
Ctrl + K
```

### Example Commands

```text
Run Workflow
Pause Workflow
Stop Workflow
Scan Current Page
Open Logs
Toggle Recorder
Open Developer Console
Import Workflow
Export Workflow
```

### Purpose

Makes FlowPilot feel like a browser operating system for workflows.

---
