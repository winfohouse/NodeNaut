import { MessageType } from '$shared/constants/messages';
import type { ExtRequest, ExtResponse } from '$shared/api/messenger';
import { SmartScanner } from './modules/Scanner';
import { Recorder } from './modules/Recorder';
import { ElementPicker } from './modules/Picker';
import { FloatingHUD } from './modules/HUD';
import { SPAWatcher } from './modules/SPAWatcher';
import { SelectorHealer, SelectorBuilder } from '$shared/utils/selectors';
import { DOMUtils } from '$shared/utils/dom';

// Action Helpers
import { MouseHelper } from './action-helpers/MouseHelper';
import { KeyboardHelper } from './action-helpers/KeyboardHelper';
import { ScrollHelper } from './action-helpers/ScrollHelper';
import { FormHelper } from './action-helpers/FormHelper';
import { StateHelper } from './action-helpers/StateHelper';

/**
 * Recursive Logic Interpreter
 * Evaluates ConditionModel JSON without using eval() to bypass CSP.
 */
class ConditionInterpreter {
  static evaluate(model: any): boolean {
    if (!model?.rootGroup) return true;
    return this.evaluateGroup(model.rootGroup);
  }

  private static evaluateGroup(group: any): boolean {
    if (!group.conditions || group.conditions.length === 0) return true;
    
    const results = group.conditions.map((c: any) => 
      c.type === 'group' ? this.evaluateGroup(c) : this.evaluateRule(c)
    );

    if (group.operator === 'ALL') return results.every(r => r === true);
    if (group.operator === 'ANY') return results.some(r => r === true);
    if (group.operator === 'NONE') return !results.some(r => r === true);
    return false;
  }

  private static evaluateRule(rule: any): boolean {
    const el = SelectorHealer.findElement(rule.candidates || (rule.selector ? [{ selector: rule.selector, type: 'ID', confidence: 100 }] : []), rule.spec).element as HTMLElement;
    
    const isVisible = el && el.offsetWidth > 0 && el.offsetHeight > 0;
    const v1Str = rule.value1 || '';
    const v2Str = rule.value2 || '';

    switch (rule.ruleType) {
      case 'element_visible': return isVisible;
      case 'element_not_visible': return !isVisible;
      case 'element_exists': return el !== null;
      case 'element_not_exists': return el === null;
      case 'element_contains_text': return !!(el && (el.innerText || '').includes(v1Str));
      case 'element_equals_text': return !!(el && (el.innerText || '').trim() === v1Str.trim());
      
      case 'checkbox_checked': return !!(el && (el as any).checked === true);
      case 'checkbox_not_checked': return !!(el && (el as any).checked === false);
      case 'input_empty': return !!(el && ((el as any).value || '').trim() === '');
      case 'input_has_value': return !!(el && ((el as any).value || '').trim() !== '');
      case 'input_equals': return !!(el && ((el as any).value || '') === v1Str);
      case 'dropdown_selected': return !!(el && (el as any).options?.[(el as any).selectedIndex]?.value === v1Str);
      
      case 'url_contains': return window.location.href.includes(v1Str);
      case 'url_equals': return window.location.href === v1Str;
      case 'title_contains': return document.title.includes(v1Str);

      case 'var_empty': return (v1Str == null || String(v1Str).trim() === '');
      case 'var_has_value': return (v1Str != null && String(v1Str).trim() !== '');
      case 'var_equals': return (String(v1Str) === v2Str);
      case 'var_contains': return (String(v1Str).includes(v2Str));

      case 'num_gt': return (!isNaN(Number(v1Str)) && Number(v1Str) > Number(v2Str));
      case 'num_lt': return (!isNaN(Number(v1Str)) && Number(v1Str) < Number(v2Str));
      case 'num_eq': return (!isNaN(Number(v1Str)) && Number(v1Str) === Number(v2Str));
      case 'num_neq': return (!isNaN(Number(v1Str)) && Number(v1Str) !== Number(v2Str));
      case 'num_gte': return (!isNaN(Number(v1Str)) && Number(v1Str) >= Number(v2Str));
      case 'num_lte': return (!isNaN(Number(v1Str)) && Number(v1Str) <= Number(v2Str));

      default: return false;
    }
  }
}

