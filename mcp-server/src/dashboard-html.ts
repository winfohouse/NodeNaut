export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FlowPilot MCP</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
--bg-deep:#0a0e1a;--bg-surface:rgba(15,23,42,0.8);--bg-card:rgba(15,23,42,0.6);
--bg-hover:rgba(30,41,59,0.7);--bg-input:rgba(15,23,42,0.9);
--border:rgba(148,163,184,0.08);--border-hover:rgba(148,163,184,0.18);
--cyan:#06b6d4;--cyan-dim:rgba(6,182,212,0.15);--cyan-glow:rgba(6,182,212,0.25);
--green:#10b981;--green-dim:rgba(16,185,129,0.15);
--red:#ef4444;--red-dim:rgba(239,68,68,0.15);
--amber:#f59e0b;--amber-dim:rgba(245,158,11,0.15);
--text-primary:#f1f5f9;--text-secondary:#94a3b8;--text-muted:#64748b;
--sidebar-w:220px;--radius:12px;--radius-sm:8px;--radius-xs:6px;
--font-ui:'Outfit',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;
--shadow:0 4px 24px rgba(0,0,0,0.3),0 1px 4px rgba(0,0,0,0.2);
--shadow-lg:0 8px 40px rgba(0,0,0,0.4),0 2px 8px rgba(0,0,0,0.3);
}
html,body{height:100%;overflow:hidden}
body{font-family:var(--font-ui);background:var(--bg-deep);color:var(--text-primary);display:flex}

/* ───── scrollbar ───── */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.18);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:rgba(148,163,184,0.3)}

/* ───── sidebar ───── */
.sidebar{width:var(--sidebar-w);min-width:var(--sidebar-w);height:100vh;background:rgba(10,14,26,0.95);
border-right:1px solid var(--border);display:flex;flex-direction:column;z-index:100;
backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
.sidebar-logo{padding:24px 20px 20px;display:flex;align-items:center;gap:12px}
.sidebar-logo svg{width:32px;height:32px;flex-shrink:0}
.sidebar-logo .logo-text{font-weight:800;font-size:17px;letter-spacing:-0.5px}
.sidebar-logo .logo-sub{font-size:10px;font-weight:400;color:var(--text-muted);letter-spacing:1.5px;text-transform:uppercase;margin-top:2px}
.sidebar-nav{flex:1;padding:8px 10px;display:flex;flex-direction:column;gap:2px}
.nav-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:var(--radius-sm);
cursor:pointer;transition:all 0.2s;color:var(--text-secondary);font-size:13.5px;font-weight:400;
position:relative;user-select:none}
.nav-item:hover{background:var(--bg-hover);color:var(--text-primary)}
.nav-item.active{background:var(--cyan-dim);color:var(--cyan);font-weight:600}
.nav-item.active::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);
width:3px;height:20px;background:var(--cyan);border-radius:0 3px 3px 0}
.nav-item svg{width:18px;height:18px;flex-shrink:0;opacity:0.7}
.nav-item.active svg{opacity:1}
.nav-badge{margin-left:auto;font-size:11px;background:var(--cyan-dim);color:var(--cyan);
padding:2px 7px;border-radius:10px;font-weight:600;font-family:var(--font-mono)}
.sidebar-footer{padding:16px 20px;border-top:1px solid var(--border)}
.conn-indicator{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted)}
.conn-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;position:relative}
.conn-dot.connected{background:var(--green);box-shadow:0 0 8px var(--green)}
.conn-dot.disconnected{background:var(--red);box-shadow:0 0 8px var(--red)}
.conn-dot::after{content:'';position:absolute;inset:-3px;border-radius:50%;
animation:pulse-ring 2s ease-out infinite;border:2px solid currentColor;opacity:0}
.conn-dot.connected::after{color:var(--green)}
.conn-dot.disconnected::after{color:var(--red)}
@keyframes pulse-ring{0%{transform:scale(0.8);opacity:0.6}100%{transform:scale(1.8);opacity:0}}

/* ───── main area ───── */
.main{flex:1;height:100vh;overflow:hidden;display:flex;flex-direction:column}
.page-header{padding:24px 32px 0;flex-shrink:0}
.page-header h1{font-size:24px;font-weight:800;letter-spacing:-0.5px}
.page-header p{font-size:13px;color:var(--text-secondary);margin-top:4px}
.page-content{flex:1;overflow-y:auto;padding:20px 32px 32px;min-height:0}
.page{display:none;animation:page-in 0.35s ease;flex:1;flex-direction:column;min-height:0;height:100%}
.page.active{display:flex}
@keyframes page-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

/* ───── cards & glass ───── */
.glass{background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius);
backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:var(--shadow);
transition:border-color 0.2s,box-shadow 0.2s}
.glass:hover{border-color:var(--border-hover)}

/* ───── stat cards ───── */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.stat-card{padding:20px 22px;display:flex;flex-direction:column;gap:6px}
.stat-card .stat-label{font-size:12px;color:var(--text-muted);font-weight:400;text-transform:uppercase;letter-spacing:0.8px}
.stat-card .stat-value{font-size:28px;font-weight:800;letter-spacing:-1px;font-family:var(--font-ui)}
.stat-card .stat-icon{width:36px;height:36px;border-radius:var(--radius-xs);display:flex;
align-items:center;justify-content:center;margin-bottom:4px;font-size:16px}
.stat-card .stat-icon.cyan{background:var(--cyan-dim);color:var(--cyan)}
.stat-card .stat-icon.green{background:var(--green-dim);color:var(--green)}
.stat-card .stat-icon.red{background:var(--red-dim);color:var(--red)}
.stat-card .stat-icon.amber{background:var(--amber-dim);color:var(--amber)}

/* ───── connection banner ───── */
.conn-banner{padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}
.conn-banner .banner-dot{width:14px;height:14px;border-radius:50%;flex-shrink:0;position:relative}
.conn-banner .banner-dot.on{background:var(--green);box-shadow:0 0 16px var(--green)}
.conn-banner .banner-dot.off{background:var(--red);box-shadow:0 0 16px var(--red)}
.conn-banner .banner-dot::after{content:'';position:absolute;inset:-4px;border-radius:50%;
animation:pulse-ring 2s ease-out infinite;border:2px solid currentColor;opacity:0}
.conn-banner .banner-dot.on::after{color:var(--green)}
.conn-banner .banner-dot.off::after{color:var(--red)}
.conn-banner .banner-text h3{font-size:16px;font-weight:700}
.conn-banner .banner-text p{font-size:12.5px;color:var(--text-secondary);margin-top:2px}

