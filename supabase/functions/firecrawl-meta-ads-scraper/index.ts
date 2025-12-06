/**
 * Supabase Edge Function: Firecrawl Meta Ads Scraper
 * 
 * Uses Firecrawl to scrape Meta Ads Library pages and extract ad creatives
 * with video URLs, ad copy, CTAs, and thumbnails.
 * 
 * Enhanced with:
 * - Multiple video URL patterns (fbcdn, scontent, blob URLs)
 * - JSON extraction from embedded script tags
 * - Longer wait times for dynamic content
 * - AI-powered extraction fallback
 * 
 * Environment Variables Required:
 * - FIRECRAWL_API_KEY: Firecrawl API key
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============= Types =============

interface MetaAdCreative {
  ad_archive_id: string;
  page_id: string;
  page_name: string;
  body_text?: string;
  caption?: string;
  title?: string;
  video_url?: string;
  video_hd_url?: string;
  video_sd_url?: string;
  video_thumbnail_url?: string;
  image_url?: string;
  media_type: "video" | "image" | "carousel" | "unknown";
  cta_text?: string;
  cta_type?: string;
  link_url?: string;
  start_date?: string;
  is_active: boolean;
  raw_json_data?: any;
}

interface ScrapeResult {
  success: boolean;
  ads: MetaAdCreative[];
  advertiser_name: string;
  total_ads_found: number;
  error?: string;
  duration_ms: number;
  extraction_method: string;
}

// Ad extraction schema for Firecrawl AI extraction
const AD_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    ads: {
      type: "array",
      items: {
        type: "object",
        properties: {
          advertiser_name: { type: "string", description: "Name of the advertiser/page" },
          ad_text: { type: "string", description: "Main ad copy/body text" },
          video_url: { type: "string", description: "Direct URL to the video file (mp4, mov)" },
          thumbnail_url: { type: "string", description: "Video thumbnail or image URL" },
          cta_text: { type: "string", description: "Call to action button text like Shop Now, Learn More" },
          link_url: { type: "string", description: "Destination URL when clicking the ad" },
          start_date: { type: "string", description: "When the ad started running" },
          is_active: { type: "boolean", description: "Whether the ad is currently active" },
        },
      },
    },
  },
};

// ============= Video URL Patterns =============

// Comprehensive patterns for Meta/Facebook video URLs
const VIDEO_URL_PATTERNS = [
  // Direct .mp4 URLs
  /https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/gi,
  // Facebook video CDN patterns
  /https?:\/\/video[.-][^"'\s<>]*fbcdn[^"'\s<>]+/gi,
  /https?:\/\/[^"'\s<>]*scontent[^"'\s<>]*\.fbcdn\.net[^"'\s<>]*/gi,
  // Video CDN with video in path
  /https?:\/\/[^"'\s<>]*fbcdn[^"'\s<>]*\/v\/[^"'\s<>]*/gi,
  // External video CDN
  /https?:\/\/[^"'\s<>]*video[^"'\s<>]*cdn[^"'\s<>]*/gi,
];

// JSON data patterns in HTML
const JSON_DATA_PATTERNS = [
  /__NEXT_DATA__[^>]*>([^<]+)</,
  /data-store="([^"]+)"/,
  /window\.__data\s*=\s*({[^;]+});/,
  /"video_url"\s*:\s*"([^"]+)"/g,
  /"playable_url"\s*:\s*"([^"]+)"/g,
  /"hd_src"\s*:\s*"([^"]+)"/g,
  /"sd_src"\s*:\s*"([^"]+)"/g,
  /"video_hd_url"\s*:\s*"([^"]+)"/g,
  /"video_sd_url"\s*:\s*"([^"]+)"/g,
  /data-video-url="([^"]+)"/g,
  /data-hd-src="([^"]+)"/g,
  /data-sd-src="([^"]+)"/g,
];

// ============= Firecrawl Client =============

