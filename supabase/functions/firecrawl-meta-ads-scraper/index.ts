/**
 * Supabase Edge Function: Firecrawl Meta Ads Scraper
 * 
 * Uses Firecrawl to scrape Meta Ads Library pages and extract ad creatives
 * with video URLs, ad copy, CTAs, and thumbnails.
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
  video_thumbnail_url?: string;
  image_url?: string;
  media_type: "video" | "image" | "carousel" | "unknown";
  cta_text?: string;
  cta_type?: string;
  link_url?: string;
  start_date?: string;
  is_active: boolean;
}

interface ScrapeResult {
  success: boolean;
  ads: MetaAdCreative[];
  advertiser_name: string;
  total_ads_found: number;
  error?: string;
  duration_ms: number;
}

// ============= Firecrawl Client =============

class FirecrawlClient {
  private apiKey: string;
  private baseUrl = "https://api.firecrawl.dev/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async scrapeUrl(url: string, options?: {
    formats?: string[];
    jsonSchema?: object;
    prompt?: string;
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/scrape`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: options?.formats || ["markdown", "html"],
        onlyMainContent: true,
        waitFor: 3000,
        ...(options?.jsonSchema && {
          formats: ["json"],
          jsonOptions: {
            schema: options.jsonSchema,
            prompt: options.prompt,
          },
        }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async extract(urls: string[], schema: object, prompt?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/extract`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urls,
        schema,
        prompt: prompt || "Extract all ad creative information from Meta Ads Library pages",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl Extract API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}

// ============= Ad Parser =============

function parseMetaAdsFromHtml(html: string, markdown: string, url: string): MetaAdCreative[] {
  const ads: MetaAdCreative[] = [];
  
  // Extract ad archive ID from URL
  const urlObj = new URL(url);
  const adId = urlObj.searchParams.get("id") || `ad_${Date.now()}`;
  
  // Parse video URLs from HTML
  const videoUrlMatches = html.match(/https:\/\/[^"'\s]+\.mp4[^"'\s]*/gi) || [];
  const videoUrls = [...new Set(videoUrlMatches)];
  
  // Parse image URLs
  const imageUrlMatches = html.match(/https:\/\/[^"'\s]+\.(jpg|jpeg|png|webp)[^"'\s]*/gi) || [];
  const imageUrls = [...new Set(imageUrlMatches)].filter(u => 
    u.includes("scontent") || u.includes("fbcdn")
  );
  
  // Extract page name from markdown
  const pageNameMatch = markdown.match(/^#\s*(.+?)(?:\n|$)/m) || 
                        markdown.match(/Page Name[:\s]*([^\n]+)/i);
  const pageName = pageNameMatch ? pageNameMatch[1].trim() : "Unknown Advertiser";
  
  // Extract ad copy/body text
  const bodyTextMatch = markdown.match(/(?:Ad Text|Body|Copy)[:\s]*([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i);
  const bodyText = bodyTextMatch ? bodyTextMatch[1].trim() : extractFirstParagraph(markdown);
  
  // Extract CTA
  const ctaMatch = markdown.match(/(?:Call to Action|CTA|Button)[:\s]*([^\n]+)/i) ||
                   html.match(/data-cta[^>]*>([^<]+)</i);
  const ctaText = ctaMatch ? ctaMatch[1].trim() : undefined;
  
  // Determine media type
  const mediaType = videoUrls.length > 0 ? "video" : 
                    imageUrls.length > 1 ? "carousel" : 
                    imageUrls.length === 1 ? "image" : "unknown";
  
  // Create ad creative object
  const creative: MetaAdCreative = {
    ad_archive_id: adId,
    page_id: extractPageId(url) || adId,
    page_name: pageName,
    body_text: bodyText,
    video_url: videoUrls[0],
    video_thumbnail_url: imageUrls[0],
    image_url: mediaType === "image" ? imageUrls[0] : undefined,
    media_type: mediaType,
    cta_text: ctaText,
    is_active: true,
  };
  
  ads.push(creative);
  
  // If multiple videos found, create additional entries
  for (let i = 1; i < Math.min(videoUrls.length, 5); i++) {
    ads.push({
      ...creative,
      ad_archive_id: `${adId}_${i}`,
      video_url: videoUrls[i],
      video_thumbnail_url: imageUrls[i] || imageUrls[0],
    });
  }
  
  return ads;
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
    !p.startsWith("*")
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

    const { url, urls, sessionId, progressCallback } = await req.json();

    const firecrawl = new FirecrawlClient(FIRECRAWL_API_KEY);

    // Helper to log progress - ONLY uses valid status values: started, completed, failed, skipped
    const logProgress = async (
      stepName: string,
      status: string,
      toolIcon: string,
      progressPercent: number,
      subStep?: string,
      outputData?: any
    ) => {
      if (sessionId) {
        // Map invalid status values to valid ones
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
        "running",
        "🔥",
        5,
        `Preparing to scrape ${urls.length} URLs`
      );

      const allAds: MetaAdCreative[] = [];
      
      for (let i = 0; i < urls.length; i++) {
        const u = urls[i];
        const progress = Math.round(5 + (i / urls.length) * 90);
        
        await logProgress(
          "Meta Ads Scraping",
          "running",
          "🔥",
          progress,
          `Scraping URL ${i + 1}/${urls.length}`
        );

        try {
          const result = await firecrawl.scrapeUrl(u, {
            formats: ["markdown", "html"],
          });

          if (result.success && result.data) {
            const ads = parseMetaAdsFromHtml(
              result.data.html || "",
              result.data.markdown || "",
              u
            );
            allAds.push(...ads);
          }
        } catch (err) {
          console.error(`[firecrawl-meta-ads-scraper] Failed to scrape ${u}:`, err);
        }
      }

      const duration = Date.now() - startTime;

      await logProgress(
        "Meta Ads Scraping",
        "completed",
        "✅",
        100,
        `Extracted ${allAds.length} ads from ${urls.length} URLs`,
        { 
          total_ads: allAds.length,
          urls_processed: urls.length,
          video_ads: allAds.filter(a => a.media_type === "video").length,
        }
      );

      return new Response(
        JSON.stringify({
          success: true,
          ads: allAds,
          total_ads_found: allAds.length,
          urls_processed: urls.length,
          duration_ms: duration,
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

    console.log("[firecrawl-meta-ads-scraper] Processing URL:", url);

    await logProgress(
      "Meta Ads Scraping",
      "running",
      "🔥",
      10,
      "Fetching page content with Firecrawl"
    );

    const result = await firecrawl.scrapeUrl(url, {
      formats: ["markdown", "html"],
    });

    if (!result.success) {
      throw new Error(result.error || "Firecrawl scrape failed");
    }

    await logProgress(
      "Meta Ads Scraping",
      "running",
      "🔥",
      60,
      "Parsing ad creatives from HTML"
    );

    const ads = parseMetaAdsFromHtml(
      result.data?.html || "",
      result.data?.markdown || "",
      url
    );

    const duration = Date.now() - startTime;

    await logProgress(
      "Meta Ads Scraping",
      "completed",
      "✅",
      100,
      `Found ${ads.length} ads`,
      {
        total_ads: ads.length,
        video_ads: ads.filter(a => a.media_type === "video").length,
        advertiser: ads[0]?.page_name,
      }
    );

    console.log(`[firecrawl-meta-ads-scraper] Extracted ${ads.length} ads in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        ads,
        advertiser_name: ads[0]?.page_name || "Unknown",
        total_ads_found: ads.length,
        duration_ms: duration,
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
        duration_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
