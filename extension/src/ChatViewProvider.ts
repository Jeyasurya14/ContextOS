import * as vscode from 'vscode';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
}

interface ConversationState {
    conversationId?: string;
    messageHistory: Message[];
    isProcessing: boolean;
    lastError?: string;
    retryCount: number;
}

interface Extensions {
    get(scope: string, key: string): unknown;
    update(scope: string, key: string, value: unknown): Promise<void>;
    secrets: {
        get(key: string): Promise<string | undefined>;
        store(key: string, value: string): Promise<void>;
    };
}

// ============================================================================
// PRODUCTION TELEMETRY (optional, privacy-respecting)
// ============================================================================

class Telemetry {
    private enabled: boolean = false;
    private sessionId: string;
    private startTime: number;

    constructor(context: vscode.ExtensionContext) {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        const config = vscode.workspace.getConfiguration('contextos');
        this.enabled = config.get<boolean>('enableTelemetry') || false;

        if (this.enabled) {
            this.track('extension_activated', {
                sessionId: this.sessionId,
                timestamp: new Date().toISOString(),
                version: context.extension.packageJSON.version
            });
        }
    }

    private generateSessionId(): string {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    track(event: string, properties: Record<string, any> = {}): void {
        if (!this.enabled) return;

        // In production, send to your telemetry endpoint
        // For now, just log to console if debugMode is on
        const config = vscode.workspace.getConfiguration('contextos');
        if (config.get<boolean>('debugMode')) {
            console.log('[Telemetry]', event, properties);
        }
    }

    trackError(error: Error, context: Record<string, any> = {}): void {
        this.track('error', {
            message: error.message,
            stack: error.stack,
            ...context
        });
    }

    getSessionDuration(): number {
        return Date.now() - this.startTime;
    }
}

// ============================================================================
// RATE LIMITER (Client-side protection)
// ============================================================================

class RateLimiter {
    private maxRequests: number;
    private windowMs: number;
    private requests: number[] = [];

    constructor(maxRequests: number, windowMs: number) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    tryAcquire(): boolean {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.windowMs);

        if (this.requests.length < this.maxRequests) {
            this.requests.push(now);
            return true;
        }

        return false;
    }

    getRemaining(): number {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        return Math.max(0, this.maxRequests - this.requests.length);
    }

    getResetTime(): number {
        if (this.requests.length === 0) return 0;
        const oldest = Math.min(...this.requests);
        return oldest + this.windowMs;
    }
}

// ============================================================================
// CIRCUIT BREAKER (Prevent hammering failing backend)
// ============================================================================

enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN'
}

class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private lastFailureTime: number = 0;
    private readonly failureThreshold: number;
    private readonly recoveryTimeout: number;
    private readonly onStateChange: (state: CircuitState) => void;

    constructor(
        failureThreshold: number = 5,
        recoveryTimeout: number = 30000,
        onStateChange?: (state: CircuitState) => void
    ) {
        this.failureThreshold = failureThreshold;
        this.recoveryTimeout = recoveryTimeout;
        this.onStateChange = onStateChange || (() => {});
    }

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.state === CircuitState.OPEN) {
            if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
                this.setState(CircuitState.HALF_OPEN);
            } else {
                throw new Error('Circuit breaker is OPEN. Backend temporarily unavailable.');
            }
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.onStateChange(this.state);
    }

    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.failureThreshold) {
            this.setState(CircuitState.OPEN);
        }
    }

    private setState(state: CircuitState): void {
        const previous = this.state;
        this.state = state;
        if (previous !== state) {
            this.onStateChange(state);
            console.log('[CircuitBreaker] State changed:', previous, '→', state);
        }
    }

    getState(): CircuitState {
        return this.state;
    }

    getFailureCount(): number {
        return this.failureCount;
    }
}

// ============================================================================
// REQUEST CACHE (Avoid duplicate requests)
// ============================================================================

class RequestCache {
    private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
    private readonly defaultTTL: number;

    constructor(defaultTTL: number = 300000) {
        this.defaultTTL = defaultTTL;
    }

    get(key: string): any {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    set(key: string, data: any, ttl?: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL
        });
    }

    invalidate(key?: string): void {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    getStats(): { size: number; hits: number; misses: number } {
        return {
            size: this.cache.size,
            hits: 0,
            misses: 0
        };
    }
}

// ============================================================================
// HEALTH MONITOR (Track backend connectivity)
// ============================================================================

class HealthMonitor {
    private healthy: boolean = true;
    private lastCheck: number = 0;
    private consecutiveFailures: number = 0;
    private readonly threshold: number;
    private readonly checkInterval: number;
    private listeners: Array<(healthy: boolean) => void> = [];

    constructor(threshold: number = 3, checkInterval: number = 60000) {
        this.threshold = threshold;
        this.checkInterval = checkInterval;
    }

