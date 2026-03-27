"use strict";
/**
 * Privacy-focused telemetry for production monitoring
 * No PII (Personally Identifiable Information) is collected
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = exports.TelemetryManager = void 0;
class TelemetryManager {
    events = [];
    maxEvents = 100;
    enabled = false;
    constructor(enabled = false) {
        this.enabled = enabled;
    }
    /**
     * Track an event (only if telemetry is enabled)
     */
    trackEvent(event, data) {
        if (!this.enabled) {
            return;
        }
        // Sanitize data to remove any PII
        const sanitizedData = this.sanitizeData(data);
        const telemetryEvent = {
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
    trackError(error, context) {
        this.trackEvent('error', {
            context,
            errorType: error.name,
            errorCode: error.code,
            // Do NOT include error message as it might contain PII
        });
    }
    /**
     * Track performance metric
     */
    trackPerformance(metric, value, unit = 'ms') {
        this.trackEvent('performance', {
            metric,
            value,
            unit
        });
    }
    /**
     * Track feature usage
     */
    trackFeatureUsage(feature) {
        this.trackEvent('feature_usage', {
            feature
        });
    }
    /**
     * Get telemetry summary (for debugging)
     */
    getSummary() {
        const summary = {};
        for (const event of this.events) {
            summary[event.event] = (summary[event.event] || 0) + 1;
        }
        return summary;
    }
    /**
     * Enable or disable telemetry
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.events = [];
        }
    }
    /**
     * Clear all telemetry data
     */
    clear() {
        this.events = [];
    }
    /**
     * Remove PII from data
     */
    sanitizeData(data) {
        if (!data) {
            return undefined;
        }
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            // Skip fields that might contain PII
            if (this.isPIIField(key)) {
                continue;
            }
            // Only include primitive types and simple objects
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                sanitized[key] = value;
            }
            else if (typeof value === 'object' && value !== null) {
                // Recursively sanitize nested objects
                sanitized[key] = this.sanitizeData(value);
            }
        }
        return sanitized;
    }
    /**
     * Check if field name suggests PII
     */
    isPIIField(fieldName) {
        const piiKeywords = [
            'email', 'name', 'user', 'username', 'password', 'token', 'key',
            'secret', 'auth', 'credential', 'api_key', 'apikey', 'message',
            'content', 'text', 'question', 'answer', 'response'
        ];
        const lowerField = fieldName.toLowerCase();
        return piiKeywords.some(keyword => lowerField.includes(keyword));
    }
}
exports.TelemetryManager = TelemetryManager;
/**
 * Performance monitor for tracking operation timings
 */
class PerformanceMonitor {
    timers = new Map();
    /**
     * Start timing an operation
     */
    start(operation) {
        this.timers.set(operation, Date.now());
    }
    /**
     * End timing and return duration
     */
    end(operation) {
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
    async measure(operation, fn) {
        this.start(operation);
        try {
            const result = await fn();
            this.end(operation);
            return result;
        }
        catch (error) {
            this.end(operation);
            throw error;
        }
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
//# sourceMappingURL=telemetry.js.map