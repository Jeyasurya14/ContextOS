/**
 * ContextOS Extension - Type Definitions
 * Production-grade TypeScript types for type safety
 */

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
    id?: string;
}

export interface ConversationState {
    id?: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
}

export interface WebviewMessage {
    type: 'prompt' | 'clearHistory' | 'copyCode' | 'copyMsg' | 'retry' | 'ready';
    value?: string;
    id?: string;
    message?: string;
}

export interface WebviewResponse {
    type: 'thinking' | 'searching' | 'token' | 'sources' | 'done' | 'error' | 'codeCopied' | 'addContext' | 'restoreHistory';
    value?: string;
    source?: string;
    count?: number;
    sources?: Source[];
    messages?: Message[];
    canRetry?: boolean;
    originalMessage?: string;
    id?: string;
}

export interface Source {
    id: string;
    source?: string;
    title?: string;
    content?: string;
    score?: number;
}

export interface SSEEvent {
    event: 'thinking' | 'searching' | 'token' | 'sources' | 'done' | 'error';
    message?: string;
    content?: string;
    source?: string;
    count?: number;
    sources?: Source[];
    conversation_id?: string;
}

export interface APIRequest {
    question: string;
    stream: boolean;
    conversation_id: string | null;
}

export interface APIError {
    message: string;
    code?: string;
    statusCode?: number;
    retryable?: boolean;
}

export interface ExtensionConfig {
    apiUrl: string;
    maxRetries: number;
    timeout: number;
    enableTelemetry: boolean;
    debugMode: boolean;
}

export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

export interface TelemetryEvent {
    event: string;
    timestamp: number;
    data?: Record<string, any>;
}
