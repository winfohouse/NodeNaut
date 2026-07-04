import { db } from '$shared/services/db';
import { MessageRouter } from './core/MessageRouter';
import { FlowPilotRegistry } from '$framework/Registry';
import { McpBridge } from './mcp/McpBridge';

// Hook console logs to forward them to companion server for visual developer diagnostics
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
  originalLog(...args);
  try { McpBridge.getInstance().sendLog('info', args); } catch (e) {}
};
console.warn = (...args) => {
  originalWarn(...args);
  try { McpBridge.getInstance().sendLog('warn', args); } catch (e) {}
};
console.error = (...args) => {
  originalError(...args);
  try { McpBridge.getInstance().sendLog('error', args); } catch (e) {}
};

// Initialize the global OS Kernel
async function initializeKernel() {
  console.log('[Kernel] Discovering Node Plugins...');
  await FlowPilotRegistry.discoverPlugins();
  
  const router = new MessageRouter();
  router.init();

  // Start MCP Bridge (connects to MCP server if running)
  const mcpBridge = McpBridge.getInstance();
  mcpBridge.start();
  
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

// Keep-alive port listener to prevent service worker termination
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'flowpilot-keepalive') {
    console.log('[Kernel] Keepalive port connected');
    port.onDisconnect.addListener(() => {
      console.log('[Kernel] Keepalive port disconnected');
    });
  }
});

// Chrome.alarms keepalive — most reliable layer for service worker survival.
// Unlike WebSocket heartbeats, Chrome officially recognizes alarm events as
// activity that resets the 30-second service worker termination timer.
// Works even when the Sidepanel is closed.
chrome.alarms.create('flowpilot-keepalive', { periodInMinutes: 0.45 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'flowpilot-keepalive') {
    const bridge = McpBridge.getInstance();
    if (!bridge.isConnected()) {
      bridge.start();
    }
  }
});
