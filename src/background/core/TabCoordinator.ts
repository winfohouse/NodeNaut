export interface TabInfo {
  tabId: number;
  purpose: 'PRIMARY' | 'HELPER' | 'VERIFICATION' | 'AUTH';
  url?: string;
  isFocused: boolean;
}

export class TabCoordinator {
  private static instance: TabCoordinator;
  private activeTabs: Map<number, TabInfo> = new Map();
  private primaryTabId: number | null = null;

  private constructor() {
    this.setupListeners();
  }

  static getInstance(): TabCoordinator {
    if (!TabCoordinator.instance) {
      TabCoordinator.instance = new TabCoordinator();
    }
    return TabCoordinator.instance;
  }

  private setupListeners() {
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.activeTabs.delete(tabId);
      if (this.primaryTabId === tabId) this.primaryTabId = null;
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (this.activeTabs.has(tabId)) {
        const info = this.activeTabs.get(tabId)!;
        info.url = tab.url;
        this.activeTabs.set(tabId, info);
      }
    });

    // Detect new popups
    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.id && this.primaryTabId) {
        // If a workflow is running, assume new tabs might be helper tabs
        this.registerTab(tab.id, 'HELPER', tab.url);
      }
    });
  }

  registerTab(tabId: number, purpose: TabInfo['purpose'], url?: string) {
    this.activeTabs.set(tabId, {
      tabId,
      purpose,
      url,
      isFocused: false
    });

    if (purpose === 'PRIMARY') {
      this.primaryTabId = tabId;
    }
  }

  async switchTab(purpose: TabInfo['purpose']): Promise<number | null> {
    const target = Array.from(this.activeTabs.values()).find(t => t.purpose === purpose);
    if (target?.tabId) {
      await chrome.tabs.update(target.tabId, { active: true });
      return target.tabId;
    }
    return null;
  }

  getPrimaryTabId(): number | null {
    return this.primaryTabId;
  }

  getActiveTabs(): TabInfo[] {
    return Array.from(this.activeTabs.values());
  }

  clear() {
    this.activeTabs.clear();
    this.primaryTabId = null;
  }
}
