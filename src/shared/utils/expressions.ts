/**
 * NodeNaut Expression Intelligence Utility
 */

export interface AutocompleteSuggestion {
  label: string;
  value: string;
  type: 'column' | 'script' | 'calc';
  description?: string;
}

export interface ValidationResult {
  isValid: boolean;
  message: string | null;
  errorIndex?: number;
}

const GLOBAL_METHODS: AutocompleteSuggestion[] = [
  // Time & ID
  { label: 'Date.now()', value: '{{Date.now()}}', type: 'script', description: 'Current timestamp in ms' },
  { label: 'Timestamp (Local)', value: '{{new Date().toLocaleString()}}', type: 'script', description: 'Human readable time' },
  { label: 'Random ID', value: '{{crypto.randomUUID()}}', type: 'script', description: 'Generate unique identifier' },
  
  // Math & Numbers
  { label: 'Random 1-100', value: '{{Math.floor(Math.random() * 100) + 1}}', type: 'script', description: 'Random integer range' },
  { label: 'calc(ADD)', value: 'calc({val1} + {val2})', type: 'calc', description: 'Mathematical sum' },
  { label: 'calc(ROUND)', value: 'calc(Math.round({value}))', type: 'calc', description: 'Round to nearest integer' },
  { label: 'calc(FIXED 2)', value: 'calc(Number({value}).toFixed(2))', type: 'calc', description: 'Force 2 decimal places' },
  
  // Logic & Strings
  { label: 'Ternary IF', value: '{{$row["Status"] === "OK" ? "TRUE" : "FALSE"}}', type: 'script', description: 'Conditional logic' },
  { label: 'String UP', value: '{{String($row["Name"]).toUpperCase()}}', type: 'script', description: 'Convert to uppercase' },
  { label: 'String TRIM', value: '{{String($row["Value"]).trim()}}', type: 'script', description: 'Remove whitespace' },
  { label: 'Length Check', value: '{{String($row["Data"]).length}}', type: 'script', description: 'Get text length' },
  
  // Browser Context
  { label: 'Page URL', value: '{{window.location.href}}', type: 'script', description: 'Get current page address' },
  { label: 'Page Title', value: '{{document.title}}', type: 'script', description: 'Get website title' },
  { label: 'FLOW.listTabs()', value: '{{await FLOW.listTabs()}}', type: 'script', description: 'List all open browser tabs (SCRIPT node)' },
  { label: 'FLOW.searchHistory()', value: '{{await FLOW.searchHistory("query")}}', type: 'script', description: 'Search browser history (SCRIPT/Formula node)' },
  { label: 'FLOW.listExtensions()', value: '{{await FLOW.listExtensions()}}', type: 'script', description: 'List active browser extensions (SCRIPT node)' },

  // Database Writing (Use inside SCRIPT nodes)
  { label: 'Table.add()', value: '{{Table.add({ col1: "val1" });}}', type: 'script', description: 'Add new row to active dataset (SCRIPT node)' },
  { label: 'Table.update()', value: '{{Table.update($row.index, { col1: "val1" });}}', type: 'script', description: 'Update row in active dataset (SCRIPT node)' },
  { label: 'Table.delete()', value: '{{Table.delete($row.index);}}', type: 'script', description: 'Delete row from active dataset (SCRIPT node)' },
  { label: 'GLOBAL.slug.update() (Variables)', value: '{{GLOBAL.my_global_vars.update({ key1: "val1" });}}', type: 'script', description: 'Update global variables (SCRIPT node)' },
  { label: 'GLOBAL.slug.update() (Dataset)', value: '{{GLOBAL.my_global_dataset.update(0, { col1: "val1" });}}', type: 'script', description: 'Update row in global dataset (SCRIPT node)' },
  { label: 'Update active row variable', value: '{{$row["my_var"] = "new value";}}', type: 'script', description: 'Update variable in active row scope (SCRIPT node)' },
];

/**
 * Validates a complex expression string with detailed feedback (CSP Compliant)
 */
