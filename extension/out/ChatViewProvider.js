"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatViewProvider = void 0;
const vscode = __importStar(require("vscode"));
class ChatViewProvider {
    _extensionUri;
    _context;
    static viewType = 'contextos.chatView';
    _view;
    _currentConversationId;
    constructor(_extensionUri, _context) {
        this._extensionUri = _extensionUri;
        this._context = _context;
    }
    resolveWebviewView(webviewView, _ctx, _token) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
        webviewView.webview.html = this._getHtmlForWebview();
        webviewView.webview.onDidReceiveMessage(async (data) => {
            if (data.type === 'prompt') {
                await this._handlePrompt(data.value, webviewView);
            }
            else if (data.type === 'clearHistory') {
                this._currentConversationId = undefined;
            }
            else if (data.type === 'copyCode') {
                await vscode.env.clipboard.writeText(data.value);
                webviewView.webview.postMessage({ type: 'codeCopied', id: data.id });
            }
            else if (data.type === 'copyMsg') {
                await vscode.env.clipboard.writeText(data.value);
            }
        });
    }
    async _handlePrompt(question, webviewView) {
        const post = (msg) => webviewView.webview.postMessage(msg);
        const apiKey = await this._context.secrets.get('contextos_api_key');
        if (!apiKey) {
            post({ type: 'error', value: 'No API key found.\n\nRun **ContextOS: Set API Key** from the Command Palette (Ctrl+Shift+P).' });
            return;
        }
        const config = vscode.workspace.getConfiguration('contextos');
        const apiUrl = config.get('apiUrl') || 'http://localhost:8000';
        try {
            post({ type: 'thinking', value: 'Thinking…' });
            const res = await fetch(`${apiUrl}/api/v1/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                body: JSON.stringify({ question, stream: true, conversation_id: this._currentConversationId ?? null }),
            });
            if (!res.ok) {
                const body = await res.text().catch(() => res.statusText);
                post({ type: 'error', value: `Server error ${res.status}: ${body}` });
                return;
            }
            if (!res.body) {
                post({ type: 'error', value: 'Empty response.' });
                return;
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop() ?? '';
                for (const part of parts) {
                    for (const line of part.split('\n')) {
                        const t = line.trim();
                        if (!t.startsWith('data: '))
                            continue;
                        const jsonStr = t.slice(6).trim();
                        if (!jsonStr || jsonStr === '[DONE]')
                            continue;
                        try {
                            const p = JSON.parse(jsonStr);
                            if (p.event === 'thinking')
                                post({ type: 'thinking', value: p.message || 'Thinking…' });
                            else if (p.event === 'searching')
                                post({ type: 'searching', source: p.source, count: p.count });
                            else if (p.event === 'token')
                                post({ type: 'token', value: p.content });
                            else if (p.event === 'sources')
                                post({ type: 'sources', sources: p.sources });
                            else if (p.event === 'done') {
                                if (p.conversation_id)
                                    this._currentConversationId = p.conversation_id;
                                post({ type: 'done' });
                            }
                            else if (p.event === 'error')
                                post({ type: 'error', value: p.message });
                        }
                        catch { /* skip malformed */ }
                    }
                }
            }
        }
        catch (e) {
            post({ type: 'error', value: e?.message ?? String(e) });
        }
    }
    sendContextToChat(ctx) {
        if (this._view) {
            this._view.show?.(true);
            this._view.webview.postMessage({ type: 'addContext', value: ctx });
        }
    }
    _getHtmlForWebview() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:;">
<title>ContextOS</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --brand:#f59e0b;--brand-l:#fbbf24;--brand-dim:rgba(245,158,11,.09);--brand-b:rgba(245,158,11,.2);
  --bg:#0b0b0e;--s1:#111115;--s2:#18181d;--s3:#222229;
  --fg:#e0e0d8;--fg2:#888890;--fg3:#3a3a42;
  --bd:rgba(255,255,255,.06);--bd2:rgba(255,255,255,.11);
  --err:#f87171;--ok:#34d399;--pu:#8b5cf6;
  --r:11px;--r2:7px;
  --font:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  --mono:'Cascadia Code','Fira Code','Consolas',monospace;
}
html,body{height:100%;overflow:hidden}
body{font-family:var(--font);font-size:13px;line-height:1.6;color:var(--fg);background:var(--bg);display:flex;flex-direction:column;height:100vh}
body::before{content:'';position:fixed;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.015) 1px,transparent 1px);background-size:22px 22px;pointer-events:none;z-index:0}
#hdr,#msgs,#sbar,#ftr{position:relative;z-index:1}

/* Header */
#hdr{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:9px 11px;border-bottom:1px solid var(--bd);background:rgba(11,11,14,.95);backdrop-filter:blur(16px)}
.hdr-l{display:flex;align-items:center;gap:7px}
.logo-svg{flex-shrink:0}
.logo-name{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;background:linear-gradient(135deg,#f59e0b,#fbbf24 60%,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.live-badge{display:inline-flex;align-items:center;gap:3px;padding:1.5px 6px;border-radius:20px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.15);font-size:9px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--brand);-webkit-text-fill-color:var(--brand);background-clip:unset;-webkit-background-clip:unset}
.live-dot{width:4px;height:4px;background:var(--ok);border-radius:50%;animation:pls 2.2s ease-in-out infinite}
@keyframes pls{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
#clearBtn{background:transparent;border:1px solid var(--bd);color:var(--fg2);border-radius:var(--r2);padding:3px 8px;font-size:10px;font-family:var(--font);cursor:pointer;transition:all .14s}
#clearBtn:hover{border-color:var(--brand-b);color:var(--brand);background:var(--brand-dim)}

/* Messages */
#msgs{flex:1;overflow-y:auto;padding:12px 0 4px;display:flex;flex-direction:column;scroll-behavior:smooth}
#msgs::-webkit-scrollbar{width:2px}
#msgs::-webkit-scrollbar-thumb{background:rgba(245,158,11,.12);border-radius:2px}

.mg{padding:10px 12px;display:flex;gap:8px;align-items:flex-start;animation:mi .18s ease-out;position:relative}
@keyframes mi{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.mg:hover{background:rgba(255,255,255,.012)}
.mg.user{flex-direction:row-reverse}

.av{width:23px;height:23px;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;margin-top:2px}
.av-b{background:linear-gradient(135deg,rgba(245,158,11,.2),rgba(249,115,22,.07));border:1px solid rgba(245,158,11,.22)}
.av-u{background:linear-gradient(135deg,rgba(139,92,246,.2),rgba(99,102,241,.07));border:1px solid rgba(139,92,246,.22);color:#a78bfa;font-size:10px;font-weight:700}

.mc{flex:1;min-width:0;max-width:calc(100% - 33px)}
.mg.user .mc{background:linear-gradient(135deg,rgba(245,158,11,.1),rgba(251,191,36,.04));border:1px solid rgba(245,158,11,.16);border-radius:10px 2px 10px 10px;padding:8px 11px;font-size:12.5px;word-break:break-word;white-space:pre-wrap}
.mg.bot .mc{color:var(--fg);word-break:break-word;font-size:12.5px}
.mg.err .mc{background:rgba(248,113,113,.07);border:1px solid rgba(248,113,113,.18);border-radius:2px 10px 10px 10px;padding:8px 11px;color:var(--err);font-size:12px;word-break:break-word}

/* Copy msg button */
.msg-copy{position:absolute;top:8px;right:10px;opacity:0;background:var(--s2);border:1px solid var(--bd);border-radius:5px;padding:2px 6px;font-size:9.5px;color:var(--fg2);cursor:pointer;transition:all .14s;font-family:var(--font)}
.mg:hover .msg-copy{opacity:1}
.msg-copy:hover{border-color:var(--bd2);color:var(--fg)}
.mg.user .msg-copy{right:auto;left:10px}

/* Timestamp */
.ts{font-size:9px;color:var(--fg3);margin-top:4px}

/* Markdown */
.md h1{font-size:15px;font-weight:700;color:#fff;margin:12px 0 6px;border-bottom:1px solid var(--bd);padding-bottom:5px}
.md h2{font-size:13.5px;font-weight:700;color:#fff;margin:10px 0 5px}
.md h3{font-size:12.5px;font-weight:600;color:var(--fg);margin:8px 0 4px}
.md p{margin:0 0 8px}.md p:last-child{margin:0}
.md strong{color:#fff;font-weight:600}.md em{color:var(--fg2);font-style:italic}
.md a{color:var(--brand);text-decoration:none}.md a:hover{text-decoration:underline}
.md ul,.md ol{margin:4px 0 8px 16px}.md li{margin:2px 0;line-height:1.55}
.md hr{border:none;border-top:1px solid var(--bd);margin:10px 0}
.md blockquote{border-left:2px solid var(--brand-b);padding-left:10px;margin:7px 0;color:var(--fg2);font-style:italic}
.md table{width:100%;border-collapse:collapse;margin:8px 0;font-size:11.5px}
.md th{background:var(--s2);color:var(--brand);font-weight:600;text-align:left;padding:5px 8px;border:1px solid var(--bd)}
.md td{padding:4px 8px;border:1px solid var(--bd)}.md tr:nth-child(even) td{background:rgba(255,255,255,.012)}
.md code{font-family:var(--mono);font-size:11px;background:var(--s2);border:1px solid var(--bd);border-radius:4px;padding:1px 4px;color:#fbbf24}

/* Code blocks */
.cb{position:relative;margin:8px 0;border-radius:var(--r);overflow:hidden;border:1px solid var(--bd);background:#0c0c11}
.cb:hover{border-color:var(--bd2)}
.cb-hdr{display:flex;align-items:center;justify-content:space-between;padding:5px 10px;background:var(--s2);border-bottom:1px solid var(--bd)}
.cb-lang{font-family:var(--mono);font-size:9.5px;color:var(--brand);font-weight:600;text-transform:uppercase;letter-spacing:.08em}
.cb-copy{display:flex;align-items:center;gap:3px;padding:2px 6px;border-radius:4px;border:1px solid var(--bd);background:transparent;color:var(--fg2);font-family:var(--font);font-size:9.5px;cursor:pointer;transition:all .14s}
.cb-copy:hover{background:var(--s3);color:var(--fg);border-color:var(--bd2)}
.cb-copy.ok{color:var(--ok);border-color:rgba(52,211,153,.28)}
.cb pre{padding:10px 12px;overflow-x:auto;font-family:var(--mono);font-size:11.5px;line-height:1.65;color:#dde1e8;margin:0;background:transparent;border:none;tab-size:2}
.cb pre::-webkit-scrollbar{height:2px}.cb pre::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
.cb pre code{background:transparent;border:none;padding:0;color:inherit;font-size:inherit}
.kw{color:#c792ea}.str{color:#c3e88d}.cm{color:#546e7a;font-style:italic}.fn{color:#82aaff}.nm{color:#f78c6c}.tp{color:#ffcb6b}.op{color:#89ddff}

/* Sources */
.srcs{margin-top:8px;padding-top:8px;border-top:1px solid var(--bd);display:flex;flex-wrap:wrap;gap:4px}
.src-pill{font-size:9.5px;padding:1.5px 7px;border-radius:20px;background:var(--s2);border:1px solid var(--bd);color:var(--fg2);font-family:var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;transition:all .14s;cursor:default}
.src-pill:hover{border-color:var(--brand-b);color:var(--brand)}

/* Cursor */
.cur{display:inline-block;width:2px;height:.82em;background:var(--brand);margin-left:1px;vertical-align:middle;animation:bl .65s step-end infinite}
@keyframes bl{50%{opacity:0}}

/* Status bar */
#sbar{flex-shrink:0;overflow:hidden;max-height:0;transition:max-height .2s ease;background:rgba(11,11,14,.97);border-top:1px solid transparent}
#sbar.on{max-height:34px;border-top-color:var(--bd)}
.sbar-in{display:flex;align-items:center;gap:7px;padding:7px 12px;font-size:10.5px;color:var(--fg2)}
.spin{width:11px;height:11px;flex-shrink:0;border:1.5px solid rgba(245,158,11,.14);border-top-color:var(--brand);border-radius:50%;animation:sp .6s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.dots{display:flex;gap:2px;align-items:center}
.dots span{width:3px;height:3px;border-radius:50%;background:var(--brand);animation:db 1.1s ease-in-out infinite}
.dots span:nth-child(2){animation-delay:.18s}.dots span:nth-child(3){animation-delay:.36s}
@keyframes db{0%,80%,100%{transform:scale(.65);opacity:.35}40%{transform:scale(1);opacity:1}}
.sbar-chip{font-size:9.5px;padding:1px 6px;border-radius:20px;background:var(--brand-dim);border:1px solid var(--brand-b);color:var(--brand);font-weight:600;font-style:normal;white-space:nowrap;margin-left:auto}

/* Footer */
#ftr{flex-shrink:0;padding:8px 10px 10px;border-top:1px solid var(--bd);background:rgba(11,11,14,.97);backdrop-filter:blur(16px);display:flex;flex-direction:column;gap:5px}
.irow{position:relative;display:flex;align-items:flex-end;background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);transition:border-color .14s,box-shadow .14s}
.irow:focus-within{border-color:rgba(245,158,11,.28);box-shadow:0 0 0 3px rgba(245,158,11,.055)}
textarea{flex:1;background:transparent;color:var(--fg);border:none;padding:9px 42px 9px 11px;font-family:var(--font);font-size:12.5px;resize:none;min-height:42px;max-height:148px;outline:none;line-height:1.5}
textarea::placeholder{color:var(--fg3)}
textarea:disabled{opacity:.3;cursor:not-allowed}
#sndBtn{position:absolute;right:6px;bottom:6px;width:28px;height:28px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;border:none;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity .14s,transform .1s,box-shadow .14s;box-shadow:0 2px 8px rgba(245,158,11,.28)}
#sndBtn:hover:not(:disabled){opacity:.88;box-shadow:0 3px 12px rgba(245,158,11,.42)}
#sndBtn:active:not(:disabled){transform:scale(.91)}
#sndBtn:disabled{opacity:.2;cursor:not-allowed;box-shadow:none}
.fmeta{display:flex;align-items:center;justify-content:space-between;padding:0 1px}
.hint{font-size:9.5px;color:var(--fg3)}
.mtag{font-size:9.5px;color:var(--brand);font-weight:600;opacity:.6;display:flex;align-items:center;gap:3px}

/* Welcome */
.welcome{padding:20px 14px 10px;text-align:center;animation:mi .25s ease-out}
.wlogo{margin:0 auto 11px;display:flex;align-items:center;justify-content:center}
.welcome h2{font-size:14.5px;font-weight:700;color:#fff;margin-bottom:5px}
.welcome p{font-size:11.5px;color:var(--fg2);line-height:1.55;margin-bottom:14px}
.chips{display:flex;flex-wrap:wrap;gap:5px;justify-content:center}
.chip{padding:4px 10px;border-radius:20px;font-size:10.5px;border:1px solid var(--bd);color:var(--fg2);background:var(--s2);cursor:pointer;transition:all .14s;white-space:nowrap}
.chip:hover{border-color:var(--brand-b);color:var(--brand);background:var(--brand-dim)}

/* Context banner */
.ctxban{margin:4px 12px;padding:7px 10px;border-radius:var(--r2);background:rgba(139,92,246,.07);border:1px solid rgba(139,92,246,.2);font-size:11px;color:var(--fg2);display:flex;align-items:center;gap:6px;animation:mi .18s ease-out}

/* Divider */
.day-div{display:flex;align-items:center;gap:8px;padding:6px 14px;margin:4px 0}
.day-div::before,.day-div::after{content:'';flex:1;height:1px;background:var(--bd)}
.day-div span{font-size:9.5px;color:var(--fg3);white-space:nowrap}
</style>
</head>
<body>

<div id="hdr">
  <div class="hdr-l">
    <svg class="logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="22" height="22">
      <defs>
        <linearGradient id="lc" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient>
        <linearGradient id="lh" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient>
      </defs>
      <path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50" fill="none" stroke="url(#lc)" stroke-width="5.5" stroke-linecap="round"/>
      <circle cx="17" cy="32" r="4" fill="#f59e0b"/>
      <g transform="translate(37,32)">
        <path d="M0,-13 L11,-6.5 L11,6.5 L0,13 L-11,6.5 L-11,-6.5 Z" fill="none" stroke="url(#lh)" stroke-width="2.5" stroke-linejoin="round"/>
        <line x1="-6" y1="-3.5" x2="6" y2="-3.5" stroke="url(#lh)" stroke-width="2" stroke-linecap="round"/>
        <line x1="-6" y1="0" x2="6" y2="0" stroke="url(#lh)" stroke-width="2" stroke-linecap="round"/>
        <line x1="-6" y1="3.5" x2="6" y2="3.5" stroke="url(#lh)" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>
    <span class="logo-name">ContextOS</span>
    <span class="live-badge"><span class="live-dot"></span>Live</span>
  </div>
  <button id="clearBtn">New chat</button>
</div>

<div id="msgs">
  <div class="welcome" id="welcome">
    <div class="wlogo">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="44" height="44">
        <defs>
          <linearGradient id="wc" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient>
          <linearGradient id="wh" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient>
        </defs>
        <path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50" fill="none" stroke="url(#wc)" stroke-width="5.5" stroke-linecap="round"/>
        <circle cx="17" cy="32" r="4.5" fill="#f59e0b"/>
        <g transform="translate(37,32)">
          <path d="M0,-15 L13,-7.5 L13,7.5 L0,15 L-13,7.5 L-13,-7.5 Z" fill="none" stroke="url(#wh)" stroke-width="2.5" stroke-linejoin="round"/>
          <line x1="-7" y1="-4" x2="7" y2="-4" stroke="url(#wh)" stroke-width="2" stroke-linecap="round"/>
          <line x1="-7" y1="0" x2="7" y2="0" stroke="url(#wh)" stroke-width="2" stroke-linecap="round"/>
          <line x1="-7" y1="4" x2="7" y2="4" stroke="url(#wh)" stroke-width="2" stroke-linecap="round"/>
        </g>
      </svg>
    </div>
    <h2>ContextOS Assistant</h2>
    <p>Your project-aware AI. Ask about code, commits,<br>docs, or anything in your workspace.</p>
    <div class="chips" id="chips">
      <span class="chip">What did I last commit?</span>
      <span class="chip">Explain this codebase</span>
      <span class="chip">What's in my Notion?</span>
      <span class="chip">Review open PRs</span>
      <span class="chip">Write a unit test</span>
      <span class="chip">Find bugs in this file</span>
    </div>
  </div>
</div>

<div id="sbar"><div class="sbar-in" id="sbar-in"></div></div>

<div id="ftr">
  <div class="irow">
    <textarea id="inp" placeholder="Ask anything… (Shift+Enter for new line)" rows="1"></textarea>
    <button id="sndBtn" title="Send (Enter)">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    </button>
  </div>
  <div class="fmeta">
    <span class="hint">Enter · Shift+Enter new line</span>
    <span class="mtag"><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>GPT-4o</span>
  </div>
</div>

<script>
(function(){
'use strict';
var vscode = acquireVsCodeApi();
var msgsEl = document.getElementById('msgs');
var inp    = document.getElementById('inp');
var sndBtn = document.getElementById('sndBtn');
var sbar   = document.getElementById('sbar');
var sbarIn = document.getElementById('sbar-in');
var clearBtn = document.getElementById('clearBtn');

var bot = null;     // current streaming bot: {group, mc, rawEl, cur}
var busy = false;
var codeIdx = 0;    // GLOBAL counter — never resets, prevents ID collisions
var codeMap = {};   // id -> raw code string

/* ── helpers ── */
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function now(){ var d=new Date(); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0') }
function scrollBot(force){
  var near = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 100;
  if(force||near) msgsEl.scrollTop = msgsEl.scrollHeight;
}
function lock(v){ busy=v; sndBtn.disabled=v; inp.disabled=v; }

/* ── status bar ── */
function showStatus(phase, chip){
  sbar.classList.add('on');
  var icon = phase==='searching'
    ? '<div class="spin"></div>'
    : phase==='generating'
    ? '<div class="dots"><span></span><span></span><span></span></div>'
    : '<div class="spin"></div>';
  var label = {thinking:'Thinking…',searching:'Searching context…',generating:'Generating response…'}[phase]||phase;
  var chipHtml = chip ? '<span class="sbar-chip">'+esc(chip)+'</span>' : '';
  sbarIn.innerHTML = icon + '<span style="font-style:italic">'+esc(label)+'</span>' + chipHtml;
}
function hideStatus(){ sbar.classList.remove('on'); sbarIn.innerHTML=''; }

/* ── markdown renderer ── */
function renderMd(raw){
  var localBlocks=[];
  var text=raw;

  // extract fenced code blocks
  text=text.replace(/\x60\x60\x60(\w*)\n?([\s\S]*?)\x60\x60\x60/g,function(_,lang,code){
    var id='cb'+codeIdx++;
    var trimmed=code.replace(/\n$/,'');
    codeMap[id]=trimmed;
    localBlocks.push({id:id,lang:lang||'code',code:trimmed});
    return 'CBPH_'+(localBlocks.length-1)+'_END';
  });

  // escape html
  text=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // block elements
  text=text.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  text=text.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  text=text.replace(/^# (.+)$/gm,'<h1>$1</h1>');
  text=text.replace(/^(-{3,}|={3,})$/gm,'<hr>');
  text=text.replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>');

  // tables
  text=text.replace(/((\|.+\|\n)+)/g,function(tbl){
    var rows=tbl.trim().split('\n');
    var hdrs=rows[0].split('|').filter(function(c){return c.trim();});
    if(rows.length<2||!/^\|?[-| :]+\|?$/.test(rows[1]))return tbl;
    var h='<table><thead><tr>';
    hdrs.forEach(function(c){h+='<th>'+c.trim()+'</th>';});
    h+='</tr></thead><tbody>';
    for(var i=2;i<rows.length;i++){var cells=rows[i].split('|').slice(1);if(!cells.length)continue;h+='<tr>';cells.forEach(function(c){h+='<td>'+(c||'').trim()+'</td>';});h+='</tr>';}
    return h+'</tbody></table>';
  });

  // lists
  text=text.replace(/^[ \t]*[\*\-] (.+)$/gm,'<li>$1</li>');
  text=text.replace(/^[ \t]*\d+\. (.+)$/gm,'<li class="ol">$1</li>');
  text=text.replace(/(<li class="ol">[\s\S]*?<\/li>\n?)+/g,function(m){return'<ol>'+m+'</ol>';});
  text=text.replace(/(<li>[\s\S]*?<\/li>\n?)+/g,function(m){return m.indexOf('class="ol"')===-1?'<ul>'+m+'</ul>':m;});

  // inline
  text=text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  text=text.replace(/\*(.+?)\*/g,'<em>$1</em>');
  text=text.replace(/\x60([^\x60]+)\x60/g,'<code>$1</code>');
  text=text.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank">$1</a>');

  // paragraphs
  text=text.split(/\n\n+/).map(function(p){
    p=p.trim(); if(!p)return'';
    if(/^(<h[1-3]|<ul|<ol|<li|<table|<blockquote|<hr|CBPH_)/.test(p))return p;
    return'<p>'+p.replace(/\n/g,'<br>')+'</p>';
  }).join('');

  // restore code blocks
  text=text.replace(/CBPH_(\d+)_END/g,function(_,i){
    var b=localBlocks[parseInt(i)];if(!b)return'';
    var escaped=b.code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return'<div class="cb">'+
      '<div class="cb-hdr"><span class="cb-lang">'+esc(b.lang)+'</span>'+
      '<button class="cb-copy" data-id="'+b.id+'" onclick="copyCode(this)">&#x2398; Copy</button></div>'+
      '<pre><code>'+escaped+'</code></pre></div>';
  });
  return text;
}

window.copyCode=function(btn){
  var id=btn.getAttribute('data-id');
  vscode.postMessage({type:'copyCode',id:id,value:codeMap[id]||''});
};

/* ── message builders ── */
function clearWelcome(){ var w=document.getElementById('welcome'); if(w)w.remove(); }

var BOT_AV = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="13" height="13"><defs><linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><path d="M28 14C16 14 10 21 10 32c0 11 6 18 18 18" fill="none" stroke="url(#ag)" stroke-width="6" stroke-linecap="round"/><circle cx="17" cy="32" r="4" fill="#f59e0b"/><g transform="translate(37,32)"><path d="M0,-13 L11,-6.5 L11,6.5 L0,13 L-11,6.5 L-11,-6.5Z" fill="none" stroke="url(#ag)" stroke-width="2.5" stroke-linejoin="round"/><line x1="-6" y1="-3.5" x2="6" y2="-3.5" stroke="url(#ag)" stroke-width="2" stroke-linecap="round"/><line x1="-6" y1="0" x2="6" y2="0" stroke="url(#ag)" stroke-width="2" stroke-linecap="round"/><line x1="-6" y1="3.5" x2="6" y2="3.5" stroke="url(#ag)" stroke-width="2" stroke-linecap="round"/></g></svg>';

function addUser(text){
  clearWelcome();
  var g=document.createElement('div'); g.className='mg user';
  var av=document.createElement('div'); av.className='av av-u'; av.textContent='U';
  var mc=document.createElement('div'); mc.className='mc'; mc.textContent=text;
  var cp=document.createElement('button'); cp.className='msg-copy'; cp.textContent='Copy';
  cp.onclick=function(){ vscode.postMessage({type:'copyMsg',value:text}); cp.textContent='Copied!'; setTimeout(function(){cp.textContent='Copy';},1800); };
  var ts=document.createElement('div'); ts.className='ts'; ts.textContent=now();
  var right=document.createElement('div'); right.style.flex='1'; right.style.minWidth='0'; right.style.maxWidth='calc(100% - 33px)';
  right.appendChild(mc); right.appendChild(ts);
  g.appendChild(av); g.appendChild(right); g.appendChild(cp);
  msgsEl.appendChild(g); scrollBot(true);
}

function startBot(){
  clearWelcome();
  var g=document.createElement('div'); g.className='mg bot';
  var av=document.createElement('div'); av.className='av av-b'; av.innerHTML=BOT_AV;
  var mc=document.createElement('div'); mc.className='mc md';
  var raw=document.createElement('span'); raw.className='raw';
  var cur=document.createElement('span'); cur.className='cur';
  mc.appendChild(raw); mc.appendChild(cur);
  g.appendChild(av); g.appendChild(mc);
  msgsEl.appendChild(g); scrollBot(true);
  return {group:g, mc:mc, rawEl:raw, cur:cur};
}

function addErr(text){
  var g=document.createElement('div'); g.className='mg err';
  var av=document.createElement('div'); av.className='av av-b'; av.innerHTML=BOT_AV;
  var mc=document.createElement('div'); mc.className='mc'; mc.innerHTML='<strong>Error</strong><br>'+esc(text);
  g.appendChild(av); g.appendChild(mc); msgsEl.appendChild(g); scrollBot(true);
}

function addSources(sources, container){
  if(!sources||!sources.length)return;
  var w=document.createElement('div'); w.className='srcs';
  sources.slice(0,8).forEach(function(s){
    var p=document.createElement('span'); p.className='src-pill';
    var lbl=s.source||s.title||s.id||'source';
    p.textContent='📎 '+String(lbl).slice(0,36); p.title=String(lbl);
    w.appendChild(p);
  });
  container.appendChild(w);
}

function finishBot(){
  if(!bot)return;
  var raw=bot.rawEl.textContent||'';
  bot.cur.remove(); bot.rawEl.remove();
  bot.mc.innerHTML=renderMd(raw);
  // add copy button
  var cp=document.createElement('button'); cp.className='msg-copy'; cp.textContent='Copy';
  cp.onclick=function(){ vscode.postMessage({type:'copyMsg',value:raw}); cp.textContent='Copied!'; setTimeout(function(){cp.textContent='Copy';},1800); };
  bot.group.appendChild(cp);
  // timestamp
  var ts=document.createElement('div'); ts.className='ts'; ts.style.marginTop='4px'; ts.textContent=now();
  bot.mc.appendChild(ts);
  bot=null;
}

/* ── message receiver ── */
window.addEventListener('message',function(ev){
  var m=ev.data;
  switch(m.type){
    case 'thinking':
      showStatus('thinking',null);
      if(!bot)bot=startBot();
      break;
    case 'searching':
      showStatus('searching', m.source?(m.source+(m.count?' ('+m.count+')':'')):null);
      if(!bot)bot=startBot();
      break;
    case 'token':
      hideStatus();
      if(!bot)bot=startBot();
      bot.rawEl.textContent+=m.value;
      scrollBot(false);
      break;
    case 'sources':
      if(bot) addSources(m.sources, bot.mc);
      break;
    case 'done':
      hideStatus();
      finishBot();
      lock(false); inp.focus();
      break;
    case 'error':
      hideStatus();
      if(bot){ bot.cur.remove(); bot.group.remove(); bot=null; }
      addErr(m.value||'Unknown error');
      lock(false); break;
    case 'codeCopied':
      var btn=msgsEl.querySelector('.cb-copy[data-id="'+m.id+'"]');
      if(btn){ btn.textContent='✓ Copied'; btn.classList.add('ok'); setTimeout(function(){btn.textContent='⌘ Copy'; btn.classList.remove('ok');},2000); }
      break;
    case 'addContext':
      var ban=document.createElement('div'); ban.className='ctxban';
      ban.innerHTML='<span style="color:#a78bfa;font-size:12px">📌</span><span style="font-size:11px;color:#a78bfa">Context from editor attached</span>';
      msgsEl.appendChild(ban);
      inp.value=(inp.value?'[Context]\n'+m.value+'\n\n'+inp.value:'[Context]\n'+m.value+'\n\n');
      autoSize(); inp.focus(); scrollBot(true);
      break;
  }
});

/* ── send ── */
function send(){
  var text=inp.value.trim(); if(!text||busy)return;
  addUser(text); inp.value=''; autoSize(); lock(true); bot=null;
  vscode.postMessage({type:'prompt',value:text});
}
sndBtn.addEventListener('click',send);
inp.addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} });
function autoSize(){ inp.style.height='auto'; inp.style.height=Math.min(inp.scrollHeight,148)+'px'; }
inp.addEventListener('input',autoSize);

/* ── clear ── */
clearBtn.addEventListener('click',function(){
  msgsEl.innerHTML='<div class="welcome" id="welcome"><div class="wlogo"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="44" height="44"><defs><linearGradient id="wc2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient><linearGradient id="wh2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs><path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50" fill="none" stroke="url(#wc2)" stroke-width="5.5" stroke-linecap="round"/><circle cx="17" cy="32" r="4.5" fill="#f59e0b"/><g transform="translate(37,32)"><path d="M0,-15 L13,-7.5 L13,7.5 L0,15 L-13,7.5 L-13,-7.5 Z" fill="none" stroke="url(#wh2)" stroke-width="2.5" stroke-linejoin="round"/><line x1="-7" y1="-4" x2="7" y2="-4" stroke="url(#wh2)" stroke-width="2" stroke-linecap="round"/><line x1="-7" y1="0" x2="7" y2="0" stroke="url(#wh2)" stroke-width="2" stroke-linecap="round"/><line x1="-7" y1="4" x2="7" y2="4" stroke="url(#wh2)" stroke-width="2" stroke-linecap="round"/></g></svg></div><h2>ContextOS Assistant</h2><p>Your project-aware AI. Ask about code, commits,<br>docs, or anything in your workspace.</p><div class="chips" id="chips"><span class="chip">What did I last commit?</span><span class="chip">Explain this codebase</span><span class="chip">What\'s in my Notion?</span><span class="chip">Review open PRs</span><span class="chip">Write a unit test</span><span class="chip">Find bugs in this file</span></div></div>';
  bot=null; lock(false); hideStatus();
  vscode.postMessage({type:'clearHistory'});
  attachChips();
});

/* ── chips ── */
function attachChips(){
  msgsEl.querySelectorAll('.chip').forEach(function(c){
    c.addEventListener('click',function(){ inp.value=c.textContent.trim(); inp.focus(); autoSize(); });
  });
}
attachChips();

})();
</script>
</body>
</html>`;
    }
}
exports.ChatViewProvider = ChatViewProvider;
//# sourceMappingURL=ChatViewProvider.js.map