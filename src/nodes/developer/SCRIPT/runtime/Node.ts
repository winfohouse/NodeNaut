import type { NodePlugin, ExecutionContext, NodeResult } from '$framework/NodePlugin';
import { manifest, type ScriptState } from '../manifest';

export interface ScriptOutput {
  [key: string]: unknown;
}

export default class ScriptNode implements NodePlugin<ScriptState, ScriptOutput> {
  manifest = manifest;

  async execute(ctx: ExecutionContext<ScriptState>): Promise<NodeResult<ScriptOutput>> {
    const { node, services, logger } = ctx;
    
    logger.info('Executing Custom FlowScript');

    // Run in the safe Neural Sandbox
    const response = await services.sandbox.execute<Record<string, unknown>, ScriptOutput>({
      code: node.state.code || '',
      data: await ctx.vars.get<Record<string, unknown>>('all'),
      tableId: node.tableId,
      rowIndex: node.rowIndex
    });

    if (response.success) {
      return { success: true, nextPort: 'success', data: response.data as ScriptOutput };
    } else {
      return { 
        success: false, 
        nextPort: 'failure',
        error: { code: 'SCRIPT_ERROR', message: response.error?.message || 'Execution failed' }
      };
    }
  }
}
