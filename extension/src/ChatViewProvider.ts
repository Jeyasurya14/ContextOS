import * as vscode from 'vscode';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'contextos.chatView';
    private _view?: vscode.WebviewView;
    private _currentConversationId?: string;
    private _messageHistory: Array<{role: string, content: string}> = [];
    private _isProcessing: boolean = false;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {
        this._loadConversationHistory();
    }

    private async _loadConversationHistory() {
        try {
            const history = this._context.globalState.get<Array<{role: string, content: string}>>('messageHistory', []);
            const conversationId = this._context.globalState.get<string>('conversationId');
            this._messageHistory = history;
            this._currentConversationId = conversationId;
        } catch (error) {
            console.error('Failed to load conversation history:', error);
        }
    }

    private async _saveConversationHistory() {
        try {
            await this._context.globalState.update('messageHistory', this._messageHistory);
            if (this._currentConversationId) {
                await this._context.globalState.update('conversationId', this._currentConversationId);
            }
        } catch (error) {
            console.error('Failed to save conversation history:', error);
        }
    }

    public resolveWebviewView(webviewView: vscode.WebviewView, _ctx: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
        this._view = webviewView;

        // Configure webview with minimal, secure options
        webviewView.webview.options = {
            enableScripts: true
        };

        // Build CSP dynamically based on configured API URL
        const config = vscode.workspace.getConfiguration('contextos');
        const apiUrl = config.get<string>('apiUrl') || 'https://contextos-api-jxdr.onrender.com';
        let apiOrigin = '*';
        try {
            const url = new URL(apiUrl);
            apiOrigin = url.origin;
        } catch (e) {
            console.warn('Invalid API URL, using wildcard for CSP:', e);
        }

        const csp = `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src ${apiOrigin} *; img-src data: blob: https:;`;
        webviewView.webview.html = this._getHtmlForWebview(csp);

        // Restore conversation history after webview is ready
        webviewView.webview.onDidReceiveMessage(message => {
            if (message.type === 'ready' && this._messageHistory.length > 0) {
                webviewView.webview.postMessage({
                    type: 'restoreHistory',
                    messages: this._messageHistory
                });
            }
        });

        webviewView.webview.onDidReceiveMessage(async (data) => {
            console.log('[ChatViewProvider] Received:', data.type, data);

            try {
                switch (data.type) {
                    case 'prompt':
                        await this._handlePrompt(data.value, webviewView);
                        break;
                    case 'clearHistory':
                        await this._clearHistory();
                        webviewView.webview.postMessage({ type: 'historyCleared' });
                        break;
                    case 'copyCode':
                        await vscode.env.clipboard.writeText(data.value);
                        webviewView.webview.postMessage({ type: 'codeCopied', id: data.id });
                        break;
                    case 'copyMsg':
                        await vscode.env.clipboard.writeText(data.value);
                        break;
                    case 'retry':
                        if (data.message) {
                            await this._handlePrompt(data.message, webviewView);
                        }
                        break;
                    case 'ready':
                        console.log('[ChatViewProvider] Webview ready');
                        break;
                }
            } catch (error) {
                console.error('[ChatViewProvider] Error handling message:', error);
                webviewView.webview.postMessage({
                    type: 'error',
                    value: 'Internal error: ' + (error as Error).message
                });
            }
        });
    }

    private async _clearHistory() {
        this._currentConversationId = undefined;
        this._messageHistory = [];
        await this._context.globalState.update('messageHistory', []);
        await this._context.globalState.update('conversationId', undefined);
    }

    private async _handlePrompt(question: string, webviewView: vscode.WebviewView) {
        console.log('[ChatViewProvider] Handling prompt:', question);

        if (this._isProcessing) {
            console.log('[ChatViewProvider] Already processing, rejecting');
            webviewView.webview.postMessage({
                type: 'error',
                value: 'Please wait for the current response to complete.',
                canRetry: true,
                originalMessage: question
            });
            return;
        }

        this._isProcessing = true;
        const post = (msg: object) => webviewView.webview.postMessage(msg);

        // Add user message to history immediately
        this._messageHistory.push({ role: 'user', content: question });
        await this._saveConversationHistory();

        // Get API key
        const apiKey = await this._context.secrets.get('contextos_api_key');
        if (!apiKey) {
            post({
                type: 'error',
                value: 'No API key configured.\n\nPlease run "ContextOS: Set API Key" from the Command Palette.',
                canRetry: false
            });
            this._isProcessing = false;
            return;
        }

        // Get API configuration
        const config = vscode.workspace.getConfiguration('contextos');
        const apiUrl = config.get<string>('apiUrl') || 'https://contextos-api-jxdr.onrender.com';
        console.log('[ChatViewProvider] API URL:', apiUrl);

        let assistantMessage = '';
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries) {
            try {
                console.log(`[ChatViewProvider] Attempt ${retryCount + 1}/${maxRetries + 1}`);
                post({ type: 'thinking' });

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 120000);

                const requestBody = {
                    question,
                    stream: true,
                    conversation_id: this._currentConversationId ?? null
                };

                console.log('[ChatViewProvider] Request:', `${apiUrl}/api/v1/query`, requestBody);

                const res = await fetch(`${apiUrl}/api/v1/query`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!res.ok) {
                    const errorText = await res.text().catch(() => res.statusText);
                    throw new Error(`API error ${res.status}: ${errorText}`);
                }

                if (!res.body) {
                    throw new Error('No response body from server');
                }

                // Stream response
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const parts = buffer.split('\n\n');
                    buffer = parts.pop() || '';

                    for (const part of parts) {
                        const lines = part.split('\n');
                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed.startsWith('data: ')) continue;

                            const dataStr = trimmed.slice(6).trim();
                            if (!dataStr || dataStr === '[DONE]') continue;

                            try {
                                const data = JSON.parse(dataStr);

                                switch (data.event) {
                                    case 'thinking':
                                        post({ type: 'thinking', message: data.message });
                                        break;
                                    case 'searching':
                                        post({ type: 'searching', source: data.source, count: data.count });
                                        break;
                                    case 'token':
                                        assistantMessage += data.content;
                                        post({ type: 'token', content: data.content });
                                        break;
                                    case 'sources':
                                        post({ type: 'sources', sources: data.sources });
                                        break;
                                    case 'done':
                                        if (data.conversation_id) {
                                            this._currentConversationId = data.conversation_id;
                                        }
                                        if (assistantMessage) {
                                            this._messageHistory.push({ role: 'assistant', content: assistantMessage });
                                            await this._saveConversationHistory();
                                        }
                                        post({ type: 'done' });
                                        this._isProcessing = false;
                                        return;
                                    case 'error':
                                        throw new Error(data.message || 'Unknown error from server');
                                }
                            } catch (parseError) {
                                console.error('[ChatViewProvider] Failed to parse SSE:', parseError, 'data:', line);
                            }
                        }
                    }
                }

                // Stream ended without explicit 'done'
                if (assistantMessage) {
                    this._messageHistory.push({ role: 'assistant', content: assistantMessage });
                    await this._saveConversationHistory();
                }
                post({ type: 'done' });
                this._isProcessing = false;
                return;

            } catch (error: any) {
                retryCount++;
                console.error(`[ChatViewProvider] Request failed (${retryCount}/${maxRetries + 1}):`, error);

                if (retryCount > maxRetries) {
                    const msg = error?.message || String(error);
                    const isNetwork = msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('aborted');

                    post({
                        type: 'error',
                        value: `${msg}\n\n${isNetwork ? 'Check your connection and API URL.' : 'Please try again.'}`,
                        canRetry: true,
                        originalMessage: question
                    });
                    this._isProcessing = false;
                    return;
                }

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }
    }

    public sendContextToChat(context: string) {
        if (this._view) {
            this._view.show(true);
            this._view.webview.postMessage({ type: 'addContext', value: context });
        }
    }

    private _getHtmlForWebview(csp: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${csp}">
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
.retry-btn{margin-top:8px;padding:5px 12px;background:var(--brand-dim);border:1px solid var(--brand-b);color:var(--brand);border-radius:6px;cursor:pointer;font-size:11px;font-family:var(--font);transition:all .14s;font-weight:600}
.retry-btn:hover{background:rgba(245,158,11,.15);border-color:var(--brand);transform:translateY(-1px)}
.retry-btn:active{transform:translateY(0)}

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
.typing-indicator{display:inline-flex;align-items:center;gap:3px;padding:8px 12px;background:var(--s2);border-radius:12px;margin:4px 0}
.typing-indicator span{width:6px;height:6px;border-radius:50%;background:var(--brand);animation:typing 1.4s ease-in-out infinite}
.typing-indicator span:nth-child(2){animation-delay:.2s}
.typing-indicator span:nth-child(3){animation-delay:.4s}
@keyframes typing{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-8px);opacity:1}}

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
#sndBtn.sending{animation:pulse .8s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
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
.success-banner{margin:4px 12px;padding:7px 10px;border-radius:var(--r2);background:rgba(52,211,153,.07);border:1px solid rgba(52,211,153,.2);font-size:11px;color:var(--ok);display:flex;align-items:center;gap:6px;animation:mi .18s ease-out}

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
    <span class="hint">Enter · Shift+Enter for new line</span>
  </div>
