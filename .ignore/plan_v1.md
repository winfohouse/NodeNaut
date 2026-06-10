# FlowPilot: Strategic Project Blueprint (Lossless Master)

FlowPilot is much more than an autofill tool; it is a **Programmable Browser Workflow + Smart Form Automation Platform**. Designed for both daily users and advanced developers, it operates as a "small operating system hidden inside a Chrome extension," providing a robust environment to visually automate websites using scanned elements, CSV data, and custom JavaScript logic.

## 0. Project Vision & Definition
FlowPilot is positioned between tools like UI.Vision RPA, Selenium IDE, and Zapier, but optimized specifically for **deep form filling and multi-page workflow orchestration**.

**Core Capabilities:**
*   **Smart Form Autofill:** Supports all form types (Inputs, Dropdowns, Checklists).
*   **Multi-Page Workflow Automation:** Chain multiple URLs into a single "Context."
*   **CSV/Data-Driven Filling:** Map dynamic table headers to form fields.
*   **DOM Scripting:** Direct access to document objects.
*   **Developer Sandbox:** A tabbed, VSCode-like IDE for persistent JS execution.
*   **Visual Mapping System:** No-code interface for complex element selection.
*   **Rule Engine:** Conditional logic for dynamic form paths.

---

## 1. Core Architecture: The 8-Engine Framework

To ensure the extension remains **super lite-weight**, it uses a "Feature Flag" and "Lazy Loading" system. Heavy modules (IDE, Formula Engine, SQLite) only load when the user enables them.

### 1.1. Workflow Engine (The Brain & State Machine)
*   **Purpose:** Manages the state machine of a "Flow." Every workflow is a sequence of `Step → Action → Wait → Continue`.
*   **Action-Based & SPA Ready:** Handles popups, modals, and DOM changes within SPAs.
*   **Context Persistence & Recovery:** Shared context survives reloads/restarts with a "Resume Workflow" feature.
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
*   **Multi-Page Chains:** Handles forms spread across multiple pages.
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
*   **Smart Recovery:** Automatically resumes workflows from the last successful step.

### 1.2. Smart Scanner Engine (The Deep Eyes)
*   **Purpose:** Deep-DOM analysis to identify and map form controls. Triggered by a "Scan Page" action.
*   **Detectable Elements:**
    *   **Native Inputs:** `<input>`, `<textarea>`, `<select>`.
    *   **Groups:** Checkbox groups, Radio button sets.
    *   **Custom Widgets:** Handles React/Angular/Vue "UI hell" (e.g., `<div role="combobox">`).
*   **Capabilities:**
    *   **Auto-Table Creation:** Automatically creates a dynamic table structure based on detected elements.
    *   **Full Value Extraction:** For dropdowns/checklists, it extracts all possible values (e.g., `["Male", "Female", "Other"]`) to populate the mapping UI.
    *   **Technical Support:** Pierce Shadow DOM, handle same-origin Iframes, and support Virtual DOM frameworks.
*   **Scanner Output Example:**
    ```json
    {
      "field": "Gender",
      "type": "dropdown",
      "selector": "#gender",
      "values": ["Male", "Female", "Other"]
    }
    ```
*   **Visual Selector Picker:** DevTools-style picker with real-time highlighting.

### 1.3. Workflow Recorder (The Generator)
*   **Interactive Recording:** Watches user interactions in real-time to generate workflow steps automatically.
*   **Tracked Interactions:**
    *   **Clicks:** Button and link events.
    *   **Typing:** Form input and textareas.
    *   **Selection:** Dropdown and checklist changes.
    *   **Navigation:** URL changes and page loads.
*   **Visual Editing:** Automatically generates steps (e.g., "Step 1: Fill Name") that users can visually edit/map after recording.
*   **Implementation Strategy:** **Build the Recorder First.** This engine automatically creates the structure for everything else, preventing users from having to manually configure complex flows.