console.log('FlowPilot Content Script Injected');

function init() {
  try {
    Recorder.init();
    if (document.body) {
      FloatingHUD.init();
    } else {
      window.addEventListener('DOMContentLoaded', () => FloatingHUD.init());
    }
    SPAWatcher.init();
  } catch (e) {
    console.error('FlowPilot Init Error:', e);
  }
}

// Start initialization
init();

// Proxy database and scan requests from Injected Script to Background
window.addEventListener('message', async (event) => {
  if (event.data?.type === 'FP_DB_REQ') {
    const { id, action, table, criteria, idOrCriteria, rowId, changes, data } = event.data;
    let response;
    
    switch (action) {
      case 'query': response = await Messenger.send('DB_QUERY' as any, { table, criteria }); break;
      case 'find': response = await Messenger.send('DB_FIND' as any, { table, idOrCriteria }); break;
      case 'add': response = await Messenger.send('DB_ADD' as any, { table, data }); break;
      case 'update': response = await Messenger.send('DB_UPDATE' as any, { table, rowId, changes }); break;
      case 'delete': response = await Messenger.send('DB_DELETE' as any, { table, rowId }); break;
      case 'put': response = await Messenger.send('DB_PUT' as any, { table, data }); break;
    }

    window.postMessage({ type: 'FP_DB_RES', id, success: response?.success, data: response?.data }, '*');
  }

  if (event.data?.type === 'FP_TABLE_REQ') {
    const { id, action, tableId, index, data, rowData } = event.data;
    const response = await Messenger.send('TABLE_ACTION' as any, { action, tableId, index, data, rowData });
    window.postMessage({ type: 'FP_TABLE_RES', id, success: response.success, data: response.data }, '*');
  }

  if (event.data?.type === 'FP_GLOBAL_REQ') {
    const { id, action, slug, index, rowData } = event.data;
    const response = await Messenger.send('GLOBAL_ACTION' as any, { action, slug, index, rowData });
    window.postMessage({ type: 'FP_GLOBAL_RES', id, success: response.success, data: response.data }, '*');
  }

  if (event.data?.type === 'FP_SCAN_REQ') {
    const { id } = event.data;
    const response = await Messenger.send(MessageType.DOM_SCAN, {});
    window.postMessage({ type: 'FP_SCAN_RES', id, success: response.success, data: response.data }, '*');
  }
});

