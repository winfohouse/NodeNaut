import { MessageType } from '$shared/constants/messages';
import { WorkflowRunner } from './WorkflowRunner';
import type { ExtRequest, ExtResponse } from '$shared/api/messenger';

export class MessageRouter {
  private workflowRunner = WorkflowRunner.getInstance();

  init() {
    chrome.runtime.onMessage.addListener((request: ExtRequest, sender, sendResponse) => {
      this.handleMessage(request, sender)
        .then(sendResponse)
        .catch((error) => {
          console.error('Router handle error:', error);
          sendResponse({
            success: false,
            error: { code: 'ROUTER_ERROR', message: error.message }
          });
        });
      return true; // Keep channel open for async response
    });
  }

  private async handleMessage(request: ExtRequest, sender: chrome.runtime.MessageSender): Promise<ExtResponse> {
    console.log(`Routing message: ${request.type}`, request.payload);

    switch (request.type) {
      case MessageType.WORKFLOW_START:
        return await this.workflowRunner.start(request.payload.workflowId);
      
      case MessageType.WORKFLOW_STOP:
        return await this.workflowRunner.stop();

      default:
        return {
          success: false,
          error: { code: 'UNKNOWN_MESSAGE_TYPE', message: `Type ${request.type} not handled` }
        };
    }
  }
}