</div>

<script>
(function() {
  'use strict';

  const vscode = acquireVsCodeApi();

  // DOM Elements
  const msgsEl = document.getElementById('msgs');
  const inp = document.getElementById('inp');
  const sndBtn = document.getElementById('sndBtn');
  const sbar = document.getElementById('sbar');
  const sbarIn = document.getElementById('sbar-in');
  const clearBtn = document.getElementById('clearBtn');
  const chips = document.querySelectorAll('.chip');

  // State
  let bot = null;
  let busy = false;
  let codeIdx = 0;
  const codeMap = {};

  // Verify DOM is ready
  if (!msgsEl || !inp || !sndBtn) {
    console.error('[Webview] Missing required DOM elements');
    return;
  }

  console.log('[Webview] Initializing');

  // Helper Functions
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const now = () => {
    const d = new Date();
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  };

  const scrollBot = (force = false) => {
    const near = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 100;
    if (force || near) msgsEl.scrollTop = msgsEl.scrollHeight;
  };

  const lock = (v) => {
    busy = v;
    sndBtn.disabled = v;
    inp.disabled = v;
  };

  const showStatus = (label) => {
    sbar.classList.add('on');
    sbarIn.innerHTML = '<span style="font-style:italic">' + esc(label) + '</span>';
  };

  const hideStatus = () => {
    sbar.classList.remove('on');
    sbarIn.innerHTML = '';
  };

  const clearWelcome = () => {
    const welcome = document.getElementById('welcome');
    if (welcome) welcome.remove();
  };

  const addUser = (text) => {
    clearWelcome();
    const g = document.createElement('div');
    g.className = 'mg user';
    const av = document.createElement('div');
    av.className = 'av av-u';
    av.textContent = 'U';
    const mc = document.createElement('div');
    mc.className = 'mc';
    mc.textContent = text;
    const cp = document.createElement('button');
    cp.className = 'msg-copy';
    cp.textContent = 'Copy';
    cp.onclick = () => {
      vscode.postMessage({ type: 'copyMsg', value: text });
      cp.textContent = 'Copied!';
      setTimeout(() => cp.textContent = 'Copy', 1800);
    };
    const ts = document.createElement('div');
    ts.className = 'ts';
    ts.textContent = now();
    const right = document.createElement('div');
    right.style.flex = '1';
    right.style.minWidth = '0';
    right.style.maxWidth = 'calc(100% - 33px)';
    right.appendChild(mc);
    right.appendChild(ts);
    g.appendChild(av);
    g.appendChild(right);
    g.appendChild(cp);
    msgsEl.appendChild(g);
    scrollBot(true);
  };

  const startBot = () => {
    clearWelcome();
    const g = document.createElement('div');
    g.className = 'mg bot';
    const av = document.createElement('div');
    av.className = 'av av-b';
    av.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="13" height="13"><defs><linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><path d="M28 14C16 14 10 21 10 32c0 11 6 18 18 18" fill="none" stroke="url(#ag)" stroke-width="6" stroke-linecap="round"/><circle cx="17" cy="32" r="4" fill="#f59e0b"/><g transform="translate(37,32)"><path d="M0,-13 L11,-6.5 L11,6.5 L0,13 L-11,6.5 L-11,-6.5Z" fill="none" stroke="url(#ag)" stroke-width="2.5" stroke-linejoin="round"/><line x1="-6" y1="-3.5" x2="6" y2="-3.5" stroke="url(#ag)" stroke-width="2" stroke-linecap="round"/><line x1="-6" y1="0" x2="6" y2="0" stroke="url(#ag)" stroke-width="2" stroke-linecap="round"/><line x1="-6" y1="3.5" x2="6" y2="3.5" stroke="url(#ag)" stroke-width="2" stroke-linecap="round"/></g></svg>';
    const mc = document.createElement('div');
    mc.className = 'mc';
    const raw = document.createElement('span');
    raw.className = 'raw';
    const cur = document.createElement('span');
    cur.className = 'cur';
    cur.innerHTML = '▋';
    mc.appendChild(raw);
    mc.appendChild(cur);
    g.appendChild(av);
    g.appendChild(mc);
    msgsEl.appendChild(g);
    scrollBot(true);
    return { group: g, mc: mc, rawEl: raw, cur: cur };
  };

  const finishBot = () => {
    if (!bot) return;
    const raw = bot.rawEl.textContent || '';
    bot.cur.remove();
    bot.rawEl.remove();
    bot.mc.innerHTML = renderMd(raw);
    const cp = document.createElement('button');
    cp.className = 'msg-copy';
    cp.textContent = 'Copy';
    cp.onclick = () => {
      vscode.postMessage({ type: 'copyMsg', value: raw });
      cp.textContent = 'Copied!';
      setTimeout(() => cp.textContent = 'Copy', 1800);
    };
    bot.group.appendChild(cp);
    const ts = document.createElement('div');
    ts.className = 'ts';
    ts.style.marginTop = '4px';
    ts.textContent = now();
    bot.mc.appendChild(ts);
    bot = null;
  };

  const addErr = (text, canRetry, originalMessage) => {
    const g = document.createElement('div');
    g.className = 'mg err';
    const av = document.createElement('div');
    av.className = 'av av-b';
    av.innerHTML = bot ? bot.group.querySelector('.av').innerHTML : '';
    const mc = document.createElement('div');
    mc.className = 'mc';
    mc.innerHTML = '<strong>Error</strong><br>' + esc(text);

    if (canRetry && originalMessage) {
      const retryBtn = document.createElement('button');
      retryBtn.className = 'retry-btn';
      retryBtn.textContent = '🔄 Retry';
      retryBtn.onclick = () => {
        vscode.postMessage({ type: 'retry', message: originalMessage });
        g.remove();
      };
      mc.appendChild(retryBtn);
    }

    g.appendChild(av);
    g.appendChild(mc);
    msgsEl.appendChild(g);
    scrollBot(true);
  };

  const addSources = (sources, container) => {
    if (!sources || !sources.length) return;
    const w = document.createElement('div');
    w.className = 'srcs';
    sources.slice(0, 8).forEach((s) => {
      const p = document.createElement('span');
      p.className = 'src-pill';
      const lbl = s.source || s.title || s.id || 'source';
      p.textContent = '📎 ' + String(lbl).slice(0, 36);
      p.title = String(lbl);
      w.appendChild(p);
    });
    container.appendChild(w);
  };

  const renderMd = (raw) => {
    const localBlocks = [];
    let text = raw;

    // Extract fenced code blocks
    text = text.replace(/\x60\x60\x60(\w*)\n?([\s\S]*?)\x60\x60\x60/g, (_, lang, code) => {
      const id = 'cb' + codeIdx++;
      const trimmed = code.replace(/\n$/, '');
      codeMap[id] = trimmed;
      localBlocks.push({ id, lang: lang || 'code', code: trimmed });
      return 'CBPH_' + (localBlocks.length - 1) + '_END';
    });

    // Escape HTML
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Headers
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    text = text.replace(/^(-{3,}|={3,})$/gm, '<hr>');
    text = text.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Tables
    text = text.replace(/((\|.+\|\n)+)/g, (tbl) => {
      const rows = tbl.trim().split('\n');
      const hdrs = rows[0].split('|').filter((c) => c.trim());
      if (rows.length < 2 || !/^\|?[-| :]+\|?$/.test(rows[1])) return tbl;
      let h = '<table><thead><tr>';
      hdrs.forEach((c) => h += '<th>' + c.trim() + '</th>');
      h += '</tr></thead><tbody>';
      for (let i = 2; i < rows.length; i++) {
        const cells = rows[i].split('|').slice(1);
        if (!cells.length) continue;
        h += '<tr>';
        cells.forEach((c) => h += '<td>' + (c || '').trim() + '</td>');
        h += '</tr>';
      }
      return h + '</tbody></table>';
    });

    // Lists
    text = text.replace(/^[ \t]*[\*\-] (.+)$/gm, '<li>$1</li>');
    text = text.replace(/^[ \t]*\d+\. (.+)$/gm, '<li class="ol">$1</li>');
    text = text.replace(/(<li class="ol">[\s\S]*?<\/li>\n?)+/g, (m) => '<ol>' + m + '</ol>');
    text = text.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (m) => m.indexOf('class="ol"') === -1 ? '<ul>' + m + '</ul>' : m);

    // Inline
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/\x60([^\x60]+)\x60/g, '<code>$1</code>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Paragraphs
    text = text.split(/\n\n+/).map((p) => {
      p = p.trim();
      if (!p) return '';
      if (/^(<h[1-3]|<ul|<ol|<li|<table|<blockquote|<hr|CBPH_)/.test(p)) return p;
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('');

    // Restore code blocks
    text = text.replace(/CBPH_(\d+)_END/g, (_, i) => {
      const b = localBlocks[parseInt(i)];
      if (!b) return '';
      const escaped = b.code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<div class="cb"><div class="cb-hdr"><span class="cb-lang">' + esc(b.lang) + '</span><button class="cb-copy" data-id="' + b.id + '" onclick="window.copyCode(this)">\u2398 Copy</button></div><pre><code>' + escaped + '</code></pre></div>';
    });

    return text;
  };

  // Global function for copy buttons
  window.copyCode = function(btn) {
    const id = btn.getAttribute('data-id');
    vscode.postMessage({ type: 'copyCode', id: id, value: codeMap[id] || '' });
  };

  // Send message
  const send = () => {
    const text = inp.value.trim();
    if (!text) {
      inp.focus();
      return;
    }
    if (busy) {
      showStatus('Please wait...');
      setTimeout(hideStatus, 2000);
      return;
    }

    console.log('[Webview] Sending:', text);
    addUser(text);
    inp.value = '';
    autoSize();
    lock(true);
    bot = null;

    vscode.postMessage({ type: 'prompt', value: text });
  };

  const autoSize = () => {
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 148) + 'px';
  };

  // Event Listeners
  sndBtn.addEventListener('click', (e) => {
    e.preventDefault();
    send();
  });

  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  inp.addEventListener('input', autoSize);

  clearBtn.addEventListener('click', () => {
    msgsEl.innerHTML = '<div class="welcome" id="welcome"><div class="wlogo"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="44" height="44"><defs><linearGradient id="wc2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient><linearGradient id="wh2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs><path d="M28 14 C16 14 10 21 10 32 C10 43 16 50 28 50" fill="none" stroke="url(#wc2)" stroke-width="5.5" stroke-linecap="round"/><circle cx="17" cy="32" r="4.5" fill="#f59e0b"/><g transform="translate(37,32)"><path d="M0,-15 L13,-7.5 L13,7.5 L0,15 L-13,7.5 L-13,-7.5 Z" fill="none" stroke="url(#wh2)" stroke-width="2.5" stroke-linejoin="round"/><line x1="-7" y1="-4" x2="7" y2="-4" stroke="url(#wh2)" stroke-width="2" stroke-linecap="round"/><line x1="-7" y1="0" x2="7" y2="0" stroke="url(#wh2)" stroke-width="2" stroke-linecap="round"/><line x1="-7" y1="4" x2="7" y2="4" stroke="url(#wh2)" stroke-width="2" stroke-linecap="round"/></g></svg></div><h2>ContextOS Assistant</h2><p>Your project-aware AI. Ask about code, commits,<br>docs, or anything in your workspace.</p><div class="chips" id="chips"><span class="chip">What did I last commit?</span><span class="chip">Explain this codebase</span><span class="chip">What\'s in my Notion?</span><span class="chip">Review open PRs</span><span class="chip">Write a unit test</span><span class="chip">Find bugs in this file</span></div></div>';
    bot = null;
    lock(false);
    hideStatus();
    vscode.postMessage({ type: 'clearHistory' });
    attachChips();
  });

  const attachChips = () => {
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        inp.value = chip.textContent.trim();
        inp.focus();
        autoSize();
      });
    });
  };

  // Use event delegation for dynamic chips
  msgsEl.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('chip')) {
      inp.value = e.target.textContent.trim();
      inp.focus();
      autoSize();
    }
  });

  // Message handler from extension
  window.addEventListener('message', (event) => {
    const m = event.data;

    switch (m.type) {
      case 'thinking':
        showStatus('Thinking...');
        if (!bot) bot = startBot();
        break;
      case 'searching':
        showStatus('Searching...');
        if (!bot) bot = startBot();
        break;
      case 'token':
        hideStatus();
        if (!bot) bot = startBot();
        bot.rawEl.textContent += m.content;
        scrollBot(false);
        break;
      case 'sources':
        if (bot) addSources(m.sources, bot.mc);
        break;
      case 'done':
        hideStatus();
        finishBot();
        lock(false);
        inp.focus();
        break;
      case 'error':
        hideStatus();
        if (bot) {
          bot.cur.remove();
          bot.group.remove();
          bot = null;
        }
        addErr(m.value, m.canRetry, m.originalMessage);
        lock(false);
        break;
      case 'codeCopied':
        const btn = document.querySelector('.cb-copy[data-id="' + m.id + '"]');
        if (btn) {
          btn.textContent = '✓ Copied';
          btn.classList.add('ok');
          setTimeout(() => {
            btn.textContent = '\u2398 Copy';
            btn.classList.remove('ok');
          }, 2000);
        }
        break;
      case 'addContext':
        const ban = document.createElement('div');
        ban.className = 'ctxban';
        ban.innerHTML = '<span style="color:#a78bfa;font-size:12px">\uD83D\uDCC4</span><span style="font-size:11px;color:#a78bfa">Context attached</span>';
        msgsEl.appendChild(ban);
        inp.value = (inp.value ? '[Context]\\n' + m.value + '\\n\\n' + inp.value : '[Context]\\n' + m.value + '\\n\\n');
        autoSize();
        inp.focus();
        scrollBot(true);
        break;
      case 'restoreHistory':
        clearWelcome();
        if (m.messages && m.messages.length > 0) {
          m.messages.forEach((msg) => {
            if (msg.role === 'user') {
              addUser(msg.content);
            } else if (msg.role === 'assistant') {
              const b = startBot();
              b.rawEl.textContent = msg.content;
              finishBot();
            }
          });
        }
        break;
      case 'historyCleared':
        clearWelcome();
        break;
    }
  });

  // Notify extension that webview is ready
  vscode.postMessage({ type: 'ready' });

  // Initial setup
  attachChips();
  inp.focus();

  console.log('[Webview] Chat UI initialized');
})();
</script>

</body>
</html>`;
    }
}
