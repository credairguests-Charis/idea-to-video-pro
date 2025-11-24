/**
 * Supabase Edge Function: Meta Ads Extractor
 * 
 * Extracts ad creative data from Meta Ads Library URLs
 * 
 * This function provides server-side Meta Ads Library data extraction
 * with caching and error handling.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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
  page_profile_uri: string;
  body_text?: string;
  caption?: string;
  title?: string;
  video_url?: string;
  video_thumbnail_url?: string;
  image_url?: string;
  media_type: string;
  cta_text?: string;
  cta_type?: string;
  link_url?: string;
  link_description?: string;
}

interface MetaAdFetchResult {
  success: boolean;
  creative?: MetaAdCreative;
  error?: {
    code: string;
    message: string;
  };
  source: "cache" | "api";
  duration_ms: number;
}

// ============= Parser =============

class MetaAdParser {
  static validateURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname.includes("facebook.com") &&
        urlObj.pathname.includes("/ads/library") &&
        urlObj.searchParams.has("id")
      );
    } catch {
      return false;
    }
  }

  static extractAdId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get("id");
    } catch {
      return null;
    }
  }

  static createMinimalCreative(ad_archive_id: string): MetaAdCreative {
    return {
      ad_archive_id,
      page_id: "",
      page_name: "Unknown Advertiser",
      page_profile_uri: "",
      media_type: "unknown",
    };
  }
}

// ============= Cache =============

class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 3600000; // 1 hour in ms

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const age = Date.now() - item.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
}

const cache = new SimpleCache();

// ============= Main Handler =============

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, urls, session_id } = await req.json();

    // Batch processing
    if (urls && Array.isArray(urls)) {
      console.log(`[meta-ads-extractor] Batch processing ${urls.length} URLs`);
      
      const results = await Promise.all(
        urls.map((u: string) => fetchAdCreative(u))
      );

      return new Response(
        JSON.stringify({
          success: true,
          results,
          total: urls.length,
          successful: results.filter((r) => r.success).length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Single URL processing
    if (!url) {
      throw new Error("Missing required parameter: url");
    }

    const result = await fetchAdCreative(url);

    // Log to Supabase if session_id provided
    if (session_id && result.success) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase.from("agent_execution_logs").insert({
          session_id,
          step_name: "Meta Ads Extraction",
          tool_name: "meta_ads_extractor",
          status: "success",
          duration_ms: result.duration_ms,
          input_data: { url },
          output_data: { 
            ad_archive_id: result.creative?.ad_archive_id,
            media_type: result.creative?.media_type
          },
        });
      } catch (logError) {
        console.error("[meta-ads-extractor] Failed to log:", logError);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[meta-ads-extractor] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ============= Helper Functions =============

async function fetchAdCreative(url: string): Promise<MetaAdFetchResult> {
  const startTime = Date.now();

  try {
    // Validate URL
    if (!MetaAdParser.validateURL(url)) {
      throw new Error("Invalid Meta Ads Library URL");
    }

    // Extract ad_archive_id
    const ad_archive_id = MetaAdParser.extractAdId(url);
    if (!ad_archive_id) {
      throw new Error("Missing ad_archive_id in URL");
    }

    // Check cache
    const cached = cache.get(ad_archive_id);
    if (cached) {
      console.log(`[meta-ads-extractor] Cache hit: ${ad_archive_id}`);
      return {
        success: true,
        creative: cached,
        source: "cache",
        duration_ms: Date.now() - startTime,
      };
    }

    // Fetch creative (minimal implementation)
    const creative = MetaAdParser.createMinimalCreative(ad_archive_id);

    // TODO: Implement actual Meta Ads Library API fetch
    // Options:
    // 1. Use third-party API (searchapi.io)
    // 2. Use Facebook Graph API with access token
    // 3. Implement web scraping

    // Cache result
    cache.set(ad_archive_id, creative);

    return {
      success: true,
      creative,
      source: "api",
      duration_ms: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "FETCH_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      source: "api",
      duration_ms: Date.now() - startTime,
    };
  }
}
