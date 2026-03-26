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
    constructor(_extensionUri, _context) {
        this._extensionUri = _extensionUri;
        this._context = _context;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview();
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'prompt':
                    {
                        const apiKey = await this._context.secrets.get('contextos_api_key');
                        if (!apiKey) {
                            vscode.window.showErrorMessage("Please set your ContextOS API Key first!");
                            webviewView.webview.postMessage({ type: 'error', value: 'API Key not set. Run "ContextOS: Set API Key" in the command palette.' });
                            return;
                        }
                        // Use Node's native fetch to sidestep Webview CORS restrictions
                        try {
                            const res = await fetch('http://127.0.0.1:8000/api/v1/query', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-API-Key': apiKey,
                                },
                                body: JSON.stringify({
                                    question: data.value,
                                    stream: true
                                })
                            });
                            if (!res.ok) {
                                webviewView.webview.postMessage({ type: 'error', value: `Error: ${res.statusText}` });
                                return;
                            }
                            if (res.body) {
                                const reader = res.body.getReader();
                                const decoder = new TextDecoder("utf-8");
                                while (true) {
                                    const { done, value } = await reader.read();
                                    if (done)
                                        break;
                                    const chunk = decoder.decode(value, { stream: true });
                                    const lines = chunk.split('\\n');
                                    for (const line of lines) {
                                        if (line.startsWith('data: ')) {
                                            try {
                                                const jsonStr = line.replace('data: ', '');
                                                if (!jsonStr.trim())
                                                    continue;
                                                const payload = JSON.parse(jsonStr);
                                                if (payload.event === 'token') {
                                                    webviewView.webview.postMessage({ type: 'token', value: payload.content });
                                                }
                                                else if (payload.event === 'done') {
                                                    webviewView.webview.postMessage({ type: 'done' });
                                                }
                                            }
                                            catch (e) { }
                                        }
                                    }
                                }
                            }
                        }
                        catch (e) {
                            webviewView.webview.postMessage({ type: 'error', value: String(e) });
                        }
                        break;
                    }
            }
        });
    }
    sendContextToChat(contextStr) {
        if (this._view) {
            this._view.show?.(true);
            this._view.webview.postMessage({ type: 'addContext', value: contextStr });
        }
    }
    _getHtmlForWebview() {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <style>
                    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 10px; display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; overflow: hidden; }
                    #messages { flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
                    .message { padding: 10px; border-radius: 6px; line-height: 1.4; word-wrap: break-word; }
                    .user { background: var(--vscode-editor-selectionBackground); border: 1px solid var(--vscode-focusBorder); }
                    .bot { background: var(--vscode-editor-inactiveSelectionBackground); }
                    .bot-streaming { border-left: 2px solid var(--vscode-focusBorder); }
                    #inputBox { flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;}
                    textarea { width: 100%; box-sizing: border-box; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 8px; font-family: inherit; resize: vertical; min-height: 60px;}
                    textarea:focus { outline: 1px solid var(--vscode-focusBorder); }
                    button { width: 100%; padding: 8px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; cursor: pointer; border-radius: 2px; }
                    button:hover { background: var(--vscode-button-hoverBackground); }
                    pre { background: var(--vscode-textCodeBlock-background); padding: 5px; overflow-x: auto; border-radius: 4px; }
                    code { font-family: var(--vscode-editor-font-family); font-size: 0.9em; }
                </style>
            </head>
            <body>
                <div id="messages">
                    <div class="message bot">👋 Hi! I am ContextOS. Ask me anything about your project's history, linear tasks, or codebase!</div>
                </div>
                <div id="inputBox">
                    <textarea id="promptInput" rows="3" placeholder="Ask ContextOS..."></textarea>
                    <button id="sendBtn">Send</button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const messagesDiv = document.getElementById('messages');
                    const input = document.getElementById('promptInput');
                    const btn = document.getElementById('sendBtn');

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'addContext':
                                input.value = message.value + "\\n\\n" + input.value;
                                break;
                            case 'token':
                                let last = messagesDiv.lastElementChild;
                                if (!last || !last.classList.contains('bot-streaming')) {
                                    last = document.createElement('div');
                                    last.className = 'message bot bot-streaming';
                                    messagesDiv.appendChild(last);
                                }
                                last.innerText += message.value;
                                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                                break;
                            case 'done':
                                if (messagesDiv.lastElementChild) {
                                    messagesDiv.lastElementChild.classList.remove('bot-streaming');
                                }
                                break;
                            case 'error':
                                const err = document.createElement('div');
                                err.className = 'message bot';
                                err.style.color = 'var(--vscode-errorForeground)';
                                err.innerText = message.value;
                                messagesDiv.appendChild(err);
                                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                                break;
                        }
                    });

                    btn.addEventListener('click', () => {
                        const text = input.value.trim();
                        if (text) {
                            const div = document.createElement('div');
                            div.className = 'message user';
                            div.innerText = text;
                            messagesDiv.appendChild(div);
                            messagesDiv.scrollTop = messagesDiv.scrollHeight;
                            
                            vscode.postMessage({ type: 'prompt', value: text });
                            input.value = '';
                        }
                    });
                    
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            btn.click();
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}
exports.ChatViewProvider = ChatViewProvider;
//# sourceMappingURL=ChatViewProvider.js.map