    recordSuccess(): void {
        this.consecutiveFailures = 0;
        if (!this.healthy) {
            this.setHealthy(true);
        }
    }

    recordFailure(): void {
        this.consecutiveFailures++;
        this.lastCheck = Date.now();

        if (this.consecutiveFailures >= this.threshold && this.healthy) {
            this.setHealthy(false);
        }
    }

    isHealthy(): boolean {
        return this.healthy;
    }

    getConsecutiveFailures(): number {
        return this.consecutiveFailures;
    }

    addListener(listener: (healthy: boolean) => void): void {
        this.listeners.push(listener);
    }

    private setHealthy(healthy: boolean): void {
        this.healthy = healthy;
        this.listeners.forEach(listener => listener(healthy));
        console.log('[HealthMonitor] Health status:', healthy ? '✅ HEALTHY' : '🔴 UNHEALTHY');
    }
}

// ============================================================================
// MAIN CHAT VIEW PROVIDER (Production Grade)
// ============================================================================

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'contextos.chatView';
    private _view?: vscode.WebviewView;
    private _state: ConversationState = {
        messageHistory: [],
        isProcessing: false,
        retryCount: 0
    };

    private readonly _telemetry: Telemetry;
    private readonly _rateLimiter: RateLimiter;
    private readonly _circuitBreaker: CircuitBreaker;
    private readonly _requestCache: RequestCache;
    private readonly _healthMonitor: HealthMonitor;

    // UI references (persisted across webview recreations)
    private _lastScrollPosition: number = 0;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {
        const config = vscode.workspace.getConfiguration('contextos');

        // Initialize production components
        this._telemetry = new Telemetry(_context);
        this._rateLimiter = new RateLimiter(
            config.get<number>('rateLimitMaxRequests') || 30,
            config.get<number>('rateLimitWindowMs') || 60000
        );
        this._requestCache = new RequestCache(config.get<number>('cacheTTL') || 300000);
        this._healthMonitor = new HealthMonitor(3, 60000);
        this._circuitBreaker = new CircuitBreaker(5, 30000, (state) => {
            this._healthMonitor.recordFailure();
            this._telemetry.track('circuit_breaker_state_change', { state });
        });

        // Load persisted state
        this._loadState();
    }

    // ========================================================================
    // STATE PERSISTENCE
    // ========================================================================

    private async _loadState(): Promise<void> {
        try {
            const history = this._context.globalState.get<Message[]>('messageHistory', []);
            const conversationId = this._context.globalState.get<string>('conversationId');
            const lastScroll = this._context.globalState.get<number>('lastScrollPosition', 0);

            this._state = {
                ...this._state,
                messageHistory: history,
                conversationId
            };
            this._lastScrollPosition = lastScroll;

            console.log('[ChatViewProvider] State loaded:', {
                messageCount: history.length,
                conversationId: conversationId?.slice(-8)
            });
        } catch (error) {
            console.error('[ChatViewProvider] Failed to load state:', error);
            this._telemetry.trackError(error as Error, { action: 'load_state' });
        }
    }

    private async _saveState(): Promise<void> {
        try {
            await Promise.all([
                this._context.globalState.update('messageHistory', this._state.messageHistory),
                this._context.globalState.update('conversationId', this._state.conversationId),
                this._context.globalState.update('lastScrollPosition', this._lastScrollPosition)
            ]);
        } catch (error) {
            console.error('[ChatViewProvider] Failed to save state:', error);
            this._telemetry.trackError(error as Error, { action: 'save_state' });
        }
    }

    // ========================================================================
    // WEBVIEW INITIALIZATION
    // ========================================================================

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _ctx: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;
        this._telemetry.track('webview_resolved');

        // Secure webview configuration
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // Build secure CSP
        const csp = this._buildCSP();
        webviewView.webview.html = this._getHtmlForWebview(csp);

        // Message handling with error boundaries
        this._setupMessageHandlers(webviewView);

        // Restore conversation history
        webviewView.webview.onDidReceiveMessage((message) => {
            if (message.type === 'ready' && this._state.messageHistory.length > 0) {
                webviewView.webview.postMessage({
                    type: 'restoreHistory',
                    messages: this._state.messageHistory,
                    scrollPosition: this._lastScrollPosition
                });
                this._telemetry.track('history_restored', { count: this._state.messageHistory.length });
            }
        });

        console.log('[ChatViewProvider] Webview initialized successfully');
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

  // Global error handler
  window.onerror = function(msg, src, line, col, error) {
    console.error('[Webview Error]', msg, 'at line', line);
    return false;
  };

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
    text = text.replace(/\`\`\`(\w*)\n?([\s\S]*?)\`\`\`/g, (_, lang, code) => {
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
    text = text.replace(/(^-{3,}|={3,})$/gm, '<hr>');
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
    text = text.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
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

    private _buildCSP(): string {
        const config = vscode.workspace.getConfiguration('contextos');
        const apiUrl = config.get<string>('apiUrl') || 'https://contextos-api-jxdr.onrender.com';

        let apiOrigin = '*';
        try {
            const url = new URL(apiUrl);
            apiOrigin = url.origin;
        } catch (e) {
            console.warn('[ChatViewProvider] Invalid API URL, using wildcard CSP:', e);
        }

        // Production-grade CSP
        const connectSrc = apiOrigin === '*' ? '*' : `${apiOrigin} *`;
        return [
            "default-src 'none'",
            "script-src 'unsafe-inline'",
            "style-src 'unsafe-inline'",
            "connect-src " + connectSrc,
            "img-src data: blob: https:",
            "font-src 'none'",
            "media-src 'none'",
            "object-src 'none'",
            "frame-src 'none'"
        ].join('; ');
    }

    private async _clearHistory(): Promise<void> {
        this._state.messageHistory = [];
        this._state.conversationId = undefined;
        await this._saveState();
    }

    private _setupMessageHandlers(webviewView: vscode.WebviewView): void {
        webviewView.webview.onDidReceiveMessage(async (data) => {
            this._telemetry.track('message_received', { type: data.type });

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
                    case 'scroll':
                        this._lastScrollPosition = data.position || 0;
                        break;
                    default:
                        console.warn('[ChatViewProvider] Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('[ChatViewProvider] Message handler error:', error);
                this._telemetry.trackError(error as Error, { messageType: data.type });

                webviewView.webview.postMessage({
                    type: 'error',
                    value: 'Internal error: ' + (error as Error).message,
                    canRetry: true
                });
            }
        });
    }

    // ========================================================================
    // MAIN MESSAGE HANDLER
    // ========================================================================

    private async _handlePrompt(question: string, webviewView: vscode.WebviewView): Promise<void> {
        const startTime = Date.now();
        this._telemetry.track('prompt_received', { questionLength: question.length });

        console.log('[ChatViewProvider] Handling prompt:', question.slice(0, 100) + '...');

        // 1. Rate limiting check
        if (!this._rateLimiter.tryAcquire()) {
            const resetTime = this._rateLimiter.getResetTime();
            const waitMs = resetTime - Date.now();

            webviewView.webview.postMessage({
                type: 'error',
                value: `Rate limit exceeded. Please wait ${Math.ceil(waitMs / 1000)} seconds.`,
                canRetry: true,
                originalMessage: question
            });

            this._telemetry.track('rate_limited', { remaining: 0 });
            return;
        }

        // 2. Circuit breaker check
        if (this._circuitBreaker.getState() === CircuitState.OPEN) {
            webviewView.webview.postMessage({
                type: 'error',
                value: 'Service temporarily unavailable. Please try again in a few seconds.',
                canRetry: true,
                originalMessage: question
            });
            return;
        }

        // 3. Check processing state
        if (this._state.isProcessing) {
            webviewView.webview.postMessage({
                type: 'error',
                value: 'Please wait for the current response to complete.',
                canRetry: true,
                originalMessage: question
            });
            return;
        }

        // 4. Get API key
        const apiKey = await this._context.secrets.get('contextos_api_key');
        if (!apiKey) {
            webviewView.webview.postMessage({
                type: 'error',
                value: 'No API key configured.\n\nPlease run "ContextOS: Set API Key" from the Command Palette.',
                canRetry: false
            });
            return;
        }

        // 5. Get configuration
        const config = vscode.workspace.getConfiguration('contextos');
        const apiUrl = config.get<string>('apiUrl') || 'https://contextos-api-jxdr.onrender.com';
        const maxRetries = config.get<number>('maxRetries') || 2;
        const timeoutMs = config.get<number>('timeout') || 120000;

        // 6. Execute request with retry logic
        this._state.isProcessing = true;
        this._state.messageHistory.push({ role: 'user', content: question });
        await this._saveState();

        try {
            const response = await this._executeRequestWithRetry(
                { question, apiKey, apiUrl, maxRetries, timeoutMs },
                webviewView
            );

            this._telemetry.track('prompt_completed', {
                duration: Date.now() - startTime,
                conversationId: this._state.conversationId?.slice(-8),
                responseLength: response.length
            });

            this._state.messageHistory.push({ role: 'assistant', content: response });
            this._state.conversationId = this._state.conversationId || 'conv_' + Date.now();
            await this._saveState();

        } catch (error: any) {
            console.error('[ChatViewProvider] Request failed:', error);
            this._telemetry.trackError(error as Error, { questionLength: question.length });

            webviewView.webview.postMessage({
                type: 'error',
                value: error.message || 'Failed to get response. Please try again.',
                canRetry: true,
                originalMessage: question
            });

            this._healthMonitor.recordFailure();
        } finally {
            this._state.isProcessing = false;
            this._state.retryCount = 0;
            await this._saveState();
        }
    }

    private async _executeRequestWithRetry(
        params: {
            question: string;
            apiKey: string;
            apiUrl: string;
            maxRetries: number;
            timeoutMs: number;
        },
        webviewView: vscode.WebviewView
    ): Promise<string> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= params.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
                    console.log(`[ChatViewProvider] Retrying after ${backoffMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                }

                const result = await this._circuitBreaker.execute(() =>
                    this._makeRequest(params, webviewView)
                );

                this._healthMonitor.recordSuccess();
                return result;

            } catch (error: any) {
                lastError = error;
                console.error(`[ChatViewProvider] Attempt ${attempt + 1} failed:`, error.message);

                // Don't retry on certain errors
                if (this._shouldNotRetry(error)) {
                    break;
                }
            }
        }

        throw lastError || new Error('Request failed after retries');
    }

    private async _makeRequest(
        params: {
            question: string;
            apiKey: string;
            apiUrl: string;
            timeoutMs: number;
        },
        webviewView: vscode.WebviewView
    ): Promise<string> {
        const cacheKey = `req_${this._hash(params.question + params.apiUrl)}`;
        const cached = this._requestCache.get(cacheKey);

        if (cached) {
            console.log('[ChatViewProvider] Cache hit for request');
            this._telemetry.track('cache_hit');
            return cached;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), params.timeoutMs);

        const requestBody = {
            question: params.question,
            stream: true,
            conversation_id: this._state.conversationId ?? null
        };

        console.log('[ChatViewProvider] Request to:', `${params.apiUrl}/api/v1/query`);

        try {
            const res = await fetch(`${params.apiUrl}/api/v1/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': params.apiKey
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
                throw new Error('Empty response from server');
            }

            const result = await this._streamResponse(res.body, webviewView);

            // Cache successful responses
            this._requestCache.set(cacheKey, result);

            return result;

        } finally {
            clearTimeout(timeoutId);
        }
    }

    private async _streamResponse(
        body: ReadableStream<Uint8Array>,
        webviewView: vscode.WebviewView
    ): Promise<string> {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        try {
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
                            await this._handleStreamEvent(data, webviewView);
                            if (data.content) {
                                fullResponse += data.content;
                            }
                        } catch (parseError) {
                            console.error('[ChatViewProvider] Parse error:', parseError);
                        }
                    }
                }
            }

            return fullResponse;
        } finally {
            reader.releaseLock();
        }
    }

    private async _handleStreamEvent(data: any, webviewView: vscode.WebviewView): Promise<void> {
        switch (data.event) {
            case 'thinking':
                webviewView.webview.postMessage({
                    type: 'thinking',
                    message: data.message || 'Thinking...'
                });
                break;

            case 'searching':
                webviewView.webview.postMessage({
                    type: 'searching',
                    source: data.source,
                    count: data.count
                });
                break;

            case 'token':
                webviewView.webview.postMessage({
                    type: 'token',
                    content: data.content
                });
                break;

            case 'sources':
                webviewView.webview.postMessage({
                    type: 'sources',
                    sources: data.sources
                });
                break;

            case 'done':
                if (data.conversation_id) {
                    this._state.conversationId = data.conversation_id;
                }
                webviewView.webview.postMessage({ type: 'done' });
                break;

            case 'error':
                throw new Error(data.message || 'Unknown error from server');
        }
    }

    private _shouldNotRetry(error: any): boolean {
        const msg = error.message?.toLowerCase() || '';
        return (
            msg.includes('401') ||
            msg.includes('403') ||
            msg.includes('invalid api key') ||
            msg.includes('unauthorized')
        );
    }

    private _hash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    public sendContextToChat(context: string): void {
        if (this._view) {
            this._view.show(true);
            this._view.webview.postMessage({ type: 'addContext', value: context });
        }
    }

    public async clearCache(): Promise<void> {
        this._requestCache.invalidate();
        this._telemetry.track('cache_cleared');
    }

    public getStats(): {
        messages: number;
        rateLimitRemaining: number;
        cacheSize: number;
        circuitState: string;
        health: string;
    } {
        return {
            messages: this._state.messageHistory.length,
            rateLimitRemaining: this._rateLimiter.getRemaining(),
            cacheSize: this._requestCache.getStats().size,
            circuitState: this._circuitBreaker.getState(),
            health: this._healthMonitor.isHealthy() ? 'healthy' : 'unhealthy'
        };
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================

    public dispose(): void {
        this._telemetry.track('extension_disposed', {
            sessionDuration: this._telemetry.getSessionDuration(),
            messageCount: this._state.messageHistory.length
        });
    }
}
