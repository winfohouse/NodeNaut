# FlowPilot MCP Server (Portable Edition)

This is the Model Context Protocol (MCP) server for FlowPilot, compiled into standalone, dependency-free portable binaries for Windows, macOS, and Linux.

It enables AI clients (like Claude Desktop or Cursor) to securely manage, create, and execute automation workflows in your browser with **zero local dependencies (no Node.js required)** and **zero cloud hosting costs**.

---

## How It Works

1. **Portable Binary**: Runs a local WebSocket Server on port `7865` inside a lightweight compiled executable.
2. **Chrome Extension**: Acts as a client, automatically connecting to `ws://localhost:7865` in the background.
3. **Auto-Configuration**: When run manually or by Claude, it automatically detects and updates the Claude Desktop config to register itself.
4. **Dynamic Discovery**: Automatically queries the running extension to discover all registered node types, logic components, and custom bundles on the fly.

---

## Compiled Binaries Location

The standalone binaries are generated in:
- **Windows**: `bin/flowpilot-mcp-win.exe`
- **macOS**: `bin/flowpilot-mcp-macos`
- **Linux**: `bin/flowpilot-mcp-linux`

---

## User Setup (Zero-Friction Guide)

To distribute this to your users, simply give them the binary matching their operating system:

### Step 1: Run the Binary once
Double-click the binary (`flowpilot-mcp-win.exe` or equivalent for their OS). 
- It will automatically create and register the configuration for **Claude Desktop** at:
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Linux: `~/.config/Claude/claude_desktop_config.json`
- Once run, the user can close the terminal window. Claude Desktop will automatically launch the binary as a background subprocess whenever it starts up.

### Step 2: Open Claude Desktop
Restart Claude Desktop. The AI will immediately have access to all 27 FlowPilot browser automation tools!

---

## Developer Rebuilding Guide

If you add new features or modify the tools:

1. **Build the CommonJS bundle**:
   ```bash
   npx esbuild src/index.ts --bundle --platform=node --format=cjs --outfile=dist/index.js
   ```
2. **Compile the standalone binaries**:
   ```bash
   npx pkg . --targets node18-win-x64,node18-macos-x64,node18-linux-x64 --out-path bin
   ```
   *(Note: This uses `node18` target packages for lightweight compiler stability and cross-compatibility)*.
