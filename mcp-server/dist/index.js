#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const bridge_js_1 = require("./bridge.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
// Path to save cached tool schemas
const CACHE_PATH = path.join(os.tmpdir(), 'flowpilot-mcp-tools-cache.json');
// Static fallback of the 38 core tools so they are ALWAYS available in Claude Desktop even if the extension is offline/connecting
const FALLBACK_TOOLS = [
    {
        name: 'list_flows',
        description: 'List all workflows stored in FlowPilot database. Returns workflow metadata such as ID, name, nodeCount, edgeCount, encrypted status, settings, created time, and updated time.',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'get_flow',
        description: 'Retrieve the complete graph (nodes, edges, and settings) of a specific workflow by its ID.',
        inputSchema: {
            type: 'object',
            properties: {
                flowId: { type: 'string', description: 'The unique UUID of the workflow to fetch' }
            },
            required: ['flowId']
        }
    },
    {
        name: 'create_flow',
        description: 'Create a new workflow with a starting START node.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Optional unique ID/UUID for the workflow (e.g. to create a bundle with static ID)' },
                name: { type: 'string', description: 'Name of the new workflow' },
                description: { type: 'string', description: 'Optional description for the workflow settings' }
            },
            required: ['name']
        }
    },
    {
        name: 'update_flow',
        description: 'Update a workflow\'s name, graph structure, or settings.',
        inputSchema: {
            type: 'object',
            properties: {
                flowId: { type: 'string', description: 'The unique UUID of the workflow to update' },
                name: { type: 'string', description: 'New name for the workflow' },
                graph: { type: 'object', description: 'New graph object containing { nodes: Array, edges: Array }' },
                settings: { type: 'object', description: 'New settings object to merge' }
            },
            required: ['flowId']
        }
    },
    {
        name: 'delete_flow',
        description: 'Delete a workflow permanently by its ID.',
        inputSchema: {
            type: 'object',
            properties: {
                flowId: { type: 'string', description: 'The unique UUID of the workflow to delete' }
            },
            required: ['flowId']
        }
    },
    {
        name: 'execute_flow',
        description: 'Starts executing a workflow in the active browser tab. Emits logs and records a run session.',
        inputSchema: {
            type: 'object',
            properties: {
                flowId: { type: 'string', description: 'The unique UUID of the workflow to run' }
            },
            required: ['flowId']
        }
    },
    {
        name: 'stop_flow',
        description: 'Stops an active workflow execution session.',
        inputSchema: {
            type: 'object',
            properties: {
                sessionId: { type: 'string', description: 'Optional execution session UUID. If omitted, stops the first active running session.' }
            }
        }
    },
    {
        name: 'pause_flow',
        description: 'Pauses an active workflow execution session.',
        inputSchema: {
            type: 'object',
            properties: {
                sessionId: { type: 'string', description: 'Optional session UUID. If omitted, pauses the first active running session.' }
            }
        }
    },
    {
        name: 'resume_flow',
        description: 'Resumes a paused workflow execution session.',
        inputSchema: {
            type: 'object',
            properties: {
                sessionId: { type: 'string', description: 'Optional session UUID. If omitted, resumes the first active paused session.' }
            }
        }
    },
    {
        name: 'get_execution_status',
        description: 'Get the current state of all active execution sessions (running, paused, waiting).',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'list_node_types',
        description: 'Dynamically list all registered node types available in FlowPilot. This includes core, browser, logic, developer, human, and custom addon/bundle nodes. AI should use this to understand what node types are available and what their initialState schemas look like.',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'add_node',
        description: 'Add a node of any type (e.g. NAVIGATE, CLICK, TYPE, INTERACT, SCRIPT, IF_BRANCH, Wait) to a workflow graph.',
        inputSchema: {
            type: 'object',
            properties: {
                flowId: { type: 'string', description: 'The unique UUID of the workflow' },
                nodeType: { type: 'string', description: 'The node type (must be one from list_node_types, e.g. NAVIGATE, CLICK, TYPE, INTERACT, SCRIPT, IF_BRANCH, WAIT)' },
                state: { type: 'object', description: 'Node configuration state. If omitted, uses the node\'s default manifest initialState.' },
                position: {
                    type: 'object',
                    properties: {
                        x: { type: 'number' },
                        y: { type: 'number' }
                    },
                    description: 'Canvas coordinates. If omitted, places the node below the last node.'
                },
                label: { type: 'string', description: 'Custom display label for the node' }
            },
            required: ['flowId', 'nodeType']
        }
    },
    {
        name: 'update_node',
        description: 'Update a node\'s configuration state or label within a workflow.',
        inputSchema: {
            type: 'object',
            properties: {
                flowId: { type: 'string', description: 'The unique UUID of the workflow' },
                nodeId: { type: 'string', description: 'The node instance UUID inside the workflow graph' },
                state: { type: 'object', description: 'Parameters to merge into the node\'s configuration state' },
                label: { type: 'string', description: 'New display label for the node' }
            },
            required: ['flowId', 'nodeId']
        }
    },
    {
        name: 'remove_node',
        description: 'Remove a node and delete all edges connected to it from a workflow graph.',
        inputSchema: {
            type: 'object',
            properties: {
                flowId: { type: 'string', description: 'The unique UUID of the workflow' },
                nodeId: { type: 'string', description: 'The node instance UUID to remove' }
            },
            required: ['flowId', 'nodeId']
        }
    },
    {
        name: 'connect_nodes',
        description: 'Create an execution path edge between a source node and target node in a workflow.',
        inputSchema: {
            type: 'object',
            properties: {
                flowId: { type: 'string', description: 'The unique UUID of the workflow' },
                sourceNodeId: { type: 'string', description: 'The source node instance UUID' },
                targetNodeId: { type: 'string', description: 'The target node instance UUID' },
                sourcePort: { type: 'string', description: 'The output port to connect from. Defaults to "success". (Use "true" or "false" for IF_BRANCH nodes)' }
            },
            required: ['flowId', 'sourceNodeId', 'targetNodeId']
        }
    },
    {
        name: 'disconnect_nodes',
        description: 'Remove an execution path edge between a source node and target node in a workflow, breaking their connection.',
        inputSchema: {
            type: 'object',
            properties: {
                flowId: { type: 'string', description: 'The unique UUID of the workflow' },
                sourceNodeId: { type: 'string', description: 'The source node instance UUID' },
                targetNodeId: { type: 'string', description: 'The target node instance UUID' },
                sourcePort: { type: 'string', description: 'The specific output port to disconnect. If omitted, all connections between the two nodes are removed.' }
            },
            required: ['flowId', 'sourceNodeId', 'targetNodeId']
        }
    },
    {
        name: 'list_tables',
        description: 'List all user data tables (datasets) stored in FlowPilot.',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'get_table',
        description: 'Fetch all rows, headers, and metadata for a specific data table by its ID.',
        inputSchema: {
            type: 'object',
            properties: {
                tableId: { type: 'string', description: 'The unique UUID of the data table' }
            },
            required: ['tableId']
        }
    },
    {
        name: 'create_table',
        description: 'Create a new data table/dataset with defined headers and optional initial rows.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Name of the new dataset' },
                headers: { type: 'array', items: { type: 'string' }, description: 'List of column names for the table' },
                rows: { type: 'array', items: { type: 'object' }, description: 'Initial rows to populate' }
            },
            required: ['name', 'headers']
        }
    },
    {
        name: 'modify_table',
        description: 'Add, update, or delete rows in a data table.',
        inputSchema: {
            type: 'object',
            properties: {
                tableId: { type: 'string', description: 'The unique UUID of the table to modify' },
                action: { type: 'string', enum: ['add', 'update', 'delete'], description: 'Action to perform' },
                rowIndex: { type: 'number', description: 'The index of the row to update or delete (0-indexed)' },
                rowData: { type: 'object', description: 'The row columns data key-value object (required for add and update)' }
            },
            required: ['tableId', 'action']
        }
    },
    {
        name: 'delete_table',
        description: 'Delete a data table permanently by its ID.',
        inputSchema: {
            type: 'object',
            properties: {
                tableId: { type: 'string', description: 'The unique UUID of the data table to delete' }
            },
            required: ['tableId']
        }
    },
    {
        name: 'list_globals',
        description: 'List all global variables tables and datasets configured in FlowPilot.',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'get_global',
        description: 'Get variables or rows stored in a global table by its slug.',
        inputSchema: {
            type: 'object',
            properties: {
                slug: { type: 'string', description: 'The identifier slug of the global table' }
            },
            required: ['slug']
        }
    },
    {
        name: 'set_global',
        description: 'Create or update variables under a global variables table.',
        inputSchema: {
            type: 'object',
            properties: {
                slug: { type: 'string', description: 'The slug of the global table to modify' },
                data: { type: 'object', description: 'Key-value pairs to set or merge' },
                name: { type: 'string', description: 'Optional name if a new global table is created' },
                createIfMissing: { type: 'boolean', description: 'Whether to create the global if it doesn\'t exist. Defaults to true.' }
            },
            required: ['slug', 'data']
        }
    },
    {
        name: 'delete_global',
        description: 'Delete a global variable table permanently by its slug.',
        inputSchema: {
            type: 'object',
            properties: {
                slug: { type: 'string', description: 'The slug of the global variable table to delete' }
            },
            required: ['slug']
        }
    },
    {
        name: 'scan_page',
        description: 'Scans the active browser tab and returns structured, AI-readable DOM data. This includes forms, inputs, interactive buttons, anchors, and candidates metadata. AI should use this to discover selectors and interactive components on the active web page.',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'run_js',
        description: 'Execute JavaScript code in the main context of the active browser tab. Returns the evaluation result (string, number, boolean, array, or object) in real-time. Example: To extract state use an IIFE: "(() => { const btn = document.querySelector(\\"button\\"); return { text: btn?.innerText, disabled: btn?.disabled }; })()"',
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'JavaScript code string to evaluate. Return a value or object to receive it in the tool response.' }
            },
            required: ['code']
        }
    },
    {
        name: 'take_screenshot',
        description: 'Capture a visible screenshot of the active browser tab. Returns page URL, tabId, and the screenshot as a base64 PNG data URL.',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'get_text',
        description: 'Retrieve the visible text content of an element in the active tab by its CSS selector. Useful for scraping text safely without CSP issues.',
        inputSchema: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'CSS selector of the target element (e.g. "h1", "div.ai-overview")' }
            },
            required: ['selector']
        }
    },
    {
        name: 'get_logs',
        description: 'Read execution audit logs with advanced filtering, time ranges, and text query search.',
        inputSchema: {
            type: 'object',
            properties: {
                workflowId: { type: 'string', description: 'Filter logs by workflow ID' },
                status: { type: 'string', enum: ['SUCCESS', 'ERROR', 'PENDING', 'RUNNING'], description: 'Filter logs by execution step status' },
                limit: { type: 'number', description: 'Max logs to return (default: 50)' },
                offset: { type: 'number', description: 'Pagination offset (default: 0)' },
                startTime: { type: 'number', description: 'Filter logs starting from this epoch timestamp in milliseconds' },
                endTime: { type: 'number', description: 'Filter logs ending at this epoch timestamp in milliseconds' },
                query: { type: 'string', description: 'Search query string matching log message or details' }
            }
        }
    },
    {
        name: 'clear_logs',
        description: 'Clear all execution logs, or logs for a specific workflow.',
        inputSchema: {
            type: 'object',
            properties: {
                workflowId: { type: 'string', description: 'Filter to clear logs only for this specific workflow ID. Clears all if omitted.' }
            }
        }
    },
    {
        name: 'register_bundle',
        description: 'Register a modular Node Bundle manifest in Chrome local storage and FlowPilot registry.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Unique UUID for the bundle' },
                name: { type: 'string', description: 'Name of the bundle node' },
                description: { type: 'string', description: 'Detailed description of what this bundle does' },
                inputs: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            label: { type: 'string' },
                            type: { type: 'string' },
                            required: { type: 'boolean' },
                            defaultValue: { type: 'string' }
                        },
                        required: ['name', 'label', 'type']
                    },
                    description: 'Parameter inputs defined by the bundle'
                },
                outputs: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Custom output ports (default: ["success", "failure"])'
                }
            },
            required: ['id', 'name', 'description']
        }
    },
    {
        name: 'list_bundles',
        description: 'List all registered modular Node Bundles and their parameters.',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'get_bundle',
        description: 'Retrieve a registered Node Bundle manifest and its parameter configurations.',
        inputSchema: {
            type: 'object',
            properties: {
                bundleId: { type: 'string', description: 'The unique ID/UUID of the bundle' }
            },
            required: ['bundleId']
        }
    },
    {
        name: 'SPAWN',
        description: 'Launch/spawn a new browser window or tab. Optionally specify starting URL, viewport dimensions, or custom User Agent.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'Starting URL to navigate to' },
                viewportWidth: { type: 'number', description: 'Viewport width in pixels (e.g. 1280)' },
                viewportHeight: { type: 'number', description: 'Viewport height in pixels (e.g. 720)' },
                userAgent: { type: 'string', description: 'Custom User Agent string' }
            }
        }
    },
    {
        name: 'CLOSE_TAB',
        description: 'Close the active browser tab.',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'NAVIGATE',
        description: 'Navigate the active browser tab to a specified URL.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'Target URL (e.g. "https://google.com")' }
            },
            required: ['url']
        }
    },
    {
        name: 'CLICK',
        description: 'Click on an element in the active browser tab identified by a CSS selector or XPath.',
        inputSchema: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'CSS or XPath selector of the element to click' }
            },
            required: ['selector']
        }
    },
    {
        name: 'TYPE',
        description: 'Type text into an input field in the active browser tab.',
        inputSchema: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'CSS or XPath selector of the target input element' },
                text: { type: 'string', description: 'The text to type' },
                clearFirst: { type: 'boolean', description: 'Whether to clear the input field first. Defaults to true.' },
                delay: { type: 'number', description: 'Delay in milliseconds between keystrokes' }
            },
            required: ['selector', 'text']
        }
    },
    {
        name: 'WAIT',
        description: 'Pause execution for a specific duration in milliseconds.',
        inputSchema: {
            type: 'object',
            properties: {
                duration: { type: 'number', description: 'Duration to wait in milliseconds' }
            },
            required: ['duration']
        }
    },
    {
        name: 'WAIT_STABILITY',
        description: 'Wait until the page becomes stable (no layout changes or DOM mutations).',
        inputSchema: {
            type: 'object',
            properties: {
                timeout: { type: 'number', description: 'Max timeout to wait in milliseconds. Defaults to 10000.' },
                stabilityTime: { type: 'number', description: 'Consecutive milliseconds of quietness required. Defaults to 500.' }
            }
        }
    },
    {
        name: 'INTERACT',
        description: 'Perform direct browser element interactions like focus, hover, or select.',
        inputSchema: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'CSS or XPath selector of the element' },
                action: { type: 'string', enum: ['focus', 'blur', 'hover', 'select'], description: 'The interaction action to perform' }
            },
            required: ['selector', 'action']
        }
    },
    {
        name: 'list_tabs',
        description: 'List all open browser tabs with their IDs, titles, URLs, and active status.',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'search_history',
        description: 'Search Chrome browsing history for matches against a text query.',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Query text to search history for' },
                maxResults: { type: 'number', description: 'Maximum history matches to return (default: 20)' }
            },
            required: ['text']
        }
    },
    {
        name: 'list_extensions',
        description: 'List all installed browser extensions with their IDs, names, version, enabled status, and descriptions.',
        inputSchema: { type: 'object', properties: {} }
    }
];
// Helper to auto-configure Claude Desktop config
function setupClaudeConfig() {
    const homeDir = os.homedir();
    let configPath = '';
    if (process.platform === 'win32') {
        configPath = path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
    }
    else if (process.platform === 'darwin') {
        configPath = path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    }
    else {
        configPath = path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
    }
    // Determine path of the running executable/script
    const exePath = process.argv[0];
    const scriptPath = process.argv[1];
    const isPackaged = typeof process.pkg !== 'undefined';
    const executableToRun = isPackaged ? exePath : path.resolve(scriptPath || './dist/index.js');
    console.error(`\n[FlowPilot MCP] Detected Executable Path: ${executableToRun}`);
    console.error(`[FlowPilot MCP] Claude Desktop Config: ${configPath}`);
    try {
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        let config = { mcpServers: {} };
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            if (content.trim()) {
                try {
                    config = JSON.parse(content);
                }
                catch (e) {
                    console.error('[FlowPilot MCP] Warning: Claude config could not be parsed as JSON. Overwriting...');
                }
            }
        }
        if (!config.mcpServers)
            config.mcpServers = {};
        // Add or update the server configuration
        config.mcpServers['flowpilot'] = {
            command: isPackaged ? executableToRun : 'node',
            args: isPackaged ? [] : [executableToRun]
        };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        console.error('[FlowPilot MCP] ✓ Claude Desktop configuration updated successfully!');
    }
    catch (err) {
        console.error(`[FlowPilot MCP] Could not auto-update Claude config: ${err.message}`);
        console.error('\n--- COPY THIS CONFIG BLOCK MANUALLY ---');
        const manualConfig = {
            mcpServers: {
                flowpilot: {
                    command: isPackaged ? executableToRun : 'node',
                    args: isPackaged ? [] : [executableToRun]
                }
            }
        };
        console.error(JSON.stringify(manualConfig, null, 2));
        console.error('---------------------------------------\n');
    }
}
async function main() {
    // Print beautiful header to standard error (stderr) to prevent crashing Claude Desktop
    console.error('==================================================');
    console.error('          FLOWPILOT MCP PORTABLE SERVER           ');
    console.error('==================================================');
    console.error('Status: Starting WebSocket server on port 7865...');
    // Auto-setup configuration on launch
    setupClaudeConfig();
    // Determine executable path for config generation
    const exePath = process.argv[0];
    const scriptPath = process.argv[1];
    const isPackaged = typeof process.pkg !== 'undefined';
    const resolvedExecPath = isPackaged ? exePath : path.resolve(scriptPath || './dist/index.js');
    const bridge = new bridge_js_1.ExtensionBridge(7865, {
        execPath: resolvedExecPath,
        version: '1.0.0'
    });
    // If running interactively (double-clicked), open the dashboard in default browser
    if (process.stdin.isTTY) {
        const url = 'http://localhost:7865';
        console.error('[FlowPilot] Launching control panel: ' + url);
        const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
        try {
            const { exec } = require('child_process');
            exec(startCmd + ' ' + url);
        }
        catch (e) { }
    }
    const server = new index_js_1.Server({ name: 'flowpilot', version: '1.0.0' }, { capabilities: { tools: {} } });
    // Dynamically list tools by querying the extension, falling back to cache & static list
    server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
        try {
            const tools = await bridge.send('get_mcp_tools');
            if (tools && Array.isArray(tools) && tools.length > 0) {
                // Cache successfully fetched schemas
                try {
                    fs.writeFileSync(CACHE_PATH, JSON.stringify(tools, null, 2), 'utf8');
                }
                catch (e) { }
                return { tools };
            }
        }
        catch (error) {
            console.error('[FlowPilot MCP] Error listing tools from extension, falling back:', error.message);
        }
        // Try to load cached schemas from file
        try {
            if (fs.existsSync(CACHE_PATH)) {
                const cached = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
                if (cached && Array.isArray(cached) && cached.length > 0) {
                    return { tools: cached };
                }
            }
        }
        catch (e) { }
        // Ultimate fallback to hardcoded list so Claude Desktop always starts with tools registered
        return { tools: FALLBACK_TOOLS };
    });
    // Dynamically dispatch tool calls to the extension
    server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            const result = await bridge.send('call_mcp_tool', { name, arguments: args });
            // If the result is already in the MCP tool response format:
            if (result && result.content) {
                return result;
            }
            // Otherwise, wrap it:
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true
            };
        }
    });
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('[FlowPilot MCP] MCP server started (stdio)');
}
main().catch(console.error);
//# sourceMappingURL=index.js.map