import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MCPRequest {
  query: string;
  max_results?: number;
  session_id?: string;
}

interface CompetitorBrand {
  name: string;
  brand_name?: string;
  website?: string;
  meta_ads_library_url?: string;
  metaAdsUrl?: string;
  description?: string;
}

// Timeout wrapper for fetch
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body: MCPRequest = await req.json();
    const { query, max_results = 5, session_id } = body;

    console.log(`[MCP-FIRECRAWL] Starting deep research for query: ${query}`);

    // Get MCP credentials
    const mcpEndpoint = Deno.env.get("KLAVIS_MCP_ENDPOINT");
    const mcpToken = Deno.env.get("KLAVIS_MCP_BEARER_TOKEN");

    // Initialize Supabase for logging
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    let supabase: any = null;
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
    }

    // Helper to log progress - ONLY uses valid status values: started, completed, failed, skipped
    const logProgress = async (status: string, message: string, data?: any) => {
      if (session_id && supabase) {
        try {
          // Map invalid status values to valid ones
          const validStatus = status === "running" || status === "in_progress" ? "started" :
                             status === "warning" || status === "error" ? "failed" :
                             ["started", "completed", "failed", "skipped"].includes(status) ? status : "started";
          
          await supabase.from("agent_execution_logs").insert({
            session_id,
            step_name: "MCP Deep Research",
            status: validStatus,
            tool_name: "firecrawl",
            input_data: { message, tool_icon: "🔥" },
            output_data: data,
            duration_ms: Date.now() - startTime,
          });
        } catch (err) {
          console.warn(`[MCP-FIRECRAWL] Failed to log progress:`, err);
        }
      }
    };

    // Check if MCP is configured
    if (!mcpEndpoint || !mcpToken) {
      console.warn(`[MCP-FIRECRAWL] MCP credentials not configured, returning fallback`);
      await logProgress("warning", "MCP not configured, using fallback results");
      
      // Return fallback competitors based on query
      const fallbackCompetitors = generateFallbackCompetitors(query, max_results);
      
      return new Response(
        JSON.stringify({
          success: true,
          competitors: fallbackCompetitors,
          source: "fallback",
          message: "MCP not configured, using generated fallback data",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await logProgress("started", "Connecting to MCP Firecrawl service...");

    // Build MCP request
    const mcpRequestBody = {
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "tools/call",
      params: {
        name: "deep_research",
        arguments: {
          query: `${query} meta ads facebook advertising competitors`,
          maxDepth: 2,
          maxUrls: max_results * 3,
          timeLimit: 60,
        },
      },
    };

    console.log(`[MCP-FIRECRAWL] Calling MCP endpoint...`);

    try {
      const mcpResponse = await fetchWithTimeout(
        mcpEndpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mcpToken}`,
          },
          body: JSON.stringify(mcpRequestBody),
        },
        45000 // 45 second timeout
      );

      if (!mcpResponse.ok) {
        const errorText = await mcpResponse.text();
        console.error(`[MCP-FIRECRAWL] MCP request failed: ${mcpResponse.status} - ${errorText}`);
        throw new Error(`MCP request failed: ${mcpResponse.status}`);
      }

      const mcpResult = await mcpResponse.json();
      console.log(`[MCP-FIRECRAWL] MCP response received`);

      // Parse the MCP result to extract competitors
      const competitors = parseCompetitorsFromMCP(mcpResult, query, max_results);
      
      await logProgress("completed", `Found ${competitors.length} competitors`, { competitors });

      const duration = Date.now() - startTime;
      console.log(`[MCP-FIRECRAWL] Completed in ${duration}ms, found ${competitors.length} competitors`);

      return new Response(
        JSON.stringify({
          success: true,
          competitors,
          source: "mcp",
          durationMs: duration,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (mcpError) {
      console.error(`[MCP-FIRECRAWL] MCP call failed:`, mcpError);
      
      // Check if it's a timeout
      if (mcpError instanceof Error && mcpError.name === "AbortError") {
        await logProgress("warning", "MCP request timed out, using fallback");
      } else {
        await logProgress("warning", `MCP call failed: ${mcpError instanceof Error ? mcpError.message : "Unknown error"}`);
      }
      
      // Return fallback data
      const fallbackCompetitors = generateFallbackCompetitors(query, max_results);
      
      return new Response(
        JSON.stringify({
          success: true,
          competitors: fallbackCompetitors,
          source: "fallback",
          message: "MCP call failed, using fallback data",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error(`[MCP-FIRECRAWL] Error:`, error);
    
    // Even on error, return fallback data to keep workflow running
    const fallbackCompetitors = generateFallbackCompetitors("general", 3);
    
    return new Response(
      JSON.stringify({
        success: true,
        competitors: fallbackCompetitors,
        source: "fallback",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Parse MCP response to extract competitor information
function parseCompetitorsFromMCP(mcpResult: any, query: string, maxResults: number): CompetitorBrand[] {
  const competitors: CompetitorBrand[] = [];
  
  try {
    // Handle different possible MCP response structures
    let content = mcpResult;
    
    if (mcpResult.result?.content) {
      content = mcpResult.result.content;
    } else if (mcpResult.result) {
      content = mcpResult.result;
    }

    // If content is an array
    if (Array.isArray(content)) {
      for (const item of content) {
        const competitor = extractCompetitorFromItem(item);
        if (competitor) {
          competitors.push(competitor);
        }
        if (competitors.length >= maxResults) break;
      }
    }

    // If content is a string, try to parse it
    if (typeof content === "string") {
      // Extract URLs and brand names from text
      const urlMatches = content.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g) || [];
      
      for (const url of urlMatches.slice(0, maxResults)) {
        const brandName = extractBrandFromUrl(url);
        if (brandName !== "Unknown") {
          competitors.push({
            name: brandName,
            brand_name: brandName,
            website: url,
            meta_ads_library_url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(brandName)}`,
          });
        }
      }
    }

    // If content has resources or data property
    if (content?.resources || content?.data) {
      const items = content.resources || content.data;
      if (Array.isArray(items)) {
        for (const item of items) {
          const competitor = extractCompetitorFromItem(item);
          if (competitor) {
            competitors.push(competitor);
          }
          if (competitors.length >= maxResults) break;
        }
      }
    }
    
    // Check for competitors directly in content
    if (content?.competitors && Array.isArray(content.competitors)) {
      for (const comp of content.competitors) {
        const competitor = extractCompetitorFromItem(comp);
        if (competitor) {
          competitors.push(competitor);
        }
        if (competitors.length >= maxResults) break;
      }
    }
  } catch (parseError) {
    console.error(`[MCP-FIRECRAWL] Error parsing MCP result:`, parseError);
  }

  // If still no competitors, add fallback based on query
  if (competitors.length === 0) {
    return generateFallbackCompetitors(query, maxResults);
  }

  return competitors.slice(0, maxResults);
}

