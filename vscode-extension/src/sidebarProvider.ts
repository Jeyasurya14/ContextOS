// vscode-extension/src/sidebarProvider.ts

import * as vscode from 'vscode';
import { APIClient, StreamEvent } from './apiClient';
import { WorkspaceContextCollector } from './contextCollector';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'contextos.chatView';

    private _view?: vscode.WebviewView;
    private apiClient: APIClient;
    private contextCollector: WorkspaceContextCollector;

    constructor(
        private readonly extensionUri: vscode.Uri,
        apiClient: APIClient,
        contextCollector: WorkspaceContextCollector
    ) {
        this.apiClient = apiClient;
        this.contextCollector = contextCollector;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri],
        };

        webviewView.webview.html = this._getHtmlContent();

        webviewView.webview.onDidReceiveMessage(async (message: { type: string; question?: string }) => {
            try {
                await this._handleMessage(message);
            } catch (error) {
                console.error('Error handling message:', error);
                this._view?.webview.postMessage({ 
                    type: 'streamEvent', 
                    event: { 
                        event: 'error', 
                        message: 'Failed to process message' 
                    } 
                });
            }
        });

        this._updateConnectionStatus();
    }

    public async sendClearChat(): Promise<void> {
        if (this._view) {
            this._view.webview.postMessage({ type: 'clearChat' });
        }
    }

    public async refresh(): Promise<void> {
        await this._updateConnectionStatus();
    }

    private async _updateConnectionStatus(): Promise<void> {
        if (!this._view) { return; }
        const connected = await this.apiClient.isConnected();
        this._view.webview.postMessage({ type: 'connectionStatus', connected });
    }

    private async _handleMessage(message: { type: string; question?: string }): Promise<void> {
        switch (message.type) {
            case 'sendMessage':
                await this._handleSendMessage(message.question || '');
                break;
            case 'connect':
                await this._handleConnect();
                break;
            case 'sync':
                await this._handleSync();
                break;
            case 'clearChat':
                this.sendClearChat();
                break;
        }
    }

    private async _handleSendMessage(question: string): Promise<void> {
        if (!question.trim()) { return; }
        if (!this._view) { return; }

        try {
            const context = this.contextCollector.collectAll();

            for await (const event of this.apiClient.sendQuery(question, context)) {
                this._view?.webview.postMessage({ type: 'streamEvent', event });
            }
        } catch (error) {
            this._view?.webview.postMessage({ 
                type: 'streamEvent', 
                event: { 
                    event: 'error', 
                    message: error instanceof Error ? error.message : 'An error occurred' 
                } 
            });
        }
    }

    private async _handleConnect(): Promise<void> {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your ContextOS API Key',
            placeHolder: 'ctx_xxxxxxxxxxxxxxxxxxxxxxxx',
            password: true,
            validateInput: (value: string) => {
                if (!value || !value.startsWith('ctx_')) {
                    return 'API key must start with "ctx_"';
                }
                return null;
            },
        });

        if (apiKey) {
            await this.apiClient.saveApiKey(apiKey);
            if (this._view) {
                this._view.webview.postMessage({ type: 'connected' });
            }
            await this._updateConnectionStatus();
            vscode.window.showInformationMessage('ContextOS: API key saved successfully.');
        }
    }

    private async _handleSync(): Promise<void> {
        if (!this._view) { return; }

        const connected = await this.apiClient.isConnected();
        if (!connected) {
            vscode.window.showWarningMessage('ContextOS: Connect your API key first.');
            return;
        }

        try {
            this._view.webview.postMessage({ type: 'syncStarted' });
            const context = this.contextCollector.collectAll();
            const result = await this.apiClient.syncWorkspace(context);
            this._view.webview.postMessage({ type: 'synced', chunks: result.chunks_added });
            vscode.window.showInformationMessage(`ContextOS: Synced ${result.chunks_added} chunks.`);
        } catch {
            this._view.webview.postMessage({ type: 'syncError' });
            vscode.window.showErrorMessage('ContextOS: Failed to sync workspace.');
        }
    }

    private _getHtmlContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    background: #0d1117;
    color: #c9d1d9;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #21262d;
    background: #161b22;
    flex-shrink: 0;
}
.header-left {
    display: flex;
    align-items: center;
    gap: 8px;
}
.header-title {
    font-weight: 600;
    font-size: 14px;
    color: #f0f6fc;
}
.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f85149;
    transition: background 0.3s;
}
.status-dot.connected {
    background: #3fb950;
}
.header-actions {
    display: flex;
    gap: 6px;
}
.icon-btn {
    background: none;
    border: 1px solid #30363d;
    color: #8b949e;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 12px;
    transition: all 0.2s;
}
.icon-btn:hover {
    background: #21262d;
    color: #c9d1d9;
}
.messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.messages::-webkit-scrollbar { width: 6px; }
.messages::-webkit-scrollbar-track { background: transparent; }
.messages::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
.message {
    max-width: 90%;
    padding: 8px 12px;
    border-radius: 12px;
    line-height: 1.5;
    word-wrap: break-word;
}
.message.user {
    align-self: flex-end;
    background: #1a6cf0;
    color: #ffffff;
    border-bottom-right-radius: 4px;
}
.message.assistant {
    align-self: flex-start;
    background: #161b22;
    color: #d1d5db;
    border-bottom-left-radius: 4px;
    border: 1px solid #21262d;
}
.message.assistant pre {
    background: #0d1117;
    padding: 8px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 6px 0;
    font-size: 12px;
}
.message.assistant code {
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    font-size: 12px;
}
.message.assistant p { margin: 4px 0; }
.message.assistant ul, .message.assistant ol { padding-left: 18px; margin: 4px 0; }
.message.assistant a { color: #58a6ff; }
.thinking {
    align-self: flex-start;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    color: #8b949e;
    font-style: italic;
}
.thinking-dots {
    display: flex;
    gap: 3px;
}
.thinking-dots span {
    width: 5px;
    height: 5px;
    background: #8b949e;
    border-radius: 50%;
    animation: pulse 1.4s ease-in-out infinite;
}
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1); }
}
.sources {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
}
.source-chip {
    display: inline-block;
    padding: 2px 8px;
    background: #21262d;
    color: #8b949e;
    border-radius: 10px;
    font-size: 11px;
    border: 1px solid #30363d;
}
.source-chip .type { color: #58a6ff; font-weight: 500; }
.input-area {
    border-top: 1px solid #21262d;
    padding: 10px 12px;
    background: #161b22;
    flex-shrink: 0;
}
.input-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
}
.input-row textarea {
    flex: 1;
    background: #0d1117;
    border: 1px solid #30363d;
    color: #c9d1d9;
    border-radius: 8px;
    padding: 8px 10px;
    font-family: inherit;
    font-size: 13px;
    resize: none;
    min-height: 36px;
    max-height: 120px;
    overflow-y: auto;
    outline: none;
    transition: border-color 0.2s;
}
.input-row textarea:focus {
    border-color: #1a6cf0;
}
.input-row textarea::placeholder {
    color: #484f58;
}
.send-btn {
    background: #1a6cf0;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.2s;
    flex-shrink: 0;
}
.send-btn:hover { background: #1558d6; }
.send-btn:disabled { background: #30363d; cursor: default; color: #484f58; }
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: #484f58;
    text-align: center;
    padding: 20px;
    gap: 8px;
}
.empty-state .emoji { font-size: 32px; }
.empty-state .title { font-size: 14px; color: #8b949e; font-weight: 500; }
.empty-state .subtitle { font-size: 12px; }
</style>
</head>
<body>
<div class="header">
    <div class="header-left">
        <span class="header-title">ContextOS</span>
        <span class="status-dot" id="statusDot"></span>
    </div>
    <div class="header-actions">
        <button class="icon-btn" id="syncBtn" title="Sync workspace">&#x21bb;</button>
        <button class="icon-btn" id="connectBtn" title="Connect API key">&#x26A1;</button>
    </div>
</div>
<div class="messages" id="messagesArea">
    <div class="empty-state" id="emptyState">
        <div class="emoji">&#x1F916;</div>
        <div class="title">Ask anything about your project</div>
        <div class="subtitle">I'll search your GitHub, Notion, Slack, and workspace context</div>
    </div>
</div>
<div class="input-area">
    <div class="input-row">
        <textarea id="inputBox" placeholder="Ask ContextOS..." rows="1"></textarea>
        <button class="send-btn" id="sendBtn">Send</button>
    </div>
</div>

<script>
(function() {
    try {
        const vscode = acquireVsCodeApi();
        const messagesArea = document.getElementById('messagesArea');
        const emptyState = document.getElementById('emptyState');
        const inputBox = document.getElementById('inputBox');
        const sendBtn = document.getElementById('sendBtn');
        const statusDot = document.getElementById('statusDot');
        const syncBtn = document.getElementById('syncBtn');
        const connectBtn = document.getElementById('connectBtn');

        if (!vscode || !messagesArea || !inputBox || !sendBtn) {
            console.error('Required elements not found');
            return;
        }

        let currentAssistantEl = null;
        let currentAssistantContent = '';
        let thinkingEl = null;
        let isStreaming = false;

        function hideEmpty() {
            if (emptyState) emptyState.style.display = 'none';
        }

        function scrollToBottom() {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        function addUserMessage(text) {
            hideEmpty();
            const div = document.createElement('div');
            div.className = 'message user';
            div.textContent = text;
            messagesArea.appendChild(div);
            scrollToBottom();
        }

        function showThinking(text) {
            if (thinkingEl) { thinkingEl.remove(); }
            thinkingEl = document.createElement('div');
            thinkingEl.className = 'thinking';
            thinkingEl.innerHTML =
                '<div class="thinking-dots"><span></span><span></span><span></span></div>' +
                '<span>' + escapeHtml(text) + '</span>';
            messagesArea.appendChild(thinkingEl);
            scrollToBottom();
        }

        function removeThinking() {
            if (thinkingEl) { thinkingEl.remove(); thinkingEl = null; }
        }

        function startAssistantMessage() {
            hideEmpty();
            removeThinking();
            currentAssistantContent = '';
            currentAssistantEl = document.createElement('div');
            currentAssistantEl.className = 'message assistant';
            messagesArea.appendChild(currentAssistantEl);
            scrollToBottom();
        }

        function appendToken(text) {
            if (!currentAssistantEl) { startAssistantMessage(); }
            currentAssistantContent += text;
            currentAssistantEl.innerHTML = renderMarkdown(currentAssistantContent);
            scrollToBottom();
        }

        function addSources(sources) {
            if (!sources || !sources.length || !currentAssistantEl) return;
            const container = document.createElement('div');
            container.className = 'sources';
            for (const s of sources) {
                const chip = document.createElement('span');
                chip.className = 'source-chip';
                const label = s.url.length > 40 ? s.url.substring(s.url.length - 40) : s.url;
                chip.innerHTML = '<span class="type">' + escapeHtml(s.type) + '</span> ' + escapeHtml(label);
                container.appendChild(chip);
            }
            currentAssistantEl.appendChild(container);
            scrollToBottom();
        }

        function finishStream() {
            removeThinking();
            currentAssistantEl = null;
            currentAssistantContent = '';
            isStreaming = false;
            sendBtn.disabled = false;
            inputBox.disabled = false;
        }

        function renderMarkdown(text) {
            let html = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            html = html.replace(/\`\`\`(\\w*)?\\n([\\s\\S]*?)\`\`\`/g, function(m, lang, code) {
                return '<pre><code>' + code + '</code></pre>';
            });
            html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
            html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
            html = html.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
            html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
            html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
            html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
            html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
            html = html.replace(/(<li>.*<\\/li>)/s, '<ul>$1</ul>');
            html = html.replace(/\\n/g, '<br>');
            return html;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function sendMessage() {
            console.log('sendMessage called');
            const text = inputBox.value.trim();
            console.log('text:', text, 'isStreaming:', isStreaming);
            if (!text || isStreaming) return;

            addUserMessage(text);
            inputBox.value = '';
            inputBox.style.height = 'auto';
            isStreaming = true;
            sendBtn.disabled = true;

            vscode.postMessage({ type: 'sendMessage', question: text });
            console.log('Message sent to extension');
        }

        sendBtn.addEventListener('click', sendMessage);

        inputBox.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });

        inputBox.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        syncBtn.addEventListener('click', function() {
            vscode.postMessage({ type: 'sync' });
        });

        connectBtn.addEventListener('click', function() {
            vscode.postMessage({ type: 'connect' });
        });

        window.addEventListener('message', function(e) {
            const msg = e.data;

            switch (msg.type) {
                case 'streamEvent':
                    handleStreamEvent(msg.event);
                    break;
                case 'connectionStatus':
                    statusDot.classList.toggle('connected', msg.connected);
                    break;
                case 'connected':
                    statusDot.classList.add('connected');
                    break;
                case 'clearChat':
                    messagesArea.innerHTML = '';
                    if (emptyState) {
                        messagesArea.appendChild(emptyState);
                        emptyState.style.display = 'flex';
                    }
                    finishStream();
                    break;
                case 'syncStarted':
                    showThinking('Syncing workspace...');
                    break;
                case 'synced':
                    removeThinking();
                    break;
                case 'syncError':
                    removeThinking();
                    break;
            }
        });

        function handleStreamEvent(event) {
            switch (event.event) {
                case 'thinking':
                    showThinking(event.message || 'Thinking...');
                    break;
                case 'searching':
                    showThinking('Searching ' + (event.source || '') + ' (' + (event.count || 0) + ' results)');
                    break;
                case 'token':
                    if (!currentAssistantEl) { startAssistantMessage(); }
                    appendToken(event.content || '');
                    break;
                case 'sources':
                    addSources(event.sources);
                    break;
                case 'done':
                    finishStream();
                    break;
                case 'error':
                    removeThinking();
                    if (!currentAssistantEl) { startAssistantMessage(); }
                    currentAssistantEl.innerHTML = '<span style="color:#f85149;">' + escapeHtml(event.message || 'An error occurred.') + '</span>';
                    finishStream();
                    break;
            }
        }
    } catch (e) {
        console.error('Error initializing webview:', e);
    }
})();
</script>
</body>
</html>`;
    }
}
