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

  static async paste(el: HTMLElement, value?: string): Promise<ExtResponse> {
    try {
      el.focus();
      
      const dt = new DataTransfer();
      if (value) {
        if (value.startsWith('file:')) {
          const parts = value.split(':');
          const name = parts[1] || 'file.png';
          const mime = parts[2] || 'image/png';
          const b64 = parts.slice(3).join(':') || '';
          
          let blob: Blob;
          if (b64) {
            const byteCharacters = atob(b64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            blob = new Blob([new Uint8Array(byteNumbers)], { type: mime });
          } else {
            blob = new Blob(['dummy content'], { type: mime });
          }
          dt.items.add(new File([blob], name, { type: mime }));
        } else {
          dt.setData('text/plain', value);
        }
      } else {
        dt.setData('text/plain', '');
      }

      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt
      } as any);

      el.dispatchEvent(pasteEvent);
      
      if (value && !value.startsWith('file:')) {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          const start = el.selectionStart || 0;
          const end = el.selectionEnd || 0;
          const val = el.value;
          el.value = val.substring(0, start) + value + val.substring(end);
          el.selectionStart = el.selectionEnd = start + value.length;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (el.contentEditable === 'true') {
          try {
            document.execCommand('insertText', false, value);
          } catch (e) {}
        }
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: { code: 'PASTE_FAILED', message: e.message } };
    }
  }
}
