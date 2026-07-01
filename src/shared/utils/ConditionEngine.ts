export type LogicOperator = 'ALL' | 'ANY' | 'NONE';

export interface ConditionGroup {
  id: string;
  type: 'group';
  operator: LogicOperator;
  conditions: (ConditionGroup | ConditionRule)[];
}

export interface ConditionRule {
  id: string;
  type: 'rule';
  ruleType: string;
  selector?: string;
  selectorLabel?: string;
  candidates?: any[];
  spec?: Record<string, unknown>;
  value1?: string; 
  value2?: string; 
}

export interface ConditionModel {
  mode: 'BUILDER' | 'CUSTOM';
  customCode?: string;
  rootGroup: ConditionGroup;
  timeout: number;
  poll: number;
}

export class ConditionEngine {
  static createDefaultModel(): ConditionModel {
    return {
      mode: 'BUILDER',
      timeout: 10000,
      poll: 500,
      customCode: '',
      rootGroup: {
        id: crypto.randomUUID(),
        type: 'group',
        operator: 'ALL',
        conditions: [
          { id: crypto.randomUUID(), type: 'rule', ruleType: 'element_visible', selector: '', value1: '' }
        ]
      }
    };
  }

  static generateJS(model: ConditionModel): string {
    if (model.mode === 'CUSTOM') {
      let code = model.customCode || 'false';
      code = code.replace(/^\{\{(.*)\}\}$/, '$1');
      return code.replace(/\{\{true\}\}/gi, 'true').replace(/\{\{false\}\}/gi, 'false');
    }
    
    if (!model.rootGroup || model.rootGroup.conditions.length === 0) return 'true';
    return this.compileGroup(model.rootGroup);
  }

  private static compileGroup(group: ConditionGroup): string {
    if (!group.conditions || group.conditions.length === 0) return 'true';
    
    const compiled = group.conditions.map(c => 
      c.type === 'group' ? this.compileGroup(c as ConditionGroup) : this.compileRule(c as ConditionRule)
    );

    if (group.operator === 'ALL') return `(${compiled.join(' && ')})`;
    if (group.operator === 'ANY') return `(${compiled.join(' || ')})`;
    if (group.operator === 'NONE') return `!(${compiled.join(' || ')})`;
    return 'false';
  }

  private static compileRule(rule: ConditionRule): string {
    const sel = rule.selector ? `\`${rule.selector.replace(/`/g, '\\`')}\`` : 'null';
    const cands = rule.candidates ? JSON.stringify(rule.candidates) : 'null';
    const spec = rule.spec ? JSON.stringify(rule.spec) : 'null';
    
    // value1 is usually Expected Value (for text/url checks) or Variable Name (for variable checks)
    const v1Str = rule.value1 ? `\`${rule.value1.replace(/`/g, '\\`')}\`` : '""';
    const v1Raw = rule.value1 || '""'; 
    
    // value2 is used for explicit comparisons (e.g., Variable Equals)
    const v2Str = rule.value2 ? `\`${rule.value2.replace(/`/g, '\\`')}\`` : '""';

    const getEl = `findElement(${sel}, ${cands}, ${spec})`;

    switch (rule.ruleType) {
      // 1. Visual Page Checks
      case 'element_visible': return `isVisible(${sel}, ${cands}, ${spec})`;
      case 'element_not_visible': return `!isVisible(${sel}, ${cands}, ${spec})`;
      case 'element_exists': return `(${getEl} !== null)`;
      case 'element_not_exists': return `(${getEl} === null)`;
      case 'element_contains_text': return `(${getEl} && (${getEl}.innerText || '').includes(${v1Str}))`;
      case 'element_equals_text': return `(${getEl} && (${getEl}.innerText || '').trim() === ${v1Str}.trim())`;
      case 'element_starts_with': return `(${getEl} && (${getEl}.innerText || '').trim().startsWith(${v1Str}))`;
      case 'element_ends_with': return `(${getEl} && (${getEl}.innerText || '').trim().endsWith(${v1Str}))`;
      
      // 2. Form & Input Checks
      case 'checkbox_checked': return `(${getEl} && ${getEl}.checked === true)`;
      case 'checkbox_not_checked': return `(${getEl} && ${getEl}.checked === false)`;
      case 'input_empty': return `(${getEl} && (${getEl}.value || '').trim() === '')`;
      case 'input_has_value': return `(${getEl} && (${getEl}.value || '').trim() !== '')`;
      case 'input_equals': return `(${getEl} && (${getEl}.value || '') === ${v1Str})`;
      case 'dropdown_selected': return `(() => { const el = ${getEl}; return el && el.options[el.selectedIndex]?.value === ${v1Str}; })()`;
      
      // 3. Navigation Checks
      case 'url_contains': return `window.location.href.includes(${v1Str})`;
      case 'url_equals': return `window.location.href === ${v1Str}`;
      case 'title_contains': return `document.title.includes(${v1Str})`;

      // 4. Variable Checks
      case 'var_empty': return `(${v1Raw} == null || String(${v1Raw}).trim() === '')`;
      case 'var_has_value': return `(${v1Raw} != null && String(${v1Raw}).trim() !== '')`;
      case 'var_equals': return `(String(${v1Raw}) === ${v2Str})`;
      case 'var_contains': return `(String(${v1Raw}).includes(${v2Str}))`;

      // 5. Number Comparisons
      case 'num_gt': return `(!isNaN(Number(${v1Raw})) && Number(${v1Raw}) > Number(${v2Str}))`;
      case 'num_lt': return `(!isNaN(Number(${v1Raw})) && Number(${v1Raw}) < Number(${v2Str}))`;
      case 'num_eq': return `(!isNaN(Number(${v1Raw})) && Number(${v1Raw}) === Number(${v2Str}))`;
      case 'num_neq': return `(!isNaN(Number(${v1Raw})) && Number(${v1Raw}) !== Number(${v2Str}))`;
      case 'num_gte': return `(!isNaN(Number(${v1Raw})) && Number(${v1Raw}) >= Number(${v2Str}))`;
      case 'num_lte': return `(!isNaN(Number(${v1Raw})) && Number(${v1Raw}) <= Number(${v2Str}))`;

      default: return 'false';
    }
  }
}
