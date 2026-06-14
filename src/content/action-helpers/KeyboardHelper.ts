import type { ExtResponse } from '$shared/api/messenger';

/**
 * Specialist logic for Keyboard simulation.
 */
export class KeyboardHelper {
  static async type(el: HTMLElement, value: string): Promise<ExtResponse> {
    try {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el.contentEditable === 'true') {
        el.focus();
        
        if ('value' in el) {
          (el as any).value = value;
        } else {
          el.innerText = value;
        }

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
        return { success: true };
      }
      return { success: false, error: { code: 'NOT_TYPEABLE', message: 'Element is not an input or contenteditable' } };
    } catch (e: any) {
      return { success: false, error: { code: 'TYPE_FAILED', message: e.message } };
    }
  }

  static async pressKey(el: HTMLElement, key: string): Promise<ExtResponse> {
    try {
      el.focus();
      const options = { key, bubbles: true, cancelable: true };
      el.dispatchEvent(new KeyboardEvent('keydown', options));
      el.dispatchEvent(new KeyboardEvent('keypress', options));
      el.dispatchEvent(new KeyboardEvent('keyup', options));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'KEYPRESS_FAILED', message: e.message } };
    }
  }

  static async keydown(el: HTMLElement, key: string): Promise<ExtResponse> {
    try {
      el.focus();
      el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'KEYDOWN_FAILED', message: e.message } };
    }
  }

  static async keyup(el: HTMLElement, key: string): Promise<ExtResponse> {
    try {
      el.focus();
      el.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'KEYUP_FAILED', message: e.message } };
    }
  }
}
