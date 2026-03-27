/**
 * Production-grade caching utilities
 */

export interface CacheEntry<T> {
    value: T;
    timestamp: number;
    expiresAt: number;
}

export class Cache<T> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private readonly defaultTTL: number;

    constructor(defaultTTLMs: number = 300000) { // 5 minutes default
        this.defaultTTL = defaultTTLMs;
    }

    /**
     * Set a value in cache
     */
    public set(key: string, value: T, ttl?: number): void {
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
    public get(key: string): T | undefined {
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
    public has(key: string): boolean {
        return this.get(key) !== undefined;
    }

    /**
     * Delete a key from cache
     */
    public delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    public clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache size
     */
    public size(): number {
        return this.cache.size;
    }

    /**
     * Remove expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

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
    public async getOrSet(
        key: string,
        factory: () => Promise<T>,
        ttl?: number
    ): Promise<T> {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await factory();
        this.set(key, value, ttl);
        return value;
    }
}

/**
 * LRU (Least Recently Used) Cache
 */
export class LRUCache<T> {
    private cache: Map<string, T> = new Map();
    private readonly maxSize: number;

    constructor(maxSize: number = 100) {
        this.maxSize = maxSize;
    }

    /**
     * Get value and mark as recently used
     */
    public get(key: string): T | undefined {
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
    public set(key: string, value: T): void {
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
    public has(key: string): boolean {
        return this.cache.has(key);
    }

    /**
     * Clear cache
     */
    public clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache size
     */
    public size(): number {
        return this.cache.size;
    }

    /**
     * Delete a key from cache
     */
    public delete(key: string): boolean {
        return this.cache.delete(key);
    }
}
