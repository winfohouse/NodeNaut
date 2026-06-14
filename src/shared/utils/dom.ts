/**
 * Elite DOM Utilities for Manifest V3 Extensions
 */
export class DOMUtils {
  /**
   * Finds an element anywhere in the DOM, including across Shadow DOM boundaries.
   */
  static querySelectorDeep(selector: string, root: Document | ShadowRoot = document): HTMLElement | null {
    // 1. Try standard query selector first
    const el = root.querySelector(selector) as HTMLElement;
    if (el) return el;

    // 2. If not found, traverse all shadow roots recursively
    const all = root.querySelectorAll('*');
    for (const item of Array.from(all)) {
      if (item.shadowRoot) {
        const found = this.querySelectorDeep(selector, item.shadowRoot);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Finds all elements matching a selector across Shadow DOM boundaries.
   */
  static querySelectorAllDeep(selector: string, root: Document | ShadowRoot = document): HTMLElement[] {
    let results: HTMLElement[] = Array.from(root.querySelectorAll(selector));

    const all = root.querySelectorAll('*');
    for (const item of Array.from(all)) {
      if (item.shadowRoot) {
        results = [...results, ...this.querySelectorAllDeep(selector, item.shadowRoot)];
      }
    }

    return results;
  }

  /**
   * Checks if an element is visible to the user.
   */
  static isVisible(el: HTMLElement): boolean {
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      el.offsetWidth > 0 &&
      el.offsetHeight > 0
    );
  }
}
