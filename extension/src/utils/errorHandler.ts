/**
 * Production-grade error handling utilities
 */

import * as vscode from 'vscode';
import { APIError } from '../types';

export class ContextOSError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode?: number,
        public retryable: boolean = false,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'ContextOSError';
        Object.setPrototypeOf(this, ContextOSError.prototype);
    }
}

export class NetworkError extends ContextOSError {
    constructor(message: string, originalError?: Error) {
        super(message, 'NETWORK_ERROR', undefined, true, originalError);
        this.name = 'NetworkError';
    }
}

export class APIKeyError extends ContextOSError {
    constructor(message: string = 'Invalid or missing API key') {
        super(message, 'API_KEY_ERROR', 401, false);
        this.name = 'APIKeyError';
    }
}

export class RateLimitError extends ContextOSError {
    constructor(message: string = 'Rate limit exceeded') {
        super(message, 'RATE_LIMIT_ERROR', 429, true);
        this.name = 'RateLimitError';
    }
}

export class TimeoutError extends ContextOSError {
    constructor(message: string = 'Request timeout') {
        super(message, 'TIMEOUT_ERROR', undefined, true);
        this.name = 'TimeoutError';
    }
}

export class ValidationError extends ContextOSError {
    constructor(message: string) {
        super(message, 'VALIDATION_ERROR', 400, false);
        this.name = 'ValidationError';
    }
}

export function parseError(error: unknown): APIError {
    if (error instanceof ContextOSError) {
        return {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            retryable: error.retryable
        };
    }

    if (error instanceof Error) {
        // Network errors
        if (error.message.includes('fetch') || error.message.includes('network')) {
            return {
                message: 'Network connection failed. Please check your internet connection.',
                code: 'NETWORK_ERROR',
                retryable: true
            };
        }

        // Timeout errors
        if (error.message.includes('aborted') || error.message.includes('timeout')) {
            return {
                message: 'Request timed out. The server took too long to respond.',
                code: 'TIMEOUT_ERROR',
                retryable: true
            };
        }

        return {
            message: error.message,
            code: 'UNKNOWN_ERROR',
            retryable: false
        };
    }

    return {
        message: String(error),
        code: 'UNKNOWN_ERROR',
        retryable: false
    };
}

export function handleError(error: unknown, context: string): void {
    const parsedError = parseError(error);
    
    console.error(`[ContextOS] Error in ${context}:`, {
        message: parsedError.message,
        code: parsedError.code,
        statusCode: parsedError.statusCode,
        retryable: parsedError.retryable
    });

    // Show user-friendly error message
    if (parsedError.statusCode === 401) {
        vscode.window.showErrorMessage(
            'ContextOS: Invalid API key. Please update your API key.',
            'Set API Key'
        ).then(selection => {
            if (selection === 'Set API Key') {
                vscode.commands.executeCommand('contextos.setApiKey');
            }
        });
    } else if (parsedError.retryable) {
        vscode.window.showWarningMessage(
            `ContextOS: ${parsedError.message}`,
            'Retry'
        );
    } else {
        vscode.window.showErrorMessage(`ContextOS: ${parsedError.message}`);
    }
}

export function sanitizeInput(input: string, maxLength: number = 10000): string {
    if (!input || typeof input !== 'string') {
        throw new ValidationError('Input must be a non-empty string');
    }

    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Enforce max length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    if (sanitized.length === 0) {
        throw new ValidationError('Input cannot be empty after sanitization');
    }

    return sanitized;
}

export function validateAPIKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
        return false;
    }

    // Must start with ctx_
    if (!apiKey.startsWith('ctx_')) {
        return false;
    }

    // Must be reasonable length (at least 20 chars)
    if (apiKey.length < 20) {
        return false;
    }

    // Must contain only alphanumeric and underscore
    if (!/^ctx_[a-zA-Z0-9_]+$/.test(apiKey)) {
        return false;
    }

    return true;
}

export function validateURL(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}
