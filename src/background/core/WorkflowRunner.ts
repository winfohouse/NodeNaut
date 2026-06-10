import { db } from '$shared/services/db';
import type { WorkflowStatus, WorkflowContext } from '$shared/types/workflow';
import { MessageType } from '$shared/constants/messages';

export class WorkflowRunner {
  private static instance: WorkflowRunner;
  private currentContext: WorkflowContext | null = null;

  private constructor() {}

  static getInstance(): WorkflowRunner {
    if (!WorkflowRunner.instance) {
      WorkflowRunner.instance = new WorkflowRunner();
    }
    return WorkflowRunner.instance;
  }

  async start(workflowId: string) {
    console.log(`Starting workflow: ${workflowId}`);
    
    // Initialize context
    this.currentContext = {
      workflow_id: workflowId,
      current_step_index: 0,
      status: 'RUNNING',
      variables: {},
      last_updated: Date.now()
    };

    await this.log(workflowId, 'RUNNING', 'Workflow started');
    
    // In a real scenario, we would start executing steps here
    // For Phase 2, we just verify the state change
    this.executeNextStep();
    
    return { success: true };
  }

  async stop() {
    if (this.currentContext) {
      const id = this.currentContext.workflow_id;
      this.currentContext.status = 'IDLE';
      await this.log(id, 'SUCCESS', 'Workflow stopped by user');
      this.currentContext = null;
    }
    return { success: true };
  }

  private async executeNextStep() {
    if (!this.currentContext || this.currentContext.status !== 'RUNNING') return;

    // TODO: Implementation of step execution logic
    console.log(`Executing step ${this.currentContext.current_step_index} for ${this.currentContext.workflow_id}`);
  }

  private async log(workflowId: string, status: any, message: string) {
    await db.execution_logs.add({
      workflow_id: workflowId,
      status,
      message,
      timestamp: Date.now()
    });
  }

  getStatus() {
    return this.currentContext?.status || 'IDLE';
  }
}
