import { db } from '$shared/services/db';
import { MessageRouter } from './core/MessageRouter';

const router = new MessageRouter();
router.init();

console.log('FlowPilot Service Worker initialized');

chrome.runtime.onInstalled.addListener(() => {
  console.log('FlowPilot Extension installed');
});

// @ts-ignore
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