### 1.4. Dynamic Data & Table Engine (The Memory)
*   **Template Parser:** Core engine that parses template strings using template literals (e.g., `` `${row.firstname} ${row.lastname}` ``).
*   **Mapping Modes:**
    *   **Simple Mode:** Direct mapping (e.g., `{name}`).
    *   **Combined Mode:** Merging multiple columns (e.g., `{firstname} {lastname}`).
    *   **Expression Mode:** Formatted strings (e.g., `{city}, {country}`).
    *   **Formula Mode:** Dynamic calculations (e.g., `INV-{AUTO+1}` for auto-incrementing invoices).
*   **Variable Generation:** Automatically generates variables from CSV headers.
*   **Complex Mapping:** Support for using multiple columns in one field.
*   **Custom Rules & Logic:** Supports conditional mapping logic (e.g., `if ({country} === "Bangladesh")`).

### 1.5. Visual Mapping UI (The Interface)
*   **Visual Selector Picker:** A DevTools-like interface that allows users to click elements on the page to auto-detect selectors.
*   **Real-time Highlighting:** Hovering over a field in the mapping UI highlights the corresponding element on the page.
*   **Selector Fallback Strategy:** To ensure stability against site changes, the engine records multiple selector types in order of preference:
    1.  `ID`
    2.  `Name`
    3.  `Label`
    4.  `Placeholder`
    5.  `XPath`
    6.  `Relative Path`
*   **Stable Selector Detection:** Automatically detects the most stable CSS or XPath selector available.

### 1.6. Developer JS Runtime & Tabbed IDE (The Mind)
*   **VSCode-like IDE:** A tabbed interface designed for developer power-user workflows (Console, Editor, DOM Viewer, Logs, Preview).
*   **Persistent State & Execution:** Uses a Background Service Worker to maintain context across reloads.
*   **Expanded Developer API:**
    *   `FillWith(value)`: Populates a field with a static or computed value.
    *   `Click(selector)`: Triggers a click event on the target element.
    *   `WaitFor(selector)`: Dynamic wait for elements to appear.
    *   `GetField(selector)`: Retrieves field metadata or value.
    *   `SetVar(name, value)` / `GetVar(name)`: Manages persistent workflow variables.
    *   `Log(message)`: Outputs to the dedicated "Bug in Process" console.
    *   `DB.query()`: Direct access to IndexedDB/SQLite for complex lookups.
*   **Custom JS Logic:** Allows complex transformations (e.g., `row.salary * 0.12`) and conditional database-driven filling.
*   **Toggle Mode:** Every field mapping has a toggle: `[Table Row Value] <-> [Custom JS Code]`.

### 1.7. Smart Waiting & Intervention System (The Guard)
*   **Wait States:** 
    *   **Wait-for-Page:** Wait until the URL matches a specific pattern (e.g., `*payment*`).
    *   **Wait-for-Selector:** Wait until a specific element (e.g., `.success-message`) appears. Essential for **AJAX forms**, **React rendering**, and **dynamic content**.
    *   **Wait-for-Disappear:** Wait until an element (e.g., a **loading spinner**) vanishes.
*   **Human Intervention (Wait-for-User):** 
    *   Explicit state (e.g., **'let user input'**) with a **Reason** (e.g., "OTP Required").
    *   **UI Prompt:** Shows a visual overlay: "⚠ Waiting for user action: OTP Required. [Continue]".
    *   **Workflow Recovery:** Saves state so the flow survives crashes or browser restarts.

### 1.8. Persistent Data Layer (The Ledger)
*   **Developer DB Access:** Developers have full access to all underlying databases for scripting and debugging.
*   **Storage Strategy:** IndexedDB + Dexie.js (Primary), optional SQLite module.
*   **Log Engine:** 
    *   Comprehensive history with **Timestamps** for every action.
    *   **Statuses:** `Success`, `Error`, `Pending`, `Waiting`, `Warning`, `Skipped`.
    *   **Real-time Output:** Logs are viewable in the "Bug in Process" console during execution.
*   **Export:** One-click export of logs to **CSV, JSON, or TXT**.

