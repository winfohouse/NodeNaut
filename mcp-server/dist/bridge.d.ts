export interface ServerConfig {
    execPath: string;
    version: string;
}
export declare class ExtensionBridge {
    private wss;
    private httpServ;
    private extensionWs;
    private dashboardSockets;
    private pendingRequests;
    private pendingDashboardRequests;
    private REQUEST_TIMEOUT;
    private config;
    private port;
    private stats;
    private cachedManifests;
    constructor(port?: number, config?: ServerConfig);
    private get isExtensionConnected();
    private getStats;
    private sendTo;
    private broadcastToDashboards;
    private fetchNodeTypes;
    private fetchMcpTools;
    private refreshManifests;
    private mapMcpToolToManifest;
    send(method: string, params?: Record<string, any>): Promise<any>;
    close(): void;
}
