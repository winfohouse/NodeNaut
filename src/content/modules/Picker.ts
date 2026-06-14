import { MessageType } from '../../shared/constants/messages';
import { SelectorBuilder } from '../../shared/utils/selectors';
import { SmartScanner } from './Scanner';

export class ElementPicker {
  private static overlay: HTMLDivElement | null = null;
  private static currentElement: HTMLElement | null = null;
  private static isActive = false;

  static start() {
    // 1. Strict Singleton: Remove any existing artifacts
    this.stop();
    
    this.isActive = true;
    this.createOverlay();
    document.addEventListener('mousemove', this.onMouseMove, true);
    document.addEventListener('click', this.onClick, true);
    document.addEventListener('keydown', this.onKeyDown, true);
  }

  static stop() {
    this.isActive = false;
    this.removeOverlay();
    document.removeEventListener('mousemove', this.onMouseMove, true);
    document.removeEventListener('click', this.onClick, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    
    // Explicitly check DOM for any leaked overlays
    const existing = document.getElementById('fp-picker-overlay');
    if (existing) existing.remove();
  }

  private static createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'fp-picker-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '1000000',
      border: '2px solid #3b82f6',
      background: 'rgba(59, 130, 246, 0.1)',
      borderRadius: '4px',
      transition: 'all 0.1s ease-out',
      display: 'none'
    });
    document.body.appendChild(this.overlay);
  }

  private static removeOverlay() {
    this.overlay?.remove();
    this.overlay = null;
  }

  private static onMouseMove = (e: MouseEvent) => {
    if (!this.isActive) return;

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    if (!el || el === this.overlay) return;

    this.currentElement = el;
    const rect = el.getBoundingClientRect();

    if (this.overlay) {
      this.overlay.style.display = 'block';
      this.overlay.style.top = `${rect.top}px`;
      this.overlay.style.left = `${rect.left}px`;
      this.overlay.style.width = `${rect.width}px`;
      this.overlay.style.height = `${rect.height}px`;
    }
  };

  private static onClick = (e: MouseEvent) => {
    if (!this.isActive) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (this.currentElement) {
      this.scanAndSend(this.currentElement);
    }
  };

  private static onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.stop();
    }
  };

  private static async scanAndSend(el: HTMLElement) {
    const spec = SelectorBuilder.getSpec(el);
    
    // Perform localized scan on the picked element and its children
    let fields = SmartScanner.scan(el);

    // If SmartScanner found nothing natively (e.g., clicked a random div), force it to be an actionable field
    if (fields.length === 0) {
      const candidates = SelectorBuilder.build(el);
      
      const isInput = 
        el instanceof HTMLInputElement || 
        el instanceof HTMLTextAreaElement || 
        el instanceof HTMLSelectElement ||
        el.contentEditable === 'true';

      // Specific check for non-input types that should definitely be CLICK
      const isActuallyInput = isInput && 
        (!(el instanceof HTMLInputElement) || !['button', 'submit', 'reset', 'checkbox', 'radio', 'file'].includes(el.type));

      let label = el.innerText?.slice(0, 30).trim() || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.id || el.tagName;
      
      fields = [{
        label: label,
        type: isActuallyInput ? 'TYPE' : 'CLICK',
        selectors: candidates,
        placeholder: el.getAttribute('placeholder') || '',
        metadata: { spec }
      }];
    } else {
      // Add spec to scanned fields too
      fields = fields.map(f => ({ ...f, metadata: { ...f.metadata, spec } }));
    }

    // ALWAYS use the batch pathway so the user sees the Scan Overlay menu
    chrome.runtime.sendMessage({
      type: MessageType.PICKER_SELECT,
      payload: {
        fields,
        isBatch: true
      }
    });

    this.stop();
  }

  private static removeHUD() {
    // This is now legacy but keeping for structure
  }
}

// Add fade-in animation to document
if (!document.getElementById('flowpilot-styles')) {
  const style = document.createElement('style');
  style.id = 'flowpilot-styles';
  style.textContent = `
    @keyframes fp-fade-in {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}
