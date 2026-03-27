/**
 * Production configuration management
 */

import * as vscode from 'vscode';
import { ExtensionConfig } from './types';

export class ConfigManager {
    private static instance: ConfigManager;
    private config: vscode.WorkspaceConfiguration;

    private constructor() {
        this.config = vscode.workspace.getConfiguration('contextos');
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    /**
     * Reload configuration
     */
    public reload(): void {
        this.config = vscode.workspace.getConfiguration('contextos');
    }

    /**
     * Get full configuration
     */
    public getConfig(): ExtensionConfig {
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
    public getAPIUrl(): string {
        return this.config.get<string>('apiUrl') || 'https://contextos-api-jxdr.onrender.com';
    }

    /**
     * Get max retries
     */
    public getMaxRetries(): number {
        return this.config.get<number>('maxRetries') || 2;
    }

    /**
     * Get request timeout (ms)
     */
    public getTimeout(): number {
        return this.config.get<number>('timeout') || 120000; // 2 minutes
    }

    /**
     * Check if telemetry is enabled
     */
    public getTelemetryEnabled(): boolean {
        return this.config.get<boolean>('enableTelemetry') || false;
    }

    /**
     * Check if debug mode is enabled
     */
    public getDebugMode(): boolean {
        return this.config.get<boolean>('debugMode') || false;
    }

    /**
     * Get rate limit config
     */
    public getRateLimitConfig(): { maxRequests: number; windowMs: number } {
        return {
            maxRequests: this.config.get<number>('rateLimitMaxRequests') || 30,
            windowMs: this.config.get<number>('rateLimitWindowMs') || 60000
        };
    }

    /**
     * Get cache TTL (ms)
     */
    public getCacheTTL(): number {
        return this.config.get<number>('cacheTTL') || 300000; // 5 minutes
    }

    /**
     * Update configuration value
     */
    public async update(key: string, value: any, global: boolean = true): Promise<void> {
        await this.config.update(key, value, global);
        this.reload();
    }
}

/**
 * Environment detection
 */
export class Environment {
    public static isProduction(): boolean {
        return vscode.env.appName.includes('Code') && !vscode.env.appName.includes('Insiders');
    }

    public static isDevelopment(): boolean {
        return vscode.env.appName.includes('Insiders') || vscode.env.appName.includes('OSS');
    }

    public static getVersion(): string {
        return vscode.extensions.getExtension('JeyaSuryaM.contextos-copilot')?.packageJSON.version || 'unknown';
    }

    public static getVSCodeVersion(): string {
        return vscode.version;
    }

    public static getPlatform(): string {
        return process.platform;
    }

    public static getSessionId(): string {
        return vscode.env.sessionId;
    }
}
