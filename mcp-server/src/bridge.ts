import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { DASHBOARD_HTML } from './dashboard-html.js';
import crypto from 'crypto';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export interface ServerConfig {
  execPath: string;
  version: string;
}

export class ExtensionBridge {
  private wss: WebSocketServer;
  private httpServ: ReturnType<typeof createServer>;
  private extensionWs: WebSocket | null = null;
  private dashboardSockets = new Set<WebSocket>();
  private pendingRequests = new Map<string, PendingRequest>();
  private pendingDashboardRequests = new Map<string, WebSocket>();
  private REQUEST_TIMEOUT = 600000;
  private config: ServerConfig;
  private port: number;

  // Live stats tracked for dashboard
  private stats = {
    totalRequests: 0,
    totalErrors: 0,
    startTime: Date.now()
  };

  // Cached manifests from the last extension update
  private cachedManifests: any[] = [];

  constructor(port: number = 7865, config: ServerConfig = { execPath: '', version: '1.0.0' }) {
    this.port = port;
    this.config = config;

    // Create combined HTTP + WebSocket server on a single port
    this.httpServ = createServer((_req: IncomingMessage, res: ServerResponse) => {
      // Every HTTP GET serves the full SPA dashboard
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      res.end(DASHBOARD_HTML);
    });

    this.wss = new WebSocketServer({ server: this.httpServ });

    this.wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
      let clientType: 'unknown' | 'extension' | 'dashboard' = 'unknown';

      ws.on('message', async (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          // ── Handle ping heartbeats ──
          if (msg.type === 'ping') {
            this.sendTo(ws, { type: 'pong' });
            return;
          }

          // ── Dashboard Registration ──
          if (msg.type === 'register_dashboard') {
            clientType = 'dashboard';
            this.dashboardSockets.add(ws);
            console.error('[FlowPilot] Dashboard client connected');

            // Send server metadata
            this.sendTo(ws, {
              type: 'server_info',
              execPath: this.config.execPath,
              version: this.config.version,
              platform: process.platform,
              port: this.port
            });

            // Send current extension connection state + manifests
            this.sendTo(ws, {
              type: 'status_update',
              extensionConnected: this.isExtensionConnected,
              manifests: this.cachedManifests
            });

            // Send current stats
            this.sendTo(ws, {
              type: 'stats_update',
              stats: this.getStats()
            });
            return;
          }

          // ── Route Test from Dashboard ──
          if (msg.type === 'route_test_request') {
            if (!this.isExtensionConnected) {
              this.sendTo(ws, { type: 'route_test_response', success: false, error: 'Chrome Extension is not connected. Open FlowPilot in the browser sidepanel.' });
              return;
            }
            const id = crypto.randomUUID();
            this.pendingDashboardRequests.set(id, ws);
            this.extensionWs!.send(JSON.stringify({ id, method: msg.method, params: msg.params || {} }));
            return;
          }

          // ── Extension Client Registration ──
          if (msg.type === 'register_extension') {
            clientType = 'extension';
            this.extensionWs = ws;
            console.error('[FlowPilot] Chrome Extension connected');

            // Fetch dynamic manifests and MCP tools from the extension
            await this.refreshManifests();

            this.broadcastToDashboards({
              type: 'status_update',
              extensionConnected: true,
              manifests: this.cachedManifests
            });
            return;
          }

          // ── Extension Client Fallback ──
          if (clientType === 'unknown' && msg.type !== 'register_dashboard') {
            clientType = 'extension';
            this.extensionWs = ws;
            console.error('[FlowPilot] Chrome Extension connected (fallback)');

            // Fetch dynamic manifests and MCP tools from the extension
            await this.refreshManifests();

            this.broadcastToDashboards({
              type: 'status_update',
              extensionConnected: true,
              manifests: this.cachedManifests
            });
          }

          // ── Handle manual refresh manifests request from dashboard ──
          if (msg.type === 'refresh_manifests') {
            console.log('[FlowPilot] Manual refresh manifests requested by dashboard');
            await this.refreshManifests();
            this.broadcastToDashboards({
              type: 'status_update',
              extensionConnected: this.isExtensionConnected,
              manifests: this.cachedManifests
            });
            return;
          }

          // ── Handle log forwarding from service worker ──
          if (msg.type === 'service_worker_log') {
            const { level, message } = msg.payload || {};
            const prefix = `[Service Worker]`;
            if (level === 'error') {
              console.error(`\x1b[31m${prefix} ${message}\x1b[0m`);
            } else if (level === 'warn') {
              console.warn(`\x1b[33m${prefix} ${message}\x1b[0m`);
            } else {
              console.log(`\x1b[32m${prefix} ${message}\x1b[0m`);
            }

            // Also forward to dashboards so they show in the log stream!
            this.broadcastToDashboards({
              type: 'mcp_log',
              id: 'sw-log-' + Date.now(),
              method: `console.${level}`,
              params: { message },
              direction: 'in',
              timestamp: Date.now()
            });
            return;
          }

          // ── Handle response messages (from extension) ──
          if (msg.id) {
            // Check stdio MCP pending requests first
            if (this.pendingRequests.has(msg.id)) {
              const pending = this.pendingRequests.get(msg.id)!;
              clearTimeout(pending.timeout);
              this.pendingRequests.delete(msg.id);
              if (msg.error) {
                pending.reject(new Error(msg.error));
              } else {
                pending.resolve(msg.result);
              }
            }

            // Check dashboard test requests
            if (this.pendingDashboardRequests.has(msg.id)) {
              const dashWs = this.pendingDashboardRequests.get(msg.id)!;
              this.pendingDashboardRequests.delete(msg.id);
              if (dashWs.readyState === WebSocket.OPEN) {
                this.sendTo(dashWs, {
                  type: 'route_test_response',
                  success: !msg.error,
                  result: msg.result,
                  error: msg.error
                });
              }
            }
          }

        } catch (e: any) {
          console.error('[FlowPilot] WebSocket parse error:', e.message);
        }
      });

