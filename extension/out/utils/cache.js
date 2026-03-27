"use strict";
/**
 * Production-grade caching utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LRUCache = exports.Cache = void 0;
class Cache {
    cache = new Map();
    defaultTTL;
    constructor(defaultTTLMs = 300000) {
        this.defaultTTL = defaultTTLMs;
    }
    /**
     * Set a value in cache
     */
    set(key, value, ttl) {
        const now = Date.now();
        const expiresAt = now + (ttl || this.defaultTTL);
        this.cache.set(key, {
            value,
            timestamp: now,
            expiresAt
        });
        // Clean up expired entries periodically
        this.cleanup();
    }
    /**
     * Get a value from cache
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }
    /**
     * Check if key exists and is not expired
     */
    has(key) {
        return this.get(key) !== undefined;
    }
    /**
     * Delete a key from cache
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get cache size
     */
    size() {
        return this.cache.size;
    }
    /**
     * Remove expired entries
     */
    cleanup() {
        const now = Date.now();
        const keysToDelete = [];
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                keysToDelete.push(key);
            }
        }
        for (const key of keysToDelete) {
            this.cache.delete(key);
        }
    }
    /**
     * Get or set pattern (lazy loading)
     */
    async getOrSet(key, factory, ttl) {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const value = await factory();
        this.set(key, value, ttl);
        return value;
    }
}
exports.Cache = Cache;
/**
 * LRU (Least Recently Used) Cache
 */
class LRUCache {
    cache = new Map();
    maxSize;
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
    }
    /**
     * Get value and mark as recently used
     */
    get(key) {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }
    /**
     * Set value
     */
    set(key, value) {
        // Delete if exists (to update position)
        this.cache.delete(key);
        // Add to end
        this.cache.set(key, value);
        // Evict oldest if over size
        if (this.cache.size > this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
    }
    /**
     * Check if key exists
     */
    has(key) {
        return this.cache.has(key);
    }
    /**
     * Clear cache
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get cache size
     */
    size() {
        return this.cache.size;
    }
    /**
     * Delete a key from cache
     */
    delete(key) {
        return this.cache.delete(key);
    }
}
exports.LRUCache = LRUCache;
//# sourceMappingURL=cache.js.map