/* ───── activity feed ───── */
.activity-section{margin-top:0}
.section-title{font-size:14px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.section-title .dot{width:6px;height:6px;border-radius:50%;background:var(--cyan)}
.activity-list{display:flex;flex-direction:column;gap:6px}
.activity-item{padding:12px 16px;display:flex;align-items:center;gap:12px;border-radius:var(--radius-sm);
background:var(--bg-card);border:1px solid var(--border);font-size:13px;transition:background 0.2s}
.activity-item:hover{background:var(--bg-hover)}
.activity-item .act-time{font-family:var(--font-mono);font-size:11px;color:var(--text-muted);flex-shrink:0;min-width:70px}
.activity-item .act-dir{font-size:14px;flex-shrink:0;width:20px;text-align:center}
.activity-item .act-method{font-family:var(--font-mono);font-size:12px;color:var(--cyan);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.activity-item .act-badge{font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;flex-shrink:0}
.badge-success{background:var(--green-dim);color:var(--green)}
.badge-error{background:var(--red-dim);color:var(--red)}
.badge-pending{background:var(--amber-dim);color:var(--amber)}
.empty-state{text-align:center;padding:40px 20px;color:var(--text-muted);font-size:13px}
.empty-state .empty-icon{font-size:36px;margin-bottom:12px;opacity:0.4}

/* ───── quick actions ───── */
.quick-actions{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:var(--radius-sm);
font-family:var(--font-ui);font-size:13px;font-weight:600;border:none;cursor:pointer;
transition:all 0.2s;outline:none}
.btn-primary{background:var(--cyan);color:#0a0e1a}
.btn-primary:hover{background:#22d3ee;box-shadow:0 0 20px var(--cyan-glow)}
.btn-secondary{background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border)}
.btn-secondary:hover{border-color:var(--border-hover);background:var(--bg-hover)}
.btn-sm{padding:7px 14px;font-size:12px}
.btn-danger{background:var(--red-dim);color:var(--red);border:1px solid rgba(239,68,68,0.2)}
.btn-danger:hover{background:rgba(239,68,68,0.25)}

/* ───── AI clients page ───── */
.clients-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px}
.client-card{padding:24px}
.client-card .client-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.client-card .client-icon{font-size:28px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;
background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--border)}
.client-card .client-name{font-size:15px;font-weight:700}
.client-card .client-desc{font-size:12.5px;color:var(--text-secondary);margin-bottom:14px;line-height:1.5}
.client-card .config-label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;font-weight:600}
.client-card .config-path{font-family:var(--font-mono);font-size:11px;color:var(--amber);margin-bottom:8px;
word-break:break-all;background:var(--amber-dim);padding:4px 8px;border-radius:var(--radius-xs);display:inline-block}
.code-block{position:relative;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);
padding:14px 16px;font-family:var(--font-mono);font-size:11.5px;line-height:1.6;color:var(--green);
overflow-x:auto;white-space:pre;margin-bottom:12px}
.code-block .copy-btn{position:absolute;top:8px;right:8px;background:var(--bg-hover);border:1px solid var(--border);
color:var(--text-secondary);padding:4px 10px;border-radius:var(--radius-xs);font-size:11px;cursor:pointer;
font-family:var(--font-ui);transition:all 0.2s;z-index:2}
.code-block .copy-btn:hover{color:var(--text-primary);border-color:var(--cyan)}
.code-block .copy-btn.copied{color:var(--green);border-color:var(--green)}
.client-card .steps{font-size:12px;color:var(--text-secondary);line-height:1.7}
.client-card .steps strong{color:var(--text-primary)}

/* ───── Route Explorer ───── */
.explorer-toolbar{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center}
.search-box{flex:1;min-width:200px;padding:10px 14px 10px 36px;background:var(--bg-input);border:1px solid var(--border);
border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--font-ui);font-size:13px;outline:none;
transition:border-color 0.2s;position:relative}
.search-box:focus{border-color:var(--cyan)}
.search-wrap{position:relative;flex:1;min-width:200px}
.search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--text-muted);pointer-events:none}
.search-wrap input{width:100%}
.cat-tabs{display:flex;gap:4px;flex-wrap:wrap}
.cat-tab{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;
background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary);transition:all 0.2s}
.cat-tab:hover{border-color:var(--border-hover);color:var(--text-primary)}
.cat-tab.active{background:var(--cyan-dim);border-color:var(--cyan);color:var(--cyan)}
.tools-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
.tool-card{padding:18px 20px;cursor:pointer;transition:all 0.25s}
.tool-card:hover{border-color:var(--cyan);box-shadow:0 0 20px rgba(6,182,212,0.08)}
.tool-card.expanded{grid-column:1/-1;cursor:default}
.tool-card .tool-head{display:flex;align-items:center;gap:10px}
.tool-card .tool-type{font-family:var(--font-mono);font-size:11px;background:var(--cyan-dim);color:var(--cyan);
padding:3px 8px;border-radius:var(--radius-xs);font-weight:700;text-transform:uppercase}
.tool-card .tool-label{font-size:14px;font-weight:700;flex:1}
.tool-card .tool-cat{font-size:10px;padding:3px 10px;border-radius:10px;font-weight:600;
background:var(--bg-card);border:1px solid var(--border);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px}
.tool-card .tool-desc{font-size:12.5px;color:var(--text-secondary);margin-top:8px;line-height:1.5}
.tool-detail{margin-top:16px;padding-top:16px;border-top:1px solid var(--border)}
.form-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:14px}
.form-group label{display:block;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;
margin-bottom:4px;font-weight:600}
.form-group input,.form-group select,.form-group textarea{width:100%;padding:9px 12px;background:var(--bg-input);
border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-primary);
font-family:var(--font-mono);font-size:12px;outline:none;transition:border-color 0.2s}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--cyan)}
.form-group textarea{min-height:80px;resize:vertical}
.form-group select{cursor:pointer;appearance:none;-webkit-appearance:none}
.raw-json-section{margin-bottom:14px}
.raw-json-section label{display:block;font-size:11px;color:var(--text-muted);text-transform:uppercase;
letter-spacing:0.6px;margin-bottom:4px;font-weight:600}
.raw-json-section textarea{width:100%;min-height:100px;padding:12px;background:var(--bg-input);
border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--green);
font-family:var(--font-mono);font-size:12px;outline:none;resize:vertical;line-height:1.5}
.raw-json-section textarea:focus{border-color:var(--cyan)}
.test-actions{display:flex;gap:10px;align-items:center;margin-bottom:14px}
.result-panel{padding:14px 16px;border-radius:var(--radius-sm);font-family:var(--font-mono);font-size:12px;
line-height:1.5;max-height:260px;overflow:auto;white-space:pre-wrap;word-break:break-all}
.result-panel.success{background:var(--green-dim);border:1px solid rgba(16,185,129,0.2);color:var(--green)}
.result-panel.error{background:var(--red-dim);border:1px solid rgba(239,68,68,0.2);color:var(--red)}
.result-panel.pending{background:var(--amber-dim);border:1px solid rgba(245,158,11,0.2);color:var(--amber)}

