<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-blue?style=flat-square" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/Version-0.2.3-green?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/Svelte-5-orange?style=flat-square" alt="Svelte 5" />
  <img src="https://img.shields.io/badge/Vite-8-purple?style=flat-square" alt="Vite 8" />
  <img src="https://img.shields.io/badge/MCP-Compatible-red?style=flat-square" alt="MCP Compatible" />
  <img src="https://img.shields.io/badge/Browser-Chrome%20%7C%20Firefox-yellow?style=flat-square" alt="Chrome | Firefox" />
</p>

# FlowPilot

**Elite Programmable Browser Workflow & Smart Form Automation Platform**

FlowPilot is a visual, node-graph-based browser extension that lets you build, test, and execute complex browser automation workflows — from simple form filling to multi-tab scraping pipelines — entirely within your browser. It features a full visual canvas editor, a sandboxed JavaScript IDE (FlowScript), encrypted vault storage, reusable subflow bundles, and deep AI integration via the **Model Context Protocol (MCP)**.

---

## Why Choose FlowPilot?

The browser automation landscape is cluttered with clunky, rigid, and privacy-invasive tools. FlowPilot redefines how you automate the web by bringing enterprise-grade power directly into your browser extension—no cloud subscriptions, no external desktop software required. 

Here is why professionals, developers, and AI agents choose FlowPilot:

### What We Offer Over The Competition
- **True Local Execution:** Unlike cloud-based scrapers (like Zapier or Make) or external automation software, FlowPilot runs 100% locally in your browser. Your data never leaves your machine unless you explicitly send it.
- **AI Agent Native (MCP):** FlowPilot isn't just for humans. We are the first browser automation platform to expose our entire engine to AI agents (like Claude Desktop) via the Model Context Protocol. AI can build, run, and debug workflows directly in your browser.
- **Self-Healing Selectors:** Forget fragile workflows that break on minor website updates. Our AI-readable DOM analysis and multi-candidate selector healing ensure your automations adapt and survive UI changes.
- **No-Code Meets Full-Code:** A beautiful visual canvas for quick automations, backed by a sandboxed Monaco IDE (FlowScript) when you need to write complex custom logic. You are never boxed in.
- **Enterprise Security (Vault):** We offer an integrated AES-256-GCM encrypted vault. Store your API keys, passwords, and sensitive datasets safely.

### The Verdict: How Good Is It?
FlowPilot is designed to be the absolute apex of programmable browser extensions. Built on a robust Manifest V3, Vite, and Svelte 5 architecture, it effortlessly handles everything from simple daily macros to parallel, multi-tab data extraction pipelines processing thousands of rows. It is blazingly fast, deeply extensible via custom node addons, and remarkably resilient.

---

## Table of Contents

