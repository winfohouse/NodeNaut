import { Messenger } from '$shared/api/messenger';
import { MessageType } from '$shared/constants/messages';

export interface HUDState {
  message: string;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'ERROR' | 'SUCCESS';
  progress: number; // 0 to 100
  details?: string;
  error?: string;
  currentStep?: number;
  totalSteps?: number;
  currentRow?: number;
  totalRows?: number;
  sessionId?: string;
}

export class FloatingHUD {
  private static container: HTMLDivElement | null = null;
  private static statusElement: HTMLDivElement | null = null;
  private static toastStack: HTMLDivElement | null = null;
  private static isExpanded = false;
  private static currentState: HUDState = { message: 'Ready', status: 'IDLE', progress: 0 };
  private static autoCloseTimeout: any = null;

  static init() {
    // 1. Strict Singleton: Remove any existing HUD from previous injections
    const existing = document.getElementById('fp-hud-container');
    if (existing) existing.remove();

    this.container = document.createElement('div');
    this.container.id = 'fp-hud-container';
    this.container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column-reverse;
      gap: 12px;
      z-index: 2147483647;
      pointer-events: none;
      font-family: 'Inter', system-ui, sans-serif;
    `;
    document.body.appendChild(this.container);

    this.statusElement = document.createElement('div');
    this.statusElement.id = 'fp-status-row';
    this.statusElement.className = 'fp-hud-panel';
    this.container.appendChild(this.statusElement);

    this.statusElement.addEventListener('mouseenter', () => this.setExpanded(true));
    this.statusElement.addEventListener('mouseleave', () => this.setExpanded(false));

    // Event Delegation for buttons
    this.statusElement.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const target = e.target as HTMLElement;
      const btn = target.closest('button'); 
      if (!btn) return;

      const id = btn.id;
      if (id === 'fp-pause') {
        Messenger.send(MessageType.WORKFLOW_PAUSE, { sessionId: this.currentState.sessionId });
      } else if (id === 'fp-resume') {
        Messenger.send(MessageType.WORKFLOW_RESUME, { sessionId: this.currentState.sessionId });
      } else if (id === 'fp-step') {
        Messenger.send(MessageType.WORKFLOW_STEP, { sessionId: this.currentState.sessionId });
      } else if (id === 'fp-stop') {
        Messenger.send(MessageType.WORKFLOW_STOP, { sessionId: this.currentState.sessionId });
      } else if (id === 'fp-cancel-picker') {
        Messenger.send(MessageType.PICKER_STOP, {});
      } else if (id === 'fp-close') {
        this.update({ status: 'IDLE', message: 'Ready', progress: 0, details: '', error: '' });
      }
    }, true); 

    this.toastStack = document.createElement('div');
    this.toastStack.id = 'fp-toast-stack';
    this.container.appendChild(this.toastStack);

    this.injectStyles();
    this.render();
  }

  static update(state: Partial<HUDState>) {
    this.currentState = { ...this.currentState, ...state };

    if (this.autoCloseTimeout) {
      clearTimeout(this.autoCloseTimeout);
      this.autoCloseTimeout = null;
    }

    if (this.currentState.status === 'SUCCESS') {
      this.autoCloseTimeout = setTimeout(() => {
        this.update({ status: 'IDLE', message: 'Ready', progress: 0, details: '', error: '' });
      }, 5000);
    }

    this.render();
  }

  static setExpanded(expanded: boolean) {
    this.isExpanded = expanded;
    this.render();
  }

  private static render() {
    if (!this.statusElement) this.init();
    
    const { status, message, progress, details, error, currentStep, totalSteps, currentRow, totalRows } = this.currentState;

    if (status === 'IDLE') {
      this.statusElement!.style.display = 'none';
      return;
    } else {
      this.statusElement!.style.display = 'block';
    }
    
    const statusColor = {
      IDLE: '#64748b',
      RUNNING: '#3b82f6',
      PAUSED: '#f59e0b',
      ERROR: '#ef4444',
      SUCCESS: '#10b981'
    }[status];

    const isHoverable = true;

    this.statusElement!.style.borderColor = `${statusColor}44`;
    
    this.statusElement!.innerHTML = `
      <div class="fp-hud-main">
        <div class="fp-pulse-dot ${status === 'RUNNING' || status === 'PAUSED' ? 'pulse' : ''}" style="background: ${statusColor}; box-shadow: 0 0 12px ${statusColor}"></div>
        <div class="fp-hud-content">
          <div class="fp-hud-header">
            <span class="fp-hud-label">${status === 'ERROR' ? 'System Error' : 'NodeNaut Engine'}</span>
            <div class="fp-hud-badges">
              ${totalRows && totalRows > 1 ? `<span class="fp-hud-badge row">Row ${currentRow}/${totalRows}</span>` : ''}
              ${totalSteps ? `<span class="fp-hud-badge step">Step ${currentStep}/${totalSteps}</span>` : ''}
            </div>
          </div>
          <div class="fp-hud-message">${message}</div>
        </div>
        <div class="fp-hud-actions">
          ${message.toLowerCase().includes('picker') ? `<button id="fp-cancel-picker" class="fp-icon-btn danger" title="Cancel Picker">✕</button>` : ''}
          ${(status === 'RUNNING' || status === 'PAUSED') && !message.toLowerCase().includes('picker') ? `<button id="fp-stop" class="fp-icon-btn danger" title="Stop & Exit">⏹</button>` : ''}
          ${status === 'RUNNING' && !message.toLowerCase().includes('picker') ? `<button id="fp-pause" class="fp-icon-btn" title="Pause">⏸</button>` : ''}
          ${status === 'PAUSED' && !message.toLowerCase().includes('picker') ? `
            <button id="fp-step" class="fp-icon-btn" title="Next Step">⏭</button>
            <button id="fp-resume" class="fp-icon-btn success" title="Resume">▶</button>
          ` : ''}
          ${(status === 'ERROR' || status === 'SUCCESS') ? `<button id="fp-close" class="fp-icon-btn" title="Close">✕</button>` : ''}
        </div>
      </div>

      <div class="fp-hud-details ${this.isExpanded ? 'show' : ''}">
        <div class="fp-progress-container">
          <div class="fp-progress-bar" style="width: ${progress}%; background: ${statusColor}"></div>
        </div>
        ${details ? `<div class="fp-detail-text">${details}</div>` : ''}
        ${error ? `<div class="fp-error-text">${error}</div>` : ''}
        
        <div class="fp-hud-footer">
          <div class="fp-badge">${status}</div>
          <div class="fp-progress-percent">${Math.round(progress)}%</div>
        </div>
      </div>
    `;
  }

  static showPulse(el: Element | null) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pulse = document.createElement('div');
    pulse.style.cssText = `
      position: absolute;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 3px solid #3b82f6;
      border-radius: 6px;
      pointer-events: none;
      z-index: 999998;
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
      animation: fp-pulse-highlight 1.5s ease-out forwards;
    `;
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 1500);
  }

  private static injectStyles() {
    if (document.getElementById('fp-hud-styles')) return;
    const style = document.createElement('style');
    style.id = 'fp-hud-styles';
    style.textContent = `
      .fp-hud-panel {
        background: #0f172a;
        backdrop-filter: none;
        color: white;
        padding: 14px 20px;
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
        pointer-events: auto;
        min-width: 280px;
        max-width: 340px;
        transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        border: 1px solid transparent;
        overflow: hidden;
        transform-origin: bottom right;
      }
      .fp-hud-panel:hover {
        transform: scale(1.02);
        max-width: 380px;
        background: #0f172a;
        box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.15);
      }
      .fp-hud-main {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .fp-hud-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .fp-hud-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .fp-hud-label {
        opacity: 0.6;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 800;
        white-space: nowrap;
      }
      .fp-hud-badges {
        display: flex;
        gap: 4px;
      }
      .fp-hud-badge {
        font-size: 10px;
        font-weight: 800;
        background: rgba(255,255,255,0.12);
        padding: 2px 6px;
        border-radius: 4px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .fp-hud-badge.row { border-left: 2px solid var(--accent); color: #3b82f6; }
      .fp-hud-badge.step { opacity: 0.8; }
      .fp-hud-message {
        font-size: 14px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .fp-hud-actions {
        display: flex;
        gap: 6px;
      }
      .fp-icon-btn {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.05);
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .fp-icon-btn:hover { 
        background: rgba(255,255,255,0.2); 
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .fp-icon-btn.success { color: #10b981; }
      .fp-icon-btn.success:hover { background: rgba(16, 185, 129, 0.2); }
      .fp-icon-btn.danger { color: #ef4444; }
      .fp-icon-btn.danger:hover { background: rgba(239, 68, 68, 0.2); }
      
      .fp-hud-details {
        max-height: 0;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        padding-top: 0;
        pointer-events: none;
      }
      .fp-hud-details.show {
        max-height: 250px;
        opacity: 1;
        padding-top: 16px;
        margin-top: 14px;
        border-top: 1px solid rgba(255,255,255,0.1);
        pointer-events: auto;
      }
      
      .fp-progress-container {
        height: 6px;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 12px;
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
      }
      .fp-progress-bar {
        height: 100%;
        transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 0 10px rgba(255,255,255,0.2);
      }
      
      .fp-detail-text { font-size: 12px; opacity: 0.8; line-height: 1.5; margin-bottom: 10px; font-weight: 500; }
      .fp-error-text { 
        font-size: 12px; 
        color: #fca5a5; 
        background: rgba(239, 68, 68, 0.15);
        padding: 10px 14px;
        border-radius: 10px;
        margin-bottom: 10px;
        border-left: 3px solid #ef4444;
        font-weight: 600;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
      }
      
      .fp-hud-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 4px;
      }
      .fp-badge {
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        background: rgba(255,255,255,0.12);
        padding: 3px 8px;
        border-radius: 6px;
        letter-spacing: 0.05em;
      }
      .fp-progress-percent { font-size: 11px; font-weight: 800; opacity: 0.6; font-variant-numeric: tabular-nums; }

      @keyframes fp-hud-pop {
        from { transform: translateY(30px) scale(0.9); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
      .fp-pulse-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      .fp-pulse-dot.pulse {
        animation: fp-dot-pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
      }
      @keyframes fp-dot-pulse {
        0%, 100% { opacity: 1; transform: scale(1); filter: brightness(1.2); }
        50% { opacity: 0.5; transform: scale(0.85); filter: brightness(1); }
      }
    `;
    document.head.appendChild(style);
  }

  static notify(message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO', duration = 4000) {
    if (!this.toastStack) this.init();
    const colors = { INFO: '#3b82f6', SUCCESS: '#10b981', WARNING: '#f59e0b', ERROR: '#ef4444' };
    const toast = document.createElement('div');
    toast.className = 'fp-toast fade-in';
    toast.style.cssText = `
      background: #1e293b;
      backdrop-filter: none;
      color: white;
      padding: 10px 16px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-left: 3px solid ${colors[type]};
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
      max-width: 320px;
      pointer-events: auto;
      animation: fp-hud-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;
    toast.textContent = message;
    this.toastStack!.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}
