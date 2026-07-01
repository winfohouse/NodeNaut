import { db } from '$shared/services/db';
import { MessageRouter } from './core/MessageRouter';
import { FlowPilotRegistry } from '$framework/Registry';

// Initialize the global OS Kernel
async function initializeKernel() {
  console.log('[Kernel] Discovering Node Plugins...');
  await FlowPilotRegistry.discoverPlugins();
  
  const router = new MessageRouter();
  router.init();
  
  console.log('[Kernel] FlowPilot Service Worker fully initialized');
}

initializeKernel();

chrome.runtime.onInstalled.addListener(() => {
  console.log('FlowPilot Extension installed');
});

// @ts-ignore
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