/* ───── Request Stream ───── */
.stream-toolbar{display:flex;gap:10px;margin-bottom:14px;align-items:center;flex-wrap:wrap}
.stream-counter{font-family:var(--font-mono);font-size:12px;color:var(--text-muted);margin-left:auto}
.log-container{border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)}
.log-list{max-height:calc(100vh - 240px);overflow-y:auto;background:var(--bg-input)}
.log-entry{padding:10px 16px;border-bottom:1px solid var(--border);font-size:12.5px;cursor:pointer;
transition:background 0.15s;display:flex;align-items:center;gap:12px}
.log-entry:hover{background:var(--bg-hover)}
.log-entry .log-time{font-family:var(--font-mono);font-size:11px;color:var(--text-muted);flex-shrink:0;min-width:80px}
.log-entry .log-dir{font-size:15px;flex-shrink:0;width:20px;text-align:center}
.log-entry .log-dir.in{color:var(--green)}
.log-entry .log-dir.out{color:var(--cyan)}
.log-entry .log-method{font-family:var(--font-mono);font-size:12px;color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.log-entry .log-status{font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;flex-shrink:0}
.log-expanded{padding:12px 16px;background:rgba(15,23,42,0.95);border-bottom:1px solid var(--border);
font-family:var(--font-mono);font-size:11.5px;line-height:1.6;white-space:pre-wrap;word-break:break-all;
color:var(--text-secondary);max-height:240px;overflow:auto;display:none}
.log-expanded.show{display:block}

/* ───── Settings ───── */
.settings-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
.setting-group{padding:22px 24px}
.setting-group .setting-title{font-size:13px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.setting-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;
border-bottom:1px solid var(--border);font-size:13px}
.setting-row:last-child{border-bottom:none}
.setting-row .setting-key{color:var(--text-muted);font-size:12px}
.setting-row .setting-val{font-family:var(--font-mono);font-size:12px;color:var(--text-primary);text-align:right;
word-break:break-all;max-width:60%}
.credits{margin-top:24px;text-align:center;color:var(--text-muted);font-size:12px}
.credits a{color:var(--cyan);text-decoration:none}

/* ───── disconnected overlay ───── */
.disconnected-state{text-align:center;padding:60px 20px}
.disconnected-state .disc-icon{font-size:48px;margin-bottom:16px;opacity:0.3}
.disconnected-state h3{font-size:18px;font-weight:700;margin-bottom:8px}
.disconnected-state p{font-size:13px;color:var(--text-secondary);max-width:400px;margin:0 auto}

/* ───── responsive ───── */
@media(max-width:768px){
.sidebar{width:60px;min-width:60px}
.sidebar-logo .logo-text,.sidebar-logo .logo-sub,.nav-item span,.nav-badge,.conn-indicator span{display:none}
.nav-item{justify-content:center;padding:10px}
.sidebar-logo{padding:16px 14px;justify-content:center}
.page-content{padding:16px}
.page-header{padding:16px 16px 0}
.clients-grid,.tools-grid{grid-template-columns:1fr}
.stats-grid{grid-template-columns:repeat(2,1fr)}
}

/* ───── theme toggle ───── */
.theme-toggle-wrap{padding:10px;border-bottom:1px solid var(--border);margin-bottom:8px}
.theme-toggle-btn{display:flex;align-items:center;gap:12px;width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-hover);color:var(--text-primary);cursor:pointer;transition:all 0.2s;font-family:var(--font-ui);font-size:12.5px;font-weight:500;box-sizing:border-box}
.theme-toggle-btn:hover{border-color:var(--cyan);background:var(--bg-hover)}
.theme-toggle-btn svg{width:16px;height:16px;flex-shrink:0}
html.light .theme-icon-sun {display:none}
html:not(.light) .theme-icon-moon {display:none}

/* ───── light mode variables ───── */
html.light :root {
  --bg-deep:#f8fafc;
  --bg-surface:rgba(255,255,255,0.85);
  --bg-card:rgba(255,255,255,0.7);
  --bg-hover:rgba(241,245,249,0.8);
  --bg-input:rgba(255,255,255,0.95);
  --border:rgba(148,163,184,0.12);
  --border-hover:rgba(148,163,184,0.25);
  --cyan:#0891b2;
  --cyan-dim:rgba(8,145,178,0.1);
  --cyan-glow:rgba(8,145,178,0.2);
  --text-primary:#0f172a;
  --text-secondary:#475569;
  --text-muted:#64748b;
  --shadow:0 4px 24px rgba(148, 163, 184, 0.15),0 1px 4px rgba(148, 163, 184, 0.1);
  --shadow-lg:0 8px 40px rgba(148, 163, 184, 0.2),0 2px 8px rgba(148, 163, 184, 0.15);
}
html.light .sidebar { background: rgba(255, 255, 255, 0.95); }
</style>
</head>
<body>

<!-- ═══════ SIDEBAR ═══════ -->
<aside class="sidebar">
<div class="sidebar-logo">
<svg viewBox="0 0 32 32" fill="none"><defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><path d="M16 2L28 9v14l-12 7L4 23V9l12-7z" fill="url(#lg)" opacity="0.15" stroke="url(#lg)" stroke-width="1.5"/><path d="M10 14l4 4 8-8" stroke="url(#lg)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div><div class="logo-text">FlowPilot</div><div class="logo-sub">MCP Server</div></div>
</div>
<nav class="sidebar-nav" id="sidebarNav">
<div class="nav-item active" data-page="dashboard">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
<span>Dashboard</span>
</div>
<div class="nav-item" data-page="clients">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
<span>AI Clients</span>
</div>
<div class="nav-item" data-page="explorer">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<span>Route Explorer</span>
<span class="nav-badge" id="toolCount">0</span>
</div>
<div class="nav-item" data-page="stream">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
<span>Request Stream</span>
</div>
<div class="nav-item" data-page="settings">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8.68a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
<span>Settings</span>
</div>
</nav>
<div class="sidebar-footer">
<div class="theme-toggle-wrap">
<button class="theme-toggle-btn" id="themeToggleBtn" onclick="toggleTheme()" title="Toggle Light/Dark Theme">
<svg class="theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
<svg class="theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
<span id="themeToggleText">Light Mode</span>
</button>
</div>
<div class="conn-indicator">
<div class="conn-dot disconnected" id="sidebarDot"></div>
<span id="sidebarStatus">Extension Offline</span>
</div>
</div>
</aside>

