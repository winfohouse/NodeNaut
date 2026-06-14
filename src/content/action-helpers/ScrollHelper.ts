import type { ExtResponse } from '$shared/api/messenger';

/**
 * Specialist logic for Scroll and Viewport management.
 */
export class ScrollHelper {
  static async scrollIntoView(el: HTMLElement): Promise<ExtResponse> {
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'SCROLL_FAILED', message: e.message } };
    }
  }

  static async scrollTo(el: HTMLElement, payload: { x?: number, y?: number }): Promise<ExtResponse> {
    try {
      el.scrollTo({ 
        top: payload.y ?? 0, 
        left: payload.x ?? 0, 
        behavior: 'smooth' 
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'SCROLL_TO_FAILED', message: e.message } };
    }
  }

  static async scrollBy(el: HTMLElement, payload: { top?: number, left?: number }): Promise<ExtResponse> {
    try {
      el.scrollBy({ 
        top: payload.top ?? 0, 
        left: payload.left ?? 0, 
        behavior: 'smooth' 
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'SCROLL_BY_FAILED', message: e.message } };
    }
  }
}
