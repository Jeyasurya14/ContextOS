import * as vscode from 'vscode';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'contextos.chatView';
    private _view?: vscode.WebviewView;
    private _currentConversationId?: string;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage(async (data) => {
            if (data.type === 'prompt') {
                await this._handlePrompt(data.value, webviewView);
            } else if (data.type === 'clearHistory') {
                this._currentConversationId = undefined;
            }
        });
    }

    private async _handlePrompt(question: string, webviewView: vscode.WebviewView) {
        const post = (msg: object) => webviewView.webview.postMessage(msg);

        const apiKey = await this._context.secrets.get('contextos_api_key');
        if (!apiKey) {
            vscode.window.showErrorMessage('Please set your ContextOS API Key first!');
            post({ type: 'error', value: 'API Key not set. Run "ContextOS: Set API Key" in the command palette.' });
            return;
        }

        const config = vscode.workspace.getConfiguration('contextos');
        const apiUrl = config.get<string>('apiUrl') || 'http://localhost:8000';

        try {
            const res = await fetch(`${apiUrl}/api/v1/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                body: JSON.stringify({
                    question,
                    stream: true,
                    conversation_id: this._currentConversationId ?? null,
                }),
            });

            if (!res.ok) {
                const errBody = await res.text().catch(() => res.statusText);
                post({ type: 'error', value: `Server error (${res.status}): ${errBody}` });
                return;
            }

            if (!res.body) {
                post({ type: 'error', value: 'No response body received.' });
                return;
            }

            const reader = (res.body as any).getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop() ?? '';

                for (const part of parts) {
                    for (const line of part.split('\n')) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith('data: ')) { continue; }
                        const jsonStr = trimmed.slice(6).trim();
                        if (!jsonStr || jsonStr === '[DONE]') { continue; }
                        try {
                            const payload = JSON.parse(jsonStr);
                            const ev = payload.event;
                            if (ev === 'thinking') {
                                post({ type: 'thinking', value: payload.message });
                            } else if (ev === 'searching') {
                                post({ type: 'searching', source: payload.source, count: payload.count });
                            } else if (ev === 'token') {
                                post({ type: 'token', value: payload.content });
                            } else if (ev === 'sources') {
                                post({ type: 'sources', sources: payload.sources });
                            } else if (ev === 'done') {
                                if (payload.conversation_id) {
                                    this._currentConversationId = payload.conversation_id;
                                }
                                post({ type: 'done' });
                            } else if (ev === 'error') {
                                post({ type: 'error', value: payload.message });
                            }
                        } catch (_e) { /* malformed JSON – skip */ }
                    }
                }
            }
        } catch (e: any) {
            webviewView.webview.postMessage({ type: 'error', value: e?.message ?? String(e) });
        }
    }

    public sendContextToChat(contextStr: string) {
        if (this._view) {
            this._view.show?.(true);
            this._view.webview.postMessage({ type: 'addContext', value: contextStr });
        }
    }

    private _getHtmlForWebview(): string {
        const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --brand:        #f59e0b;
    --brand-hover:  #fbbf24;
    --brand-dim:    rgba(245,158,11,0.10);
    --brand-border: rgba(245,158,11,0.22);
    --bg:           #0a0a0b;
    --surface:      #111113;
    --surface2:     #1a1a1d;
    --surface3:     #222226;
    --fg:           #e8e8e3;
    --fg-dim:       #8b8b8b;
    --fg-muted:     #404047;
    --border:       rgba(255,255,255,0.05);
    --border-hover: rgba(255,255,255,0.09);
    --error:        #f87171;
    --error-dim:    rgba(248,113,113,0.08);
    --success:      #34d399;
    --radius:       12px;
    --radius-sm:    8px;
    --font:         'Inter', system-ui, -apple-system, sans-serif;
    --font-mono:    'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  }

  html, body { height: 100%; overflow: hidden; }

  body {
    font-family: var(--font);
    font-size: 13px;
    line-height: 1.6;
    color: var(--fg);
    background: var(--bg);
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: radial-gradient(circle, rgba(255,255,255,0.018) 1px, transparent 1px);
    background-size: 22px 22px;
    pointer-events: none;
    z-index: 0;
  }
  #header, #messages, #status-bar, #inputBox { position: relative; z-index: 1; }

  /* ── Header ── */
  #header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 9px;
    border-bottom: 1px solid var(--border);
    background: rgba(10,10,11,0.92);
    backdrop-filter: blur(12px);
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 5px;
    font-weight: 800;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 60%, #f97316 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .logo-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    border-radius: 20px;
    background: rgba(245,158,11,0.08);
    border: 1px solid rgba(245,158,11,0.15);
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: #f59e0b;
    -webkit-text-fill-color: #f59e0b;
    background-clip: unset;
    -webkit-background-clip: unset;
    text-transform: uppercase;
  }
  .logo-dot { width: 5px; height: 5px; background: var(--success); border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  .header-actions { display: flex; align-items: center; gap: 6px; }
  #clearBtn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--fg-dim);
    border-radius: var(--radius-sm);
    padding: 3px 9px;
    font-size: 10.5px;
    font-family: var(--font);
    cursor: pointer;
    transition: all 0.15s;
  }
  #clearBtn:hover { border-color: var(--brand-border); color: var(--brand); background: var(--brand-dim); }

  /* ── Messages ── */
  #messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px 0 8px;
    display: flex;
    flex-direction: column;
    gap: 0;
    scroll-behavior: smooth;
  }
  #messages::-webkit-scrollbar { width: 3px; }
  #messages::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.15); border-radius: 2px; }

  /* Claude-style message layout */
  .msg-group {
    padding: 12px 14px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    transition: background 0.1s;
  }
  .msg-group.user { flex-direction: row-reverse; }
  .msg-group:hover { background: rgba(255,255,255,0.012); }

  .avatar {
    width: 26px; height: 26px;
    border-radius: 7px;
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 10.5px; font-weight: 800;
    margin-top: 1px;
  }
  .avatar.bot {
    background: linear-gradient(135deg, rgba(245,158,11,0.25), rgba(249,115,22,0.1));
    border: 1px solid rgba(245,158,11,0.25);
    color: #f59e0b;
  }
  .avatar.user-av {
    background: linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.1));
    border: 1px solid rgba(139,92,246,0.25);
    color: #a78bfa;
  }

  .msg-content { flex: 1; min-width: 0; max-width: calc(100% - 40px); }

  /* User bubble */
  .msg-group.user .msg-content {
    background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,191,36,0.06));
    border: 1px solid rgba(245,158,11,0.18);
    border-radius: 12px 3px 12px 12px;
    padding: 9px 13px;
    color: var(--fg);
    word-break: break-word;
    white-space: pre-wrap;
  }

  /* Bot message - plain like Claude */
  .msg-group.bot .msg-content {
    color: var(--fg);
    word-break: break-word;
  }

  .msg-group.error-group .msg-content {
    background: var(--error-dim);
    border: 1px solid rgba(248,113,113,0.2);
    border-radius: 3px 12px 12px 12px;
    padding: 9px 13px;
    color: var(--error);
    word-break: break-word;
    font-size: 12.5px;
  }

  /* ── Markdown Rendering ── */
  .md h1 { font-size: 16px; font-weight: 700; color: #fff; margin: 14px 0 8px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
  .md h2 { font-size: 14px; font-weight: 700; color: #fff; margin: 12px 0 6px; }
  .md h3 { font-size: 13px; font-weight: 600; color: var(--fg); margin: 10px 0 5px; }
  .md p { margin: 0 0 9px; }
  .md p:last-child { margin-bottom: 0; }
  .md strong { color: #fff; font-weight: 600; }
  .md em { color: var(--fg-dim); font-style: italic; }
  .md a { color: var(--brand); text-decoration: none; }
  .md a:hover { text-decoration: underline; }
  .md ul, .md ol { margin: 5px 0 9px 18px; }
  .md li { margin: 3px 0; }
  .md li > ul, .md li > ol { margin: 3px 0 3px 15px; }
  .md hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
  .md blockquote {
    border-left: 3px solid var(--brand-border);
    padding-left: 12px;
    margin: 8px 0;
    color: var(--fg-dim);
    font-style: italic;
  }
  .md table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
  .md th { background: var(--surface2); color: var(--brand); font-weight: 600; text-align: left; padding: 7px 10px; border: 1px solid var(--border); }
  .md td { padding: 6px 10px; border: 1px solid var(--border); color: var(--fg); }
  .md tr:nth-child(even) td { background: rgba(255,255,255,0.015); }

  /* Code — Claude style */
  .md code {
    font-family: var(--font-mono);
    font-size: 11.5px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 5px;
    color: #fbbf24;
  }
  .code-block-wrap {
    position: relative;
    margin: 10px 0;
    border-radius: 9px;
    overflow: hidden;
    border: 1px solid var(--border);
    background: #0d0d10;
  }
  .code-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: var(--surface2);
    border-bottom: 1px solid var(--border);
  }
  .code-lang {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--brand);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .copy-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 5px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--fg-dim);
    font-family: var(--font);
    font-size: 10px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .copy-btn:hover { background: var(--surface3); color: var(--fg); border-color: var(--border-hover); }
  .copy-btn.copied { color: var(--success); border-color: rgba(52,211,153,0.3); }
  .code-block-wrap pre {
    padding: 12px 14px;
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.65;
    color: #e2e8f0;
    margin: 0;
    background: transparent;
    border: none;
  }
  .code-block-wrap pre code {
    background: transparent;
    border: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }

  /* Syntax colors */
  .kw { color: #c792ea; }  /* keywords */
  .str { color: #c3e88d; } /* strings */
  .cm { color: #546e7a; font-style: italic; } /* comments */
  .fn { color: #82aaff; }  /* functions */
  .nm { color: #f78c6c; }  /* numbers */
  .tp { color: #ffcb6b; }  /* types/builtins */

  /* ── Status bar ── */
  #status-bar {
    display: none;
    flex-shrink: 0;
    padding: 6px 14px;
    border-top: 1px solid var(--border);
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--fg-dim);
    background: rgba(10,10,11,0.95);
    font-style: italic;
  }
  #status-bar.visible { display: flex; }

  .spinner {
    width: 12px; height: 12px; flex-shrink: 0;
    border: 1.5px solid rgba(245,158,11,0.15);
    border-top-color: var(--brand);
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .status-source {
    margin-left: auto;
    font-size: 10px; padding: 1px 7px; border-radius: 20px;
    background: var(--brand-dim); border: 1px solid var(--brand-border);
    color: var(--brand); font-weight: 600; font-style: normal;
  }

  /* ── Sources ── */
  .sources-wrap {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .source-pill {
    font-size: 10px; padding: 2px 8px; border-radius: 20px;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--fg-dim); font-family: var(--font-mono);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;
  }

  /* ── Cursor ── */
  .cursor {
    display: inline-block; width: 2px; height: 0.85em;
    background: var(--brand); margin-left: 1px;
    vertical-align: text-bottom;
    animation: blink 0.75s step-end infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }

  /* ── Input area ── */
  #inputBox {
    flex-shrink: 0;
    padding: 8px 10px 12px;
    border-top: 1px solid var(--border);
    background: rgba(10,10,11,0.95);
    backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .input-wrap {
    position: relative;
    display: flex;
    align-items: flex-end;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .input-wrap:focus-within {
    border-color: rgba(245,158,11,0.3);
    box-shadow: 0 0 0 3px rgba(245,158,11,0.06);
  }
  textarea {
    flex: 1;
    background: transparent;
    color: var(--fg);
    border: none;
    padding: 10px 44px 10px 12px;
    font-family: var(--font);
    font-size: 13px;
    resize: none;
    min-height: 44px;
    max-height: 160px;
    outline: none;
    line-height: 1.5;
  }
  textarea::placeholder { color: var(--fg-muted); }
  textarea:disabled { opacity: 0.4; cursor: not-allowed; }

  #sendBtn {
    position: absolute;
    right: 7px; bottom: 7px;
    width: 30px; height: 30px;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: #000;
    border: none;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
    box-shadow: 0 2px 10px rgba(245,158,11,0.3);
    flex-shrink: 0;
  }
  #sendBtn:hover { opacity: 0.88; box-shadow: 0 3px 14px rgba(245,158,11,0.4); }
  #sendBtn:active { transform: scale(0.93); }
  #sendBtn:disabled { opacity: 0.28; cursor: not-allowed; box-shadow: none; }

  .input-hint {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 2px;
  }
  .hint-text { font-size: 10px; color: var(--fg-muted); }
  .model-badge {
    font-size: 9.5px; color: var(--brand); font-weight: 600;
    display: flex; align-items: center; gap: 3px;
    opacity: 0.7;
  }

  /* ── Welcome ── */
  .welcome {
    padding: 24px 16px 12px;
    text-align: center;
  }
  .welcome-icon {
    width: 44px; height: 44px;
    background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(249,115,22,0.1));
    border: 1px solid rgba(245,158,11,0.2);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 12px;
    font-size: 20px;
  }
  .welcome h2 {
    font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px;
  }
  .welcome p { font-size: 12px; color: var(--fg-dim); line-height: 1.6; }
  .welcome-chips {
    display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 14px;
  }
  .chip {
    padding: 5px 11px; border-radius: 20px; font-size: 11px;
    border: 1px solid var(--border); color: var(--fg-dim);
    background: var(--surface2); cursor: pointer;
    transition: all 0.15s;
  }
  .chip:hover { border-color: var(--brand-border); color: var(--brand); background: var(--brand-dim); }
`;

        const js = `
  const vscode = acquireVsCodeApi();
  const messagesDiv = document.getElementById('messages');
  const input = document.getElementById('promptInput');
  const btn = document.getElementById('sendBtn');
  const statusBar = document.getElementById('status-bar');
  const statusText = document.getElementById('status-text');
  const statusSource = document.getElementById('status-source');
  const clearBtn = document.getElementById('clearBtn');

  let currentBotGroup = null; // { group, contentDiv, streamText, cursor }
  let isStreaming = false;

  function scrollBottom() { messagesDiv.scrollTop = messagesDiv.scrollHeight; }

  function setStatus(text, source) {
    statusBar.classList.add('visible');
    statusText.textContent = text;
    if (source) { statusSource.textContent = source; statusSource.style.display = ''; }
    else { statusSource.style.display = 'none'; }
  }
  function clearStatus() { statusBar.classList.remove('visible'); }

  function setLocked(locked) {
    isStreaming = locked;
    btn.disabled = locked;
    input.disabled = locked;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Full markdown renderer ──
  function renderMarkdown(rawText) {
    var text = rawText;

    // 1. Extract code blocks first to protect them
    var codeBlocks = [];
    text = text.replace(/\x60\x60\x60(\w*)\n?([\s\S]*?)\x60\x60\x60/g, function(_, lang, code) {
      var idx = codeBlocks.length;
      codeBlocks.push({ lang: lang || 'code', code: code.replace(/\n$/, '') });
      return 'CODEBLOCK_PLACEHOLDER_' + idx + '_END';
    });

    // 2. Escape HTML in remaining text
    text = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 3. Block elements
    // Headers
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    // HR
    text = text.replace(/^(-{3,}|={3,})$/gm, '<hr>');
    // Blockquote
    text = text.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Tables
    text = text.replace(/((\|.+\|\n)+)/g, function(table) {
      var rows = table.trim().split('\n');
      var headers = rows[0].split('|').filter(function(c) { return c.trim(); });
      var isTable = rows.length > 1 && /^\|?[-| :]+\|?$/.test(rows[1]);
      if (!isTable) return table;
      var html = '<table><thead><tr>';
      headers.forEach(function(h) { html += '<th>' + h.trim() + '</th>'; });
      html += '</tr></thead><tbody>';
      for (var i = 2; i < rows.length; i++) {
        var cells = rows[i].split('|').filter(function(c) { return c.trim() !== undefined; }).slice(1);
        if (cells.length === 0) continue;
        html += '<tr>';
        cells.forEach(function(c) { html += '<td>' + (c || '').trim() + '</td>'; });
        html += '</tr>';
      }
      html += '</tbody></table>';
      return html;
    });

    // Lists
    text = text.replace(/^([ \t]*)\* (.+)$/gm, '$1<li>$2</li>');
    text = text.replace(/^([ \t]*)- (.+)$/gm, '$1<li>$2</li>');
    text = text.replace(/^([ \t]*)\d+\. (.+)$/gm, '$1<li class="ol">$2</li>');
    text = text.replace(/(<li class="ol">[\s\S]*?<\/li>\n?)+/g, function(m) { return '<ol>' + m + '</ol>'; });
    text = text.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, function(m) {
      if (m.indexOf('class="ol"') === -1) return '<ul>' + m + '</ul>';
      return m;
    });

    // 4. Inline elements
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/\x60([^\x60]+)\x60/g, '<code>$1</code>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // 5. Paragraphs (double newline)
    var parts = text.split(/\n\n+/);
    text = parts.map(function(p) {
      p = p.trim();
      if (!p) return '';
      if (/^(<h[1-3]|<ul|<ol|<li|<table|<blockquote|<hr|CODEBLOCK)/.test(p)) return p;
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('');

    // 6. Restore code blocks with copy button
    text = text.replace(/CODEBLOCK_PLACEHOLDER_(\d+)_END/g, function(_, idx) {
      var block = codeBlocks[parseInt(idx)];
      var escapedCode = block.code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<div class="code-block-wrap">' +
        '<div class="code-header">' +
          '<span class="code-lang">' + escapeHtml(block.lang) + '</span>' +
          '<button class="copy-btn" onclick="copyCode(this, ' + idx + ')">&#x2398; Copy</button>' +
        '</div>' +
        '<pre><code>' + escapedCode + '</code></pre>' +
      '</div>';
    });

    return text;
  }

  // Store code for copy
  var storedCodeBlocks = [];
  function copyCode(btn, idx) {
    var code = storedCodeBlocks[idx] || '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(function() {
        btn.textContent = '\u2713 Copied';
        btn.classList.add('copied');
        setTimeout(function() { btn.textContent = '\u2398 Copy'; btn.classList.remove('copied'); }, 2000);
      });
    }
  }

  // Patched markdown renderer that also captures code for copy
  function renderMarkdownFull(rawText) {
    storedCodeBlocks = [];
    var text = rawText;
    // Capture code blocks for copy
    text = text.replace(/\x60\x60\x60(\w*)\n?([\s\S]*?)\x60\x60\x60/g, function(_, lang, code) {
      storedCodeBlocks.push(code.replace(/\n$/, ''));
      return '\x60\x60\x60' + (lang || '') + '\n' + code + '\x60\x60\x60';
    });
    return renderMarkdown(rawText);
  }

  function addUserMessage(text) {
    var welcome = messagesDiv.querySelector('.welcome');
    if (welcome) welcome.remove();
    var group = document.createElement('div');
    group.className = 'msg-group user';
    var av = document.createElement('div');
    av.className = 'avatar user-av';
    av.textContent = 'U';
    var content = document.createElement('div');
    content.className = 'msg-content';
    content.textContent = text;
    group.appendChild(av);
    group.appendChild(content);
    messagesDiv.appendChild(group);
    scrollBottom();
  }

  function createBotGroup() {
    var group = document.createElement('div');
    group.className = 'msg-group bot';
    var av = document.createElement('div');
    av.className = 'avatar bot';
    av.textContent = 'C';
    var content = document.createElement('div');
    content.className = 'msg-content md';
    var cursor = document.createElement('span');
    cursor.className = 'cursor';
    var streamSpan = document.createElement('span');
    streamSpan.className = 'stream-raw';
    content.appendChild(streamSpan);
    content.appendChild(cursor);
    group.appendChild(av);
    group.appendChild(content);
    messagesDiv.appendChild(group);
    scrollBottom();
    return { group, content, streamSpan, cursor };
  }

  function addErrorMessage(text) {
    var group = document.createElement('div');
    group.className = 'msg-group error-group';
    var av = document.createElement('div');
    av.className = 'avatar bot';
    av.textContent = 'C';
    var content = document.createElement('div');
    content.className = 'msg-content';
    content.textContent = '\u26a0 ' + text;
    group.appendChild(av);
    group.appendChild(content);
    messagesDiv.appendChild(group);
    scrollBottom();
  }

  function addSourcesPills(sources, container) {
    if (!sources || sources.length === 0) return;
    var wrap = document.createElement('div');
    wrap.className = 'sources-wrap';
    sources.slice(0, 8).forEach(function(src) {
      var pill = document.createElement('span');
      pill.className = 'source-pill';
      var label = src.source || src.title || src.id || 'source';
      pill.textContent = '\uD83D\uDCCE ' + String(label).slice(0, 40);
      pill.title = String(label);
      wrap.appendChild(pill);
    });
    container.appendChild(wrap);
  }

  // Chip prompts
  document.querySelectorAll('.chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      input.value = chip.textContent;
      input.focus();
    });
  });

  window.addEventListener('message', function(event) {
    var msg = event.data;
    switch (msg.type) {

      case 'thinking':
        setStatus(msg.value, null);
        if (!currentBotGroup) { currentBotGroup = createBotGroup(); }
        break;

      case 'searching':
        setStatus('Searching ' + msg.source + '...', msg.source + ' (' + msg.count + ')');
        if (!currentBotGroup) { currentBotGroup = createBotGroup(); }
        break;

      case 'token':
        clearStatus();
        if (!currentBotGroup) { currentBotGroup = createBotGroup(); }
        currentBotGroup.streamSpan.textContent += msg.value;
        scrollBottom();
        break;

      case 'sources':
        if (currentBotGroup) {
          addSourcesPills(msg.sources, currentBotGroup.content);
        }
        break;

      case 'done':
        clearStatus();
        if (currentBotGroup) {
          var raw = currentBotGroup.streamSpan.textContent || '';
          currentBotGroup.cursor.remove();
          currentBotGroup.streamSpan.remove();
          currentBotGroup.content.innerHTML = renderMarkdownFull(raw);
          currentBotGroup = null;
        }
        setLocked(false);
        input.focus();
        break;

      case 'error':
        clearStatus();
        if (currentBotGroup) {
          currentBotGroup.cursor.remove();
          currentBotGroup.group.remove();
          currentBotGroup = null;
        }
        addErrorMessage(msg.value);
        setLocked(false);
        break;

      case 'addContext':
        if (input.value) {
          input.value = '[Context]\n' + msg.value + '\n\n' + input.value;
        } else {
          input.value = '[Context]\n' + msg.value + '\n\n';
        }
        autoResize();
        input.focus();
        break;
    }
  });

  function sendMessage() {
    var text = input.value.trim();
    if (!text || isStreaming) return;
    addUserMessage(text);
    input.value = '';
    autoResize();
    setLocked(true);
    currentBotGroup = null;
    vscode.postMessage({ type: 'prompt', value: text });
  }

  btn.addEventListener('click', sendMessage);

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  function autoResize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  }
  input.addEventListener('input', autoResize);

  clearBtn.addEventListener('click', function() {
    messagesDiv.innerHTML = getWelcomeHTML();
    currentBotGroup = null;
    setLocked(false);
    clearStatus();
    vscode.postMessage({ type: 'clearHistory' });
    attachChipListeners();
  });

  function getWelcomeHTML() {
    return '<div class="welcome">' +
      '<div class="welcome-icon">\u26a1</div>' +
      '<h2>ContextOS Assistant</h2>' +
      '<p>Your project-aware AI co-pilot. Ask anything about your code, docs, commits, or get help with any engineering question.</p>' +
      '<div class="welcome-chips">' +
        '<span class="chip">What did I last commit?</span>' +
        '<span class="chip">Explain this codebase</span>' +
        '<span class="chip">What\u2019s in my Notion?</span>' +
        '<span class="chip">Write a Python function</span>' +
      '</div>' +
    '</div>';
  }

  function attachChipListeners() {
    document.querySelectorAll('.chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        input.value = chip.textContent;
        input.focus();
      });
    });
  }
`;

        const bodyHtml = [
            '<div id="header">',
            '  <div class="logo">',
            '    \u26a1 CONTEXTOS',
            '    <span class="logo-badge"><span class="logo-dot"></span> Live</span>',
            '  </div>',
            '  <div class="header-actions">',
            '    <button id="clearBtn">New chat</button>',
            '  </div>',
            '</div>',
            '',
            '<div id="messages">',
            '  <div class="welcome">',
            '    <div class="welcome-icon">\u26a1</div>',
            '    <h2>ContextOS Assistant</h2>',
            '    <p>Your project-aware AI co-pilot. Ask anything about your code, docs, commits, or get help with any engineering question.</p>',
            '    <div class="welcome-chips">',
            '      <span class="chip">What did I last commit?</span>',
            '      <span class="chip">Explain this codebase</span>',
            '      <span class="chip">What\u2019s in my Notion?</span>',
            '      <span class="chip">Write a Python function</span>',
            '    </div>',
            '  </div>',
            '</div>',
            '',
            '<div id="status-bar">',
            '  <div class="spinner"></div>',
            '  <span id="status-text">Thinking...</span>',
            '  <span id="status-source" style="display:none"></span>',
            '</div>',
            '',
            '<div id="inputBox">',
            '  <div class="input-wrap">',
            '    <textarea id="promptInput" placeholder="Ask anything\u2026 (Shift+Enter for new line)" rows="1"></textarea>',
            '    <button id="sendBtn" title="Send (Enter)">',
            '      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
            '        <line x1="22" y1="2" x2="11" y2="13"></line>',
            '        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>',
            '      </svg>',
            '    </button>',
            '  </div>',
            '  <div class="input-hint">',
            '    <span class="hint-text">Enter to send \u00b7 Shift+Enter for new line</span>',
            '    <span class="model-badge">\u26a1 GPT-4o</span>',
            '  </div>',
            '</div>',
        ].join('\n');

        return [
            '<!DOCTYPE html>',
            '<html lang="en">',
            '<head>',
            '<meta charset="UTF-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
            '<title>ContextOS</title>',
            '<link rel="preconnect" href="https://fonts.googleapis.com">',
            '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">',
            '<style>' + css + '</style>',
            '</head>',
            '<body>',
            bodyHtml,
            '<script>' + js + '<\/script>',
            '</body>',
            '</html>',
        ].join('\n');
    }
}
