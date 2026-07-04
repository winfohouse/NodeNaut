import { db } from '$shared/services/db';
import { NodeNautRegistry } from '$framework/Registry';
import type { 
  ExecutionContext, 
  NodeResult, 
  NodePlugin, 
  ExecutionError, 
  ElementDiscovery,
  MessengerService
} from '$framework/NodePlugin';
import { Messenger } from '$shared/api/messenger';
import { MessageType } from '$shared/constants/messages';
import { ResilientTabSender } from '$background/core/ResilientTabSender';
import { SandboxService } from '$background/core/SandboxService';
import { VaultService } from '$shared/services/vault';

export class ExecutionHub {
  private static instance: ExecutionHub;
  private activeSessions = new Map<string, Record<string, unknown>>();
  private registry = NodeNautRegistry.getInstance();

  private constructor() {
    NodeNautRegistry.discoverPlugins();
  }

  static getInstance(): ExecutionHub {
    if (!ExecutionHub.instance) {
      ExecutionHub.instance = new ExecutionHub();
    }
    return ExecutionHub.instance;
  }

  async runNode(sessionId: string, nodeId: string): Promise<void> {
    const session = await db.execution_sessions.get(sessionId);
    if (!session || session.status === 'PAUSED') return;

    const workflow = await db.workflows.get(session.workflow_id);
    if (!workflow) return;

    const nodeData = workflow.graph?.nodes.find((n: any) => n.id === nodeId);
    if (!nodeData) return;

    const plugin = this.registry.getPlugin(nodeData.type) as NodePlugin | undefined;
    if (!plugin) {
      console.error(`[ExecutionHub] No plugin found for type: ${nodeData.type}`);
      return;
    }

    const context = await this.createContext(session, nodeData);
    
    try {
      if (plugin.onInit) await plugin.onInit(context);
      
      const result = await plugin.execute(context);
      
      if (result.success) {
        await this.handleSuccess(session, nodeData, result);
      } else {
        await this.handleError(session, nodeData, result, plugin, context);
      }
    } catch (e: any) {
      const error: ExecutionError = { code: 'CRASH', message: e.message || 'Node execution crashed' };
      await this.handleError(session, nodeData, { success: false, error }, plugin, context);
    }
  }

  private async createContext(session: any, nodeData: any): Promise<ExecutionContext> {
    const rowData = (session.variables as Record<string, unknown>) || {};

    return {
      node: {
        id: nodeData.id,
        state: nodeData.state || {},
        tabId: session.tab_id
      },
      services: {
        dom: {},
        messenger: Messenger as unknown as MessengerService,
        vault: VaultService,
        sandbox: SandboxService.getInstance(),
        picker: {
          start: async (mode = 'step'): Promise<ElementDiscovery> => {
            const response = await ResilientTabSender.send(session.tab_id, MessageType.PICKER_START, { mode });
            if (!response.success) throw new Error(response.error?.message || 'Picker failed');
            
            return new Promise((resolve) => {
              const listener = (msg: any) => {
                if (msg.type === MessageType.PICKER_SELECT) {
                  chrome.runtime.onMessage.removeListener(listener);
                  resolve(msg.payload as ElementDiscovery);
                }
              };
              chrome.runtime.onMessage.addListener(listener);
            });
          },
          scan: async (): Promise<ElementDiscovery[]> => {
            const response = await ResilientTabSender.send(session.tab_id, MessageType.DOM_SCAN, {});
            return response.success ? (response.data as ElementDiscovery[]) : [];
          }
        }
      },
      vars: {
        get: async <V>(key: string): Promise<V> => rowData[key] as V,
        set: async <V>(key: string, val: V): Promise<void> => {
          rowData[key] = val as any;
          await db.execution_sessions.update(session.id, { variables: rowData });
        },
        resolve: async (str: string) => str // TODO: Implement expression engine resolution
      },
      logger: {
        info: (m: string, d?: Record<string, unknown>) => console.log(`[Node:${nodeData.id}] ${m}`, d),
        warn: (m: string, d?: Record<string, unknown>) => console.warn(`[Node:${nodeData.id}] ${m}`, d),
        error: (m: string, d?: Record<string, unknown>) => console.error(`[Node:${nodeData.id}] ${m}`, d)
      },
      runtime: {
        pause: () => db.execution_sessions.update(session.id, { status: 'PAUSED' }),
        stop: () => db.execution_sessions.delete(session.id),
        next: (port: string) => {}
      }
    };
  }

  private async handleSuccess(session: any, nodeData: any, result: NodeResult) {
    const workflow = await db.workflows.get(session.workflow_id);
    const edges = workflow?.graph?.edges || [];
    const outgoing = edges.filter((e: any) => e.sourceNodeId === nodeData.id);

    let nextNodeId: string | undefined;
    
    if (result.nextPort) {
      const edge = outgoing.find((e: any) => e.type === result.nextPort);
      nextNodeId = edge?.targetNodeId;
    } else {
      nextNodeId = outgoing[0]?.targetNodeId;
    }

    if (nextNodeId) {
      session.current_node_id = nextNodeId;
      await db.execution_sessions.put(session);
      this.runNode(session.id, nextNodeId);
    } else {
      await db.execution_sessions.delete(session.id);
    }
  }

  private async handleError(session: any, nodeData: any, result: NodeResult, plugin: NodePlugin, context: ExecutionContext) {
    if (plugin.recover) {
      const recovered = await plugin.recover(result.error!, context);
      if (recovered) return;
    }
    await db.execution_sessions.update(session.id, { 
      status: 'FAILED',
      error: result.error?.message || 'Unknown node error'
    });
  }
}