class FirecrawlClient {
  private apiKey: string;
  private baseUrl = "https://api.firecrawl.dev/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async scrapeUrl(url: string, options?: {
    formats?: string[];
    waitFor?: number;
    onlyMainContent?: boolean;
    actions?: any[];
  }): Promise<any> {
    console.log(`[FirecrawlClient] Scraping URL: ${url}`);
    
    const response = await fetch(`${this.baseUrl}/scrape`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: options?.formats || ["markdown", "html"],
        onlyMainContent: options?.onlyMainContent ?? false, // Get full page for video elements
        waitFor: options?.waitFor || 5000, // Increased wait time for dynamic content
        timeout: 30000,
        ...(options?.actions && { actions: options.actions }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async extract(urls: string[], schema: object, prompt?: string): Promise<any> {
    console.log(`[FirecrawlClient] AI extraction for ${urls.length} URLs`);
    
    const response = await fetch(`${this.baseUrl}/extract`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urls,
        schema,
        prompt: prompt || "Extract all video ad creative information from these Meta Ads Library pages. Focus on finding video URLs, ad copy text, call-to-action buttons, and advertiser information.",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl Extract API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}

// ============= Enhanced Video URL Extraction =============

function extractVideoUrls(html: string): string[] {
  const videoUrls: Set<string> = new Set();
  
  // Method 1: Apply all regex patterns
  for (const pattern of VIDEO_URL_PATTERNS) {
    const matches = html.match(pattern) || [];
    matches.forEach(match => {
      // Clean up the URL
      const cleanUrl = cleanVideoUrl(match);
      if (isValidVideoUrl(cleanUrl)) {
        videoUrls.add(cleanUrl);
      }
    });
  }
  
  // Method 2: Extract from JSON data in script tags
  for (const pattern of JSON_DATA_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags || 'g');
    let match;
    while ((match = regex.exec(html)) !== null) {
      const potentialUrl = match[1];
      if (potentialUrl) {
        // Try to decode if it's escaped
        try {
          const decoded = potentialUrl
            .replace(/\\u002F/g, '/')
            .replace(/\\u0026/g, '&')
            .replace(/\\\//g, '/')
            .replace(/\\"/g, '"');
          if (isValidVideoUrl(decoded)) {
            videoUrls.add(decoded);
          }
        } catch {
          if (isValidVideoUrl(potentialUrl)) {
            videoUrls.add(potentialUrl);
          }
        }
      }
    }
  }
  
  // Method 3: Look for og:video meta tags
  const ogVideoMatch = html.match(/<meta\s+property="og:video"\s+content="([^"]+)"/i) ||
                       html.match(/<meta\s+content="([^"]+)"\s+property="og:video"/i);
  if (ogVideoMatch && ogVideoMatch[1]) {
    videoUrls.add(ogVideoMatch[1]);
  }
  
  // Method 4: Look for video source tags
  const sourceMatches = html.match(/<source[^>]+src="([^"]+)"/gi) || [];
  sourceMatches.forEach(match => {
    const srcMatch = match.match(/src="([^"]+)"/);
    if (srcMatch && srcMatch[1] && isValidVideoUrl(srcMatch[1])) {
      videoUrls.add(srcMatch[1]);
    }
  });
  
  // Method 5: Look for video tags with src
  const videoTagMatches = html.match(/<video[^>]+src="([^"]+)"/gi) || [];
  videoTagMatches.forEach(match => {
    const srcMatch = match.match(/src="([^"]+)"/);
    if (srcMatch && srcMatch[1] && isValidVideoUrl(srcMatch[1])) {
      videoUrls.add(srcMatch[1]);
    }
  });
  
  console.log(`[extractVideoUrls] Found ${videoUrls.size} video URLs`);
  return Array.from(videoUrls);
}