export function validateExpression(str: any): ValidationResult {
  if (str === undefined || str === null) return { isValid: true, message: null };
  const valStr = String(str);
  if (!valStr) return { isValid: true, message: null };

  // 1. Check for unbalanced curly braces
  const openBraces = (valStr.match(/\{/g) || []).length;
  const closeBraces = (valStr.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    return { isValid: false, message: 'Missing closing brace "}".', errorIndex: valStr.lastIndexOf('{') };
  }
  if (closeBraces > openBraces) {
    return { isValid: false, message: 'Extra closing brace "}".', errorIndex: valStr.lastIndexOf('}') };
  }

  // 2. Scan for JS expressions {{ ... }}
  const jsMatches = Array.from(valStr.matchAll(/\{\{([^}]+)\}\}/g));
  for (const match of jsMatches) {
    const exp = match[1].trim();
    
    // Allow GLOBAL and $row patterns
    // Enforce strict path checks only if the expression represents a simple path structure
    const isSimplePath = /^[a-zA-Z0-9_$.\[\]'"\-]+$/.test(exp);
    if ((exp.startsWith('GLOBAL.') || exp.startsWith('$row')) && isSimplePath) {
      if (!/^[a-zA-Z0-9_$.\[\]]+$/.test(exp)) {
        return { isValid: false, message: `Invalid identifier in path: ${exp}`, errorIndex: match.index };
      }
      continue;
    }

    // For other JS expressions, we can only check basic syntax (no eval allowed in CSP)
    // We check for common illegal characters or obvious errors
    if (/;|['"`]/.test(exp) && !exp.includes('["')) {
      // Very basic sanity check
    }
  }

  // 3. Scan for calc expressions calc(...)
  const calcMatches = Array.from(valStr.matchAll(/calc\(([^)]+)\)/g));
  for (const match of calcMatches) {
    const m = match as any;
    const exp = m[1];
    // Check if it only contains math-safe characters
    if (!/^[0-9+\-*/().\s{}a-zA-Z0-9_\[\]"]+$/.test(exp)) {
      return { isValid: false, message: 'Calc contains illegal characters. Only math and columns allowed.', errorIndex: m.index };
    }
  }

  return { isValid: true, message: null };
}

/**
 * Provides context-aware suggestions based on current input and cursor
 */
export function getSuggestions(
  input: string, 
  cursorIndex: number, 
  headers: string[] = [], 
  globalTables: any[] = [],
  localVariables: string[] = []
): AutocompleteSuggestion[] {
  const textBefore = input.substring(0, cursorIndex);
  
  const lastDouble = textBefore.lastIndexOf('{{');
  const lastSingle = textBefore.lastIndexOf('{');
  const textBeforeLower = textBefore.toLowerCase();
  const lastCalc = textBeforeLower.lastIndexOf('calc(');
  
  // 1. Inside {{ script }}
  if (lastDouble !== -1 && lastDouble >= lastSingle - 1) {
    const term = textBefore.substring(lastDouble + 2).toLowerCase();
    
    const suggestions: AutocompleteSuggestion[] = [
      ...GLOBAL_METHODS.filter(m => m.type === 'script'),
      ...headers.map(h => ({ 
        label: `$row["${h}"]`, 
        value: `{{$row["${h}"]}}`, 
        type: 'script' as const,
        description: `Current row column: ${h}`
      })),
      ...localVariables.map(v => ({
        label: `$row["${v}"]`,
        value: `{{$row["${v}"]}}`,
        type: 'script' as const,
        description: `Local variable: ${v}`
      }))
    ];

    // Add Global Suggestions: GLOBAL.slug.field
    globalTables.forEach(table => {
      let fields: string[] = table.metadata?.headers || table.metadata?.keys || [];
      // Fallback for metadata-less tables
      if (fields.length === 0 && !table.is_secure && table.data) {
        fields = table.type === 'VARIABLES' ? Object.keys(table.data) : (table.data.headers || []);
      }
      
      fields.forEach((f: string) => {
        suggestions.push({
          label: `GLOBAL.${table.slug}.${f}`,
          value: `{{GLOBAL.${table.slug}.${f}}}`,
          type: 'script',
          description: `Global ${table.type}: ${table.name}`
        });
      });
    });

    return suggestions.filter(s => s.label.toLowerCase().includes(term));
  }

  // 2. Inside calc(...)
  if (lastCalc !== -1 && lastCalc > lastSingle) {
    const term = textBefore.substring(lastCalc + 5).toLowerCase();
    const suggestions: AutocompleteSuggestion[] = [
      ...headers.map(h => ({ label: h, value: `{${h}}`, type: 'column' as const, description: `Row value: ${h}` })),
      ...localVariables.map(v => ({ label: v, value: `{${v}}`, type: 'column' as const, description: `Local variable: ${v}` })),
      ...GLOBAL_METHODS.filter(m => m.type === 'calc')
    ];

    globalTables.forEach(table => {
      let fields: string[] = table.metadata?.headers || table.metadata?.keys || [];
      if (fields.length === 0 && !table.is_secure && table.data) {
        fields = table.type === 'VARIABLES' ? Object.keys(table.data) : (table.data.headers || []);
      }
      fields.forEach((f: string) => {
        suggestions.push({
          label: `GLOBAL.${table.slug}.${f}`,
          value: `{{GLOBAL.${table.slug}.${f}}}`,
          type: 'script',
          description: `Global ${table.type}: ${table.name}`
        });
      });
    });

    return suggestions.filter(s => s.label.toLowerCase().includes(term));
  }

  // 3. Inside { column }
  if (lastSingle !== -1) {
    const term = textBefore.substring(lastSingle + 1).toLowerCase();
    const suggestions: AutocompleteSuggestion[] = [
      ...headers.map(h => ({ label: h, value: `{${h}}`, type: 'column' as const, description: `Row value: ${h}` })),
      ...localVariables.map(v => ({ label: v, value: `{${v}}`, type: 'column' as const, description: `Local variable: ${v}` })),
      ...GLOBAL_METHODS.filter(m => m.type === 'script') 
    ];

    globalTables.forEach(table => {
      let fields: string[] = table.metadata?.headers || table.metadata?.keys || [];
      if (fields.length === 0 && !table.is_secure && table.data) {
        fields = table.type === 'VARIABLES' ? Object.keys(table.data) : (table.data.headers || []);
      }
      fields.forEach((f: string) => {
        suggestions.push({
          label: `GLOBAL.${table.slug}.${f}`,
          value: `{{GLOBAL.${table.slug}.${f}}}`,
          type: 'script',
          description: `Global ${table.type}: ${table.name}`
        });
      });
    });

    return suggestions.filter(s => s.label.toLowerCase().includes(term));
  }

  return [];
}

/**
 * Smartly replaces the trigger sequence with the chosen suggestion without duplication
 */
export function applySuggestion(currentVal: string, suggestion: string, cursorIndex: number): string {
  const textBefore = currentVal.substring(0, cursorIndex);
  const textAfter = currentVal.substring(cursorIndex);

  // Find the exact trigger start that matches the suggestion type
  const lastDouble = textBefore.lastIndexOf('{{');
  const lastSingle = textBefore.lastIndexOf('{');
  const lastCalc = textBefore.toLowerCase().lastIndexOf('calc(');

  let splitIndex = -1;

  if (suggestion.toLowerCase().startsWith('calc(')) {
    splitIndex = lastCalc !== -1 ? lastCalc : lastSingle;
  } else if (suggestion.startsWith('{{')) {
    splitIndex = (lastDouble !== -1 && lastDouble >= lastSingle - 1) ? lastDouble : lastSingle;
  } else if (suggestion.startsWith('{')) {
    splitIndex = lastSingle;
  } else {
    // Fallback: Use whatever trigger index opened the autocomplete dropdown
    if (lastDouble !== -1 && lastDouble >= lastSingle - 1) {
      splitIndex = lastDouble;
    } else if (lastSingle !== -1) {
      splitIndex = lastSingle;
    }
  }

  if (splitIndex === -1) return currentVal;

  return currentVal.substring(0, splitIndex) + suggestion + textAfter;
}
