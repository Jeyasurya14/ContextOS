"use strict";
/**
 * Production configuration management
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
exports.Environment = exports.ConfigManager = void 0;
const vscode = __importStar(require("vscode"));
class ConfigManager {
    static instance;
    config;
    constructor() {
        this.config = vscode.workspace.getConfiguration('contextos');
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    /**
     * Reload configuration
     */
    reload() {
        this.config = vscode.workspace.getConfiguration('contextos');
    }
    /**
     * Get full configuration
     */
    getConfig() {
        return {
            apiUrl: this.getAPIUrl(),
            maxRetries: this.getMaxRetries(),
            timeout: this.getTimeout(),
            enableTelemetry: this.getTelemetryEnabled(),
            debugMode: this.getDebugMode()
        };
    }
    /**
     * Get API URL
     */
    getAPIUrl() {
        return this.config.get('apiUrl') || 'https://contextos-api-jxdr.onrender.com';
    }
    /**
     * Get max retries
     */
    getMaxRetries() {
        return this.config.get('maxRetries') || 2;
    }
    /**
     * Get request timeout (ms)
     */
    getTimeout() {
        return this.config.get('timeout') || 120000; // 2 minutes
    }
    /**
     * Check if telemetry is enabled
     */
    getTelemetryEnabled() {
        return this.config.get('enableTelemetry') || false;
    }
    /**
     * Check if debug mode is enabled
     */
    getDebugMode() {
        return this.config.get('debugMode') || false;
    }
    /**
     * Get rate limit config
     */
    getRateLimitConfig() {
        return {
            maxRequests: this.config.get('rateLimitMaxRequests') || 30,
            windowMs: this.config.get('rateLimitWindowMs') || 60000
        };
    }
    /**
     * Get cache TTL (ms)
     */
    getCacheTTL() {
        return this.config.get('cacheTTL') || 300000; // 5 minutes
    }
    /**
     * Update configuration value
     */
    async update(key, value, global = true) {
        await this.config.update(key, value, global);
        this.reload();
    }
}
exports.ConfigManager = ConfigManager;
/**
 * Environment detection
 */
class Environment {
    static isProduction() {
        return vscode.env.appName.includes('Code') && !vscode.env.appName.includes('Insiders');
    }
    static isDevelopment() {
        return vscode.env.appName.includes('Insiders') || vscode.env.appName.includes('OSS');
    }
    static getVersion() {
        return vscode.extensions.getExtension('JeyaSuryaM.contextos-copilot')?.packageJSON.version || 'unknown';
    }
    static getVSCodeVersion() {
        return vscode.version;
    }
    static getPlatform() {
        return process.platform;
    }
    static getSessionId() {
        return vscode.env.sessionId;
    }
}
exports.Environment = Environment;
//# sourceMappingURL=config.js.map