async function handleContentMessage(request: ExtRequest): Promise<ExtResponse> {
  console.log(`Content Script received: ${request.type}`, request.payload);

  switch (request.type) {
    case MessageType.IPC_PING:
      return { success: true, data: 'PONG' };

    case MessageType.HUD_UPDATE:
      FloatingHUD.update(request.payload);
      return { success: true };

    case MessageType.DOM_FILL:
      await SPAWatcher.waitForStability();
      return performAction('FILL', request.payload);
    
    case MessageType.DOM_CLICK:
      await SPAWatcher.waitForStability();
      return performAction('CLICK', request.payload);

    case MessageType.DOM_INTERACT:
      await SPAWatcher.waitForStability();
      return handleInteract(request.payload);

    case MessageType.DOM_EVAL: {
      try {
        const { code, model } = request.payload;
        
        // --- 1. SAFE INTERPRETER (Bypasses CSP) ---
        if (model) {
          const result = ConditionInterpreter.evaluate(model);
          return { success: true, data: result };
        }

        // --- 2. LEGACY EVAL (Limited by CSP) ---
        if (code) {
          const findElement = (sel: string, candidates?: any[], spec?: any) => {
            const res = SelectorHealer.findElement(candidates || (sel ? [{ selector: sel, type: 'ID', confidence: 100 }] : []), spec);
            return res.element as HTMLElement;
          };
          const isVisible = (sel: string, candidates?: any[], spec?: any) => {
            const el = findElement(sel, candidates, spec);
            return !!(el && el.offsetWidth > 0 && el.offsetHeight > 0);
          };
          const querySelectorDeep = (sel: string) => DOMUtils.querySelectorDeep(sel);
          
          // Use indirect eval to slightly reduce CSP impact on some browsers, though still risky
          const indirectEval = eval;
          const result = indirectEval(code);
          return { success: true, data: result };
        }

        return { success: false, error: { code: 'EMPTY_EVAL', message: 'No logic provided' } };
      } catch (e: any) {
        console.error('[FlowPilot] DOM_EVAL error:', e);
        return { success: false, error: { code: 'EVAL_ERROR', message: e.message } };
      }
    }

    case MessageType.DOM_SCAN:
      FloatingHUD.update({ message: 'Scanning page...', status: 'RUNNING' });
      const fields = SmartScanner.scan();
      FloatingHUD.update({ message: 'Scan complete', status: 'IDLE' });
      return { success: true, data: fields };
    
    case MessageType.PICKER_START:
      FloatingHUD.update({ message: 'Picker active', status: 'PAUSED' });
      ElementPicker.start(request.payload);
      return { success: true };

    case MessageType.PICKER_STOP:
      FloatingHUD.update({ message: 'Picker stopped', status: 'IDLE' });
      ElementPicker.stop();
      return { success: true };

    case MessageType.DOM_HIGHLIGHT:
      const highlightTarget = SelectorHealer.findElement(request.payload.candidates || [{ selector: request.payload.selector, type: 'ID', confidence: 100 }]);
      FloatingHUD.showPulse(highlightTarget.element);
      return highlightElement(highlightTarget.element as HTMLElement);

    case MessageType.DOM_GET_SPEC:
      try {
        const target = SelectorHealer.findElement(request.payload.candidates || [{ selector: request.payload.selector, type: 'ID', confidence: 100 }]);
        if (target.element) {
          const spec = SelectorBuilder.getSpec(target.element);
          return { success: true, data: spec };
        }
        return { success: false, error: { code: 'NOT_FOUND', message: 'Element not found' } };
      } catch (err: any) {
        return { success: false, error: { code: 'GET_SPEC_FAILED', message: err.message } };
      }

    case MessageType.RECORDER_START:
      FloatingHUD.update({ message: 'Recording active', status: 'PAUSED' });
      Recorder.start(request.payload.workflowId);
      return { success: true };

    case MessageType.RECORDER_STOP:
      FloatingHUD.update({ message: 'Recording stopped', status: 'IDLE' });
      Recorder.stop();
      return { success: true };

    case MessageType.HUD_WAIT:
      FloatingHUD.update({ message: request.payload.message, status: 'PAUSED' });
      return { success: true };

    case MessageType.HUD_RESUME:
      FloatingHUD.update({ message: 'Resuming...', status: 'RUNNING' });
      return { success: true };

    case MessageType.DOM_WAIT_STABILITY:
      FloatingHUD.update({ message: 'Waiting for page stability...', status: 'RUNNING' });
      await SPAWatcher.waitForStability(request.payload?.timeout);
      FloatingHUD.update({ message: 'Page stable', status: 'RUNNING' });
      return { success: true };

    default:
      return {
        success: false,
        error: { code: 'UNHANDLED_CONTENT_MESSAGE', message: `Type ${request.type} not handled in content` }
      };
  }
}

// Global Messenger Bridge (Background <-> Content)
import { Messenger } from '$shared/api/messenger';
Messenger.listen(handleContentMessage);

/**
 * High-level action performer with Self-Healing and Index-based support
 */