<!-- ═══════ MAIN CONTENT ═══════ -->
<main class="main">

<!-- ── PAGE: Dashboard ── -->
<div class="page active" id="page-dashboard">
<div class="page-header"><h1>Dashboard</h1><p>FlowPilot MCP Server Overview</p></div>
<div class="page-content">
<div class="conn-banner glass" id="connBanner">
<div style="display:flex;align-items:center;gap:16px">
<div class="banner-dot off" id="bannerDot"></div>
<div class="banner-text">
<h3 id="bannerTitle">Extension Disconnected</h3>
<p id="bannerDesc">Waiting for FlowPilot Chrome extension to connect...</p>
</div>
</div>
<button class="btn btn-secondary btn-sm" id="btnReconnect" onclick="reconnectNow()">Sync / Connect Now</button>
</div>
<div class="stats-grid">
<div class="stat-card glass">
<div class="stat-icon cyan">&#x1f9e9;</div>
<div class="stat-label">Available Tools</div>
<div class="stat-value" id="statTools">0</div>
</div>
<div class="stat-card glass">
<div class="stat-icon green">&#x2705;</div>
<div class="stat-label">Requests Processed</div>
<div class="stat-value" id="statRequests">0</div>
</div>
<div class="stat-card glass">
<div class="stat-icon red">&#x26a0;</div>
<div class="stat-label">Errors</div>
<div class="stat-value" id="statErrors">0</div>
</div>
<div class="stat-card glass">
<div class="stat-icon amber">&#x23f1;</div>
<div class="stat-label">Uptime</div>
<div class="stat-value" id="statUptime">0s</div>
</div>
</div>
<div class="activity-section">
<div class="section-title"><div class="dot"></div> Recent Activity</div>
<div class="activity-list" id="activityList">
<div class="empty-state"><div class="empty-icon">&#x1f4ed;</div>No activity yet. Waiting for requests...</div>
</div>
</div>
<div class="quick-actions">
<button class="btn btn-primary" onclick="navigateTo('explorer')">&#x1f50d; Open Route Explorer</button>
<button class="btn btn-secondary" onclick="navigateTo('clients')">&#x2699; Configure AI Client</button>
</div>
</div>
</div>

<!-- ── PAGE: AI Clients ── -->
<div class="page" id="page-clients">
<div class="page-header"><h1>AI Clients</h1><p>Configure FlowPilot with your favorite AI applications</p></div>
<div class="page-content">
<div class="clients-grid" id="clientsGrid"></div>
</div>
</div>

<!-- ── PAGE: Route Explorer ── -->
<div class="page" id="page-explorer">
<div class="page-header"><h1>Route Explorer</h1><p>Browse and test available MCP tools</p></div>
<div class="page-content">
<div id="explorerContent"></div>
</div>
</div>

<!-- ── PAGE: Request Stream ── -->
<div class="page" id="page-stream">
<div class="page-header"><h1>Request Stream</h1><p>Real-time log of all MCP requests and responses</p></div>
<div class="page-content">
<div class="stream-toolbar">
<div class="search-wrap">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input class="search-box" type="text" placeholder="Filter logs..." id="logSearch" oninput="renderLogs()">
</div>
<button class="btn btn-sm btn-danger" onclick="clearLogs()">&#x1f5d1; Clear</button>
<div class="stream-counter"><span id="logCounter">0</span> entries</div>
</div>
<div class="log-container">
<div class="log-list" id="logList">
<div class="empty-state"><div class="empty-icon">&#x1f4e1;</div>No log entries yet. Activity will appear here in real-time.</div>
</div>
</div>
</div>
</div>

<!-- ── PAGE: Settings ── -->
<div class="page" id="page-settings">
<div class="page-header"><h1>Settings</h1><p>Server information and configuration</p></div>
<div class="page-content">
<div class="settings-grid">
<div class="setting-group glass">
<div class="setting-title">&#x1f5a5; Server Info</div>
<div class="setting-row"><span class="setting-key">Version</span><span class="setting-val" id="setVersion">—</span></div>
<div class="setting-row"><span class="setting-key">Platform</span><span class="setting-val" id="setPlatform">—</span></div>
<div class="setting-row"><span class="setting-key">Port</span><span class="setting-val">7865</span></div>
<div class="setting-row"><span class="setting-key">Executable Path</span><span class="setting-val" id="setExecPath">—</span></div>
</div>
<div class="setting-group glass">
<div class="setting-title">&#x1f517; Connection</div>
<div class="setting-row"><span class="setting-key">WebSocket</span><span class="setting-val">ws://localhost:7865</span></div>
<div class="setting-row"><span class="setting-key">Extension</span><span class="setting-val" id="setExtConn">Disconnected</span></div>
<div class="setting-row"><span class="setting-key">Uptime</span><span class="setting-val" id="setUptime">—</span></div>
<div class="setting-row"><span class="setting-key">Tools Registered</span><span class="setting-val" id="setToolsCount">0</span></div>
</div>
<div class="setting-group glass">
<div class="setting-title">&#x2139; About</div>
<div class="setting-row"><span class="setting-key">Product</span><span class="setting-val">FlowPilot MCP</span></div>
<div class="setting-row"><span class="setting-key">Transport</span><span class="setting-val">stdio + WebSocket</span></div>
<div class="setting-row"><span class="setting-key">Protocol</span><span class="setting-val">Model Context Protocol</span></div>
<div class="setting-row"><span class="setting-key">License</span><span class="setting-val">MIT</span></div>
</div>
</div>
<div class="credits">Built with &#x2764; by FlowPilot &mdash; <a href="https://modelcontextprotocol.io" target="_blank">MCP Specification</a></div>
</div>
</div>

</main>

<script>
/* ═══════════════════════════════════════
   FlowPilot MCP Dashboard — App Script
   NO template literals allowed here.
   ═══════════════════════════════════════ */

