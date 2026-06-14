import type { ExtResponse } from '$shared/api/messenger';

/**
 * Specialist logic for Mouse and Pointer interactions.
 */
export class MouseHelper {
  static async click(el: HTMLElement): Promise<ExtResponse> {
    try {
      el.click();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'CLICK_FAILED', message: e.message } };
    }
  }

  static async dblclick(el: HTMLElement): Promise<ExtResponse> {
    try {
      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'DBLCLICK_FAILED', message: e.message } };
    }
  }

  static async rightClick(el: HTMLElement): Promise<ExtResponse> {
    try {
      el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, view: window }));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'RIGHTCLICK_FAILED', message: e.message } };
    }
  }

  static async hover(el: HTMLElement): Promise<ExtResponse> {
    try {
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      
      // Elite visual cue: Temporary highlight
      const originalOutline = el.style.outline;
      el.style.outline = '2px dashed var(--accent, #3b82f6)';
      setTimeout(() => el.style.outline = originalOutline, 1000);
      
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'HOVER_FAILED', message: e.message } };
    }
  }

  static async mousedown(el: HTMLElement): Promise<ExtResponse> {
    try {
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'MOUSEDOWN_FAILED', message: e.message } };
    }
  }

  static async mouseup(el: HTMLElement): Promise<ExtResponse> {
    try {
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'MOUSEUP_FAILED', message: e.message } };
    }
  }

  static async mousemove(el: HTMLElement): Promise<ExtResponse> {
    try {
      el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'MOUSEMOVE_FAILED', message: e.message } };
    }
  }

  static async contextmenu(el: HTMLElement): Promise<ExtResponse> {
    return this.rightClick(el);
  }
}
