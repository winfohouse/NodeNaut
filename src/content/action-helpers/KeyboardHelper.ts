import type { ExtResponse } from '$shared/api/messenger';

/**
 * Specialist logic for Keyboard simulation.
 */
export class KeyboardHelper {
  static async type(el: HTMLElement, value: any): Promise<ExtResponse> {
    try {
      if (el instanceof HTMLSelectElement) {
        el.focus();
        let found = false;
        for (let i = 0; i < el.options.length; i++) {
          if (el.options[i].value === value) {
            el.selectedIndex = i;
            found = true;
            break;
          }
        }
        if (!found) {
          for (let i = 0; i < el.options.length; i++) {
            if (el.options[i].text.trim().toLowerCase() === String(value).trim().toLowerCase()) {
              el.selectedIndex = i;
              found = true;
              break;
            }
          }
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
        return { success: true };
      }

      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el.contentEditable === 'true') {
        el.focus();
        
        // 1. Checkbox & Radio automation via type/fill
        if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
          const checkVal = value === 'true' || value === 'on' || value === 'checked' || value === '1';
          if (el.checked !== checkVal) {
            el.click();
          }
          return { success: true };
        }

        // 2. File input automation via programmatically creating File objects
        if (el instanceof HTMLInputElement && el.type === 'file') {
          try {
            const dt = new DataTransfer();
            let file: File;
            
            if (value instanceof File) {
              file = value;
            } else if (typeof value === 'string' && value.startsWith('file:')) {
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
                blob = new Blob([''], { type: mime });
              }
              file = new File([blob], name, { type: mime });
            } else {
              file = new File(["dummy content"], (typeof value === 'string' ? value : '') || "file.txt", { type: "text/plain" });
            }
            
            dt.items.add(file);
            el.files = dt.files;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true };
          } catch (fileErr: any) {
            return { success: false, error: { code: 'FILE_INJECTION_FAILED', message: fileErr.message } };
          }
        }

        // 3. Default text-based, range, date, time, url, etc. inputs
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
