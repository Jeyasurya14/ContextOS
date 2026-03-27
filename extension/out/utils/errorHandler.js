"use strict";
/**
 * Production-grade error handling utilities
 */
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
exports.ValidationError = exports.TimeoutError = exports.RateLimitError = exports.APIKeyError = exports.NetworkError = exports.ContextOSError = void 0;
exports.parseError = parseError;
exports.handleError = handleError;
exports.sanitizeInput = sanitizeInput;
exports.validateAPIKey = validateAPIKey;
exports.validateURL = validateURL;
const vscode = __importStar(require("vscode"));
class ContextOSError extends Error {
    code;
    statusCode;
    retryable;
    originalError;
    constructor(message, code, statusCode, retryable = false, originalError) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.retryable = retryable;
        this.originalError = originalError;
        this.name = 'ContextOSError';
        Object.setPrototypeOf(this, ContextOSError.prototype);
    }
}
exports.ContextOSError = ContextOSError;
class NetworkError extends ContextOSError {
    constructor(message, originalError) {
        super(message, 'NETWORK_ERROR', undefined, true, originalError);
        this.name = 'NetworkError';
    }
}
exports.NetworkError = NetworkError;
class APIKeyError extends ContextOSError {
    constructor(message = 'Invalid or missing API key') {
        super(message, 'API_KEY_ERROR', 401, false);
        this.name = 'APIKeyError';
    }
}
exports.APIKeyError = APIKeyError;
class RateLimitError extends ContextOSError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 'RATE_LIMIT_ERROR', 429, true);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
class TimeoutError extends ContextOSError {
    constructor(message = 'Request timeout') {
        super(message, 'TIMEOUT_ERROR', undefined, true);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
class ValidationError extends ContextOSError {
    constructor(message) {
        super(message, 'VALIDATION_ERROR', 400, false);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
function parseError(error) {
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
function handleError(error, context) {
    const parsedError = parseError(error);
    console.error(`[ContextOS] Error in ${context}:`, {
        message: parsedError.message,
        code: parsedError.code,
        statusCode: parsedError.statusCode,
        retryable: parsedError.retryable
    });
    // Show user-friendly error message
    if (parsedError.statusCode === 401) {
        vscode.window.showErrorMessage('ContextOS: Invalid API key. Please update your API key.', 'Set API Key').then(selection => {
            if (selection === 'Set API Key') {
                vscode.commands.executeCommand('contextos.setApiKey');
            }
        });
    }
    else if (parsedError.retryable) {
        vscode.window.showWarningMessage(`ContextOS: ${parsedError.message}`, 'Retry');
    }
    else {
        vscode.window.showErrorMessage(`ContextOS: ${parsedError.message}`);
    }
}
function sanitizeInput(input, maxLength = 10000) {
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
function validateAPIKey(apiKey) {
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
function validateURL(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=errorHandler.js.map