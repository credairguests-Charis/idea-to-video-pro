/**
 * Meta Ads Library Fetcher
 * 
 * Fetches ad creative data from Meta Ads Library
 */

import {
  MetaAdLibraryURL,
  MetaAdCreative,
  MetaAdFetchResult,
  MetaAdError,
  MetaAdErrorCode,
  CacheOptions,
} from "./types";
import { MetaAdParser } from "./parser";
import { MetaAdCache } from "./cache";

export class MetaAdFetcher {
  private cache: MetaAdCache;

  constructor(cacheOptions?: CacheOptions) {
    this.cache = new MetaAdCache(cacheOptions);
  }

  /**
   * Fetch ad creative from Meta Ads Library URL
   */
  async fetchAdCreative(
    metaAdUrl: string | MetaAdLibraryURL
  ): Promise<MetaAdFetchResult> {
    const startTime = Date.now();
    const url = typeof metaAdUrl === "string" ? metaAdUrl : metaAdUrl.url;

    console.log("[MetaAdFetcher] Fetching ad creative:", url);

    try {
      // Validate URL
      if (!MetaAdParser.validateURL(url)) {
        throw new MetaAdError(
          MetaAdErrorCode.INVALID_URL,
          "Invalid Meta Ads Library URL",
          { url }
        );
      }

      // Extract ad_archive_id
      const urlObj = new URL(url);
      const ad_archive_id = urlObj.searchParams.get("id");

      if (!ad_archive_id) {
        throw new MetaAdError(
          MetaAdErrorCode.INVALID_URL,
          "Missing ad_archive_id in URL"
        );
      }

      // Check cache
      const cached = await this.cache.get(ad_archive_id);
      if (cached) {
        console.log("[MetaAdFetcher] Cache hit for:", ad_archive_id);
        return {
          success: true,
          creative: cached,
          source: "cache",
          duration_ms: Date.now() - startTime,
        };
      }

      // Fetch from Meta Ads Library
      const creative = await this.fetchFromAPI(url, ad_archive_id);

      // Cache result
      await this.cache.set(ad_archive_id, creative);

      return {
        success: true,
        creative,
        source: "api",
        duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error("[MetaAdFetcher] Fetch failed:", error);

      if (error instanceof MetaAdError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
          source: "api",
          duration_ms: Date.now() - startTime,
        };
      }

      return {
        success: false,
        error: {
          code: MetaAdErrorCode.NETWORK_ERROR,
          message: error instanceof Error ? error.message : "Unknown error",
        },
        source: "api",
        duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Fetch from Meta Ads Library (via edge function or direct)
   */
  private async fetchFromAPI(
    url: string,
    ad_archive_id: string
  ): Promise<MetaAdCreative> {
    // Note: Meta Ads Library doesn't have a public API for direct access
    // We need to either:
    // 1. Use a third-party service (like searchapi.io)
    // 2. Scrape the HTML page
    // 3. Use Facebook Graph API (requires access token)

    // For this implementation, we'll use a structured approach
    // that can be extended to use any of these methods

    try {
      // Attempt to fetch via structured API (placeholder)
      // In production, this would call a third-party API or Graph API
      const response = await this.fetchViaThirdPartyAPI(ad_archive_id);
      
      if (response) {
        return MetaAdParser.parseAPIResponse(response);
      }

      // Fallback: Return minimal data structure
      return this.createMinimalCreative(ad_archive_id, url);
    } catch (error) {
      console.error("[MetaAdFetcher] API fetch failed, using minimal data");
      return this.createMinimalCreative(ad_archive_id, url);
    }
  }

  /**
   * Fetch via third-party API (placeholder)
   */
  private async fetchViaThirdPartyAPI(ad_archive_id: string): Promise<any | null> {
    // This is a placeholder for third-party API integration
    // In production, you would:
    // 1. Use searchapi.io Meta Ads Library API
    // 2. Use Facebook Graph API with proper authentication
    // 3. Implement web scraping with proper rate limiting

    console.log("[MetaAdFetcher] Third-party API fetch not implemented");
    return null;
  }

  /**
   * Create minimal creative object (fallback)
   */
  private createMinimalCreative(
    ad_archive_id: string,
    url: string
  ): MetaAdCreative {
    console.log("[MetaAdFetcher] Creating minimal creative for:", ad_archive_id);

    return {
      ad_archive_id,
      page_id: "",
      page_name: "Unknown Advertiser",
      page_profile_uri: "",
      media_type: "unknown",
      
      // Placeholder values - will be enriched by actual API
      body_text: undefined,
      caption: undefined,
      video_url: undefined,
      cta_text: undefined,
      link_url: undefined,
    };
  }

  /**
   * Extract video URL from creative
   */
  extractVideoUrl(creative: MetaAdCreative): string | undefined {
    return MetaAdParser.extractVideo(creative).video_url;
  }

  /**
   * Extract text metadata from creative
   */
  extractTextMetadata(creative: MetaAdCreative) {
    return MetaAdParser.extractText(creative);
  }

  /**
   * Extract CTA metadata from creative
   */
  extractCTAMetadata(creative: MetaAdCreative) {
    return MetaAdParser.extractCTA(creative);
  }

  /**
   * Extract advertiser metadata from creative
   */
  extractAdvertiserMetadata(creative: MetaAdCreative) {
    return MetaAdParser.extractAdvertiser(creative);
  }

  /**
   * Batch fetch multiple ads
   */
  async fetchBatch(urls: string[]): Promise<MetaAdFetchResult[]> {
    console.log(`[MetaAdFetcher] Batch fetching ${urls.length} ads`);

    const results = await Promise.all(
      urls.map((url) => this.fetchAdCreative(url))
    );

    const successCount = results.filter((r) => r.success).length;
    console.log(`[MetaAdFetcher] Batch complete: ${successCount}/${urls.length} successful`);

    return results;
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }
}
