import type { NodePlugin, ExecutionContext, NodeResult } from '$framework/NodePlugin';
import { manifest, type InteractState } from '../manifest';
import { DOMActionHelper } from '$framework/DOMActionHelper';

export default class InteractNode implements NodePlugin<InteractState> {
  manifest = manifest;

  async execute(ctx: ExecutionContext<InteractState>): Promise<NodeResult> {
    const result = await DOMActionHelper.executeInteract(ctx, {
      action: ctx.node.state.interactType,
      selector: ctx.node.state.selector,
      value: ctx.node.state.value || '',
      candidates: ctx.node.state.candidates,
      metadata: ctx.node.state.metadata,
      failCode: 'INTERACT_FAILED',
      failMessage: `Failed to execute ${ctx.node.state.interactType}`
    });

    if (result.success && ctx.node.state.interactType.startsWith('extract')) {
      const { saveMode = 'local', variableName, globalTableSlug, globalTableKey, tableColumn } = ctx.node.state;
      const extractedValue = result.data;
      
      ctx.logger.info(`Extraction captured (Mode: ${saveMode})`, { value: extractedValue });
      
      if (saveMode === 'local' && variableName) {
        await ctx.vars.set(variableName, extractedValue);
      } else if (saveMode === 'table' && tableColumn) {
        await ctx.vars.set(tableColumn, extractedValue);
      } else if (saveMode === 'global' && globalTableSlug && globalTableKey) {
        try {
          const { db } = await import('$shared/services/db');
          const { VaultService } = await import('$shared/services/vault');
          const globalTable = await db.global_tables.where('slug').equals(globalTableSlug).first();
          
          if (globalTable) {
            let tableData = globalTable.data || {};
            if (globalTable.is_secure) {
              try {
                const decrypted = await VaultService.decrypt(globalTable.data.blob);
                tableData = JSON.parse(decrypted);
              } catch (e) {
                tableData = {};
              }
            }
            
            if (globalTable.type === 'VARIABLES') {
              tableData[globalTableKey] = extractedValue;
            } else if (globalTable.type === 'DATASET' && tableData.tableId) {
              const actualTable = await db.data_tables.get(tableData.tableId);
              if (actualTable) {
                if (!actualTable.rows) actualTable.rows = [];
                if (actualTable.rows.length === 0) {
                  actualTable.rows.push({ [globalTableKey]: extractedValue });
                } else {
                  actualTable.rows[0] = { ...actualTable.rows[0], [globalTableKey]: extractedValue };
                }
                await db.data_tables.update(tableData.tableId, { rows: actualTable.rows });
              }
            }
            
            const toStore = globalTable.is_secure ? { blob: await VaultService.encrypt(JSON.stringify(tableData)) } : tableData;
            await db.global_tables.update(globalTable.id, { data: toStore });
            ctx.logger.info(`Saved to global variable: GLOBAL.${globalTableSlug}.${globalTableKey}`);
          }
        } catch (err: any) {
          ctx.logger.error('Failed to save to global variable', { error: err.message });
        }
      }
    }

    return result;
  }
}
