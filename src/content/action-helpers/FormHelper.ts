import type { ExtResponse } from '$shared/api/messenger';

/**
 * Specialist logic for Form interactions.
 */
export class FormHelper {
  static async check(el: HTMLElement, checked = true): Promise<ExtResponse> {
    try {
      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
        if (el.checked !== checked) {
          el.click();
        }
        return { success: true };
      }
      return { success: false, error: { code: 'NOT_CHECKABLE', message: 'Element is not a checkbox or radio button' } };
    } catch (e: any) {
      return { success: false, error: { code: 'CHECK_FAILED', message: e.message } };
    }
  }

  static async select(el: HTMLElement, value: string): Promise<ExtResponse> {
    try {
      if (el instanceof HTMLSelectElement) {
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true };
      }
      return { success: false, error: { code: 'NOT_SELECTABLE', message: 'Element is not a select element' } };
    } catch (e: any) {
      return { success: false, error: { code: 'SELECT_FAILED', message: e.message } };
    }
  }

  static async submit(el: HTMLElement): Promise<ExtResponse> {
    try {
      if (el instanceof HTMLFormElement) {
        el.submit();
        return { success: true };
      }
      const form = el.closest('form');
      if (form) {
        form.submit();
        return { success: true };
      }
      return { success: false, error: { code: 'NO_FORM_FOUND', message: 'Element is not part of a form' } };
    } catch (e: any) {
      return { success: false, error: { code: 'SUBMIT_FAILED', message: e.message } };
    }
  }

  static async reset(el: HTMLElement): Promise<ExtResponse> {
    try {
      const form = el instanceof HTMLFormElement ? el : el.closest('form');
      if (form) {
        form.reset();
        return { success: true };
      }
      return { success: false, error: { code: 'NO_FORM_FOUND', message: 'Element is not part of a form' } };
    } catch (e: any) {
      return { success: false, error: { code: 'RESET_FAILED', message: e.message } };
    }
  }
}
