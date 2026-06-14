import { MessageType } from '$shared/constants/messages';
import { Messenger } from '$shared/api/messenger';
import type { WorkflowAction } from '$shared/types/workflow';
import { SelectorBuilder } from '../../shared/utils/selectors';

export class Recorder {
  private static isRecording = false;
  private static activeWorkflowId: string | null = null;

  static init() {
    // Listen for global interaction events
    document.addEventListener('click', (e) => this.handleClick(e), true);
    document.addEventListener('input', (e) => this.handleInput(e), true);
    
    console.log('FlowPilot Recorder Initialized');
  }

  static start(workflowId: string) {
    this.isRecording = true;
    this.activeWorkflowId = workflowId;
    console.log(`Recording started for workflow: ${workflowId}`);
  }

  static stop() {
    this.isRecording = false;
    this.activeWorkflowId = null;
    console.log('Recording stopped');
  }

  private static async handleClick(event: MouseEvent) {
    if (!this.isRecording) return;
    
    const target = event.target as HTMLElement;
    if (!target) return;

    const selectors = SelectorBuilder.build(target);
    const spec = SelectorBuilder.getSpec(target);
    
    const action: WorkflowAction = {
      id: crypto.randomUUID(),
      type: 'CLICK',
      selector: selectors[0].selector,
      candidates: selectors,
      metadata: { spec },
      timestamp: Date.now()
    };

    this.emitEvent(action);
  }

  private static async handleInput(event: Event) {
    if (!this.isRecording) return;
    
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (!target) return;

    const selectors = SelectorBuilder.build(target);
    const spec = SelectorBuilder.getSpec(target);

    const action: WorkflowAction = {
      id: crypto.randomUUID(),
      type: 'TYPE',
      selector: selectors[0].selector,
      candidates: selectors,
      value: target.value,
      metadata: { spec },
      timestamp: Date.now()
    };

    this.emitEvent(action);
  }

  private static async emitEvent(action: WorkflowAction) {
    if (!this.activeWorkflowId) return;

    console.log('Recording Action:', action);
    
    await Messenger.send(MessageType.RECORDER_EVENT, {
      workflowId: this.activeWorkflowId,
      action
    });
  }
}
