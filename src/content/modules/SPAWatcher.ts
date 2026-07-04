import { Messenger } from '$shared/api/messenger';

export class SPAWatcher {
  private static lastUrl: string = '';

  static init() {
    // We need to inject this into the "Main World" to catch pushState/replaceState
    // because they are not detectable from the Isolated World (Content Script).
    // Using src-based injection is more CSP-compliant than textContent when extension origin is allowed.
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('spa-bridge.js');
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => script.remove();

    window.addEventListener('nodenaut-navigation', () => {
      this.handleNavigation();
    });

    this.lastUrl = window.location.href;
  }

  private static async handleNavigation() {
    if (window.location.href === this.lastUrl) return;
    this.lastUrl = window.location.href;

    console.log('SPA Navigation detected:', this.lastUrl);
    
    // Notify Background script that a virtual navigation occurred
    await Messenger.send('SPA_NAVIGATED' as any, {
      url: this.lastUrl,
      timestamp: Date.now()
    });
  }

  /**
   * Waits for DOM mutations to settle (idle detection)
   */
  static async waitForStability(timeout = 1500): Promise<void> {
    return new Promise((resolve) => {
      let idleTimer: any;
      const observer = new MutationObserver(() => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          observer.disconnect();
          resolve();
        }, 150); // 150ms of silence = stable
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });

      // Absolute timeout
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeout);
    });
  }
}
