import { MessageType } from '$shared/constants/messages';
import type { ExtRequest, ExtResponse } from '$shared/api/messenger';

console.log('FlowPilot Content Script Injected');

chrome.runtime.onMessage.addListener((request: ExtRequest, sender, sendResponse) => {
  handleContentMessage(request)
    .then(sendResponse)
    .catch((error) => {
      console.error('Content handle error:', error);
      sendResponse({
        success: false,
        error: { code: 'CONTENT_ERROR', message: error.message }
      });
    });
  return true;
});

async function handleContentMessage(request: ExtRequest): Promise<ExtResponse> {
  console.log(`Content Script received: ${request.type}`, request.payload);

  switch (request.type) {
    case MessageType.DOM_FILL:
      return fillElement(request.payload.selector, request.payload.value);
    
    case MessageType.DOM_CLICK:
      return clickElement(request.payload.selector);

    default:
      return {
        success: false,
        error: { code: 'UNHANDLED_CONTENT_MESSAGE', message: `Type ${request.type} not handled in content` }
      };
  }
}

async function fillElement(selector: string, value: string): Promise<ExtResponse> {
  const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
  if (!element) {
    return { success: false, error: { code: 'ELEMENT_NOT_FOUND', message: `Selector ${selector} not found` } };
  }

  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  
  return { success: true };
}

async function clickElement(selector: string): Promise<ExtResponse> {
  const element = document.querySelector(selector) as HTMLElement;
  if (!element) {
    return { success: false, error: { code: 'ELEMENT_NOT_FOUND', message: `Selector ${selector} not found` } };
  }

  element.click();
  return { success: true };
}
