/**
 * Privacy-focused telemetry for production monitoring
 * No PII (Personally Identifiable Information) is collected
 */

import { TelemetryEvent } from '../types';

export class TelemetryManager {
    private events: TelemetryEvent[] = [];
    private readonly maxEvents: number = 100;
    private enabled: boolean = false;

    constructor(enabled: boolean = false) {
        this.enabled = enabled;
    }

    /**
     * Track an event (only if telemetry is enabled)
     */
    public trackEvent(event: string, data?: Record<string, any>): void {
        if (!this.enabled) {
            return;
        }

        // Sanitize data to remove any PII
        const sanitizedData = this.sanitizeData(data);

        const telemetryEvent: TelemetryEvent = {
            event,
            timestamp: Date.now(),
            data: sanitizedData
        };

        this.events.push(telemetryEvent);

        // Keep only recent events
        if (this.events.length > this.maxEvents) {
            this.events.shift();
        }

        console.log('[Telemetry]', event, sanitizedData);
    }

    /**
     * Track error (anonymized)
     */
    public trackError(error: Error, context?: string): void {
        this.trackEvent('error', {
            context,
            errorType: error.name,
            errorCode: (error as any).code,
            // Do NOT include error message as it might contain PII
        });
    }

    /**
     * Track performance metric
     */
    public trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
        this.trackEvent('performance', {
            metric,
            value,
            unit
        });
    }

    /**
     * Track feature usage
     */
    public trackFeatureUsage(feature: string): void {
        this.trackEvent('feature_usage', {
            feature
        });
    }

    /**
     * Get telemetry summary (for debugging)
     */
    public getSummary(): Record<string, number> {
        const summary: Record<string, number> = {};

        for (const event of this.events) {
            summary[event.event] = (summary[event.event] || 0) + 1;
        }

        return summary;
    }

    /**
     * Enable or disable telemetry
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.events = [];
        }
    }

    /**
     * Clear all telemetry data
     */
    public clear(): void {
        this.events = [];
    }

    /**
     * Remove PII from data
     */
    private sanitizeData(data?: Record<string, any>): Record<string, any> | undefined {
        if (!data) {
            return undefined;
        }

        const sanitized: Record<string, any> = {};

        for (const [key, value] of Object.entries(data)) {
            // Skip fields that might contain PII
            if (this.isPIIField(key)) {
                continue;
            }

            // Only include primitive types and simple objects
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                sanitized[key] = value;
            } else if (typeof value === 'object' && value !== null) {
                // Recursively sanitize nested objects
                sanitized[key] = this.sanitizeData(value as Record<string, any>);
            }
        }

        return sanitized;
    }

    /**
     * Check if field name suggests PII
     */
    private isPIIField(fieldName: string): boolean {
        const piiKeywords = [
            'email', 'name', 'user', 'username', 'password', 'token', 'key',
            'secret', 'auth', 'credential', 'api_key', 'apikey', 'message',
            'content', 'text', 'question', 'answer', 'response'
        ];

        const lowerField = fieldName.toLowerCase();
        return piiKeywords.some(keyword => lowerField.includes(keyword));
    }
}

/**
 * Performance monitor for tracking operation timings
 */
export class PerformanceMonitor {
    private timers: Map<string, number> = new Map();

    /**
     * Start timing an operation
     */
    public start(operation: string): void {
        this.timers.set(operation, Date.now());
    }

    /**
     * End timing and return duration
     */
    public end(operation: string): number {
        const startTime = this.timers.get(operation);
        if (!startTime) {
            console.warn(`[Performance] No start time found for operation: ${operation}`);
            return 0;
        }

        const duration = Date.now() - startTime;
        this.timers.delete(operation);
        
        console.log(`[Performance] ${operation}: ${duration}ms`);
        return duration;
    }

    /**
     * Measure async operation
     */
    public async measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
        this.start(operation);
        try {
            const result = await fn();
            this.end(operation);
            return result;
        } catch (error) {
            this.end(operation);
            throw error;
        }
    }
}