function cleanVideoUrl(url: string): string {
  // Remove trailing quotes, brackets, etc.
  return url
    .replace(/["'<>\s]+$/, '')
    .replace(/\\u002F/g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&');
}

function isValidVideoUrl(url: string): boolean {
  if (!url || url.length < 10) return false;
  
  try {
    new URL(url);
  } catch {
    return false;
  }
  
  // Must be video file or video CDN
  const isVideoFile = /\.(mp4|mov|webm|m3u8)/i.test(url);
  const isVideoCdn = /video|fbcdn|scontent/i.test(url) && !/\.(jpg|jpeg|png|gif|webp)/i.test(url);
  
  return isVideoFile || isVideoCdn;
}

// ============= Enhanced Ad Parser =============

function parseMetaAdsFromHtml(html: string, markdown: string, url: string): MetaAdCreative[] {
  const ads: MetaAdCreative[] = [];
  
  console.log(`[parseMetaAdsFromHtml] Parsing HTML (${html.length} chars) and Markdown (${markdown.length} chars)`);
  
  // Extract ad archive ID from URL
  const urlObj = new URL(url);
  const adId = urlObj.searchParams.get("id") || 
               urlObj.searchParams.get("ad_id") || 
               `ad_${Date.now()}`;
  
  // Extract video URLs using enhanced methods
  const videoUrls = extractVideoUrls(html);
  console.log(`[parseMetaAdsFromHtml] Extracted ${videoUrls.length} video URLs:`, videoUrls.slice(0, 3));
  
  // Parse image URLs (for thumbnails)
  const imageUrlMatches = html.match(/https:\/\/[^"'\s<>]+\.(jpg|jpeg|png|webp)[^"'\s<>]*/gi) || [];
  const imageUrls = [...new Set(imageUrlMatches)].filter(u => 
    (u.includes("scontent") || u.includes("fbcdn")) && 
    !u.includes("emoji") && 
    !u.includes("icon")
  );
  
  // Extract page name from multiple sources
  const pageName = extractPageName(html, markdown);
  console.log(`[parseMetaAdsFromHtml] Page name: ${pageName}`);
  
  // Extract ad copy/body text
  const bodyText = extractAdCopy(html, markdown);
  
  // Extract CTA
  const ctaText = extractCTA(html, markdown);
  
  // Extract link URL
  const linkUrl = extractLinkUrl(html);
  
  // Determine media type
  const mediaType = videoUrls.length > 0 ? "video" : 
                    imageUrls.length > 1 ? "carousel" : 
                    imageUrls.length === 1 ? "image" : "unknown";
  
  // Create primary ad creative object
  const creative: MetaAdCreative = {
    ad_archive_id: adId,
    page_id: extractPageId(url) || adId,
    page_name: pageName,
    body_text: bodyText,
    video_url: videoUrls[0],
    video_hd_url: videoUrls.find(u => /hd|1080|720/i.test(u)),
    video_sd_url: videoUrls.find(u => /sd|480|360/i.test(u)) || videoUrls[0],
    video_thumbnail_url: imageUrls[0],
    image_url: mediaType === "image" ? imageUrls[0] : undefined,
    media_type: mediaType,
    cta_text: ctaText,
    link_url: linkUrl,
    is_active: true,
  };
  
  ads.push(creative);
  
  // If multiple distinct video URLs found, create additional entries
  const uniqueVideoUrls = [...new Set(videoUrls)];
  for (let i = 1; i < Math.min(uniqueVideoUrls.length, 5); i++) {
    ads.push({
      ...creative,
      ad_archive_id: `${adId}_v${i}`,
      video_url: uniqueVideoUrls[i],
      video_thumbnail_url: imageUrls[i] || imageUrls[0],
    });
  }
  
  console.log(`[parseMetaAdsFromHtml] Created ${ads.length} ad entries`);
  return ads;
}

function extractPageName(html: string, markdown: string): string {
  // Try multiple extraction methods
  const methods = [
    // From markdown heading
    () => {
      const match = markdown.match(/^#\s*(.+?)(?:\n|$)/m);
      return match ? match[1].trim() : null;
    },
    // From og:site_name
    () => {
      const match = html.match(/<meta\s+property="og:site_name"\s+content="([^"]+)"/i);
      return match ? match[1] : null;
    },
    // From title tag
    () => {
      const match = html.match(/<title>([^<|]+)/i);
      return match ? match[1].trim() : null;
    },
    // From page name span
    () => {
      const match = html.match(/class="[^"]*page[_-]?name[^"]*"[^>]*>([^<]+)/i);
      return match ? match[1].trim() : null;
    },
    // From advertiser data
    () => {
      const match = html.match(/"advertiser_?name"\s*:\s*"([^"]+)"/i);
      return match ? match[1] : null;
    },
    // From markdown "Page Name:" pattern
    () => {
      const match = markdown.match(/Page Name[:\s]*([^\n]+)/i);
      return match ? match[1].trim() : null;
    },
  ];
  
  for (const method of methods) {
    const result = method();
    if (result && result.length > 1 && result.length < 200) {
      return result;
    }
  }
  
  return "Unknown Advertiser";
}

function extractAdCopy(html: string, markdown: string): string {
  // Try multiple extraction methods
  const methods = [
    // From markdown patterns
    () => {
      const match = markdown.match(/(?:Ad Text|Body|Copy|Message)[:\s]*([^\n]+(?:\n(?![A-Z#\-\*])[^\n]+)*)/i);
      return match ? match[1].trim() : null;
    },
    // From og:description
    () => {
      const match = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
      return match ? match[1] : null;
    },
    // From ad copy div
    () => {
      const match = html.match(/class="[^"]*(?:ad[_-]?copy|ad[_-]?text|message)[^"]*"[^>]*>([^<]+)/i);
      return match ? match[1].trim() : null;
    },
    // First substantial paragraph from markdown
    () => extractFirstParagraph(markdown),
  ];
  
  for (const method of methods) {
    const result = method();
    if (result && result.length > 20) {
      return result.substring(0, 1000);
    }
  }
  
  return "";
}

function extractCTA(html: string, markdown: string): string | undefined {
  const ctaPatterns = [
    /(?:Call to Action|CTA|Button)[:\s]*([^\n]+)/i,
    /class="[^"]*cta[^"]*"[^>]*>([^<]+)/i,
    /data-cta[^>]*>([^<]+)/i,
    /"cta_text"\s*:\s*"([^"]+)"/i,
    />(Shop Now|Learn More|Sign Up|Get Started|Buy Now|Download|Subscribe|Book Now|Get Offer|Apply Now|Contact Us|Watch More|See More|Order Now|Try Free|Start Free|Get Quote)<\/(?:a|button|span)/i,
  ];
  
  for (const pattern of ctaPatterns) {
    const match = html.match(pattern) || markdown.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return undefined;
}

function extractLinkUrl(html: string): string | undefined {
  const patterns = [
    /"link_url"\s*:\s*"([^"]+)"/i,
    /"destination_url"\s*:\s*"([^"]+)"/i,
    /href="(https:\/\/[^"]+)"/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1] && !match[1].includes("facebook.com/ads")) {
      return match[1];
    }
  }
  
  return undefined;
}

function extractPageId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const viewAllPageId = urlObj.searchParams.get("view_all_page_id");
    if (viewAllPageId) return viewAllPageId;
    
    const pageIdMatch = url.match(/page_id=(\d+)/);
    return pageIdMatch ? pageIdMatch[1] : null;
  } catch {
    return null;
  }
}