async function performAction(type: 'FILL' | 'CLICK', payload: any): Promise<ExtResponse> {
  const { selector, value, candidates, metadata } = payload;
  const targetSelector = selector || 'Unknown Selector';

  const element = await findTargetElement(selector, candidates, metadata?.spec);
  if (!element) {
    return { success: false, error: { code: 'ELEMENT_NOT_FOUND', message: `Could not find element: ${targetSelector}` } };
  }

  FloatingHUD.update({ message: `${type === 'FILL' ? 'Filling' : 'Clicking'} element...`, status: 'RUNNING' });
  FloatingHUD.showPulse(element);

  if (type === 'FILL') {
    return KeyboardHelper.type(element, value);
  } else {
    return MouseHelper.click(element);
  }
}

/**
 * Polymorphic interaction handler
 */
async function handleInteract(payload: any): Promise<ExtResponse> {
  const { action, selector, value, candidates, metadata } = payload;
  const targetSelector = selector || 'Unknown Selector';
  
  const element = await findTargetElement(selector, candidates, metadata?.spec);

  if (!element) {
    return { success: false, error: { code: 'ELEMENT_NOT_FOUND', message: `Could not find element: ${targetSelector}` } };
  }

  if (!metadata?.skipHUD) {
    FloatingHUD.update({ message: `Action: ${action}...`, status: 'RUNNING' });
    FloatingHUD.showPulse(element);
  }

  switch (action) {
    // Mouse
    case 'click': return MouseHelper.click(element);
    case 'dblclick': return MouseHelper.dblclick(element);
    case 'right-click': 
    case 'contextmenu': return MouseHelper.rightClick(element);
    case 'hover': return MouseHelper.hover(element);
    case 'mousedown': return MouseHelper.mousedown(element);
    case 'mouseup': return MouseHelper.mouseup(element);
    case 'mousemove': return MouseHelper.mousemove(element);

    // Keyboard
    case 'type': return KeyboardHelper.type(element, value);
    case 'press-enter': return KeyboardHelper.pressKey(element, 'Enter');
    case 'press-escape': return KeyboardHelper.pressKey(element, 'Escape');
    case 'keydown': return KeyboardHelper.keydown(element, value);
    case 'keyup': return KeyboardHelper.keyup(element, value);

    // Scroll
    case 'scroll-into-view': return ScrollHelper.scrollIntoView(element);
    case 'scroll-top': return ScrollHelper.scrollTo(element, { y: 0 });
    case 'scroll-by': return ScrollHelper.scrollBy(element, { top: parseInt(value) || 0 });

    // Form
    case 'check': return FormHelper.check(element, true);
    case 'uncheck': return FormHelper.check(element, false);
    case 'select': return FormHelper.select(element, value);
    case 'submit': return FormHelper.submit(element);
    case 'reset': return FormHelper.reset(element);

    // State & Clipboard
    case 'focus': return StateHelper.focus(element);
    case 'blur': return StateHelper.blur(element);
    case 'copy': return StateHelper.copy(element);
    case 'cut': return StateHelper.cut(element);
    case 'paste': return StateHelper.paste(element, value);

    // Data
    case 'extract-text': return StateHelper.extract(element, 'TEXT');
    case 'extract-html': return StateHelper.extract(element, 'HTML');
    case 'extract-attr': return StateHelper.extract(element, 'ATTR', metadata?.attribute);
    
    // Assertions
    case 'assert-visible': return StateHelper.assert(element, 'VISIBLE');
    case 'assert-hidden': return StateHelper.assert(element, 'HIDDEN');

    default:
      return { success: false, error: { code: 'UNKNOWN_INTERACT_ACTION', message: `Action ${action} not implemented` } };
  }
}

async function findTargetElement(selector: string, candidates?: any[], spec?: any): Promise<HTMLElement | null> {
  let element: HTMLElement | null = null;

  if (candidates && candidates.length > 0) {
    const result = SelectorHealer.findElement(candidates, spec);
    element = result.element as HTMLElement;
  }

  if (!element && selector) {
    element = DOMUtils.querySelectorDeep(selector);
  }

  return element;
}

async function highlightElement(element: HTMLElement | null): Promise<ExtResponse> {
  if (!element) return { success: false, error: { code: 'NOT_FOUND', message: `Element not found for highlighting` } };
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return { success: true };
}
