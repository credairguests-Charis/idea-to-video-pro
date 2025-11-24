/**
 * Meta Ads Library - Type Definitions
 * 
 * Types for fetching and parsing Meta Ads Library data
 */

// ============= Meta Ads Library Types =============

export interface MetaAdLibraryURL {
  url: string;
  ad_archive_id?: string;
  page_id?: string;
}

export interface MetaAdCreative {
  ad_archive_id: string;
  page_id: string;
  page_name: string;
  page_profile_uri: string;
  page_profile_picture_url?: string;
  
  // Ad content
  body_text?: string;
  caption?: string;
  title?: string;
  
  // Media
  video_url?: string;
  video_thumbnail_url?: string;
  image_url?: string;
  media_type: "video" | "image" | "carousel" | "unknown";
  
  // Call to Action
  cta_text?: string;
  cta_type?: string;
  link_url?: string;
  link_description?: string;
  
  // Metadata
  display_format?: string;
  page_categories?: string[];
  page_like_count?: number;
  
  // Timestamps
  start_date?: string;
  end_date?: string;
  
  // Additional data
  cards?: MetaAdCard[];
  targeting?: MetaAdTargeting;
}

export interface MetaAdCard {
  title?: string;
  body?: string;
  cta_text?: string;
  cta_type?: string;
  link_url?: string;
  link_description?: string;
  original_image_url?: string;
  resized_image_url?: string;
  video_url?: string;
}

export interface MetaAdTargeting {
  age_range?: string;
  gender?: string;
  locations?: string[];
  interests?: string[];
}

export interface MetaAdFetchResult {
  success: boolean;
  creative?: MetaAdCreative;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  source: "cache" | "api" | "scrape";
  duration_ms: number;
}

// ============= Extractor Types =============

export interface VideoExtraction {
  video_url?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  resolution?: string;
  format?: string;
}

export interface TextExtraction {
  headline?: string;
  body_text?: string;
  caption?: string;
  description?: string;
}

export interface CTAExtraction {
  cta_text?: string;
  cta_type?: string;
  link_url?: string;
  link_domain?: string;
  link_description?: string;
}

export interface AdvertiserExtraction {
  page_name: string;
  page_id: string;
  page_url: string;
  page_category?: string;
  page_likes?: number;
  verification_status?: string;
}

// ============= Parser Types =============

export interface MetaAdHTMLData {
  html: string;
  url: string;
}

export interface MetaAdAPIData {
  ad_archive_id: string;
  snapshot: any;
  page_id: string;
}

// ============= Cache Types =============

export interface CachedAd {
  creative: MetaAdCreative;
  cached_at: string;
  ttl_seconds: number;
}

export interface CacheOptions {
  enabled: boolean;
  ttl_seconds: number;
  storage: "memory" | "supabase";
}

// ============= Error Types =============

export enum MetaAdErrorCode {
  INVALID_URL = "INVALID_URL",
  AD_NOT_FOUND = "AD_NOT_FOUND",
  ACCESS_DENIED = "ACCESS_DENIED",
  PARSING_ERROR = "PARSING_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  RATE_LIMITED = "RATE_LIMITED",
  TIMEOUT = "TIMEOUT",
}

export class MetaAdError extends Error {
  constructor(
    public code: MetaAdErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "MetaAdError";
  }
}
