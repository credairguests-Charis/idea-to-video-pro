/**
 * Meta Ads Library Cache
 * 
 * Caches fetched ad creatives to reduce API calls
 */

import {
  MetaAdCreative,
  CachedAd,
  CacheOptions,
} from "./types";

export class MetaAdCache {
  private memoryCache: Map<string, CachedAd> = new Map();
  private options: Required<CacheOptions>;

  constructor(options?: CacheOptions) {
    this.options = {
      enabled: options?.enabled ?? true,
      ttl_seconds: options?.ttl_seconds ?? 3600, // 1 hour default
      storage: options?.storage ?? "memory",
    };
  }

  /**
   * Get cached ad creative
   */
  async get(ad_archive_id: string): Promise<MetaAdCreative | null> {
    if (!this.options.enabled) {
      return null;
    }

    if (this.options.storage === "memory") {
      return this.getFromMemory(ad_archive_id);
    }

    // Supabase storage not implemented in this version
    return null;
  }

  /**
   * Set cached ad creative
   */
  async set(ad_archive_id: string, creative: MetaAdCreative): Promise<void> {
    if (!this.options.enabled) {
      return;
    }

    if (this.options.storage === "memory") {
      this.setInMemory(ad_archive_id, creative);
    }

    // Supabase storage not implemented in this version
  }

  /**
   * Get from memory cache
   */
  private getFromMemory(ad_archive_id: string): MetaAdCreative | null {
    const cached = this.memoryCache.get(ad_archive_id);

    if (!cached) {
      return null;
    }

    // Check if expired
    const cachedAt = new Date(cached.cached_at).getTime();
    const now = Date.now();
    const age = (now - cachedAt) / 1000; // seconds

    if (age > cached.ttl_seconds) {
      console.log(`[MetaAdCache] Cache expired for ${ad_archive_id}`);
      this.memoryCache.delete(ad_archive_id);
      return null;
    }

    console.log(`[MetaAdCache] Cache hit for ${ad_archive_id} (age: ${Math.floor(age)}s)`);
    return cached.creative;
  }

  /**
   * Set in memory cache
   */
  private setInMemory(ad_archive_id: string, creative: MetaAdCreative): void {
    const cachedAd: CachedAd = {
      creative,
      cached_at: new Date().toISOString(),
      ttl_seconds: this.options.ttl_seconds,
    };

    this.memoryCache.set(ad_archive_id, cachedAd);
    console.log(`[MetaAdCache] Cached ${ad_archive_id} (TTL: ${this.options.ttl_seconds}s)`);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    console.log("[MetaAdCache] Cache cleared");
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.memoryCache.size,
      storage: this.options.storage,
      ttl_seconds: this.options.ttl_seconds,
      enabled: this.options.enabled,
    };
  }
}