(function() {
  "use strict";

  /* ──── State ──── */
  var ws = null;
  var serverInfo = { execPath: '', version: '—', platform: '—' };
  var extensionConnected = false;
  var manifests = [];
  var logs = [];
  var requestCount = 0;
  var errorCount = 0;
  var startTime = Date.now();
  var expandedTool = null;
  var expandedLog = null;
  var reconnectTimer = null;
  var currentPage = 'dashboard';
  var uptimeInterval = null;

  /* ──── Navigation ──── */
  window.navigateTo = function(page) {
    currentPage = page;
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.remove('active');
    }
    var target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    var navItems = document.querySelectorAll('.nav-item');
    for (var j = 0; j < navItems.length; j++) {
      navItems[j].classList.remove('active');
      if (navItems[j].getAttribute('data-page') === page) {
        navItems[j].classList.add('active');
      }
    }

    if (page === 'explorer') renderExplorer();
    if (page === 'clients') renderClients();
    if (page === 'stream') renderLogs();
  };

  window.toggleTheme = function() {
    var html = document.documentElement;
    var text = document.getElementById('themeToggleText');
    if (html.classList.contains('light')) {
      html.classList.remove('light');
      if (text) text.textContent = 'Light Mode';
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.add('light');
      if (text) text.textContent = 'Dark Mode';
      localStorage.setItem('theme', 'light');
    }
  };

  // Initialize theme on load
  setTimeout(function() {
    var savedTheme = localStorage.getItem('theme');
    var html = document.documentElement;
    var text = document.getElementById('themeToggleText');
    if (savedTheme === 'light') {
      html.classList.add('light');
      if (text) text.textContent = 'Dark Mode';
    } else {
      html.classList.remove('light');
      if (text) text.textContent = 'Light Mode';
    }
  }, 50);

  window.reconnectNow = function() {
    var btn = document.getElementById('btnReconnect');
    if (extensionConnected) {
      if (btn) {
        btn.textContent = 'Refreshing...';
        btn.disabled = true;
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'refresh_manifests' }));
      }
      setTimeout(function() {
        if (btn) {
          btn.textContent = 'Refresh Tools';
          btn.disabled = false;
        }
      }, 1000);
      return;
    }

    if (btn) {
      btn.textContent = 'Syncing...';
      btn.disabled = true;
    }
    if (ws) {
      ws.close();
    }
    connectWS();
    setTimeout(function() {
      if (btn) {
        btn.textContent = 'Sync / Connect Now';
        btn.disabled = false;
      }
      if (!extensionConnected) {
        var desc = document.getElementById('bannerDesc');
        if (desc) {
          desc.innerHTML = 'Extension is still offline. <strong>Tip:</strong> Click the FlowPilot icon in your Chrome toolbar to open the Sidepanel and wake up the service worker!';
        }
      }
    }, 1500);
  };

  var navItems = document.querySelectorAll('.nav-item');
  for (var ni = 0; ni < navItems.length; ni++) {
    (function(item) {
      item.addEventListener('click', function() {
        var p = item.getAttribute('data-page');
        if (p) window.navigateTo(p);
      });
    })(navItems[ni]);
  }

  /* ──── WebSocket ──── */
  function connectWS() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    try {
      ws = new WebSocket('ws://localhost:7865');
    } catch (e) {
      scheduleReconnect();
      return;
    }

    ws.onopen = function() {
      ws.send(JSON.stringify({ type: 'register_dashboard' }));
    };

    ws.onmessage = function(evt) {
      try {
        var msg = JSON.parse(evt.data);
        handleMessage(msg);
      } catch (e) { /* ignore parse errors */ }
    };

    ws.onclose = function() {
      scheduleReconnect();
    };

    ws.onerror = function() {
      /* onclose will fire after this */
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectWS, 3000);
  }

  function handleMessage(msg) {
    if (msg.type === 'server_info') {
      serverInfo.execPath = msg.execPath || '';
      serverInfo.version = msg.version || '1.0.0';
      serverInfo.platform = msg.platform || 'unknown';
      updateServerInfoUI();
    } else if (msg.type === 'status_update') {
      extensionConnected = !!msg.extensionConnected;
      if (msg.manifests && Array.isArray(msg.manifests)) {
        manifests = msg.manifests;
      }
      updateConnectionUI();
      if (currentPage === 'explorer') renderExplorer();
    } else if (msg.type === 'log_event' && msg.log) {
      var log = msg.log;
      logs.unshift(log);
      if (logs.length > 500) logs.pop();
      requestCount++;
      if (log.status === 'error') errorCount++;
      updateDashboardStats();
      renderRecentActivity();
      if (currentPage === 'stream') renderLogs();
    } else if (msg.type === 'route_test_response') {
      renderTestResult(msg);
    }
  }

  /* ──── UI Updates ──── */
  function updateConnectionUI() {
    var dot = document.getElementById('sidebarDot');
    var statusEl = document.getElementById('sidebarStatus');
    var bannerDot = document.getElementById('bannerDot');
    var bannerTitle = document.getElementById('bannerTitle');
    var bannerDesc = document.getElementById('bannerDesc');
    var toolCountEl = document.getElementById('toolCount');
    var setExtConn = document.getElementById('setExtConn');

    if (extensionConnected) {
      dot.className = 'conn-dot connected';
      statusEl.textContent = 'Extension Online';
      bannerDot.className = 'banner-dot on';
      bannerTitle.textContent = 'Extension Connected';
      bannerDesc.textContent = 'FlowPilot Chrome extension is active. ' + manifests.length + ' tools available.';
      if (setExtConn) setExtConn.textContent = 'Connected';
      setExtConn.style.color = '#10b981';
      
      var btn = document.getElementById('btnReconnect');
      if (btn) {
        btn.textContent = 'Refresh Tools';
        btn.className = 'btn btn-primary btn-sm';
      }
    } else {
      dot.className = 'conn-dot disconnected';
      statusEl.textContent = 'Extension Offline';
      bannerDot.className = 'banner-dot off';
      bannerTitle.textContent = 'Extension Disconnected';
      bannerDesc.textContent = 'Waiting for FlowPilot Chrome extension to connect...';
      if (setExtConn) setExtConn.textContent = 'Disconnected';
      setExtConn.style.color = '#ef4444';
      
      var btn = document.getElementById('btnReconnect');
      if (btn) {
        btn.textContent = 'Sync / Connect Now';
        btn.className = 'btn btn-secondary btn-sm';
      }
    }

    toolCountEl.textContent = String(manifests.length);
    updateDashboardStats();
  }

  function updateServerInfoUI() {
    document.getElementById('setVersion').textContent = serverInfo.version;
    document.getElementById('setPlatform').textContent = serverInfo.platform;
    document.getElementById('setExecPath').textContent = serverInfo.execPath || '—';
    if (currentPage === 'clients') renderClients();
  }

  function updateDashboardStats() {
    document.getElementById('statTools').textContent = String(manifests.length);
    document.getElementById('statRequests').textContent = String(requestCount);
    document.getElementById('statErrors').textContent = String(errorCount);
    document.getElementById('setToolsCount').textContent = String(manifests.length);
  }

  function formatUptime(ms) {
    var s = Math.floor(ms / 1000);
    if (s < 60) return s + 's';
    var m = Math.floor(s / 60);
    s = s % 60;
    if (m < 60) return m + 'm ' + s + 's';
    var h = Math.floor(m / 60);
    m = m % 60;
    if (h < 24) return h + 'h ' + m + 'm';
    var d = Math.floor(h / 24);
    h = h % 24;
    return d + 'd ' + h + 'h';
  }

  function updateUptime() {
    var elapsed = Date.now() - startTime;
    var formatted = formatUptime(elapsed);
    document.getElementById('statUptime').textContent = formatted;
    document.getElementById('setUptime').textContent = formatted;
  }

  uptimeInterval = setInterval(updateUptime, 1000);

  function formatTime(ts) {
    var d = new Date(ts);
    var h = d.getHours();
    var m = d.getMinutes();
    var s = d.getSeconds();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ──── Recent Activity (Dashboard) ──── */
  function renderRecentActivity() {
    var container = document.getElementById('activityList');
    var recent = logs.slice(0, 5);
    if (recent.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">&#x1f4ed;</div>No activity yet. Waiting for requests...</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < recent.length; i++) {
      var log = recent[i];
      var dirSymbol = log.direction === 'in' ? '&#x2192;' : '&#x2190;';
      var dirColor = log.direction === 'in' ? 'color:var(--green)' : 'color:var(--cyan)';
      var badgeClass = log.status === 'error' ? 'badge-error' : (log.status === 'success' ? 'badge-success' : 'badge-pending');
      html += '<div class="activity-item">' +
        '<span class="act-time">' + formatTime(log.timestamp) + '</span>' +
        '<span class="act-dir" style="' + dirColor + '">' + dirSymbol + '</span>' +
        '<span class="act-method">' + escapeHtml(log.method || '—') + '</span>' +
        '<span class="act-badge ' + badgeClass + '">' + escapeHtml(log.status || 'pending') + '</span>' +
        '</div>';
    }
    container.innerHTML = html;
  }

  /* ──── AI Clients ──── */
  function renderClients() {
    var grid = document.getElementById('clientsGrid');
    var ep = serverInfo.execPath || '/path/to/flowpilot';
    var epEscaped = escapeHtml(ep);
    var isWin = serverInfo.platform === 'win32';
    var epJson = ep.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');

    var clients = [
      {
        icon: '&#x1f916;',
        name: 'Claude Desktop',
        desc: 'Add FlowPilot to Claude Desktop for full MCP tool access. Auto-configured on first launch.',
        configPath: isWin ? '%APPDATA%\\\\Claude\\\\claude_desktop_config.json' : '~/Library/Application Support/Claude/claude_desktop_config.json',
        json: '{\\n  "mcpServers": {\\n    "flowpilot": {\\n      "command": "' + epJson + '",\\n      "args": []\\n    }\\n  }\\n}',
        steps: '<strong>1.</strong> Open Claude Desktop settings<br><strong>2.</strong> Navigate to Developer &gt; Edit Config<br><strong>3.</strong> Paste the JSON below and restart Claude'
      },
      {
        icon: '&#x26a1;',
        name: 'Cursor',
        desc: 'Enable FlowPilot in Cursor IDE through MCP server settings.',
        configPath: 'Settings > Features > MCP > Add Server',
        json: '{\\n  "mcpServers": {\\n    "flowpilot": {\\n      "command": "' + epJson + '"\\n    }\\n  }\\n}',
        steps: '<strong>1.</strong> Open Cursor Settings<br><strong>2.</strong> Go to Features &gt; MCP<br><strong>3.</strong> Click "Add Server" and paste the config'
      },
      {
        icon: '&#x1f3c4;',
        name: 'Windsurf (Codeium)',
        desc: 'Connect FlowPilot to Windsurf for AI-powered browser automation.',
        configPath: isWin ? '%USERPROFILE%\\\\.codeium\\\\windsurf\\\\mcp_config.json' : '~/.codeium/windsurf/mcp_config.json',
        json: '{\\n  "mcpServers": {\\n    "flowpilot": {\\n      "command": "' + epJson + '"\\n    }\\n  }\\n}',
        steps: '<strong>1.</strong> Create or edit the config file at the path above<br><strong>2.</strong> Paste the JSON below<br><strong>3.</strong> Restart Windsurf'
      },
      {
        icon: '&#x1f48e;',
        name: 'VS Code (Copilot)',
        desc: 'Add FlowPilot as an MCP server in your VS Code project.',
        configPath: '.vscode/mcp.json (in project root)',
        json: '{\\n  "servers": {\\n    "flowpilot": {\\n      "type": "stdio",\\n      "command": "' + epJson + '"\\n    }\\n  }\\n}',
        steps: '<strong>1.</strong> Create <strong>.vscode/mcp.json</strong> in your project<br><strong>2.</strong> Paste the JSON below<br><strong>3.</strong> Reload VS Code window'
      },
      {
        icon: '&#x1f52c;',
        name: 'Cline',
        desc: 'Add FlowPilot to the Cline VS Code extension for browser control.',
        configPath: 'Cline Sidebar > MCP Servers > Add',
        json: '{\\n  "mcpServers": {\\n    "flowpilot": {\\n      "command": "' + epJson + '"\\n    }\\n  }\\n}',
        steps: '<strong>1.</strong> Open the Cline sidebar in VS Code<br><strong>2.</strong> Click MCP Servers &gt; Add<br><strong>3.</strong> Paste the config JSON'
      },
      {
        icon: '&#x2728;',
        name: 'Zed',
        desc: 'Register FlowPilot as a context server in the Zed editor.',
        configPath: isWin ? '%APPDATA%\\\\Zed\\\\settings.json' : '~/.config/zed/settings.json',
        json: '{\\n  "context_servers": {\\n    "flowpilot": {\\n      "command": {\\n        "path": "' + epJson + '"\\n      }\\n    }\\n  }\\n}',
        steps: '<strong>1.</strong> Open your Zed settings file<br><strong>2.</strong> Add the context_servers block<br><strong>3.</strong> Restart Zed'
      },
      {
        icon: '&#x1f300;',
        name: 'Gemini CLI / Antigravity',
        desc: 'Connect FlowPilot to Google Gemini CLI or Antigravity.',
        configPath: isWin ? '%USERPROFILE%\\\\.gemini\\\\settings.json' : '~/.gemini/settings.json',
        json: '{\\n  "mcpServers": [\\n    {\\n      "name": "flowpilot",\\n      "command": "' + epJson + '"\\n    }\\n  ]\\n}',
        steps: '<strong>1.</strong> Create or edit the settings file<br><strong>2.</strong> Add the mcpServers array entry<br><strong>3.</strong> Restart Gemini CLI'
      },
      {
        icon: '&#x1f527;',
        name: 'Generic / Custom CLI',
        desc: 'Any MCP-compatible client. Use stdio transport or connect via WebSocket.',
        configPath: 'N/A — see details below',
        json: 'Command: ' + epEscaped + '\\nTransport: stdio\\n\\nFor programmatic access:\\nWebSocket: ws://localhost:7865',
        steps: '<strong>Command:</strong> ' + epEscaped + '<br><strong>Transport:</strong> stdio<br><strong>WebSocket:</strong> ws://localhost:7865'
      }
    ];

    var html = '';
    for (var i = 0; i < clients.length; i++) {
      var c = clients[i];
      var codeId = 'clientCode' + i;
      html += '<div class="client-card glass">' +
        '<div class="client-head">' +
          '<div class="client-icon">' + c.icon + '</div>' +
          '<div class="client-name">' + c.name + '</div>' +
        '</div>' +
        '<div class="client-desc">' + c.desc + '</div>' +
        '<div class="config-label">Config Location</div>' +
        '<div class="config-path">' + c.configPath + '</div>' +
        '<div class="config-label" style="margin-top:12px">Configuration</div>' +
        '<div class="code-block" id="' + codeId + '">' +
          '<button class="copy-btn" onclick="copyCode(' + String.fromCharCode(39) + codeId + String.fromCharCode(39) + ', this)">Copy</button>' +
          c.json.replace(/\\\\n/g, String.fromCharCode(10)) +
        '</div>' +
        '<div class="steps">' + c.steps + '</div>' +
        '</div>';
    }
    grid.innerHTML = html;
  }

  window.copyCode = function(id, btn) {
    var el = document.getElementById(id);
    if (!el) return;
    var text = el.textContent.replace('Copy', '').replace('Copied!', '').trim();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function() {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      });
    }
  };

  /* ──── Route Explorer ──── */
  function renderExplorer() {
    var container = document.getElementById('explorerContent');

    if (!extensionConnected) {
      container.innerHTML = '<div class="disconnected-state">' +
        '<div class="disc-icon">&#x1f50c;</div>' +
        '<h3>Extension Not Connected</h3>' +
        '<p>The FlowPilot Chrome extension must be running and connected to browse available tools.</p>' +
        '</div>';
      return;
    }

    if (manifests.length === 0) {
      container.innerHTML = '<div class="disconnected-state">' +
        '<div class="disc-icon">&#x1f4e6;</div>' +
        '<h3>No Tools Registered</h3>' +
        '<p>The extension is connected but no tool manifests have been received yet.</p>' +
        '</div>';
      return;
    }

    /* Gather categories */
    var cats = {};
    for (var c = 0; c < manifests.length; c++) {
      var cat = manifests[c].category || 'other';
      cats[cat] = (cats[cat] || 0) + 1;
    }
    var catKeys = Object.keys(cats).sort();

    /* Build toolbar */
    var html = '<div class="explorer-toolbar">' +
      '<div class="search-wrap">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        '<input class="search-box" type="text" placeholder="Search tools..." id="explorerSearch" oninput="filterTools()">' +
      '</div>' +
      '<div class="cat-tabs">' +
        '<div class="cat-tab active" onclick="filterByCategory(' + String.fromCharCode(39) + 'all' + String.fromCharCode(39) + ', this)">All (' + manifests.length + ')</div>';

    for (var k = 0; k < catKeys.length; k++) {
      html += '<div class="cat-tab" onclick="filterByCategory(' + String.fromCharCode(39) + catKeys[k] + String.fromCharCode(39) + ', this)">' + catKeys[k] + ' (' + cats[catKeys[k]] + ')</div>';
    }
    html += '</div></div>';

    html += '<div class="tools-grid" id="toolsGrid">';
    for (var t = 0; t < manifests.length; t++) {
      html += buildToolCard(manifests[t], t);
    }
    html += '</div>';

    container.innerHTML = html;
  }

  function buildToolCard(manifest, idx) {
    var isExpanded = (expandedTool === idx);
    var cls = 'tool-card glass' + (isExpanded ? ' expanded' : '');
    var html = '<div class="' + cls + '" data-index="' + idx + '" data-category="' + escapeHtml(manifest.category || 'other') + '" onclick="toggleTool(' + idx + ', event)">' +
      '<div class="tool-head">' +
        '<span class="tool-type">' + escapeHtml(manifest.type || '—') + '</span>' +
        '<span class="tool-label">' + escapeHtml(manifest.label || manifest.type || '—') + '</span>' +
        '<span class="tool-cat">' + escapeHtml(manifest.category || 'other') + '</span>' +
      '</div>' +
      '<div class="tool-desc">' + escapeHtml(manifest.description || 'No description available.') + '</div>';

    if (isExpanded) {
      html += buildToolDetail(manifest, idx);
    }

    html += '</div>';
    return html;
  }

  function buildToolDetail(manifest, idx) {
    var state = manifest.initialState || {};
    var keys = Object.keys(state);
    var html = '<div class="tool-detail" onclick="event.stopPropagation()">';

    if (keys.length > 0) {
      html += '<div class="form-grid">';
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = state[key];
        var valType = typeof val;
        html += '<div class="form-group">';
        html += '<label>' + escapeHtml(key) + '</label>';

        if (valType === 'boolean') {
          html += '<select data-param="' + escapeHtml(key) + '" onchange="syncFormToRaw(' + idx + ')">' +
            '<option value="true"' + (val ? ' selected' : '') + '>true</option>' +
            '<option value="false"' + (!val ? ' selected' : '') + '>false</option>' +
            '</select>';
        } else if (valType === 'number') {
          html += '<input type="number" data-param="' + escapeHtml(key) + '" value="' + val + '" onchange="syncFormToRaw(' + idx + ')">';
        } else if (valType === 'object') {
          html += '<textarea data-param="' + escapeHtml(key) + '" onchange="syncFormToRaw(' + idx + ')">' + escapeHtml(JSON.stringify(val, null, 2)) + '</textarea>';
        } else {
          html += '<input type="text" data-param="' + escapeHtml(key) + '" value="' + escapeHtml(String(val)) + '" onchange="syncFormToRaw(' + idx + ')">';
        }

        html += '</div>';
      }
      html += '</div>';
    }

    /* Raw JSON textarea */
    var rawJson = JSON.stringify(state, null, 2);
    html += '<div class="raw-json-section">' +
      '<label>Raw JSON Params</label>' +
      '<textarea id="rawJson' + idx + '" onchange="syncRawToForm(' + idx + ')">' + escapeHtml(rawJson) + '</textarea>' +
      '</div>';

    html += '<div class="test-actions">' +
      '<button class="btn btn-primary btn-sm" onclick="executeTest(' + idx + ')">&#x25b6; Execute Test</button>' +
      '<span style="font-size:12px;color:var(--text-muted)">Sends request to extension via server</span>' +
      '</div>';

    html += '<div id="testResult' + idx + '"></div>';

    html += '</div>';
    return html;
  }

  window.toggleTool = function(idx, evt) {
    if (expandedTool === idx) {
      expandedTool = null;
    } else {
      expandedTool = idx;
    }
    renderExplorer();
  };

  window.syncFormToRaw = function(idx) {
    var card = document.querySelector('.tool-card[data-index="' + idx + '"]');
    if (!card) return;
    var inputs = card.querySelectorAll('[data-param]');
    var obj = {};
    for (var i = 0; i < inputs.length; i++) {
      var key = inputs[i].getAttribute('data-param');
      var tag = inputs[i].tagName.toLowerCase();
      var rawVal = inputs[i].value;

      if (tag === 'select') {
        obj[key] = rawVal === 'true';
      } else if (inputs[i].type === 'number') {
        obj[key] = Number(rawVal);
      } else if (tag === 'textarea') {
        try { obj[key] = JSON.parse(rawVal); } catch (e) { obj[key] = rawVal; }
      } else {
        obj[key] = rawVal;
      }
    }
    var rawEl = document.getElementById('rawJson' + idx);
    if (rawEl) rawEl.value = JSON.stringify(obj, null, 2);
  };

  window.syncRawToForm = function(idx) {
    var rawEl = document.getElementById('rawJson' + idx);
    if (!rawEl) return;
    var obj;
    try { obj = JSON.parse(rawEl.value); } catch (e) { return; }
    var card = document.querySelector('.tool-card[data-index="' + idx + '"]');
    if (!card) return;
    var inputs = card.querySelectorAll('[data-param]');
    for (var i = 0; i < inputs.length; i++) {
      var key = inputs[i].getAttribute('data-param');
      if (obj.hasOwnProperty(key)) {
        var val = obj[key];
        if (typeof val === 'object') {
          inputs[i].value = JSON.stringify(val, null, 2);
        } else {
          inputs[i].value = String(val);
        }
      }
    }
  };

  window.executeTest = function(idx) {
    var manifest = manifests[idx];
    if (!manifest) return;
    var rawEl = document.getElementById('rawJson' + idx);
    var params = {};
    if (rawEl) {
      try { params = JSON.parse(rawEl.value); } catch (e) { params = {}; }
    }

    var resultDiv = document.getElementById('testResult' + idx);
    if (resultDiv) {
      resultDiv.innerHTML = '<div class="result-panel pending">Executing...</div>';
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'route_test_request',
        method: manifest.type || manifest.label,
        params: params
      }));
    } else {
      if (resultDiv) {
        resultDiv.innerHTML = '<div class="result-panel error">WebSocket not connected</div>';
      }
    }
  };

  function renderTestResult(msg) {
    /* Find the currently expanded tool result div */
    if (expandedTool === null) return;
    var resultDiv = document.getElementById('testResult' + expandedTool);
    if (!resultDiv) return;

    if (msg.success) {
      resultDiv.innerHTML = '<div class="result-panel success">' + escapeHtml(JSON.stringify(msg.result, null, 2)) + '</div>';
    } else {
      resultDiv.innerHTML = '<div class="result-panel error">' + escapeHtml(msg.error || 'Unknown error') + '</div>';
    }
  }

  window.filterTools = function() {
    var query = (document.getElementById('explorerSearch') || {}).value || '';
    query = query.toLowerCase();
    var cards = document.querySelectorAll('.tool-card');
    for (var i = 0; i < cards.length; i++) {
      var text = cards[i].textContent.toLowerCase();
      cards[i].style.display = text.indexOf(query) >= 0 ? '' : 'none';
    }
  };

  var currentCatFilter = 'all';
  window.filterByCategory = function(cat, btn) {
    currentCatFilter = cat;
    var tabs = document.querySelectorAll('.cat-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    if (btn) btn.classList.add('active');

    var cards = document.querySelectorAll('.tool-card');
    for (var j = 0; j < cards.length; j++) {
      if (cat === 'all') {
        cards[j].style.display = '';
      } else {
        cards[j].style.display = cards[j].getAttribute('data-category') === cat ? '' : 'none';
      }
    }
  };

  /* ──── Request Stream (Logs) ──── */
  window.renderLogs = function() {
    var container = document.getElementById('logList');
    var search = (document.getElementById('logSearch') || {}).value || '';
    search = search.toLowerCase();
    var counterEl = document.getElementById('logCounter');

    var filtered = logs;
    if (search) {
      filtered = [];
      for (var f = 0; f < logs.length; f++) {
        var txt = (logs[f].method || '') + ' ' + (logs[f].status || '');
        if (txt.toLowerCase().indexOf(search) >= 0) filtered.push(logs[f]);
      }
    }

    counterEl.textContent = String(filtered.length);

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">&#x1f4e1;</div>No log entries yet. Activity will appear here in real-time.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var log = filtered[i];
      var dirClass = log.direction === 'in' ? 'in' : 'out';
      var dirSymbol = log.direction === 'in' ? '&#x2192;' : '&#x2190;';
      var badgeClass = log.status === 'error' ? 'badge-error' : (log.status === 'success' ? 'badge-success' : 'badge-pending');
      var logId = 'logExp' + i;

      html += '<div class="log-entry" onclick="toggleLogExpand(' + String.fromCharCode(39) + logId + String.fromCharCode(39) + ')">' +
        '<span class="log-time">' + formatTime(log.timestamp) + '</span>' +
        '<span class="log-dir ' + dirClass + '">' + dirSymbol + '</span>' +
        '<span class="log-method">' + escapeHtml(log.method || '—') + '</span>' +
        '<span class="log-status ' + badgeClass + '">' + escapeHtml(log.status || 'pending') + '</span>' +
        '</div>';

      var expandContent = '';
      if (log.direction === 'in' && log.params) {
        expandContent = 'Params:\\n' + JSON.stringify(log.params, null, 2);
      } else if (log.result) {
        expandContent = 'Result:\\n' + JSON.stringify(log.result, null, 2);
      } else if (log.error) {
        expandContent = 'Error:\\n' + (typeof log.error === 'string' ? log.error : JSON.stringify(log.error, null, 2));
      } else {
        expandContent = 'No payload data';
      }
      html += '<div class="log-expanded" id="' + logId + '">' + escapeHtml(expandContent).replace(/\\\\n/g, String.fromCharCode(10)) + '</div>';
    }

    container.innerHTML = html;
  };

  window.toggleLogExpand = function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('show');
  };

  window.clearLogs = function() {
    logs = [];
    requestCount = 0;
    errorCount = 0;
    updateDashboardStats();
    renderRecentActivity();
    renderLogs();
  };

  /* ──── Helpers ──── */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ──── Init ──── */
  connectWS();
  renderClients();
  updateUptime();

})();
</script>
</body>
</html>`;
