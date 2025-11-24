/**
 * Meta Ads Library Parser
 * 
 * Parses Meta Ads Library HTML and API responses
 */

import {
  MetaAdCreative,
  MetaAdHTMLData,
  MetaAdAPIData,
  MetaAdCard,
  VideoExtraction,
  TextExtraction,
  CTAExtraction,
  AdvertiserExtraction,
  MetaAdError,
  MetaAdErrorCode,
} from "./types";

export class MetaAdParser {
  /**
   * Parse Meta Ads Library API response
   */
  static parseAPIResponse(data: MetaAdAPIData): MetaAdCreative {
    console.log("[MetaAdParser] Parsing API response:", data.ad_archive_id);

    const snapshot = data.snapshot || {};
    
    return {
      ad_archive_id: data.ad_archive_id,
      page_id: data.page_id || snapshot.page_id,
      page_name: snapshot.page_name || "",
      page_profile_uri: snapshot.page_profile_uri || "",
      page_profile_picture_url: snapshot.page_profile_picture_url,
      
      body_text: snapshot.body?.text || snapshot.body,
      caption: snapshot.caption,
      title: snapshot.title,
      
      video_url: this.extractVideoURL(snapshot),
      video_thumbnail_url: this.extractThumbnailURL(snapshot),
      image_url: snapshot.original_image_url || snapshot.resized_image_url,
      media_type: this.detectMediaType(snapshot),
      
      cta_text: snapshot.cta_text,
      cta_type: snapshot.cta_type,
      link_url: snapshot.link_url,
      link_description: snapshot.link_description,
      
      display_format: snapshot.display_format,
      page_categories: snapshot.page_categories,
      page_like_count: snapshot.page_like_count,
      
      cards: this.parseCards(snapshot.cards),
      targeting: this.parseTargeting(snapshot),
    };
  }

  /**
   * Parse HTML from Meta Ads Library page (fallback)
   */
  static parseHTML(htmlData: MetaAdHTMLData): MetaAdCreative {
    console.log("[MetaAdParser] Parsing HTML from:", htmlData.url);

    try {
      // Extract ad_archive_id from URL
      const ad_archive_id = this.extractAdIdFromURL(htmlData.url);
      
      if (!ad_archive_id) {
        throw new MetaAdError(
          MetaAdErrorCode.INVALID_URL,
          "Could not extract ad_archive_id from URL"
        );
      }

      // Note: HTML parsing is complex and requires DOM parser
      // This is a placeholder for server-side HTML parsing
      // In production, this would use cheerio or similar library
      
      return {
        ad_archive_id,
        page_id: "",
        page_name: "",
        page_profile_uri: "",
        media_type: "unknown",
      };
    } catch (error) {
      throw new MetaAdError(
        MetaAdErrorCode.PARSING_ERROR,
        error instanceof Error ? error.message : "HTML parsing failed",
        { url: htmlData.url }
      );
    }
  }

  /**
   * Extract video URL from snapshot
   */
  private static extractVideoURL(snapshot: any): string | undefined {
    // Check various possible locations for video URL
    if (snapshot.video_url) return snapshot.video_url;
    if (snapshot.video_hd_url) return snapshot.video_hd_url;
    if (snapshot.video_sd_url) return snapshot.video_sd_url;
    
    // Check in cards for video
    if (snapshot.cards && Array.isArray(snapshot.cards)) {
      for (const card of snapshot.cards) {
        if (card.video_url) return card.video_url;
      }
    }
    
    return undefined;
  }

  /**
   * Extract thumbnail URL
   */
  private static extractThumbnailURL(snapshot: any): string | undefined {
    if (snapshot.video_preview_image_url) return snapshot.video_preview_image_url;
    if (snapshot.resized_image_url) return snapshot.resized_image_url;
    if (snapshot.original_image_url) return snapshot.original_image_url;
    
    return undefined;
  }

  /**
   * Detect media type from snapshot
   */
  private static detectMediaType(snapshot: any): MetaAdCreative["media_type"] {
    if (snapshot.video_url || snapshot.video_hd_url || snapshot.video_sd_url) {
      return "video";
    }
    
    if (snapshot.cards && snapshot.cards.length > 1) {
      return "carousel";
    }
    
    if (snapshot.original_image_url || snapshot.resized_image_url) {
      return "image";
    }
    
    return "unknown";
  }

  /**
   * Parse ad cards (for carousel ads)
   */
  private static parseCards(cards: any[]): MetaAdCard[] | undefined {
    if (!cards || !Array.isArray(cards)) return undefined;
    
    return cards.map((card) => ({
      title: card.title,
      body: card.body,
      cta_text: card.cta_text,
      cta_type: card.cta_type,
      link_url: card.link_url,
      link_description: card.link_description,
      original_image_url: card.original_image_url,
      resized_image_url: card.resized_image_url,
      video_url: card.video_url,
    }));
  }

  /**
   * Parse targeting information
   */
  private static parseTargeting(snapshot: any): any {
    // Targeting data is usually limited in public Ads Library
    // May include age_range, gender, locations
    return snapshot.targeting || undefined;
  }

  /**
   * Extract ad_archive_id from Meta Ads Library URL
   */
  private static extractAdIdFromURL(url: string): string | null {
    try {
      const urlObj = new URL(url);
      
      // Pattern 1: ?id=123456789
      const idParam = urlObj.searchParams.get("id");
      if (idParam) return idParam;
      
      // Pattern 2: /ads/library/?id=123456789
      const pathMatch = url.match(/[?&]id=(\d+)/);
      if (pathMatch) return pathMatch[1];
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract video details
   */
  static extractVideo(creative: MetaAdCreative): VideoExtraction {
    return {
      video_url: creative.video_url,
      thumbnail_url: creative.video_thumbnail_url || creative.image_url,
      // Duration and resolution not typically available in public API
    };
  }

  /**
   * Extract text metadata
   */
  static extractText(creative: MetaAdCreative): TextExtraction {
    return {
      headline: creative.title,
      body_text: creative.body_text,
      caption: creative.caption,
      description: creative.link_description,
    };
  }

  /**
   * Extract CTA details
   */
  static extractCTA(creative: MetaAdCreative): CTAExtraction {
    let link_domain: string | undefined;
    
    if (creative.link_url) {
      try {
        link_domain = new URL(creative.link_url).hostname;
      } catch {
        link_domain = undefined;
      }
    }
    
    return {
      cta_text: creative.cta_text,
      cta_type: creative.cta_type,
      link_url: creative.link_url,
      link_domain,
      link_description: creative.link_description,
    };
  }

  /**
   * Extract advertiser details
   */
  static extractAdvertiser(creative: MetaAdCreative): AdvertiserExtraction {
    return {
      page_name: creative.page_name,
      page_id: creative.page_id,
      page_url: creative.page_profile_uri,
      page_category: creative.page_categories?.[0],
      page_likes: creative.page_like_count,
    };
  }

  /**
   * Validate Meta Ads Library URL
   */
  static validateURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Must be facebook.com domain
      if (!urlObj.hostname.includes("facebook.com")) {
        return false;
      }
      
      // Must be ads/library path
      if (!urlObj.pathname.includes("/ads/library")) {
        return false;
      }
      
      // Must have id parameter
      const idParam = urlObj.searchParams.get("id");
      if (!idParam) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
}
