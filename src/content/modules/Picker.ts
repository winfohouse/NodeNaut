import { MessageType } from '../../shared/constants/messages';
import { SelectorBuilder } from '../../shared/utils/selectors';
import { SmartScanner } from './Scanner';

export class ElementPicker {
  private static overlay: HTMLDivElement | null = null;
  private static currentElement: HTMLElement | null = null;
  private static isActive = false;
  private static options: { source?: 'standalone' | 'node' } = {};
  private static activeMenu: HTMLDivElement | null = null;

  static start(options: { source?: 'standalone' | 'node' } = {}) {
    // 1. Strict Singleton: Remove any existing artifacts
    this.stop();
    
    this.isActive = true;
    this.options = options;
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

    if (this.activeMenu) {
      this.activeMenu.remove();
      this.activeMenu = null;
    }
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

  private static getElementFromPoint(clientX: number, clientY: number): HTMLElement | null {
    let el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    while (el && el.shadowRoot) {
      const innerEl = el.shadowRoot.elementFromPoint(clientX, clientY) as HTMLElement | null;
      if (!innerEl || innerEl === el) break;
      el = innerEl;
    }
    return el;
  }

  private static onMouseMove = (e: MouseEvent) => {
    if (!this.isActive) return;
    if (this.activeMenu && this.activeMenu.contains(e.target as Node)) return;

    const el = this.getElementFromPoint(e.clientX, e.clientY);
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

  private static findAssociatedFileInput(el: HTMLElement): HTMLInputElement | null {
    const label = el.closest('label');
    if (label) {
      if (label.htmlFor) {
        const input = document.getElementById(label.htmlFor);
        if (input instanceof HTMLInputElement && input.type === 'file') return input;
      }
      const nestedInput = label.querySelector('input[type="file"]');
      if (nestedInput instanceof HTMLInputElement) return nestedInput;
    }

    const container = el.parentElement;
    if (container) {
      const siblingInput = container.querySelector('input[type="file"]');
      if (siblingInput instanceof HTMLInputElement) return siblingInput;
    }

    return null;
  }

  private static onClick = (e: MouseEvent) => {
    if (!this.isActive) return;

    // Prevent interactions outside of our custom context menu
    if (this.activeMenu && this.activeMenu.contains(e.target as Node)) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    let el = this.getElementFromPoint(e.clientX, e.clientY) || this.currentElement;
    if (el) {
      const fileInput = this.findAssociatedFileInput(el);
      if (fileInput) {
        el = fileInput;
      }
      
      // Collect elements list for the user selection options
      const elements: { type: 'exact' | 'parent' | 'child'; element: HTMLElement; label: string; desc: string }[] = [];
      
      elements.push({
        type: 'exact',
        element: el,
        label: el.tagName,
        desc: this.getElementDescription(el)
      });

      let parent = el.parentElement;
      let parentCount = 0;
      while (parent && parent.tagName !== 'BODY' && parent.tagName !== 'HTML' && parentCount < 4) {
        elements.push({
          type: 'parent',
          element: parent,
          label: parent.tagName,
          desc: this.getElementDescription(parent)
        });
        parent = parent.parentElement;
        parentCount++;
      }

      const children = el.querySelectorAll('input, button, a, select, textarea');
      let childCount = 0;
      for (const child of children) {
        if (child !== el && childCount < 4) {
          elements.push({
            type: 'child',
            element: child as HTMLElement,
            label: child.tagName,
            desc: this.getElementDescription(child as HTMLElement)
          });
          childCount++;
        }
      }

      this.showOptionMenu(e, elements);
    }
  };

  private static getElementDescription(el: HTMLElement): string {
    const id = el.id ? `#${el.id}` : '';
    const classes = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
    const text = el.innerText?.slice(0, 20).trim() || el.getAttribute('placeholder') || '';
    const textSnippet = text ? ` "${text}"` : '';
    return `${id}${classes}${textSnippet}`;
  }

  private static showOptionMenu(e: MouseEvent, elements: any[]) {
    if (this.activeMenu) this.activeMenu.remove();

    const menu = document.createElement('div');
    menu.id = 'fp-picker-menu';
    this.activeMenu = menu;

    Object.assign(menu.style, {
      position: 'absolute',
      top: `${e.clientY + window.scrollY + 10}px`,
      left: `${e.clientX + window.scrollX + 10}px`
    });

    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${e.clientX + window.scrollX - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${e.clientY + window.scrollY - rect.height - 10}px`;
    }

    const exact = elements.filter(item => item.type === 'exact');
    if (exact.length > 0) {
      const title = document.createElement('div');
      title.className = 'fp-menu-section-title';
      title.innerText = 'Exact Element';
      menu.appendChild(title);
      exact.forEach(item => menu.appendChild(this.createMenuButton(item)));
    }

    const parents = elements.filter(item => item.type === 'parent');
    if (parents.length > 0) {
      const title = document.createElement('div');
      title.className = 'fp-menu-section-title';
      title.innerText = 'Parent Elements';
      menu.appendChild(title);
      parents.forEach(item => menu.appendChild(this.createMenuButton(item)));
    }

    const children = elements.filter(item => item.type === 'child');
    if (children.length > 0) {
      const title = document.createElement('div');
      title.className = 'fp-menu-section-title';
      title.innerText = 'Child Elements';
      menu.appendChild(title);
      children.forEach(item => menu.appendChild(this.createMenuButton(item)));
    }
  }

  private static createMenuButton(item: any): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'fp-menu-item';
    
    const tag = document.createElement('span');
    tag.className = 'fp-menu-item-tag';
    tag.innerText = item.label;
    
    const desc = document.createElement('span');
    desc.innerText = item.desc;
    desc.style.fontSize = '0.65rem';
    desc.style.color = '#64748b';
    
    btn.appendChild(tag);
    btn.appendChild(desc);

    btn.addEventListener('mouseenter', () => {
      const rect = item.element.getBoundingClientRect();
      if (this.overlay) {
        this.overlay.style.display = 'block';
        this.overlay.style.top = `${rect.top}px`;
        this.overlay.style.left = `${rect.left}px`;
        this.overlay.style.width = `${rect.width}px`;
        this.overlay.style.height = `${rect.height}px`;
      }
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.chooseElement(item.element);
    });

    return btn;
  }

  private static chooseElement(el: HTMLElement) {
    if (this.options.source !== 'standalone') {
      this.scanAndSend(el);
      if (this.activeMenu) this.activeMenu.remove();
      this.activeMenu = null;
      return;
    }

    if (!this.activeMenu) return;
    this.activeMenu.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'fp-menu-section-title';
    title.innerText = 'Choose Action/Tool';
    this.activeMenu.appendChild(title);

    const actions = [
      { type: 'CLICK', label: 'Click Element', desc: 'Simulate click interaction' },
      { type: 'TYPE', label: 'Type Text / Value', desc: 'Simulate input typing / form fill' },
      { type: 'hover', label: 'Hover Over', desc: 'Simulate mouse enter / hover state' },
      { type: 'scroll-into-view', label: 'Scroll Into View', desc: 'Scroll viewport to element' },
      { type: 'extract-text', label: 'Extract Text', desc: 'Read and save element inner text' },
      { type: 'assert-visible', label: 'Assert Visible', desc: 'Wait and verify element is visible' },
      { type: 'paste', label: 'Paste Clipboard', desc: 'Simulate clipboard text or file paste' }
    ];

    actions.forEach(act => {
      const btn = document.createElement('button');
      btn.className = 'fp-menu-item';
      
      const label = document.createElement('span');
      label.className = 'fp-menu-item-tag';
      label.innerText = act.label;
      
      const desc = document.createElement('span');
      desc.style.fontSize = '0.65rem';
      desc.style.color = '#64748b';
      desc.innerText = act.desc;
      
      btn.appendChild(label);
      btn.appendChild(desc);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.scanAndSend(el, act.type);
        if (this.activeMenu) this.activeMenu.remove();
        this.activeMenu = null;
      });

      this.activeMenu?.appendChild(btn);
    });
  }

  private static onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.stop();
    }
  };

  private static async scanAndSend(el: HTMLElement, customType?: string) {
    const spec = SelectorBuilder.getSpec(el);
    
    // If the user selected an element from the menu, or is updating a single node config,
    // we bypass scanning and target that exact element.
    const forceExact = customType || this.options.source !== 'standalone';
    let fields: any[] = [];
    
    if (!forceExact) {
      fields = SmartScanner.scan(el);
    }

    if (fields.length === 0) {
      const candidates = SelectorBuilder.build(el);
      
      const isInput = 
        el instanceof HTMLInputElement || 
        el instanceof HTMLTextAreaElement || 
        el instanceof HTMLSelectElement ||
        el.contentEditable === 'true';

      const isActuallyInput = isInput && 
        (!(el instanceof HTMLInputElement) || !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image'].includes(el.type));

      let label = el.innerText?.slice(0, 30).trim() || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.id || el.tagName;
      
      fields = [{
        label: label,
        type: customType || (isActuallyInput ? 'TYPE' : 'CLICK'),
        selectors: candidates,
        placeholder: el.getAttribute('placeholder') || '',
        metadata: { spec }
      }];
    } else {
      fields = fields.map(f => ({ ...f, metadata: { ...f.metadata, spec } }));
    }

    chrome.runtime.sendMessage({
      type: MessageType.PICKER_SELECT,
      payload: {
        fields,
        isBatch: !forceExact && fields.length > 1
      }
    });

    this.stop();
  }
}

if (!document.getElementById('nodenaut-styles')) {
  const style = document.createElement('style');
  style.id = 'nodenaut-styles';
  style.textContent = `
    @keyframes fp-fade-in {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    #fp-picker-menu {
      position: fixed;
      z-index: 1000001;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
      width: 280px;
      max-height: 400px;
      overflow-y: auto;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      color: #f8fafc;
      animation: fp-fade-in 0.15s ease-out;
    }
    .fp-menu-section-title {
      font-size: 0.65rem;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 0.4rem;
      margin-bottom: 0.15rem;
      padding-left: 0.5rem;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 0.15rem;
    }
    .fp-menu-section-title:first-child {
      margin-top: 0.15rem;
    }
    .fp-menu-item {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      background: transparent;
      border: none;
      text-align: left;
      padding: 0.45rem 0.6rem;
      border-radius: 8px;
      cursor: pointer;
      width: 100%;
      color: #e2e8f0;
      transition: all 0.15s ease;
    }
    .fp-menu-item:hover {
      background: #1e293b;
      color: #3b82f6;
    }
    .fp-menu-item-tag {
      font-size: 0.75rem;
      font-weight: 700;
    }
  `;
  document.head.appendChild(style);
}
