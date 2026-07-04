(async () => {
  console.log('[FlowPilot] Sandbox Engine Loaded');

  // Signal ready to background
  window.parent.postMessage({ type: 'FP_READY' }, '*');

  window.addEventListener('message', async (event) => {
    const payload = event.data?.type === 'TO_SANDBOX' ? event.data.payload : event.data;
    if (!payload) return;
    
    const { id, code, data, tableId, gConfig, tableHeaders, type } = payload;
    
    if (type === 'FP_STATUS_REQ') {
      window.parent.postMessage({ type: 'FP_READY' }, '*');
      return;
    }

    if (type?.endsWith('_RES')) return;
    if (!id) return; // ID is required for routing

    if (!code || code.trim() === '') {
      console.warn('[FlowPilot] Sandbox received empty script, returning success.');
      window.parent.postMessage({ type: 'FP_SCRIPT_DONE', id, success: true, data: null }, '*');
      return;
    }

    console.log('[FlowPilot] Sandbox executing script:', id);

    const _call = async (type: string, payload: any) => {
      return new Promise((res, rej) => {
        const callId = Math.random().toString(36).substring(2);
        const timeout = setTimeout(() => {
          window.removeEventListener('message', l);
          rej(new Error('Sandbox API Timeout: ' + type));
        }, 15000);

        const l = (e: MessageEvent) => {
          if (e.data?.type === type + '_RES' && e.data.callId === callId) {
            clearTimeout(timeout);
            window.removeEventListener('message', l);
            res(e.data.data);
          }
        };
        window.addEventListener('message', l);
        window.parent.postMessage({ type: type + '_REQ', id, callId, ...payload }, '*');
      });
    };

    const log = async (m: any) => {
      try {
        let val = m;
        if (m instanceof Promise) val = await m;

        let safeMessage = val;
        if (typeof val === 'object' && val !== null) {
          try {
            // Test if it can be cloned
            window.parent.postMessage({ type: 'TEST_CLONE', data: val }, '*');
          } catch (e) {
            safeMessage = JSON.parse(JSON.stringify(val)); // Strip non-serializable parts
          }
        }
        window.parent.postMessage({ type: 'FP_LOG', id, message: safeMessage }, '*');
      } catch (e) {
        window.parent.postMessage({ type: 'FP_LOG', id, message: String(m) }, '*');
      }
    };

    const GLOBAL: any = {};
    if (gConfig) {
      gConfig.forEach((t: any) => {
        const methods = {
          getAll: function() { return _call('FP_GLOBAL', { slug: t.slug, action: 'getAll' }); },
          add: function(d: any) { return _call('FP_GLOBAL', { slug: t.slug, action: 'add', rowData: d }); },
          update: function(arg1?: any, arg2?: any) {
            if (t.type === 'VARIABLES' && arg1 === undefined) {
              // Self-update for VARIABLES: send current non-function properties
              const dataToSave: any = {};
              Object.keys(this).forEach(key => {
                if (typeof (this as any)[key] !== 'function') dataToSave[key] = (this as any)[key];
              });
              return _call('FP_GLOBAL', { slug: t.slug, action: 'update', rowData: dataToSave });
            }
            return _call('FP_GLOBAL', { slug: t.slug, action: 'update', index: arg1, rowData: arg2 });
          },
          delete: function(i: number) { return _call('FP_GLOBAL', { slug: t.slug, action: 'delete', index: i }); },
          forEach: async function(cb: any) {
            const data: any = await _call('FP_GLOBAL', { slug: t.slug, action: 'getAll' });
            if (Array.isArray(data)) {
              for (let i = 0; i < data.length; i++) await cb(data[i], i);
            }
          },
          find: async function(cb: any) {
            const data: any = await _call('FP_GLOBAL', { slug: t.slug, action: 'getAll' });
            if (Array.isArray(data)) return data.find(cb);
          }
        };

        const target = { ...t.sample };
        // Define methods as non-enumerable so they aren't part of the "data" when we serialize
        Object.keys(methods).forEach(m => {
          Object.defineProperty(target, m, {
            value: (methods as any)[m].bind(target),
            enumerable: false,
            configurable: true,
            writable: true
          });
        });

        GLOBAL[t.slug] = target;
      });
    }

    const FLOW: any = {
      click: (s: string) => _call('FP_CLICK', { selector: s }),
      fill: (s: string, v: string) => _call('FP_FILL', { selector: s, value: v }),
      wait: (m: number) => new Promise(r => setTimeout(r, m)),
      scan: () => _call('FP_SCAN', {}),
      log: log,
      waitFor: (s: string, t: number) => _call('FP_WAIT_FOR', { selector: s, timeout: t }),
      getText: (s: string) => _call('FP_GET_TEXT', { selector: s }),
      alert: async (m: any) => {
        let val = m;
        if (m instanceof Promise) val = await m;
        return _call('FP_ALERT', { message: String(val) });
      },
      listTabs: () => _call('FP_LIST_TABS', {}),
      searchHistory: (text: string, maxResults?: number) => _call('FP_SEARCH_HISTORY', { text, maxResults }),
      listExtensions: () => _call('FP_LIST_EXTENSIONS', {}),
      
      Click: (s: string) => _call('FP_CLICK', { selector: s }),
      Fill: (s: string, v: string) => _call('FP_FILL', { selector: s, value: v }),
      FillWith: (s: string, v: string) => _call('FP_FILL', { selector: s, value: v }),
      Wait: (m: number) => new Promise(r => setTimeout(r, m)),
      Scan: () => _call('FP_SCAN', {}),
      Log: log,
      WaitFor: (s: string, t: number) => _call('FP_WAIT_FOR', { selector: s, timeout: t }),
      GetText: (s: string) => _call('FP_GET_TEXT', { selector: s }),
      ListTabs: () => _call('FP_LIST_TABS', {}),
      SearchHistory: (text: string, maxResults?: number) => _call('FP_SEARCH_HISTORY', { text, maxResults }),
      ListExtensions: () => _call('FP_LIST_EXTENSIONS', {})
    };

    const Table: any = {
      columns: (cb: any) => (tableHeaders || []).forEach((h: any, i: number) => cb(h, i)),
      getHeaders: () => tableHeaders || [],
      add: (d: any) => _call('FP_TABLE', { tableId, action: 'add', rowData: d }),
      update: (i: number, d: any) => _call('FP_TABLE', { tableId, action: 'update', index: i, rowData: d }),
      delete: (i: number) => _call('FP_TABLE', { tableId, action: 'delete', index: i }),
      getAll: () => _call('FP_TABLE', { tableId, action: 'getAll' }),
      find: async (cb: any) => {
        const data: any = await _call('FP_TABLE', { tableId, action: 'getAll' });
        if (Array.isArray(data)) return data.find(cb);
      },
      forEach: async (cb: any) => {
        const data: any = await _call('FP_TABLE', { tableId, action: 'getAll' });
        if (Array.isArray(data)) {
          for (let i = 0; i < data.length; i++) await cb(data[i], i);
        }
      }
    };

    const rowIndex = payload.rowIndex;
    const smartRow: any = data ? { ...data } : {};
    if (data) {
      Object.keys(data).forEach(key => {
        Object.defineProperty(smartRow, key, {
          get: () => data[key],
          set: (val) => {
            data[key] = val;
            if (rowIndex !== undefined && tableId) {
              _call('FP_TABLE', { tableId, action: 'update', index: rowIndex, rowData: { [key]: val } }).catch(() => {});
            }
          },
          enumerable: true,
          configurable: true
        });
      });
    }

    Object.defineProperty(smartRow, 'index', {
      value: rowIndex,
      enumerable: false,
      writable: false
    });

    Object.defineProperty(smartRow, 'set', {
      value: async function(key: string, value: any) {
        data[key] = value;
        if (rowIndex !== undefined && tableId) {
          await _call('FP_TABLE', { tableId, action: 'update', index: rowIndex, rowData: { [key]: value } });
        }
      },
      enumerable: false,
      writable: false
    });

    Object.defineProperty(smartRow, 'update', {
      value: async function(fields: Record<string, any>) {
        Object.assign(data, fields);
        if (rowIndex !== undefined && tableId) {
          await _call('FP_TABLE', { tableId, action: 'update', index: rowIndex, rowData: fields });
        }
      },
      enumerable: false,
      writable: false
    });

    try {
      const scriptFunc = new Function('GLOBAL', 'FLOW', 'Table', '$row', 'alert', 'log', `
        const console = { log: log, error: log, warn: log };
        return (async () => {
          ${code}
        })();
      `);
      const result = await scriptFunc(GLOBAL, FLOW, Table, smartRow, FLOW.alert, FLOW.log);
      window.parent.postMessage({ type: 'FP_SCRIPT_DONE', id, success: true, data: result }, '*');
    } catch (e: any) {
      window.parent.postMessage({ type: 'FP_SCRIPT_DONE', id, success: false, error: e.message }, '*');
    }
  });
})();
