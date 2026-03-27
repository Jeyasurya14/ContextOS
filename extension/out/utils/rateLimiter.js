"use strict";
/**
 * Production-grade rate limiter for API requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestThrottler = exports.RateLimiter = void 0;
const errorHandler_1 = require("./errorHandler");
class RateLimiter {
    requests = [];
    maxRequests;
    windowMs;
    constructor(maxRequests = 30, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }
    /**
     * Check if request is allowed under rate limit
     * @throws RateLimitError if rate limit exceeded
     */
    checkLimit() {
        const now = Date.now();
        // Remove old requests outside the window
        this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const resetTime = oldestRequest + this.windowMs;
            const waitTime = Math.ceil((resetTime - now) / 1000);
            throw new errorHandler_1.RateLimitError(`Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`);
        }
        // Add current request
        this.requests.push(now);
    }
    /**
     * Get remaining requests in current window
     */
    getRemainingRequests() {
        const now = Date.now();
        this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);
        return Math.max(0, this.maxRequests - this.requests.length);
    }
    /**
     * Get time until rate limit resets (in ms)
     */
    getResetTime() {
        if (this.requests.length === 0) {
            return 0;
        }
        const now = Date.now();
        const oldestRequest = this.requests[0];
        const resetTime = oldestRequest + this.windowMs;
        return Math.max(0, resetTime - now);
    }
    /**
     * Reset the rate limiter
     */
    reset() {
        this.requests = [];
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Request throttler to prevent rapid successive requests
 */
class RequestThrottler {
    lastRequestTime = 0;
    minInterval;
    constructor(minIntervalMs = 1000) {
        this.minInterval = minIntervalMs;
    }
    /**
     * Wait if necessary to maintain minimum interval between requests
     */
    async throttle() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.lastRequestTime = Date.now();
    }
}
exports.RequestThrottler = RequestThrottler;
//# sourceMappingURL=rateLimiter.js.map