### 1.9. Modular System (The Body)
*   **Lite-Weight Philosophy:** The core extension remains under 500KB by lazy-loading all non-essential assets.
*   **Core Build (Small Bundle):** Includes only **Scan**, **Fill**, **Mapping**, **Workflow Engine**, and **CSV Parsing**.
*   **Optional Modules (Lazy-Loaded via Dynamic Imports):**
    *   **Developer Mode:** Loads Monaco Editor, Debugger, and Console only when toggled.
    *   **Formula Engine:** Loads the full JS runtime for complex template calculations.
    *   **SQLite Module:** Relational storage module for advanced users.
    *   **AI Smart Mapping:** Optional ML-based field detection.
    *   **Cloud Sync / OCR / OTP Reading:** Future external integrations.
*   **Loading Logic Example:**
    ```js
    if (feature.devMode) { import('./monaco.js'); }
    ```

---

## 2. Technical Data Schema

| Table | Fields | Purpose |
| :--- | :--- | :--- |
| **workflows** | `id`, `name`, `created_at`, `updated_at`, `settings` | Multi-page definitions and global settings. |
| **workflow_steps** | `id`, `workflow_id`, `order`, `type`, `config_json` | Actions (Fill, Click, Wait, Navigate, Custom JS). |
| **field_mappings** | `id`, `workflow_id`, `field_name`, `selector`, `mode`, `template`, `js_code` | Field-to-Data logic (Toggle between Row vs JS). |
| **csv_sources** | `id`, `name`, `headers`, `data` | CSV headers and raw data storage. |
| **workflow_context** | `workflow_id`, `current_step`, `runtime_state`, `variables` | Runtime variables that survive reloads. |
| **execution_logs**| `id`, `workflow_id`, `step_id`, `type`, `status`, `message`, `timestamp` | Action-by-action history with Success/Error status. |

---
## 3. Implementation Roadmap

### Phase 1: MVP (Foundation)
*   **Scan Page:** Deep-DOM detection of fields.
*   **Detect Fields:** Extract possible values and types.
*   **CSV Upload:** Integrate PapaParse for data sourcing.
*   **Variable Mapping:** Visual UI to map columns to fields.
*   **Autofill Engine:** Execute filling on the active page.
*   **Save Workflow:** Basic persistence for reusable flows.

### Phase 2: Multi-Page & Context
*   **Workflow Chaining:** Connect multiple URLs into one context.
*   **Context Memory:** Persistent shared state across navigation.
*   **Auto-Navigation:** Logic to move between pages.
*   **URL Chaining:** Pattern-based URL matching for flow steps.

### Phase 3: Developer IDE & Sandbox
*   **Tabbed JS Editor:** Monaco integration with bug tracking.
*   **Developer Console:** Real-time log output.
*   **Custom Scripts:** Run persistent JS across reloads.
*   **DOM Access:** Direct scripting capabilities via dedicated API.

### Phase 4: AI & Optimization
*   **AI Autofill Suggestions:** Smart mapping based on page context.
*   **Smart Selector Repair:** Self-healing selectors.
*   **Auto Re-scan:** Detect changes in dynamic forms.
*   **Workflow Templates:** Reusable community/standard patterns.

---

## 4. Technology Stack

*   **Frontend Framework:** **Svelte** (Preferred for its lite-weight footprint in extensions).
*   **State Management:** **Zustand** (Simple, efficient state).
*   **Storage:** **IndexedDB** via Dexie.js (for high-volume workflow/data persistence).
*   **Editor:** **Monaco Editor** (VSCode core for the IDE).
*   **CSV Parsing:** **PapaParse** (Robust browser-side parsing).
*   **DOM Monitoring:** **MutationObserver** (Essential for detecting dynamic/React forms).
*   **Architecture:**
    ```txt
    Popup UI -> Side Panel -> Background Worker -> Content Script -> Injected Page Script
    ```

## 5. Suggested Internal Data Structure
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
          value: "{full_name}"
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