      ws.on('close', () => {
        if (clientType === 'extension') {
          console.error('[FlowPilot] Chrome Extension disconnected');
          this.extensionWs = null;
          this.cachedManifests = [];
          this.broadcastToDashboards({
            type: 'status_update',
            extensionConnected: false,
            manifests: []
          });
          // Reject all pending stdio requests
          for (const [, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Extension disconnected'));
          }
          this.pendingRequests.clear();
        } else if (clientType === 'dashboard') {
          console.error('[FlowPilot] Dashboard client disconnected');
          this.dashboardSockets.delete(ws);
        }
      });

      ws.on('error', (err) => {
        console.error('[FlowPilot] WebSocket error:', err.message);
      });
    });

    this.httpServ.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error('[FlowPilot] Port ' + port + ' is already in use. Another instance may be running.');
        console.error('[FlowPilot] Open http://localhost:' + port + ' to access the existing dashboard.');
      } else {
        console.error('[FlowPilot] Server error:', err.message);
      }
    });

    this.httpServ.listen(port, () => {
      console.error('[FlowPilot] Server & dashboard live at http://localhost:' + port);
    });
  }

  // ── Utility helpers ──

  private get isExtensionConnected(): boolean {
    return this.extensionWs !== null && this.extensionWs.readyState === WebSocket.OPEN;
  }

  private getStats() {
    return {
      totalRequests: this.stats.totalRequests,
      totalErrors: this.stats.totalErrors,
      uptime: Date.now() - this.stats.startTime,
      connectedClients: this.dashboardSockets.size
    };
  }

  private sendTo(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  private broadcastToDashboards(data: any) {
    const raw = JSON.stringify(data);
    for (const ws of this.dashboardSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(raw);
      }
    }
  }

  // Dynamically fetch all registered node type manifests from the extension
  private async fetchNodeTypes(): Promise<any[]> {
    if (!this.isExtensionConnected) return [];
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        resolve([]);
      }, 5000);

      this.pendingRequests.set(id, {
        resolve: (val) => resolve(Array.isArray(val) ? val : []),
        reject: () => resolve([]),
        timeout
      });

      this.extensionWs!.send(JSON.stringify({ id, method: 'list_node_types', params: {} }));
    });
  }

  // Dynamically fetch all registered MCP tools from the extension
  private async fetchMcpTools(): Promise<any[]> {
    if (!this.isExtensionConnected) return [];
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        resolve([]);
      }, 5000);

      this.pendingRequests.set(id, {
        resolve: (val) => resolve(Array.isArray(val) ? val : []),
        reject: () => resolve([]),
        timeout
      });

      this.extensionWs!.send(JSON.stringify({ id, method: 'get_mcp_tools', params: {} }));
    });
  }

  // Refresh and combine both MCP tools and node type manifests
  private async refreshManifests() {
    try {
      const [nodeTypes, mcpTools] = await Promise.all([
        this.fetchNodeTypes(),
        this.fetchMcpTools()
      ]);
      const mappedTools = mcpTools.map((t: any) => this.mapMcpToolToManifest(t));
      this.cachedManifests = [...mappedTools, ...nodeTypes];
    } catch (e) {
      console.error('[FlowPilot] Error refreshing manifests:', e);
    }
  }

  // Maps a generic MCP Tool schema to Svelte Dashboard compatible manifest format
  private mapMcpToolToManifest(tool: any) {
    const initialState: Record<string, any> = {};
    if (tool.inputSchema?.properties) {
      for (const [key, prop] of Object.entries<any>(tool.inputSchema.properties)) {
        if (prop.type === 'boolean') {
          initialState[key] = false;
        } else if (prop.type === 'number') {
          initialState[key] = 0;
        } else if (prop.type === 'array') {
          initialState[key] = [];
        } else if (prop.type === 'object') {
          initialState[key] = {};
        } else {
          initialState[key] = '';
        }
      }
    }

    return {
      type: tool.name,
      label: tool.name,
      category: 'System Tools',
      description: tool.description || 'System orchestration tool.',
      initialState,
      version: 1,
      icon: 'Settings'
    };
  }

  // ── Public API: send a tool request to the extension ──

  async send(method: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.isExtensionConnected) {
      throw new Error('FlowPilot extension is not connected. Open the Chrome sidepanel to connect.');
    }

    this.stats.totalRequests++;
    const reqLogId = crypto.randomUUID();

    // Broadcast incoming request to all dashboard clients
    this.broadcastToDashboards({
      type: 'log_event',
      log: { id: reqLogId, method, params, direction: 'in', timestamp: Date.now() }
    });

    // Broadcast updated stats
    this.broadcastToDashboards({ type: 'stats_update', stats: this.getStats() });

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        this.stats.totalErrors++;
        const err = new Error('Request timed out after ' + this.REQUEST_TIMEOUT + 'ms: ' + method);

        this.broadcastToDashboards({
          type: 'log_event',
          log: { id: reqLogId, method, status: 'error', error: err.message, direction: 'out', timestamp: Date.now() }
        });
        this.broadcastToDashboards({ type: 'stats_update', stats: this.getStats() });
        reject(err);
      }, this.REQUEST_TIMEOUT);

      this.pendingRequests.set(id, {
        resolve: (result) => {
          this.broadcastToDashboards({
            type: 'log_event',
            log: { id: reqLogId, method, status: 'success', result, direction: 'out', timestamp: Date.now() }
          });
          resolve(result);
        },
        reject: (reason) => {
          this.stats.totalErrors++;
          this.broadcastToDashboards({
            type: 'log_event',
            log: { id: reqLogId, method, status: 'error', error: reason.message || reason, direction: 'out', timestamp: Date.now() }
          });
          this.broadcastToDashboards({ type: 'stats_update', stats: this.getStats() });
          reject(reason);
        },
        timeout
      });

      this.extensionWs!.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.wss.close();
    this.httpServ.close();
  }
}