function extractFirstParagraph(markdown: string): string {
  const paragraphs = markdown.split(/\n\n+/).filter(p => 
    p.trim().length > 50 && 
    !p.startsWith("#") && 
    !p.startsWith("-") &&
    !p.startsWith("*") &&
    !p.includes("cookie") &&
    !p.includes("privacy")
  );
  return paragraphs[0]?.trim().substring(0, 500) || "";
}

// ============= Main Handler =============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { url, urls, sessionId, useAiExtraction } = await req.json();

    const firecrawl = new FirecrawlClient(FIRECRAWL_API_KEY);

    // Helper to log progress
    const logProgress = async (
      stepName: string,
      status: string,
      toolIcon: string,
      progressPercent: number,
      subStep?: string,
      outputData?: any
    ) => {
      if (sessionId) {
        const validStatus = status === "running" || status === "in_progress" ? "started" :
                           status === "warning" || status === "error" ? "failed" :
                           ["started", "completed", "failed", "skipped"].includes(status) ? status : "started";
        
        await supabase.from("agent_execution_logs").insert({
          session_id: sessionId,
          step_name: stepName,
          tool_name: "firecrawl_meta_ads_scraper",
          status: validStatus,
          input_data: { 
            tool_icon: toolIcon,
            progress_percent: progressPercent,
            sub_step: subStep,
          },
          output_data: outputData,
          duration_ms: Date.now() - startTime,
        });
      }
    };

    // Batch processing
    if (urls && Array.isArray(urls)) {
      console.log(`[firecrawl-meta-ads-scraper] Batch processing ${urls.length} URLs`);
      
      await logProgress(
        "Meta Ads Scraping",
        "started",
        "🔥",
        5,
        `Preparing to scrape ${urls.length} Meta Ads Library URLs`
      );

      const allAds: MetaAdCreative[] = [];
      let extractionMethod = "html_parsing";
      
      for (let i = 0; i < urls.length; i++) {
        const u = urls[i];
        const progress = Math.round(5 + (i / urls.length) * 85);
        
        await logProgress(
          "Meta Ads Scraping",
          "started",
          "🔥",
          progress,
          `Scraping URL ${i + 1}/${urls.length}: ${new URL(u).hostname}`
        );

        try {
          // First attempt: Standard scraping with longer wait
          console.log(`[firecrawl-meta-ads-scraper] Scraping: ${u}`);
          
          const result = await firecrawl.scrapeUrl(u, {
            formats: ["markdown", "html"],
            waitFor: 6000, // Wait for dynamic content
            onlyMainContent: false, // Get full page
          });

          if (result.success && result.data) {
            let ads = parseMetaAdsFromHtml(
              result.data.html || "",
              result.data.markdown || "",
              u
            );
            
            // If no video URLs found and AI extraction requested, try that
            if (ads.length === 0 || (ads[0].media_type !== "video" && useAiExtraction)) {
              console.log(`[firecrawl-meta-ads-scraper] No videos found, trying AI extraction for: ${u}`);
              
              await logProgress(
                "Meta Ads Scraping",
                "started",
                "🧠",
                progress + 2,
                `Using AI extraction for ${i + 1}/${urls.length}`
              );
              
              try {
                const aiResult = await firecrawl.extract([u], AD_EXTRACTION_SCHEMA);
                if (aiResult.success && aiResult.data?.ads) {
                  extractionMethod = "ai_extraction";
                  ads = aiResult.data.ads.map((ad: any, idx: number) => ({
                    ad_archive_id: `ai_${Date.now()}_${idx}`,
                    page_id: extractPageId(u) || `page_${idx}`,
                    page_name: ad.advertiser_name || "Unknown",
                    body_text: ad.ad_text,
                    video_url: ad.video_url,
                    video_thumbnail_url: ad.thumbnail_url,
                    media_type: ad.video_url ? "video" : "image",
                    cta_text: ad.cta_text,
                    link_url: ad.link_url,
                    is_active: ad.is_active ?? true,
                    raw_json_data: ad,
                  }));
                }
              } catch (aiError) {
                console.error(`[firecrawl-meta-ads-scraper] AI extraction failed:`, aiError);
              }
            }
            
            allAds.push(...ads);
          }
        } catch (err) {
          console.error(`[firecrawl-meta-ads-scraper] Failed to scrape ${u}:`, err);
          
          await logProgress(
            "Meta Ads Scraping",
            "started",
            "⚠️",
            progress,
            `Failed to scrape URL ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }
      }

      const duration = Date.now() - startTime;
      const videoAds = allAds.filter(a => a.media_type === "video");

      await logProgress(
        "Meta Ads Scraping",
        "completed",
        "✅",
        100,
        `Extracted ${allAds.length} ads (${videoAds.length} videos) from ${urls.length} URLs`,
        { 
          total_ads: allAds.length,
          urls_processed: urls.length,
          video_ads: videoAds.length,
          video_urls: videoAds.slice(0, 5).map(a => a.video_url),
          extraction_method: extractionMethod,
        }
      );

      console.log(`[firecrawl-meta-ads-scraper] Complete: ${allAds.length} ads, ${videoAds.length} videos in ${duration}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          ads: allAds,
          total_ads_found: allAds.length,
          video_ads_found: videoAds.length,
          urls_processed: urls.length,
          duration_ms: duration,
          extraction_method: extractionMethod,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Single URL processing
    if (!url) {
      throw new Error("Missing required parameter: url or urls");
    }

    console.log("[firecrawl-meta-ads-scraper] Processing single URL:", url);

    await logProgress(
      "Meta Ads Scraping",
      "started",
      "🔥",
      10,
      "Fetching page content with Firecrawl (waiting for dynamic content)"
    );

    const result = await firecrawl.scrapeUrl(url, {
      formats: ["markdown", "html"],
      waitFor: 6000,
      onlyMainContent: false,
    });

    if (!result.success) {
      throw new Error(result.error || "Firecrawl scrape failed");
    }

    await logProgress(
      "Meta Ads Scraping",
      "started",
      "🔥",
      50,
      "Parsing video URLs and ad creatives from HTML"
    );

    let ads = parseMetaAdsFromHtml(
      result.data?.html || "",
      result.data?.markdown || "",
      url
    );

    let extractionMethod = "html_parsing";

    // Fallback to AI extraction if no videos found
    if ((ads.length === 0 || ads[0].media_type !== "video") && useAiExtraction !== false) {
      console.log("[firecrawl-meta-ads-scraper] No videos found, trying AI extraction");
      
      await logProgress(
        "Meta Ads Scraping",
        "started",
        "🧠",
        70,
        "Using AI-powered extraction for video content"
      );

      try {
        const aiResult = await firecrawl.extract([url], AD_EXTRACTION_SCHEMA);
        if (aiResult.success && aiResult.data?.ads?.length > 0) {
          extractionMethod = "ai_extraction";
          ads = aiResult.data.ads.map((ad: any, idx: number) => ({
            ad_archive_id: `ai_${Date.now()}_${idx}`,
            page_id: extractPageId(url) || `page_${idx}`,
            page_name: ad.advertiser_name || ads[0]?.page_name || "Unknown",
            body_text: ad.ad_text || ads[0]?.body_text,
            video_url: ad.video_url,
            video_thumbnail_url: ad.thumbnail_url,
            media_type: ad.video_url ? "video" : "image",
            cta_text: ad.cta_text || ads[0]?.cta_text,
            link_url: ad.link_url,
            is_active: ad.is_active ?? true,
            raw_json_data: ad,
          }));
        }
      } catch (aiError) {
        console.error("[firecrawl-meta-ads-scraper] AI extraction failed:", aiError);
      }
    }

    const duration = Date.now() - startTime;
    const videoAds = ads.filter(a => a.media_type === "video");

    await logProgress(
      "Meta Ads Scraping",
      "completed",
      "✅",
      100,
      `Found ${ads.length} ads (${videoAds.length} videos)`,
      {
        total_ads: ads.length,
        video_ads: videoAds.length,
        advertiser: ads[0]?.page_name,
        video_urls: videoAds.slice(0, 3).map(a => a.video_url),
        extraction_method: extractionMethod,
      }
    );

    console.log(`[firecrawl-meta-ads-scraper] Extracted ${ads.length} ads (${videoAds.length} videos) in ${duration}ms using ${extractionMethod}`);

    return new Response(
      JSON.stringify({
        success: true,
        ads,
        advertiser_name: ads[0]?.page_name || "Unknown",
        total_ads_found: ads.length,
        video_ads_found: videoAds.length,
        duration_ms: duration,
        extraction_method: extractionMethod,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[firecrawl-meta-ads-scraper] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        ads: [],
        total_ads_found: 0,
        video_ads_found: 0,
        duration_ms: Date.now() - startTime,
        extraction_method: "failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
