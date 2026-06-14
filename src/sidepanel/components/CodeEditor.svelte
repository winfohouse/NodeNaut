<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as monaco from 'monaco-editor';
  import { db } from '$shared/services/db';
  import { VaultService } from '$shared/services/vault';
  // @ts-ignore - Vite raw import for the source of truth
  import flowscriptDts from '$shared/types/flowscript.d.ts?raw';

  export let value = '';
  export let language = 'javascript';
  export let fontSize = 12;
  export let headers: string[] = [];
  export let onChange: (val: string) => void = () => {};

  let editorContainer: HTMLElement;
  let editor: monaco.editor.IStandaloneCodeEditor;
  let completionProvider: monaco.IDisposable | null = null;
  let libDisposable: monaco.IDisposable | null = null;

  async function updateDynamicTypes() {
    if (!monaco || !monaco.languages.typescript) return;
    if (libDisposable) libDisposable.dispose();

    const globalTables = await db.global_tables.toArray();
    
    // Resolve project interfaces with actual table headers where possible
    const interfacePromises = globalTables.map(async t => {
      let fields: string[] = [];
      
      if (t.type === 'VARIABLES') {
        let data = t.data;
        if (t.is_secure && data?.blob) {
          try {
            const decrypted = await VaultService.decrypt(data.blob);
            data = JSON.parse(decrypted);
          } catch (e) {}
        }
        fields = Object.keys(data || {}).filter(k => k !== 'blob');
      } else if (t.data?.tableId) {
        const actualTable = await db.data_tables.get(t.data.tableId);
        fields = actualTable?.headers || [];
      }

      // Fallback to metadata if available
      if (fields.length === 0) {
        fields = t.metadata?.headers || t.metadata?.keys || [];
      }

      const rowInterfaceName = `Global_${t.slug}_Row`;
      const rowInterface = `
        interface ${rowInterfaceName} {
          ${fields.map(f => `"${f}": any;`).join('\n          ')}
        }
      `;

      if (t.type === 'VARIABLES') {
        return `
          ${rowInterface}
          interface Global_${t.slug} extends GlobalVariable<${rowInterfaceName}> {
            ${fields.map(f => `"${f}": any;`).join('\n            ')}
          }
        `;
      } else {
        return `
          ${rowInterface}
          interface Global_${t.slug} extends GlobalDataset<${rowInterfaceName}> {}
        `;
      }
    });

    const projectInterfaces = (await Promise.all(interfacePromises)).join('\n');

    const dynamicDefinitions = `
      /** Live Table Schema */
      interface FlowRow {
        ${headers.map(h => `"${h}": any;`).join('\n        ')}
      }

      ${projectInterfaces}

      /** Dynamic Project Registry */
      interface GlobalRegistry {
        ${globalTables.map(t => `"${t.slug}": Global_${t.slug};`).join('\n        ')}
      }

      declare const GLOBAL: GlobalRegistry;
      declare const $row: FlowRow;
      declare const Table: FlowTable<FlowRow>;
      declare const FLOW: FlowEngine;
    `;

    const fullSource = `${flowscriptDts}\n${dynamicDefinitions}`;
    libDisposable = monaco.languages.typescript.javascriptDefaults.addExtraLib(fullSource, 'flowpilot-env.d.ts');
  }

  $: if (headers && monaco) updateDynamicTypes();

  onMount(async () => {
    const isLight = document.body.classList.contains('mood-crystal');
    
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      noLib: false
    });

    await updateDynamicTypes();

    // Restoration of entry-point completion
    completionProvider = monaco.languages.registerCompletionItemProvider('javascript', {
      triggerCharacters: ['.'],
      provideCompletionItems: async (model, position) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const suggestions: monaco.languages.CompletionItem[] = [];
        
        const isAfterDot = word.word.length > 0 
          ? textUntilPosition.slice(0, -word.word.length).trim().endsWith('.')
          : textUntilPosition.trim().endsWith('.');

        // 1. Root Level Entry Points (ONLY if NOT after a dot)
        if (!isAfterDot) {
          const roots = [
            { label: 'GLOBAL', detail: 'Neural Vault (All Data)', kind: monaco.languages.CompletionItemKind.Module },
            { label: 'FLOW', detail: 'Automation Engine', kind: monaco.languages.CompletionItemKind.Module },
            { label: 'Table', detail: 'Sequence Dataset', kind: monaco.languages.CompletionItemKind.Module },
            { label: '$row', detail: 'Active Data Packet', kind: monaco.languages.CompletionItemKind.Variable }
          ];
          roots.forEach(r => {
            if (r.label.toUpperCase().startsWith(word.word.toUpperCase()) || word.word === '') {
              suggestions.push({ ...r, insertText: r.label, range });
            }
          });
        }

        // 2. High-Productivity Snippets (Only after a dot on a GLOBAL slug)
        const slugMatch = textUntilPosition.match(/GLOBAL\.([a-z0-9_]+)(\[\d+\])?\.([a-z0-9_]*)$/i);
        if (slugMatch) {
          const slug = slugMatch[1];
          const table = await db.global_tables.where('slug').equals(slug).first();
          if (table) {
            const snippets = [
              { label: 'forEach', insertText: 'forEach(async (item, index) => {\n\t$0\n})', detail: 'Async loop over items' },
              { label: 'find', insertText: 'find(item => item.$1)', detail: 'Search for item' },
              { label: 'update', insertText: 'update(${1:index}, { $0 })', detail: 'Modify specific item' },
              { label: 'add', insertText: 'add({ $0 })', detail: 'Insert new item' }
            ];
            snippets.forEach(s => suggestions.push({
              ...s,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              sortText: '0000' // Ensure snippets are at the top
            }));
          }
        }

        // 3. Root Table ($row) Property Completion (Restored for absolute reliability)
        if (textUntilPosition.match(/(?:\$row|row)\.([a-z0-9_]*)$/i)) {
          headers.forEach(h => {
            suggestions.push({
              label: h,
              kind: monaco.languages.CompletionItemKind.Property,
              detail: 'Active Row Data',
              insertText: h,
              range,
              sortText: '0001'
            });
          });
        }

        return { suggestions };
      }
    });

    editor = monaco.editor.create(editorContainer, {
      value,
      language,
      theme: isLight ? 'vs' : 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize,
      lineNumbers: 'on',
      roundedSelection: false,
      cursorStyle: 'line',
      padding: { top: 10, bottom: 10 },
      fixedOverflowWidgets: true,
      wordWrap: 'on',
      wrappingStrategy: 'advanced',
      scrollbar: {
        horizontal: 'auto',
        vertical: 'auto',
        alwaysConsumeMouseWheel: false
      }
    });

    editor.onDidChangeModelContent(() => onChange(editor.getValue()));

    const observer = new MutationObserver(() => {
      monaco.editor.setTheme(document.body.classList.contains('mood-crystal') ? 'vs' : 'vs-dark');
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    // Track observer for cleanup
    (window as any)._monacoObserver = observer;
  });

  onDestroy(() => {
    if (editor) editor.dispose();
    if (completionProvider) completionProvider.dispose();
    if (libDisposable) libDisposable.dispose();
    
    // Clean up observer
    if ((window as any)._monacoObserver) {
      (window as any)._monacoObserver.disconnect();
      delete (window as any)._monacoObserver;
    }
  });

  $: if (editor && value !== editor.getValue()) editor.setValue(value);
  $: if (editor && fontSize) editor.updateOptions({ fontSize });
</script>

<div bind:this={editorContainer} class="editor-container"></div>

<style>
  .editor-container {
    width: 100%;
    height: 100%;
    min-height: 250px;
    border-radius: 0.75rem;
    overflow: hidden;
    border: 1px solid var(--border-ui);
    background: var(--bg-surface-solid);
  }
</style>
