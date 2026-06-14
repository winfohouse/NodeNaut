import { FieldType, type ScannedField } from '../../shared/types/scanner';
import { SelectorBuilder } from '../../shared/utils/selectors';

export class SmartScanner {
  /**
   * Scans a specific branch or the entire document for interactable fields.
   */
  static scan(root: Document | ShadowRoot | HTMLElement = document): ScannedField[] {
    const fields: ScannedField[] = [];
    
    // If root is a single interactive element itself, analyze it first
    if (root instanceof HTMLElement && this.isInteractive(root) && this.isVisible(root)) {
      const field = this.analyzeElement(root, document);
      if (field) fields.push(field);
    }

    // 1. Find all interactable children within the root
    const elements = root.querySelectorAll('input, textarea, select, button, [role="button"], [role="checkbox"], [role="textbox"], a.btn, a.button');

    elements.forEach((el) => {
      const element = el as HTMLElement;
      if (!this.isVisible(element)) return;

      // Use document as global context for label finding if root is element
      const context = (root instanceof HTMLElement) ? (root.ownerDocument || document) : root;
      const field = this.analyzeElement(element, context as any);
      if (field) {
        fields.push(field);
      }

      if (element.shadowRoot) {
        fields.push(...this.scan(element.shadowRoot));
      }
    });

    // 2. Deep Shadow DOM traversal for non-standard containers
    if (!(root instanceof HTMLElement && this.isInteractive(root))) {
      const all = root.querySelectorAll('*');
      all.forEach((el) => {
        const element = el as HTMLElement;
        if (element.shadowRoot) {
          fields.push(...this.scan(element.shadowRoot));
        }
      });
    }

    // 3. Iframe Traversal (New: Deep Scan)
    const iframes = root.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      try {
        const frameEl = iframe as HTMLIFrameElement;
        if (frameEl.contentDocument) {
          fields.push(...this.scan(frameEl.contentDocument));
        }
      } catch (e) {
        // Cross-origin restriction
      }
    });

    return fields;
  }

  private static isInteractive(el: HTMLElement): boolean {
    const tagName = el.tagName;
    const role = el.getAttribute('role');
    const interactiveTags = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'];
    const interactiveRoles = ['button', 'checkbox', 'textbox', 'link'];
    
    return interactiveTags.includes(tagName) || (role !== null && interactiveRoles.includes(role));
  }

  private static analyzeElement(el: HTMLElement, root: Document | ShadowRoot): ScannedField | null {
    const tagName = el.tagName;
    const role = el.getAttribute('role');
    let type = FieldType.UNKNOWN;
    
    if (tagName === 'INPUT') {
      const input = el as HTMLInputElement;
      switch (input.type) {
        case 'password': type = FieldType.PASSWORD; break;
        case 'email': type = FieldType.EMAIL; break;
        case 'number': type = FieldType.NUMBER; break;
        case 'date': type = FieldType.DATE; break;
        case 'checkbox': type = FieldType.CHECKBOX; break;
        case 'radio': type = FieldType.RADIO; break;
        case 'submit': type = FieldType.SUBMIT; break;
        case 'button': type = FieldType.BUTTON; break;
        default: type = FieldType.TEXT;
      }
    } else if (tagName === 'TEXTAREA' || role === 'textbox') {
      type = FieldType.TEXTAREA;
    } else if (tagName === 'SELECT') {
      type = FieldType.SELECT;
    } else if (tagName === 'BUTTON' || role === 'button' || tagName === 'A') {
      type = FieldType.BUTTON;
      // Check if it's a submit-like button based on text
      const text = el.textContent?.trim().toLowerCase() || '';
      const submitWords = ['submit', 'continue', 'next', 'proceed', 'save', 'apply', 'finish'];
      if (submitWords.some(word => text.includes(word))) {
        type = FieldType.SUBMIT;
      }
    } else if (role === 'checkbox') {
      type = FieldType.CHECKBOX;
    }

    const label = this.findLabel(el, root);
    const selectors = SelectorBuilder.build(el);

    if (selectors.length === 0) return null;

    return {
      id: crypto.randomUUID(),
      label: label || selectors[0].selector,
      type,
      tagName,
      placeholder: el.getAttribute('placeholder') || undefined,
      isRequired: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
      isVisible: true,
      selectors,
      metadata: {
        name: el.getAttribute('name') || undefined,
        ariaLabel: el.getAttribute('aria-label') || undefined,
        options: this.getOptions(el),
        isWorkflowOpportunity: type === FieldType.SUBMIT
      }
    };
  }

  private static findLabel(el: HTMLElement, root: Document | ShadowRoot): string | null {
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    if (el.id) {
      const labelEl = root.querySelector(`label[for="${el.id}"]`);
      if (labelEl) return labelEl.textContent?.trim() || null;
    }

    const parentLabel = el.closest('label');
    if (parentLabel) return parentLabel.textContent?.trim() || null;

    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return placeholder;

    const name = el.getAttribute('name');
    if (name) return name;

    if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button') {
      const text = el.textContent?.trim();
      if (text && text.length < 50) return text;
    }

    return null;
  }

  private static getOptions(el: HTMLElement): { label: string, value: string }[] | undefined {
    if (el.tagName !== 'SELECT') return undefined;
    const select = el as HTMLSelectElement;
    return Array.from(select.options).map(opt => ({
      label: opt.text,
      value: opt.value
    }));
  }

  private static isVisible(el: HTMLElement): boolean {
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
