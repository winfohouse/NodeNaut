import type { ExtResponse } from '$shared/api/messenger';

/**
 * Specialist logic for DOM State Extraction and Assertions.
 */
export class StateHelper {
  static async extract(el: HTMLElement, type: 'TEXT' | 'HTML' | 'ATTR', attrName?: string): Promise<ExtResponse> {
    try {
      let value: any;
      if (type === 'TEXT') value = el.innerText;
      else if (type === 'HTML') value = el.innerHTML;
      else if (type === 'ATTR' && attrName) value = el.getAttribute(attrName);
      
      return { success: true, data: value };
    } catch (e: any) {
      return { success: false, error: { code: 'EXTRACT_FAILED', message: e.message } };
    }
  }

  static async assert(el: HTMLElement, condition: 'VISIBLE' | 'HIDDEN' | 'CONTAINS_TEXT', expectedValue?: string): Promise<ExtResponse> {
    try {
      let success = false;
      const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;

      if (condition === 'VISIBLE') success = isVisible;
      else if (condition === 'HIDDEN') success = !isVisible;
      else if (condition === 'CONTAINS_TEXT' && expectedValue) {
        success = el.innerText.includes(expectedValue);
      }
      
      return { success };
    } catch (e: any) {
      return { success: false, error: { code: 'ASSERT_FAILED', message: e.message } };
    }
  }

  static async focus(el: HTMLElement): Promise<ExtResponse> {
    try {
      el.focus();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'FOCUS_FAILED', message: e.message } };
    }
  }

  static async blur(el: HTMLElement): Promise<ExtResponse> {
    try {
      el.blur();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'BLUR_FAILED', message: e.message } };
    }
  }

  static async copy(el: HTMLElement): Promise<ExtResponse> {
    try {
      el.focus();
      document.execCommand('copy');
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'COPY_FAILED', message: e.message } };
    }
  }

  static async cut(el: HTMLElement): Promise<ExtResponse> {
    try {
      el.focus();
      document.execCommand('cut');
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'CUT_FAILED', message: e.message } };
    }
  }

  static async paste(el: HTMLElement): Promise<ExtResponse> {
    try {
      el.focus();
      document.execCommand('paste');
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'PASTE_FAILED', message: e.message } };
    }
  }
}
