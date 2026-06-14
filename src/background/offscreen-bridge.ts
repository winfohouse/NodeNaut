const sandbox = document.getElementById('sandbox') as HTMLIFrameElement;

// Relay messages from Sandbox to Background
window.addEventListener('message', (event) => {
  if (event.source === sandbox?.contentWindow) {
    chrome.runtime.sendMessage(event.data);
  }
});

// Receive messages from Background and relay to Sandbox
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'TO_SANDBOX' || request.type?.startsWith('FP_')) {
    sandbox?.contentWindow?.postMessage(request, '*');
  }
});

console.log('[FlowPilot] Offscreen Bridge Initialized');
