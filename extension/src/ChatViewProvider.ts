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
        // Default to localhost - set contextos.apiUrl in VS Code settings for production
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
                // SSE messages are separated by \n\n
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
    --brand-dim:    rgba(245,158,11,0.12);
    --brand-border: rgba(245,158,11,0.28);
    --bg:           #0a0a0b;
    --surface:      #111113;
    --surface2:     #18181b;
    --fg:           #f5f5f0;
    --fg-dim:       #6b7280;
    --fg-muted:     #3f4147;
    --border:       rgba(255,255,255,0.06);
    --error:        #f87171;
    --error-dim:    rgba(248,113,113,0.1);
    --radius:       10px;
  }

  html, body { height: 100%; overflow: hidden; }

  body {
    font-family: 'Inter', var(--vscode-font-family, system-ui), sans-serif;
    font-size: 13px;
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
    background-image: radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 20px 20px;
    pointer-events: none;
    z-index: 0;
  }
  #header, #messages, #status-bar, #inputBox { position: relative; z-index: 1; }

  #header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 9px;
    border-bottom: 1px solid var(--border);
    background: rgba(10,10,11,0.85);
    backdrop-filter: blur(10px);
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 800;
    font-size: 11.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: linear-gradient(135deg, #f59e0b, #fbbf24);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .logo-sub {
    background: none;
    -webkit-text-fill-color: var(--fg-dim);
    font-weight: 400;
    letter-spacing: 0.04em;
  }
  #clearBtn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--fg-dim);
    border-radius: 6px;
    padding: 3px 9px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
  }
  #clearBtn:hover { border-color: var(--brand-border); color: var(--brand); background: var(--brand-dim); }

  #messages {
    flex: 1;
    overflow-y: auto;
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    scroll-behavior: smooth;
  }
  #messages::-webkit-scrollbar { width: 3px; }
  #messages::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.2); border-radius: 2px; }

  .msg-row { display: flex; gap: 8px; align-items: flex-start; }
  .msg-row.user { flex-direction: row-reverse; }

  .avatar {
    width: 27px; height: 27px;
    border-radius: 8px;
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800;
  }
  .avatar.bot {
    background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.08));
    border: 1px solid var(--brand-border);
    color: var(--brand);
  }
  .avatar.user-av {
    background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(167,139,250,0.08));
    border: 1px solid rgba(139,92,246,0.3);
    color: #a78bfa;
  }

  .bubble {
    max-width: calc(100% - 42px);
    padding: 9px 13px;
    border-radius: var(--radius);
    line-height: 1.6;
    word-break: break-word;
    white-space: pre-wrap;
    font-size: 13px;
  }
  .bubble.bot { background: var(--surface); border: 1px solid var(--border); border-top-left-radius: 3px; }
  .bubble.user {
    background: linear-gradient(135deg, rgba(245,158,11,0.14), rgba(251,191,36,0.07));
    border: 1px solid var(--brand-border);
    border-top-right-radius: 3px;
  }
  .bubble.error { background: var(--error-dim); border: 1px solid rgba(248,113,113,0.25); color: var(--error); }

  #status-bar {
    display: none;
    flex-shrink: 0;
    padding: 7px 14px;
    border-top: 1px solid var(--border);
    align-items: center;
    gap: 8px;
    font-size: 11.5px;
    color: var(--fg-dim);
    background: rgba(10,10,11,0.9);
  }
  #status-bar.visible { display: flex; }

  .spinner {
    width: 13px; height: 13px;
    border: 2px solid rgba(245,158,11,0.15);
    border-top-color: var(--brand);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .status-text { flex: 1; font-style: italic; }
  .status-source {
    font-size: 10.5px; padding: 2px 8px; border-radius: 20px;
    background: var(--brand-dim); border: 1px solid var(--brand-border);
    color: var(--brand); font-weight: 600; font-style: normal;
  }

  .sources-row {
    display: flex; flex-wrap: wrap; gap: 5px;
    margin-top: 9px; padding-top: 9px;
    border-top: 1px solid var(--border);
  }
  .source-pill {
    font-size: 10.5px; padding: 2px 8px; border-radius: 20px;
    background: var(--surface2); border: 1px solid var(--border); color: var(--fg-dim);
  }

  .cursor {
    display: inline-block; width: 2px; height: 0.9em;
    background: var(--brand); margin-left: 1px;
    vertical-align: text-bottom;
    animation: blink 0.8s step-end infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }

  #inputBox {
    flex-shrink: 0; padding: 8px 10px 12px;
    border-top: 1px solid var(--border);
    background: rgba(10,10,11,0.9);
    backdrop-filter: blur(10px);
    display: flex; flex-direction: column; gap: 6px;
  }
  textarea {
    width: 100%;
    background: var(--surface2); color: var(--fg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 9px 11px;
    font-family: inherit; font-size: 13px;
    resize: none; min-height: 56px; max-height: 120px;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
  }
  textarea:focus { border-color: var(--brand-border); box-shadow: 0 0 0 3px rgba(245,158,11,0.07); }
  textarea::placeholder { color: var(--fg-muted); }
  textarea:disabled { opacity: 0.45; cursor: not-allowed; }

  #sendBtn {
    width: 100%; padding: 8px;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: #000; border: none;
    border-radius: var(--radius);
    font-weight: 700; font-size: 12.5px;
    cursor: pointer; letter-spacing: 0.05em;
    transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
    box-shadow: 0 2px 14px rgba(245,158,11,0.25);
  }
  #sendBtn:hover { opacity: 0.9; box-shadow: 0 4px 20px rgba(245,158,11,0.35); }
  #sendBtn:active { transform: scale(0.98); }
  #sendBtn:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; }

  .welcome {
    text-align: center; padding: 28px 10px;
    color: var(--fg-dim); font-size: 12.5px; line-height: 1.75;
  }
  .welcome strong {
    display: block; font-size: 15px; font-weight: 800; margin-bottom: 8px;
    background: linear-gradient(135deg, #f59e0b, #fbbf24);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .welcome em { font-style: normal; color: var(--fg-muted); font-size: 11.5px; }
  .tip-code {
    background: var(--surface2); border: 1px solid var(--border);
    padding: 2px 6px; border-radius: 5px; font-size: 11px;
    color: var(--fg); font-family: var(--vscode-editor-font-family, monospace);
  }

  pre {
    background: var(--surface2); border: 1px solid var(--border);
    border-left: 2px solid var(--brand-border);
    border-radius: 7px; padding: 9px 11px;
    overflow-x: auto; margin-top: 6px; font-size: 12px; white-space: pre;
  }
  code { font-family: var(--vscode-editor-font-family, monospace); font-size: 0.91em; }
  strong { color: var(--brand-hover); }
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

  let currentBotBubble = null;
  let isStreaming = false;

  function scrollBottom() { messagesDiv.scrollTop = messagesDiv.scrollHeight; }

  function setStatus(text, source) {
    statusBar.classList.add('visible');
    statusText.textContent = text;
    if (source) { statusSource.textContent = source; statusSource.style.display = ''; }
    else { statusSource.style.display = 'none'; }
  }
  function clearStatus() { statusBar.classList.remove('visible'); statusSource.style.display = 'none'; }

  function setLocked(locked) {
    isStreaming = locked;
    btn.disabled = locked;
    input.disabled = locked;
  }

  function addUserBubble(text) {
    const row = document.createElement('div');
    row.className = 'msg-row user';
    const av = document.createElement('div');
    av.className = 'avatar user-av';
    av.textContent = 'U';
    const bubble = document.createElement('div');
    bubble.className = 'bubble user';
    bubble.textContent = text;
    row.appendChild(av);
    row.appendChild(bubble);
    messagesDiv.appendChild(row);
    scrollBottom();
  }

  function createBotBubble() {
    const row = document.createElement('div');
    row.className = 'msg-row';
    const av = document.createElement('div');
    av.className = 'avatar bot';
    av.textContent = 'C';
    const bubble = document.createElement('div');
    bubble.className = 'bubble bot';
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    bubble.appendChild(cursor);
    row.appendChild(av);
    row.appendChild(bubble);
    messagesDiv.appendChild(row);
    scrollBottom();
    return { row, bubble, cursor };
  }

  function addErrorBubble(text) {
    const row = document.createElement('div');
    row.className = 'msg-row';
    const av = document.createElement('div');
    av.className = 'avatar bot';
    av.textContent = 'C';
    const bubble = document.createElement('div');
    bubble.className = 'bubble error';
    bubble.textContent = '\u26a0 ' + text;
    row.appendChild(av);
    row.appendChild(bubble);
    messagesDiv.appendChild(row);
    scrollBottom();
  }

  function addSourcesPills(sources, bubble) {
    if (!sources || sources.length === 0) { return; }
    const row = document.createElement('div');
    row.className = 'sources-row';
    sources.slice(0, 6).forEach(function(src) {
      const pill = document.createElement('span');
      pill.className = 'source-pill';
      const label = src.source || src.title || src.id || 'source';
      pill.textContent = '\uD83D\uDCCE ' + label.slice(0, 40);
      row.appendChild(pill);
    });
    bubble.appendChild(row);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderMarkdown(text) {
    var html = escapeHtml(text);
    // Bold
    html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
    return html;
  }

  window.addEventListener('message', function(event) {
    var msg = event.data;
    switch (msg.type) {
      case 'thinking':
        setStatus(msg.value, null);
        if (!currentBotBubble) { currentBotBubble = createBotBubble(); }
        break;
      case 'searching':
        setStatus('Searching ' + msg.source + '\u2026', msg.source + ' (' + msg.count + ')');
        break;
      case 'token':
        clearStatus();
        if (!currentBotBubble) { currentBotBubble = createBotBubble(); }
        var cursor = currentBotBubble.cursor;
        var bubble = currentBotBubble.bubble;
        cursor.remove();
        var textNode = bubble.querySelector('.stream-text');
        if (!textNode) {
          textNode = document.createElement('span');
          textNode.className = 'stream-text';
          bubble.appendChild(textNode);
        }
        textNode.textContent += msg.value;
        bubble.appendChild(cursor);
        scrollBottom();
        break;
      case 'sources':
        if (currentBotBubble) { addSourcesPills(msg.sources, currentBotBubble.bubble); }
        break;
      case 'done':
        clearStatus();
        if (currentBotBubble) {
          currentBotBubble.cursor.remove();
          var span = currentBotBubble.bubble.querySelector('.stream-text');
          if (span) { span.innerHTML = renderMarkdown(span.textContent || ''); }
          currentBotBubble = null;
        }
        setLocked(false);
        input.focus();
        break;
      case 'error':
        clearStatus();
        if (currentBotBubble) { currentBotBubble.cursor.remove(); currentBotBubble = null; }
        addErrorBubble(msg.value);
        setLocked(false);
        break;
      case 'addContext':
        input.value = msg.value + '\\n\\n' + input.value;
        input.focus();
        break;
    }
  });

  function sendMessage() {
    var text = input.value.trim();
    if (!text || isStreaming) { return; }
    var welcome = messagesDiv.querySelector('.welcome');
    if (welcome) { welcome.remove(); }
    addUserBubble(text);
    input.value = '';
    setLocked(true);
    currentBotBubble = null;
    vscode.postMessage({ type: 'prompt', value: text });
  }

  btn.addEventListener('click', sendMessage);

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  clearBtn.addEventListener('click', function() {
    messagesDiv.innerHTML = '<div class="welcome"><strong>\uD83D\uDC4B ContextOS is ready</strong>New conversation started.</div>';
    currentBotBubble = null;
    setLocked(false);
    clearStatus();
    vscode.postMessage({ type: 'clearHistory' });
  });

  input.addEventListener('input', function() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
`;

        return [
            '<!DOCTYPE html>',
            '<html lang="en">',
            '<head>',
            '<meta charset="UTF-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
            '<title>ContextOS</title>',
            '<style>' + css + '</style>',
            '</head>',
            '<body>',
            '<div id="header">',
            '  <div class="logo">\u26a1 ContextOS <span class="logo-sub">&nbsp;Assistant</span></div>',
            '  <button id="clearBtn">New chat</button>',
            '</div>',
            '<div id="messages">',
            '  <div class="welcome">',
            '    <strong>\uD83D\uDC4B ContextOS is ready</strong>',
            '    Ask anything about your project \u2014 commits, docs, Slack threads, Linear issues, and code.<br><br>',
            '    <em>Tip: select code and press <span class="tip-code">ContextOS: Send Code to Chat</span> to reference it.</em>',
            '  </div>',
            '</div>',
            '<div id="status-bar">',
            '  <div class="spinner"></div>',
            '  <span class="status-text" id="status-text">Thinking...</span>',
            '  <span class="status-source" id="status-source" style="display:none"></span>',
            '</div>',
            '<div id="inputBox">',
            '  <textarea id="promptInput" placeholder="Ask ContextOS about your project\u2026" rows="2"></textarea>',
            '  <button id="sendBtn">Send</button>',
            '</div>',
            '<script>' + js + '<\/script>',
            '</body>',
            '</html>',
        ].join('\n');
    }
}
