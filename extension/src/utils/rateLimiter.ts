/**
 * Production-grade rate limiter for API requests
 */

import { RateLimitError } from './errorHandler';

export class RateLimiter {
    private requests: number[] = [];
    private readonly maxRequests: number;
    private readonly windowMs: number;

    constructor(maxRequests: number = 30, windowMs: number = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    /**
     * Check if request is allowed under rate limit
     * @throws RateLimitError if rate limit exceeded
     */
    public checkLimit(): void {
        const now = Date.now();
        
        // Remove old requests outside the window
        this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);

        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const resetTime = oldestRequest + this.windowMs;
            const waitTime = Math.ceil((resetTime - now) / 1000);
            
            throw new RateLimitError(
                `Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`
            );
        }

        // Add current request
        this.requests.push(now);
    }

    /**
     * Get remaining requests in current window
     */
    public getRemainingRequests(): number {
        const now = Date.now();
        this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);
        return Math.max(0, this.maxRequests - this.requests.length);
    }

    /**
     * Get time until rate limit resets (in ms)
     */
    public getResetTime(): number {
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
    public reset(): void {
        this.requests = [];
    }
}

/**
 * Request throttler to prevent rapid successive requests
 */
export class RequestThrottler {
    private lastRequestTime: number = 0;
    private readonly minInterval: number;

    constructor(minIntervalMs: number = 1000) {
        this.minInterval = minIntervalMs;
    }

    /**
     * Wait if necessary to maintain minimum interval between requests
     */
    public async throttle(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }
}