function extractCompetitorFromItem(item: any): CompetitorBrand | null {
  if (!item) return null;

  const name = item.name || item.brand_name || item.brand || item.company || item.title || extractBrandFromUrl(item.url || item.website || "");
  const website = item.url || item.website || item.link;
  
  if (!name || name === "Unknown") return null;

  const metaAdsUrl = item.meta_ads_library_url || item.metaAdsUrl || 
    `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(name)}`;

  return {
    name,
    brand_name: name,
    website,
    meta_ads_library_url: metaAdsUrl,
    metaAdsUrl,
    description: item.description || item.summary,
  };
}

function extractBrandFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.replace("www.", "").split(".");
    const name = parts[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return "Unknown";
  }
}

function generateFallbackCompetitors(query: string, maxResults: number): CompetitorBrand[] {
  const competitors: CompetitorBrand[] = [];
  const keywords = query.toLowerCase().split(/\s+/);
  
  // Create Meta Ads Library search URL based on query
  const searchQuery = encodeURIComponent(query);
  competitors.push({
    name: `${query} Ads`,
    brand_name: `${query} Ads`,
    meta_ads_library_url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${searchQuery}`,
    metaAdsUrl: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${searchQuery}`,
    description: `Meta Ads Library search results for "${query}"`,
  });

  // Add industry-specific fallbacks if we can detect the industry
  if (keywords.some(k => ["skincare", "beauty", "cosmetic", "skin", "makeup"].includes(k))) {
    competitors.push({
      name: "Beauty Industry",
      brand_name: "Beauty Industry",
      meta_ads_library_url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=skincare%20beauty",
      metaAdsUrl: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=skincare%20beauty",
    });
  }

  if (keywords.some(k => ["saas", "software", "app", "tech", "startup"].includes(k))) {
    competitors.push({
      name: "SaaS Industry",
      brand_name: "SaaS Industry",
      meta_ads_library_url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=software%20saas",
      metaAdsUrl: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=software%20saas",
    });
  }

  if (keywords.some(k => ["fitness", "gym", "workout", "health", "wellness"].includes(k))) {
    competitors.push({
      name: "Fitness Industry",
      brand_name: "Fitness Industry",
      meta_ads_library_url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=fitness%20workout",
      metaAdsUrl: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=fitness%20workout",
    });
  }

  if (keywords.some(k => ["ecommerce", "shop", "store", "retail", "product"].includes(k))) {
    competitors.push({
      name: "E-commerce Industry",
      brand_name: "E-commerce Industry",
      meta_ads_library_url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=ecommerce%20shop",
      metaAdsUrl: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=ecommerce%20shop",
    });
  }

  return competitors.slice(0, maxResults);
}