- [Why Choose FlowPilot?](#why-choose-flowpilot)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Installation](#installation)
  - [Chrome](#chrome)
  - [Firefox](#firefox)
  - [Building from Source](#building-from-source)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Creating Your First Workflow](#creating-your-first-workflow)
  - [Running a Workflow](#running-a-workflow)
- [The Visual Canvas Editor](#the-visual-canvas-editor)
  - [Canvas Controls](#canvas-controls)
  - [Node Inspector](#node-inspector)
  - [Edge Connections & Threading Modes](#edge-connections--threading-modes)
  - [Element Picker](#element-picker)
  - [Page Scanner](#page-scanner)
  - [History (Undo/Redo)](#history-undoredo)
- [Node Types Reference](#node-types-reference)
  - [Interaction Nodes](#interaction-nodes)
  - [Browser Nodes](#browser-nodes)
  - [Logic Nodes](#logic-nodes)
  - [Developer Nodes](#developer-nodes)
  - [Advanced Nodes](#advanced-nodes)
  - [Subflow Nodes (Built-in)](#subflow-nodes-built-in)
- [FlowScript IDE](#flowscript-ide)
  - [FLOW API](#flow-api)
  - [Table API](#table-api)
  - [GLOBAL API](#global-api)
  - [$row API](#row-api)
  - [Code Examples](#code-examples)
- [Expression System](#expression-system)
  - [Column References](#column-references)
  - [Inline JavaScript](#inline-javascript)
  - [Calc Expressions](#calc-expressions)
  - [Built-in Suggestions](#built-in-suggestions)
- [Data Tables](#data-tables)
- [Global Variables & Datasets](#global-variables--datasets)
- [Encrypted Vault](#encrypted-vault)
- [Node Bundles (Subflows)](#node-bundles-subflows)
  - [Creating a Bundle](#creating-a-bundle)
  - [Bundle Parameters](#bundle-parameters)
  - [Import/Export](#importexport)
- [Custom Node Addons](#custom-node-addons)
- [Theming (Moods)](#theming-moods)
- [MCP Integration (AI Agent Support)](#mcp-integration-ai-agent-support)
  - [How It Works](#how-it-works)
  - [Setting Up the Companion Server](#setting-up-the-companion-server)
  - [MCP Dashboard](#mcp-dashboard)
  - [Complete MCP Tool Reference](#complete-mcp-tool-reference)
- [Content Script & DOM Interaction](#content-script--dom-interaction)
  - [Self-Healing Selectors](#self-healing-selectors)
  - [Smart Scanner](#smart-scanner)
  - [Element Recorder](#element-recorder)
  - [Condition Interpreter](#condition-interpreter)
  - [SPA Detection](#spa-detection)
- [Database Schema](#database-schema)
- [Cross-Browser Support](#cross-browser-support)
- [Build System](#build-system)
- [Configuration Reference](#configuration-reference)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

- **Visual Node-Graph Editor** — Drag-and-drop workflow canvas with pan, zoom, node inspector, and connection threading
- **16+ Built-in Node Types** — Click, Type, Navigate, Spawn, Script, Conditional Branching, Waiting, Notifications, and more
- **FlowScript IDE** — Full Monaco-powered JavaScript editor with IntelliSense, running in a secure sandbox
- **Expression Engine** — Inline `{column}`, `{{jsExpression}}`, and `calc()` expressions in any text field
- **Self-Healing Selectors** — Automatically recovers from broken CSS selectors using candidate arrays and spec-based fallback
- **Page Scanner** — AI-readable DOM analysis that extracts forms, inputs, buttons, and anchors
- **Encrypted Vault** — AES-256-GCM encryption for workflows and global data with master password protection
- **Data Tables** — CSV-compatible spreadsheet storage for batch processing workflows
- **Global Variables & Datasets** — Shared key-value stores and row-based datasets accessible across all workflows
- **Node Bundles (Subflows)** — Reusable workflow components with typed input parameters and export/import
- **Custom Node Addons** — Upload `.zip` addon packages to extend the node palette
- **Multi-Tab & Parallel Execution** — CLONE (fork session), FRESH (clean tab), and MAIN (sequential) threading modes
- **MCP Protocol Integration** — 38+ tools exposed to AI agents (Claude, etc.) for full programmatic control
- **Cross-Browser** — Builds for both Chrome (Manifest V3 service worker) and Firefox (background scripts)
- **4 Visual Themes** — Obsidian (dark), Crystal (light), Synthwave (neon), Nebula (purple)

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Chrome Side Panel                            │
│  index.html → Svelte App (App.svelte)                                │
│  ├── WorkflowList          (workflow CRUD)                           │
│  ├── WorkflowEditor        (visual canvas + node inspector + IDE)    │
│  │   ├── NeuralCanvas      (2D graph renderer, pan/zoom)             │
│  │   ├── Launcher          (node palette, drag-and-drop)             │
│  │   ├── CodeEditor        (Monaco wrapper, FlowScript IDE)          │
│  │   ├── DataTable          (variable pool / CSV data)               │
│  │   └── ExpressionInput   (inline autocomplete inputs)              │
│  ├── GlobalVault, Logs, Scanner, Docs, Navbar                        │
│  └── Settings (moods, custom addons, MCP, node bundles)              │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ chrome.runtime.sendMessage
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  Background Service Worker (Kernel)                   │
│  src/background/index.ts                                             │
│  ├── MessageRouter     ← central message bus (380 lines)             │
│  ├── WorkflowRunner    ← execution engine, sessions, graphs (750 L)  │
│  ├── SandboxService    ← offscreen sandbox lifecycle (155 L)         │
│  ├── FlowPilotRegistry ← node plugin system (390 L)                 │
│  ├── TabCoordinator    ← multi-tab management                       │
│  └── McpBridge         ← WebSocket to MCP server (1207 L)           │
└────────┬──────────────────────────────────┬──────────────────────────┘
         │ chrome.tabs.sendMessage          │ chrome.runtime.sendMessage
         ▼                                  ▼
┌────────────────┐            ┌─────────────────────────────────────────┐
│ Content Script  │            │ Offscreen Document                      │
│ assets/         │            │ offscreen.html                          │
│ content.js      │            │ ├── offscreen-bridge.ts (relay)         │
│ (injected into  │            │ └── <iframe sandbox="allow-scripts">    │
│  all web pages) │            │     └── sandbox.html                    │
└────────────────┘            │         └── sandbox-logic.ts            │
                               │             (FLOW, GLOBAL, Table, $row) │
                               └─────────────────────────────────────────┘

┌──────────────────────┐  WebSocket :7865  ┌──────────────────────────┐
│   MCP Companion      │ ←──────────────→  │  McpBridge.ts            │
│   Server (Node.js)   │                   │  (in service worker)     │
│   mcp-server/        │  stdio            │                          │
│   ├── index.ts       │ ←──────────────→  │  38 tools dispatched to  │
│   ├── bridge.ts      │                   │  Dexie, Chrome APIs,     │
│   └── dashboard SPA  │                   │  Registry, Runner        │
└──────────────────────┘                   └──────────────────────────┘
        ↕ stdio
┌──────────────────────┐
│  Claude Desktop /    │
│  Any MCP Client      │
└──────────────────────┘
```

### Message Flow for Script Execution

1. Sidepanel sends `DOM_SCRIPT` → **MessageRouter**
2. MessageRouter → `SandboxService.execute()`
3. SandboxService sends `TO_SANDBOX` via `chrome.runtime.sendMessage`
4. `offscreen-bridge.ts` receives → `postMessage` to sandbox iframe
5. `sandbox-logic.ts` executes user code with `new Function()`
6. FLOW API calls (`click`, `fill`, etc.) → `postMessage` `FP_*_REQ` back up
7. `offscreen-bridge.ts` relays → `MessageRouter.handleSandboxRequest()`
8. MessageRouter forwards to content script or handles directly
9. Response flows back down the chain
10. Final `FP_SCRIPT_DONE` → SandboxService resolves the Promise

---

## Installation

### Chrome

1. Download or clone this repository
2. Run `npm install` in the project root
3. Run `npm run build`
4. Open `chrome://extensions/` in Chrome
5. Enable **Developer mode** (top-right toggle)
6. Click **Load unpacked** and select the `dist/` folder
7. FlowPilot appears in your extension toolbar — click to open the side panel

### Firefox

1. Run `npm install` in the project root
2. Run `npm run build:firefox`
3. Open `about:debugging#/runtime/this-firefox` in Firefox
4. Click **Load Temporary Add-on**
5. Select any file inside the `dist-firefox/` folder (e.g., `manifest.json`)
6. FlowPilot appears in the sidebar (`View → Sidebar → FlowPilot`)

### Building from Source

```bash
# Install dependencies
npm install

# Build for Chrome (output: dist/)
npm run build

# Build for Firefox (output: dist-firefox/)
npm run build:firefox

# Development server (hot-reload)
npm run dev

# Type checking
npm run check
```

The build pipeline is a **two-pass Vite build**:
1. **Main pass** — Builds the sidepanel (Svelte app), background service worker, offscreen document, and sandbox page as ES modules
2. **Content pass** (`--mode content`) — Builds the content script as an IIFE (no module syntax, injected directly into web pages)

---

## Project Structure

```
FlowPilot/
├── public/
│   └── manifest.json              # Chrome Extension Manifest V3
├── src/
│   ├── background/                # Service Worker (Kernel)
│   │   ├── index.ts               # Entry point — boots MessageRouter, Registry, McpBridge
│   │   ├── core/
│   │   │   ├── MessageRouter.ts   # Central message bus (380 lines)
│   │   │   ├── WorkflowRunner.ts  # Execution engine, sessions, graph traversal (750 lines)
│   │   │   ├── SandboxService.ts  # Offscreen sandbox lifecycle (155 lines)
│   │   │   └── TabCoordinator.ts  # Multi-tab session management
│   │   ├── mcp/
│   │   │   └── McpBridge.ts       # WebSocket bridge + 38 MCP tool implementations (1207 lines)
│   │   ├── offscreen-bridge.ts    # Offscreen ↔ Sandbox message relay
│   │   └── sandbox-logic.ts       # FLOW/GLOBAL/Table/$row runtime APIs (223 lines)
│   ├── content/
│   │   └── index.ts               # Content script — DOM actions, picker, scanner (378 lines)
│   ├── nodes/                     # Node plugin system
│   │   ├── browser/               # NAVIGATE, SPAWN, CLOSE_TAB
│   │   ├── core/                  # CLICK, TYPE, INTERACT, WAIT, WAIT_STABILITY
│   │   ├── developer/             # SCRIPT (FlowScript IDE)
│   │   ├── human/                 # NOTIFY, WAIT_USER
│   │   └── logic/                 # IF_BRANCH, WAIT_UNTIL
│   ├── shared/
│   │   ├── framework/
│   │   │   ├── Registry.ts        # Plugin discovery & registration (390 lines)
│   │   │   └── NodePlugin.ts      # NodePlugin interface, ExecutionContext, NodeResult types
│   │   ├── services/
│   │   │   ├── db.ts              # Dexie IndexedDB schema (7 tables, 146 lines)
│   │   │   └── vault.ts           # AES-256-GCM encryption service (223 lines)
│   │   ├── types/
│   │   │   └── flowscript.d.ts    # TypeScript definitions for sandbox APIs
│   │   └── utils/
│   │       └── expressions.ts     # Expression validation, autocomplete, suggestions
│   └── sidepanel/                 # Svelte UI
│       ├── App.svelte             # Root shell — tabs, themes, vault, bundles (1626 lines)
│       ├── features/
│       │   └── WorkflowEditor.svelte  # Canvas editor + inspector + IDE (2106 lines)
│       └── components/
│           ├── CodeEditor.svelte  # Monaco wrapper with IntelliSense (297 lines)
│           └── ExpressionInput.svelte # Inline expression autocomplete (322 lines)
├── mcp-server/                    # MCP Companion Server
│   ├── src/
│   │   ├── index.ts               # MCP stdio server + tool definitions (667 lines)
│   │   └── bridge.ts             # HTTP + WebSocket bridge server (430 lines)
│   └── package.json               # Separate package (flowpilot-mcp v1.0.0)
├── scripts/
│   ├── copy-binaries.js           # Copies MCP binaries to public/mcp/
│   └── build-firefox.js           # Firefox manifest translation build
├── index.html                     # Side panel entry point
├── offscreen.html                 # Offscreen document (hosts sandbox iframe)
├── sandbox.html                   # Sandboxed page for FlowScript execution
├── vite.config.ts                 # Dual-mode Vite build configuration
└── package.json                   # Root package (flowpilot v0.1.0)
```

---

## Getting Started

### Creating Your First Workflow

1. Open the FlowPilot side panel by clicking the extension icon
2. Click **+ New Workflow** on the Workflows tab
3. You are taken to the **Canvas Editor** with a single **START** node
4. Open the **Launcher** (rocket icon in the toolbar) to see available nodes
5. Drag a node from the launcher onto the canvas — or click it to place at center
6. Connect the **START** node's `success` port to your new node's `default` input by dragging from one port to the other
7. Configure the node by clicking it to open the **Node Inspector**

### Running a Workflow

1. Navigate to the target website in a browser tab
2. Open FlowPilot side panel
3. Select a workflow and click the **▶ Play** button
4. The workflow begins executing from the START node
5. Use **⏸ Pause**, **⏹ Stop**, or **⏯ Step** for debugging
6. View execution logs in the **Logs** tab

---

## The Visual Canvas Editor

The `WorkflowEditor` component is a 2106-line Svelte component that provides a full-featured 2D node-graph editing experience.

### Canvas Controls

| Action | How |
|--------|-----|
| **Pan** | Click and drag on empty canvas space |
| **Zoom** | Mouse wheel / pinch |
| **Select node** | Click on a node |
| **Move node** | Drag a selected node |
| **Delete node** | Select + press Delete, or use inspector footer |
| **Connect nodes** | Drag from an output port to an input port |
| **Disconnect** | Select edge + "Cut All Links" in inspector |

### Node Inspector

Clicking a node opens a **450px side panel** showing:
- The node's **configuration UI** (provided by each node's `Config.svelte` component)
- A footer with **Cut All Links** and **Delete Node** buttons
- For SCRIPT nodes: an **Open Full IDE** button

### Edge Connections & Threading Modes

Edges connect output ports to input ports. Each edge has a **threading mode** that you can cycle by clicking on the edge:

| Mode | Label | Behavior |
|------|-------|----------|
| **MAIN** | Exclusive Main | Continues in the same tab (sequential) |
| **CLONE** | Session Clone | Forks cookies/session into a new tab for parallel execution |
| **FRESH** | Fresh Start | Opens a clean background tab with no session state |

### Element Picker

Click the **crosshair** button to activate the DOM element picker:
1. Hover over elements on the page — they highlight
2. Click to select — FlowPilot captures the CSS selector and candidate paths
3. A new CLICK or TYPE node is auto-created with the selected element

### Page Scanner

Click **Scan Page** to analyze the current page's DOM:
- Returns all interactive elements (forms, inputs, buttons, anchors)
- Results appear in a filterable overlay
- **Auto-Map Fields** matches scanned fields to your data table headers
- **Add Selected** bulk-creates TYPE/CLICK nodes for checked elements

### History (Undo/Redo)

- **Undo**: `Ctrl+Z` — up to 50 history snapshots
- **Redo**: `Ctrl+Y` / `Ctrl+Shift+Z`
- History is stored as JSON snapshots of the full graph state

---

## Node Types Reference

Every node follows the `NodePlugin` interface:
```typescript
interface NodePlugin<TState, TOutput> {
  manifest: NodeManifest<TState>;
  execute(ctx: ExecutionContext<TState>): Promise<NodeResult<TOutput>>;
  recover?(error, ctx): Promise<boolean>;  // optional error recovery
}
```

### Interaction Nodes

#### `CLICK` — Click Element
| | |
|---|---|
| **Icon** | MousePointer2 |
| **Ports** | `default` → `success` / `failure` |
| **Permissions** | domRead, domWrite |
| **Config** | `selector` (CSS/XPath), `interactType` (`click` \| `dblclick` \| `right-click` \| `hover`) |
| **Behavior** | Finds the target element using self-healing selector resolution, then dispatches the specified mouse event. |

#### `TYPE` — Type Text
| | |
|---|---|
| **Icon** | Type |
| **Ports** | `default` → `success` / `failure` |
| **Permissions** | domRead, domWrite |
| **Config** | `selector` (CSS/XPath), `value` (text to type — supports `{expressions}`) |
| **Behavior** | Finds the target input/textarea, clears it, and types the resolved value character by character. Supports variable interpolation from data tables. |

#### `INTERACT` — Universal Interaction
| | |
|---|---|
| **Icon** | Zap |
| **Ports** | `default` → `success` / `failure` |
| **Permissions** | domRead, domWrite |
| **Config** | `interactType` (25+ action types), `selector`, `value`, `saveMode` (`local` \| `global` \| `table`), `variableName`, `globalTableSlug`, `tableColumn` |
| **Behavior** | The Swiss Army knife node. Handles mouse events, keyboard events, scrolling, clipboard, form manipulation, data extraction, and DOM assertions. When extracting data, saves to local variables, global tables, or data table columns based on `saveMode`. Supports encrypted vault globals. |

**Supported interaction types:**
- **Mouse**: click, dblclick, right-click, hover, mousedown, mouseup
- **Keyboard**: keypress, keydown, keyup
- **Scroll**: scroll-to, scroll-by, scroll-into-view
- **Clipboard**: copy, paste, cut
- **Form**: focus, blur, select, clear, check, uncheck
- **Data**: extract-text, extract-html, extract-attribute, extract-value, extract-count
- **Assert**: assert-visible, assert-text, assert-value

#### `WAIT` — Wait (Delay)
| | |
|---|---|
| **Icon** | Clock |
| **Ports** | `default` → `success` |
| **Permissions** | None |
| **Config** | `value` (milliseconds, default `2000`) |
| **Behavior** | Simple timer — pauses workflow for the specified duration. |

#### `WAIT_STABILITY` — Wait for Page Stability
| | |
|---|---|
| **Icon** | Activity |
| **Ports** | `default` → `success` / `failure` |
| **Permissions** | domRead |
| **Config** | `timeout` (max wait in ms, default `10000`) |
| **Behavior** | Monitors DOM mutations via MutationObserver. Resolves when no significant changes are detected for a stability window. Ideal for SPAs and dynamically loaded content. |

### Browser Nodes

#### `NAVIGATE` — Navigate to URL
| | |
|---|---|
| **Icon** | Globe |
| **Ports** | `default` → `success` / `failure` |
| **Permissions** | network |
| **Config** | `url` (supports `{expressions}` for dynamic URLs) |
| **Behavior** | Updates the current tab's URL, waits for `chrome.tabs.onUpdated` with `status === 'complete'`, then adds a 1-second SPA/redirect buffer. |

#### `SPAWN` — Spawn Tab & Workflow
| | |
|---|---|
| **Icon** | Layers |
| **Ports** | `default` → `success` / `failure` |
| **Permissions** | network |
| **Config** | `url` (target URL), `spawnWorkflowId` (workflow to execute in the new tab) |
| **Behavior** | Creates a background tab, waits for it to load (5s timeout), then triggers execution of the selected workflow in the new tab via `WORKFLOW_START` message. |

#### `CLOSE_TAB` — Close Current Tab
| | |
|---|---|
| **Icon** | XCircle |
| **Ports** | `default` → `success` |
| **Permissions** | None |
| **Config** | None |
| **Behavior** | Closes the tab associated with the current execution session. |

### Logic Nodes

#### `IF_BRANCH` — Logic Branch
| | |
|---|---|
| **Icon** | Layers |
| **Ports** | `default` → `true` / `false` |
| **Permissions** | domRead |
| **Config** | `conditionModel` (structured condition builder) or `value` (custom JS expression) |
| **Behavior** | Evaluates conditions and routes the workflow to either the `true` or `false` output port. Supports two modes: |

**Builder Mode** — Visual condition builder with rules:

| Category | Rules |
|----------|-------|
| **Element** | `element_visible`, `element_not_visible`, `element_exists`, `element_not_exists`, `element_contains_text`, `element_equals_text` |
| **Form** | `checkbox_checked`, `checkbox_not_checked`, `input_empty`, `input_has_value`, `input_equals`, `dropdown_selected` |
| **URL/Title** | `url_contains`, `url_equals`, `title_contains` |
| **Variables** | `var_empty`, `var_has_value`, `var_equals`, `var_contains` |
| **Numeric** | `num_gt`, `num_lt`, `num_eq`, `num_neq`, `num_gte`, `num_lte` |

Rules can be grouped with `ALL` (AND), `ANY` (OR), or `NONE` (NOR) operators.

**Custom Mode** — Arbitrary JavaScript expression evaluated in the sandbox or content script.

Both modes support **polling** with configurable `timeout` and `poll` intervals.

#### `WAIT_UNTIL` — Wait Until (Condition)
| | |
|---|---|
| **Icon** | Timer |
| **Ports** | `default` → `success` / `timeout` |
| **Permissions** | domRead |
| **Config** | `value` (expression to evaluate), `timeout` (max wait, default `30000`ms), `poll` (check interval, default `1000`ms) |
| **Behavior** | Polls the sandbox repeatedly, evaluating the expression until it returns `true`. If the timeout expires, routes to the `timeout` port. Ideal for waiting for OTP fields, page transitions, or async data. |

### Developer Nodes

#### `SCRIPT` — FlowScript IDE
| | |
|---|---|
| **Icon** | Code |
| **Ports** | `default` → `success` / `failure` |
| **Permissions** | domRead, domWrite, network, vault |
| **Config** | `code` (JavaScript source code) |
| **Behavior** | Executes arbitrary JavaScript in a secure sandboxed iframe with no access to Chrome APIs or page DOM. Instead, interaction happens through the `FLOW`, `GLOBAL`, `Table`, and `$row` APIs. See [FlowScript IDE](#flowscript-ide) for full API documentation. |

### Advanced Nodes

#### `NOTIFY` — Notify Me
| | |
|---|---|
| **Icon** | Bell |
| **Ports** | `default` → `success` |
| **Permissions** | None |
| **Config** | `title`, `message` (both support `{expressions}`), `type` (`system` \| `alert`) |
| **Behavior** | `system` → Chrome desktop notification with priority 2. `alert` → JavaScript `alert()` injected into the page. |

#### `WAIT_USER` — Wait for User
| | |
|---|---|
| **Icon** | UserCircle |
| **Ports** | `default` → `success` |
| **Permissions** | None |
| **Config** | None |
| **Behavior** | Pauses the workflow and waits for the user to manually click **Resume** in the side panel. Useful for manual steps like CAPTCHA solving or human review. |

### Subflow Nodes (Built-in)

These are registered inline by the Registry and cannot be removed:

#### `START` — Entry Point
Every workflow has exactly one START node. It is the root of the graph and is automatically created when a workflow is made. Outputs `success`.

#### `BUNDLE_RETURN` — Return from Bundle
Terminal node inside a subflow bundle. When reached, execution returns to the parent workflow. Config: `outputPort` — the port name (e.g., `success` or `failure`) to route back through on the parent's bundle node.

#### `EXECUTE_NODE_REF` — Execute Node Reference
Executes a node or chain of nodes referenced by a bundle parameter. Used inside bundles to run user-provided node graphs. Config: `paramName` — the variable name holding the target node ID.

#### `BUNDLE_{id}` — Custom Bundle Instances
Dynamically registered for each user-created bundle. Inputs are defined by the bundle's parameter list. Execution walks the bundle's internal sub-graph until a `BUNDLE_RETURN` node is reached.

---

## FlowScript IDE

The FlowScript IDE is a full Monaco-powered code editor with TypeScript IntelliSense, available when configuring **SCRIPT** nodes. Open it by double-clicking a SCRIPT node or clicking **Open Full IDE** in the inspector.

Code runs inside a **secure sandbox** (`sandbox.html` with `sandbox="allow-scripts"`) — completely isolated from the page DOM and Chrome APIs. All interaction happens through bridged APIs:

### FLOW API

Access browser actions through the `FLOW` object:

```javascript
// Click an element
await FLOW.click('#submit-button');

// Fill a form field
await FLOW.fill('#email', 'user@example.com');

// Wait for a delay
await FLOW.wait(2000);

// Wait for an element to appear
await FLOW.waitFor('.loading-complete', 15000);

// Get text from an element
const text = await FLOW.getText('#result');

// Scan the page for interactive elements
const elements = await FLOW.scan();

// Log a message to the FlowPilot console
FLOW.log('Processing complete!');

// Show an alert on the page
await FLOW.alert('Step finished');

// List all open browser tabs
const tabs = await FLOW.listTabs();

// Search browsing history
const history = await FLOW.searchHistory('github.com', 10);

// List installed extensions
const extensions = await FLOW.listExtensions();
```

> **Note:** All methods have both camelCase and PascalCase aliases (e.g., `FLOW.click()` and `FLOW.Click()`).

### Table API

Read and write the workflow's bound data table:

```javascript
// Get all rows
const rows = await Table.getAll();

// Add a new row
await Table.add({ name: 'Alice', email: 'alice@example.com' });

// Update row at index 2
await Table.update(2, { status: 'processed' });

// Delete row at index 0
await Table.delete(0);

// Find a specific row
const found = await Table.find(row => row.email === 'bob@example.com');

// Iterate all rows
await Table.forEach((row, index) => {
  FLOW.log(`Row ${index}: ${row.name}`);
});

// Get column headers
const headers = Table.getHeaders();
```

### GLOBAL API

Access shared global variables and datasets:

```javascript
// Read a global variable
const apiKey = GLOBAL.settings.apiKey;

// Update a global variable (VARIABLES type)
await GLOBAL.settings.update('apiKey', 'new-key-value');

// Add a row to a global dataset
await GLOBAL.leads.add({ name: 'Jane', score: 95 });

// Iterate a global dataset
await GLOBAL.leads.forEach((row, i) => {
  FLOW.log(`Lead ${i}: ${row.name}`);
});

// Get all entries
const allSettings = await GLOBAL.settings.getAll();

// Find in a dataset
const topLead = await GLOBAL.leads.find(r => r.score > 90);
```

### $row API

The current data table row as a reactive proxy (auto-persists changes):

```javascript
// Read the current row's fields
const name = $row.name;
const email = $row.email;

// Write back — automatically saved to the table
$row.status = 'completed';
$row.processedAt = new Date().toISOString();

// Batch update
$row.update({ status: 'done', notes: 'All good' });

// Get current row index
const idx = $row.index;
```

### Code Examples

**Scrape a list of items:**
```javascript
const items = await FLOW.click('.load-more');
await FLOW.wait(1000);

const count = await FLOW.getText('.item-count');
FLOW.log(`Found ${count} items`);

const data = (function() {
  return [...document.querySelectorAll('.item')].map(el => ({
    title: el.querySelector('.title')?.textContent,
    price: el.querySelector('.price')?.textContent
  }));
})();

for (const item of data) {
  await Table.add(item);
}
```

**Conditional logic with global state:**
```javascript
const retries = GLOBAL.config.retryCount || 0;

if (retries >= 3) {
  FLOW.log('Max retries reached, stopping.');
  $row.status = 'failed';
} else {
  await GLOBAL.config.update('retryCount', retries + 1);
  await FLOW.click('#retry-button');
  await FLOW.waitFor('.success-indicator', 10000);
  $row.status = 'success';
}
```

---

## Expression System

Expressions can be used in **any text field** across all nodes (URL fields, type values, notification messages, etc.).

### Column References

Wrap a data table column name in single braces:
```
Hello {firstName}, your order #{orderId} is ready!
```
Resolves to the value from the current row during batch execution.

### Inline JavaScript

Wrap JavaScript in double braces for dynamic evaluation:
```
{{Date.now()}}
{{$row["email"].toUpperCase()}}
{{GLOBAL.config.baseUrl}}/api/users
{{crypto.randomUUID()}}
```

### Calc Expressions

For math operations:
```
calc({price} * {quantity})
calc(Math.round({total} * 100) / 100)
calc({index} + 1)
```

### Built-in Suggestions

The autocomplete system provides contextual suggestions:

| Category | Examples |
|----------|----------|
| **Time/ID** | `{{Date.now()}}`, `{{new Date().toLocaleString()}}`, `{{crypto.randomUUID()}}` |
| **Math** | `{{Math.floor(Math.random() * 100) + 1}}`, `calc()` |
| **Logic** | `{{condition ? "yes" : "no"}}` |
| **Strings** | `{{value.toUpperCase()}}`, `{{value.trim()}}`, `{{value.length}}` |
| **Browser** | `{{window.location.href}}`, `{{document.title}}` |
| **FLOW** | `{{await FLOW.listTabs()}}`, `{{await FLOW.searchHistory("term")}}` |
| **Database** | `{{await Table.getAll()}}`, `{{GLOBAL.slug.field}}` |

---

## Data Tables

Data tables are CSV-compatible spreadsheets stored in IndexedDB. They serve two purposes:

1. **Batch Processing** — When a workflow is bound to a data table, it iterates through each row, executing the full graph once per row. Column values are accessible via `{columnName}` expressions and the `$row` proxy.

2. **Data Storage** — SCRIPT nodes can read/write rows via the `Table` API, and INTERACT nodes can extract data into specific columns.

**Features:**
- Import/export CSV via PapaParse
- Add, edit, delete rows from the UI
- Live-sync with running workflow sessions
- Accessible from FlowScript via `Table.add()`, `Table.update()`, etc.

---

## Global Variables & Datasets

Globals are shared data stores accessible across all workflows. There are two types:

### VARIABLES Type
A flat key-value dictionary. Good for configuration, API keys, counters.
```javascript
// In FlowScript
GLOBAL.config.apiKey       // read
await GLOBAL.config.update('apiKey', 'new-value') // write
```

### DATASET Type
A row-based table (backed by a `DataTable`). Good for shared lists, lead databases.
```javascript
// In FlowScript
await GLOBAL.leads.add({ name: 'Jane', email: 'jane@example.com' })
await GLOBAL.leads.forEach((row, i) => { ... })
```

**Security:** Globals can be marked as **secure** — their data is encrypted with AES-256-GCM via the Vault. Secure globals require the vault to be unlocked before access.

---

## Encrypted Vault

FlowPilot includes a client-side encryption vault for sensitive data.

### How It Works
- **Algorithm**: AES-256-GCM with random 12-byte IV
- **Key Derivation**: PBKDF2 with 100,000 iterations, SHA-256, random 16-byte salt
- **Verification**: Separate PBKDF2-derived HMAC hash (10,000 iterations) — non-reversible
- **Session Key**: Held in-memory as a `CryptoKey` object; cleared on lock

### Vault States
| State | Meaning |
|-------|---------|
| `UNINITIALIZED` | No master password has been set |
| `LOCKED` | Master password exists but the vault is locked |
| `UNLOCKED` | Active session with decryption key in memory |

### What Can Be Encrypted
- **Workflows** — Entire workflow graphs can be locked with vault encryption
- **Global Tables** — Sensitive variables/datasets can be marked as secure
- **Password Change** — Re-encrypts all protected data with the new key

### API
```typescript
VaultService.setMasterPassword(password)  // Initialize vault
VaultService.unlock(password)              // Unlock session
VaultService.lock()                        // Clear session key
VaultService.encrypt(plaintext)            // Encrypt string
VaultService.decrypt(ciphertext)           // Decrypt string
VaultService.getState()                    // Check vault state
VaultService.changeMasterPassword(old, new) // Re-encrypt everything
```

---

## Node Bundles (Subflows)

Node Bundles are reusable workflow components. Think of them as **functions** — they have typed inputs, an internal graph, and return to the parent workflow via output ports.

### Creating a Bundle

1. Go to **Settings → Node Bundles** tab
2. Click **+ Create Bundle**
3. Name your bundle and add input parameters
4. Build the internal graph (it starts with a START node)
5. Add a **BUNDLE_RETURN** node at the end of each path
6. Set the `outputPort` on each BUNDLE_RETURN (e.g., `success` or `failure`)

### Bundle Parameters

| Type | Description |
|------|-------------|
| `text` | Free-text string input |
| `number` | Numeric input |
| `boolean` | True/false toggle |
| `expression` | Expression that gets resolved at runtime |
| `node_ref` | Reference to a single node in the parent workflow |
| `nodes_flow` | Reference to a chain of connected nodes |
| `bundle_ref` | Reference to another bundle |

### Import/Export

- **Export**: Click the download icon on a bundle → saves as `.flowbundle` JSON
- **Import**: Click **Import Bundle** → select a `.flowbundle` file
- Bundle files contain the manifest, parameter definitions, and the complete internal workflow graph

---

## Custom Node Addons

Power users can extend FlowPilot with custom node addons.

### Addon Structure

A `.zip` file containing:
```
my-addon/
├── manifest.json    # Node metadata (type, label, ports, initialState)
└── runtime.js       # execute(ctx) function
```

### manifest.json
```json
{
  "type": "CUSTOM_MY_NODE",
  "label": "My Custom Node",
  "description": "Does something custom",
  "category": "custom",
  "ports": {
    "inputs": ["default"],
    "outputs": ["success", "failure"]
  },
  "initialState": {
    "myParam": ""
  }
}
```

### runtime.js
```javascript
async function execute(ctx) {
  const { node, services } = ctx;
  // Custom logic here...
  return { success: true, nextPort: 'success' };
}
```

### Installing Addons

1. Go to **Settings → Custom Node Addons**
2. Click **Upload Addon** and select your `.zip` file
3. The node appears in the Launcher under the "custom" category
4. To remove: click the delete button next to the addon

You can also download a **developer boilerplate** ZIP from the settings panel.

---

## Theming (Moods)

FlowPilot ships with 4 visual themes ("moods"):

| Mood | Style |
|------|-------|
| **Obsidian** | Dark theme with slate blues and cool grays |
| **Crystal** | Light theme with white backgrounds and subtle borders |
| **Synthwave** | Neon pink/cyan on deep purple — retro-futuristic |
| **Nebula** | Deep purple gradients with cosmic accents |

Switch themes in **Settings → Appearance**. The selection persists in `chrome.storage.local` under the key `flowpilot_mood`.

Each theme is defined as a set of CSS custom properties applied globally.

---

## MCP Integration (AI Agent Support)

FlowPilot exposes **38 tools** via the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP), allowing AI agents like Claude Desktop to fully control the extension programmatically.

### How It Works

```
AI Agent (Claude Desktop)
    ↕ stdio (JSON-RPC)
MCP Companion Server (Node.js process)
    ↕ WebSocket (port 7865)
Chrome Extension Service Worker (McpBridge.ts)
    ↕ Internal APIs
Dexie DB, Chrome APIs, Plugin Registry, WorkflowRunner
```

The companion server is a **thin proxy** — all 38 tool implementations live in `McpBridge.ts` inside the extension's service worker, which has direct access to IndexedDB, Chrome tabs/scripting/history/management APIs, the workflow runner, and the plugin registry.

### Setting Up the Companion Server

**Option 1: Download Binary (Recommended)**
1. Go to **Settings → MCP Integration** in the FlowPilot side panel
2. Download the binary for your OS (Windows/macOS/Linux)
3. Run it — the server auto-configures `claude_desktop_config.json`
4. Restart Claude Desktop

**Option 2: Run from Source**
```bash
cd mcp-server
npm install
npm run build
npm start
```

**Option 3: Dev Mode**
```bash
cd mcp-server
npm run dev
```

The server runs on port **7865** and opens a dashboard in your browser.

### MCP Dashboard

When the companion server starts, it serves a web dashboard at `http://localhost:7865`. The dashboard shows:
- Extension connection status
- Live request/response logging
- Statistics (uptime, request count, error count)
- Tool testing interface

### Complete MCP Tool Reference

#### Workflow Management

| Tool | Description | Required Params | Optional Params |
|------|-------------|-----------------|-----------------|
| `list_flows` | List all workflows with metadata | — | — |
| `get_flow` | Get complete graph of a workflow | `flowId` | — |
| `create_flow` | Create new workflow with START node | `name` | `id`, `description` |
| `update_flow` | Update name, graph, or settings | `flowId` | `name`, `graph`, `settings` |
| `delete_flow` | Delete a workflow permanently | `flowId` | — |

#### Execution Control

| Tool | Description | Required Params | Optional Params |
|------|-------------|-----------------|-----------------|
| `execute_flow` | Start workflow in active tab | `flowId` | — |
| `stop_flow` | Stop execution | — | `sessionId` |
| `pause_flow` | Pause execution | — | `sessionId` |
| `resume_flow` | Resume paused execution | — | `sessionId` |
| `get_execution_status` | Get all active session states | — | — |

#### Node Operations

| Tool | Description | Required Params | Optional Params |
|------|-------------|-----------------|-----------------|
| `list_node_types` | List all registered node types | — | — |
| `add_node` | Add node to a workflow | `flowId`, `nodeType` | `state`, `position`, `label` |
| `update_node` | Update node state or label | `flowId`, `nodeId` | `state`, `label` |
| `remove_node` | Remove node and connected edges | `flowId`, `nodeId` | — |
| `connect_nodes` | Create edge between nodes | `flowId`, `sourceNodeId`, `targetNodeId` | `sourcePort` |
| `disconnect_nodes` | Remove edge between nodes | `flowId`, `sourceNodeId`, `targetNodeId` | `sourcePort` |

#### Data Tables

| Tool | Description | Required Params | Optional Params |
|------|-------------|-----------------|-----------------|
| `list_tables` | List all data tables | — | — |
| `get_table` | Get table rows and headers | `tableId` | — |
| `create_table` | Create table with headers | `name`, `headers` | `rows` |
| `modify_table` | Add/update/delete rows | `tableId`, `action` | `rowIndex`, `rowData` |
| `delete_table` | Delete a table | `tableId` | — |

#### Global Variables

| Tool | Description | Required Params | Optional Params |
|------|-------------|-----------------|-----------------|
| `list_globals` | List all global tables | — | — |
| `get_global` | Get global by slug | `slug` | — |
| `set_global` | Create or update global | `slug`, `data` | `name`, `createIfMissing` |
| `delete_global` | Delete global by slug | `slug` | — |

#### Browser & Page Interaction

| Tool | Description | Required Params | Optional Params |
|------|-------------|-----------------|-----------------|
| `scan_page` | AI-readable DOM analysis | — | — |
| `run_js` | Execute JS in active tab (returns result) | `code` | — |
| `take_screenshot` | Capture visible tab as base64 PNG | — | — |
| `get_text` | Get element text by CSS selector | `selector` | — |
| `list_tabs` | List all open tabs | — | — |
| `search_history` | Search browsing history | `text` | `maxResults` |
| `list_extensions` | List installed extensions | — | — |

#### Logging

| Tool | Description | Required Params | Optional Params |
|------|-------------|-----------------|-----------------|
| `get_logs` | Read execution logs with filters | — | `workflowId`, `status`, `limit`, `offset`, `startTime`, `endTime`, `query` |
| `clear_logs` | Clear execution logs | — | `workflowId` |

#### Node Bundles

| Tool | Description | Required Params | Optional Params |
|------|-------------|-----------------|-----------------|
| `register_bundle` | Register a bundle manifest | `id`, `name`, `description` | `inputs`, `outputs` |
| `list_bundles` | List all registered bundles | — | — |
| `get_bundle` | Get bundle by ID | `bundleId` | — |

#### Direct Browser Actions

These tools execute browser actions directly (no workflow needed):

| Tool | Description | Required Params | Optional Params |
|------|-------------|-----------------|-----------------|
| `SPAWN` | Open a new browser tab | — | `url`, `viewportWidth`, `viewportHeight`, `userAgent` |
| `CLOSE_TAB` | Close the active tab | — | — |
| `NAVIGATE` | Navigate active tab to URL | `url` | — |
| `CLICK` | Click element by selector | `selector` | — |
| `TYPE` | Type text into input | `selector`, `text` | `clearFirst`, `delay` |
| `WAIT` | Pause for N milliseconds | `duration` | — |
| `WAIT_STABILITY` | Wait for page stability | — | `timeout`, `stabilityTime` |
| `INTERACT` | Focus/blur/hover/select element | `selector`, `action` | — |

---

## Content Script & DOM Interaction

The content script (`src/content/index.ts`) is injected into **every web page** and runs in all frames. It is the bridge between the extension's background worker and the live DOM.

### Self-Healing Selectors

FlowPilot doesn't rely on a single CSS selector. When an element is picked or scanned, it stores:
1. **Primary selector** — The most specific CSS path
2. **Candidate array** — Alternative selectors ranked by specificity
3. **Element spec** — Attributes, text content, position metadata

At execution time, `SelectorHealer.findElement()` tries candidates in order, falling back to spec-based matching if all selectors break. This makes workflows resilient to minor DOM changes.

### Smart Scanner

`SmartScanner.scan()` analyzes the page and returns a structured, AI-readable representation:
- **Forms** — grouped by `<form>` element with all child inputs
- **Inputs** — text fields, textareas, selects, checkboxes, radios
- **Buttons** — submit buttons, `<button>` elements, clickable `<a>` tags
- **Anchors** — navigation links with href attributes

### Element Recorder

The recorder tracks user interactions in real-time:
- Mouse clicks → generates CLICK node configs
- Text input → generates TYPE node configs
- Navigation → generates NAVIGATE node configs

Start/stop recording from the toolbar. Recorded actions are appended to the active workflow.

### Condition Interpreter

A **CSP-safe**, recursive JSON-based condition evaluator used by `IF_BRANCH` and `WAIT_UNTIL` nodes. It does **not** use `eval()` — instead, it evaluates structured condition models with:
- Group operators: `ALL` (AND), `ANY` (OR), `NONE` (NOR)
- Rule types covering elements, forms, URLs, variables, and numeric comparisons

### SPA Detection

`SPAWatcher` monitors for single-page application navigation using:
- `MutationObserver` on the document body
- `popstate` and `hashchange` event listeners
- Automatic stability detection after dynamic content loads

`waitForStability()` resolves when no DOM mutations are detected within a configurable stability window.

---

## Database Schema

FlowPilot uses **Dexie.js** (IndexedDB wrapper) with 7 tables:

| Table | Primary Key | Indexes | Purpose |
|-------|-------------|---------|---------|
| `workflows` | `id` | — | Workflow definitions (graph, settings, name) |
| `workflow_steps` | `id` | `workflow_id` | Legacy linear action steps (deprecated) |
| `workflow_versions` | `++id` (auto) | `workflow_id` | Version history snapshots |
| `execution_logs` | `++id` (auto) | `[workflow_id+timestamp]` | Audit trail for all node executions |
| `execution_sessions` | `id` | `workflow_id` | Active/historical execution contexts |
| `data_tables` | `id` | — | User data tables (CSV data, batch processing) |
| `global_tables` | `id` | `slug` (unique) | Global variables and shared datasets |

**Current schema version:** 8

**Key types:**
```typescript
interface Workflow {
  id: string;
  name: string;
  version: number;
  graph?: { nodes: any[]; edges: any[] };
  settings: Record<string, any>;
  is_encrypted?: boolean;
  encrypted_blob?: string;
  created_at: Date;
  updated_at: Date;
}

interface ExecutionLog {
  id?: number;           // auto-incremented
  workflow_id: string;
  step_id?: string;
  row_index?: number;
  status: 'SUCCESS' | 'ERROR' | 'PENDING' | 'RUNNING';
  message: string;
  details?: any;
  timestamp: Date;
}

interface WorkflowContext {
  id: string;            // session UUID
  workflow_id: string;
  tab_id: number;
  current_node_id?: string;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'SUCCESS' | 'FAILED' | 'WAITING';
  variables: Record<string, any>;
  parent_session_id?: string;
}

interface GlobalTable {
  id: string;
  name: string;
  slug: string;          // unique identifier
  type: 'VARIABLES' | 'DATASET';
  data: any;
  is_secure: boolean;
}
```

---

## Cross-Browser Support

FlowPilot supports both **Chrome** and **Firefox** from a single codebase.

### Differences Handled

| Feature | Chrome | Firefox |
|---------|--------|---------|
| **Background** | Service Worker (`service_worker`) | Background Script (`scripts[]`) |
| **Side Panel** | `chrome.sidePanel` API (`side_panel` manifest key) | `sidebar_action` manifest key |
| **Offscreen Document** | `chrome.offscreen.createDocument()` | Hidden `<iframe>` appended to background page DOM |
| **Context Discovery** | `chrome.runtime.getContexts()` | Feature-detected and skipped if unavailable |
| **Gecko Settings** | N/A | `browser_specific_settings.gecko` with extension ID |
| **Permissions** | Includes `sidePanel`, `offscreen` | `sidePanel` removed (not supported) |

### Build Commands

```bash
npm run build           # Chrome → dist/
npm run build:firefox   # Firefox → dist-firefox/
```

The Firefox build script (`scripts/build-firefox.js`) compiles the full bundle and then patches the manifest with Firefox-compatible equivalents.

---

## Build System

### Dependencies

| Package | Version | Role |
|---------|---------|------|
| `svelte` | 5.x | UI framework |
| `vite` | 8.x | Build tool |
| `typescript` | 5.x | Type checking |
| `dexie` | 3.2.x | IndexedDB wrapper |
| `monaco-editor` | 0.53.x | Code editor |
| `papaparse` | 5.5.x | CSV parsing |
| `jszip` | 3.10.x | ZIP file handling (addon imports) |
| `@lucide/svelte` | 1.17.x | Icon library |

### MCP Server Dependencies

| Package | Version | Role |
|---------|---------|------|
| `@modelcontextprotocol/sdk` | 1.12.x | MCP protocol implementation |
| `ws` | 8.18.x | WebSocket server |
| `zod` | 3.24.x | Schema validation |
| `pkg` | 5.8.x | Binary packaging (win/mac/linux) |

### Vite Configuration

The build uses **dual-mode** Vite:

| Mode | Entry Points | Output Format |
|------|-------------|---------------|
| **Default** | `sidepanel` (index.html), `background` (index.ts), `offscreen` (offscreen.html), `sandbox` (sandbox.html) | ES modules |
| **Content** | `src/content/index.ts` | IIFE (no modules) |

**Path Aliases:**
| Alias | Maps To |
|-------|---------|
| `$shared` | `src/shared` |
| `$infra` | `src/infra` |
| `$framework` | `src/shared/framework` |
| `$nodes` | `src/nodes` |
| `$background` | `src/background` |
| `$content` | `src/content` |
| `$sidepanel` | `src/sidepanel` |

---

## Configuration Reference

### Manifest Permissions

| Permission | Used For |
|------------|----------|
| `storage` | Dexie IndexedDB, chrome.storage.local |
| `sidePanel` | Chrome side panel API (Chrome only) |
| `tabs` | Tab queries, creation, updates |
| `scripting` | Content script injection, `executeScript()` |
| `activeTab` | Active tab access |
| `offscreen` | Offscreen document creation (Chrome only) |
| `webNavigation` | SPA navigation detection |
| `notifications` | Desktop notifications (NOTIFY node) |
| `alarms` | Service worker keepalive heartbeat |
| `history` | Browser history search |
| `management` | Installed extension listing |
| `bookmarks` | Bookmark access |
| `downloads` | Download management |
| `cookies` | Cookie access for session cloning |

### Storage Keys (chrome.storage.local)

| Key | Type | Purpose |
|-----|------|---------|
| `flowpilot_mood` | `string` | Active theme name |
| `custom_nodes` | `array` | Installed custom node addons |
| `node_bundles` | `array` | Registered node bundle manifests |
| `flowpilot_v4_salt` | `string` | Vault PBKDF2 salt (base64) |
| `flowpilot_v4_hash` | `string` | Vault verification hash (base64) |

---

## Troubleshooting

### Extension not loading
- Ensure you're loading the `dist/` folder (Chrome) or `dist-firefox/` folder (Firefox)
- Check that **Developer mode** is enabled in `chrome://extensions/`
- Look for errors in the extension's service worker console

### MCP server not connecting
- Verify the companion server is running on port 7865
- Check that the extension's service worker is active (open `chrome://extensions/` → FlowPilot → "Inspect views: service worker")
- The extension auto-reconnects via a keepalive alarm every 27 seconds

### Vault locked during execution
- If a workflow requires encrypted data, the vault must be unlocked first
- The extension will show a **Vault Challenge** prompt automatically
- Enter your master password to continue execution

### Script execution timeout
- FlowScript has a 30-second watchdog timeout
- Sandbox readiness check polls for up to 5 seconds
- Individual `_call()` RPCs (FLOW.click, etc.) timeout after 15 seconds

### Selectors breaking on updated pages
- FlowPilot uses self-healing selectors with candidate arrays
- Re-scan the page or re-pick elements to refresh selector candidates
- The `SelectorHealer` tries multiple fallback strategies automatically

---

## License

See [LICENSE](LICENSE) for details.
