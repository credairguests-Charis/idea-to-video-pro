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

// Make Klavis MCP request using Streamable HTTP (Strata pattern)
async function makeKlavisMCPRequest(
  endpoint: string,
  method: string,
  params: Record<string, any>,
  timeoutMs: number = 45000
): Promise<any> {
  const requestBody = {
    jsonrpc: "2.0",
    id: crypto.randomUUID(),
    method,
    params,
  };

  console.log(`[MCP-FIRECRAWL] Making Klavis request: ${method}`, JSON.stringify(params));

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
    timeoutMs
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Klavis MCP request failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  if (result.error) {
    throw new Error(`MCP error: ${result.error.message || JSON.stringify(result.error)}`);
  }

  return result.result;
}

// Discover available Firecrawl actions using Strata pattern
async function discoverFirecrawlActions(endpoint: string): Promise<any> {
  try {
    // Step 1: Discover servers and categories
    const discovery = await makeKlavisMCPRequest(endpoint, "tools/call", {
      name: "discover_server_categories_or_actions",
      arguments: {
        user_query: "deep research web scraping competitor analysis meta ads",
        server_names: ["firecrawl"],
        detail_level: "full_details",
      },
    });

    console.log(`[MCP-FIRECRAWL] Discovery result:`, JSON.stringify(discovery).slice(0, 500));
    return discovery;
  } catch (error) {
    console.error(`[MCP-FIRECRAWL] Discovery failed:`, error);
    return null;
  }
}

// Execute Firecrawl deep research using Strata pattern
async function executeStrataDeepResearch(
  endpoint: string,
  query: string,
  maxResults: number
): Promise<any> {
  // Try Strata execute_action pattern
  try {
    const result = await makeKlavisMCPRequest(endpoint, "tools/call", {
      name: "execute_action",
      arguments: {
        server_name: "firecrawl",
        category_name: "scraping",
        action_name: "deep_research",
        body_schema: JSON.stringify({
          query: `${query} meta ads facebook advertising competitors`,
          maxDepth: 2,
          maxUrls: maxResults * 3,
          timeLimit: 60,
        }),
      },
    });

    console.log(`[MCP-FIRECRAWL] Strata execute_action result received`);
    return result;
  } catch (strataError) {
    console.warn(`[MCP-FIRECRAWL] Strata execute_action failed, trying direct tool call:`, strataError);
    
    // Fallback to direct tool call (for servers that still support it)
    const result = await makeKlavisMCPRequest(endpoint, "tools/call", {
      name: "firecrawl_deep_research",
      arguments: {
        query: `${query} meta ads facebook advertising competitors`,
        maxDepth: 2,
        maxUrls: maxResults * 3,
        timeLimit: 60,
      },
    });

    return result;
  }
}

// Try calling with simple deep_research tool name (some MCPs use this)
async function executeDirectDeepResearch(
  endpoint: string,
  query: string,
  maxResults: number
): Promise<any> {
  const result = await makeKlavisMCPRequest(endpoint, "tools/call", {
    name: "deep_research",
    arguments: {
      query: `${query} meta ads facebook advertising competitors`,
      maxDepth: 2,
      maxUrls: maxResults * 3,
      timeLimit: 60,
    },
  });

  return result;
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

    // Get MCP credentials - Klavis Streamable HTTP URL (contains auth in URL)
    const mcpEndpoint = Deno.env.get("KLAVIS_MCP_ENDPOINT");
    const mcpToken = Deno.env.get("KLAVIS_MCP_BEARER_TOKEN"); // Optional, URL may contain auth

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
    if (!mcpEndpoint) {
      console.warn(`[MCP-FIRECRAWL] MCP endpoint not configured, returning fallback`);
      await logProgress("failed", "MCP not configured, using fallback results");
      
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

    await logProgress("started", "Connecting to Klavis MCP Firecrawl service...");

    let mcpResult = null;
    let attemptedMethods: string[] = [];

    // Try multiple approaches in order of preference
    try {
      // Approach 1: Strata pattern with execute_action
      attemptedMethods.push("strata_execute_action");
      console.log(`[MCP-FIRECRAWL] Attempting Strata execute_action pattern...`);
      mcpResult = await executeStrataDeepResearch(mcpEndpoint, query, max_results);
    } catch (error1) {
      console.warn(`[MCP-FIRECRAWL] Strata pattern failed:`, error1);
      
      try {
        // Approach 2: Direct deep_research tool call
        attemptedMethods.push("direct_deep_research");
        console.log(`[MCP-FIRECRAWL] Attempting direct deep_research tool call...`);
        mcpResult = await executeDirectDeepResearch(mcpEndpoint, query, max_results);
      } catch (error2) {
        console.warn(`[MCP-FIRECRAWL] Direct deep_research failed:`, error2);
        
        try {
          // Approach 3: Discovery to find available tools
          attemptedMethods.push("discovery");
          console.log(`[MCP-FIRECRAWL] Attempting tool discovery...`);
          const discovery = await discoverFirecrawlActions(mcpEndpoint);
          
          if (discovery) {
            // Extract any competitor/research data from discovery response
            mcpResult = discovery;
          }
        } catch (error3) {
          console.error(`[MCP-FIRECRAWL] All approaches failed:`, error3);
          throw new Error(`All MCP approaches failed: ${attemptedMethods.join(", ")}`);
        }
      }
    }

    if (mcpResult) {
      console.log(`[MCP-FIRECRAWL] MCP response received`);
      
      // Parse the MCP result to extract competitors
      const competitors = parseCompetitorsFromMCP(mcpResult, query, max_results);
      
      await logProgress("completed", `Found ${competitors.length} competitors via Klavis MCP`, { 
        competitors,
        methods_tried: attemptedMethods 
      });

      const duration = Date.now() - startTime;
      console.log(`[MCP-FIRECRAWL] Completed in ${duration}ms, found ${competitors.length} competitors`);

      return new Response(
        JSON.stringify({
          success: true,
          competitors,
          source: "klavis_mcp",
          methods_tried: attemptedMethods,
          durationMs: duration,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If we got here, no result from MCP - use fallback
    throw new Error("No result from MCP");

  } catch (error) {
    console.error(`[MCP-FIRECRAWL] Error:`, error);
    
    const startTime = Date.now();
    const fallbackCompetitors = generateFallbackCompetitors(
      (error as any)?.query || "general", 
      3
    );
    
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
    
    // Strata response structure
    if (mcpResult?.content) {
      content = mcpResult.content;
    } else if (mcpResult?.result?.content) {
      content = mcpResult.result.content;
    } else if (mcpResult?.result) {
      content = mcpResult.result;
    } else if (mcpResult?.data) {
      content = mcpResult.data;
    }

    console.log(`[MCP-FIRECRAWL] Parsing content type: ${typeof content}`);

    // If content is an array of text items (common MCP format)
    if (Array.isArray(content)) {
      for (const item of content) {
        // Handle text content items
        if (item?.type === "text" && item?.text) {
          const textCompetitors = extractCompetitorsFromText(item.text, maxResults - competitors.length);
          competitors.push(...textCompetitors);
        } else {
          const competitor = extractCompetitorFromItem(item);
          if (competitor) {
            competitors.push(competitor);
          }
        }
        if (competitors.length >= maxResults) break;
      }
    }

    // If content is a string, try to parse it
    if (typeof content === "string") {
      const textCompetitors = extractCompetitorsFromText(content, maxResults);
      competitors.push(...textCompetitors);
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

    // Check for actions array (Strata discovery response)
    if (content?.actions && Array.isArray(content.actions)) {
      console.log(`[MCP-FIRECRAWL] Found Strata actions in response`);
      // This is a discovery response, not competitor data
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

// Extract competitors from text content
function extractCompetitorsFromText(text: string, maxResults: number): CompetitorBrand[] {
  const competitors: CompetitorBrand[] = [];
  
  // Extract URLs and brand names from text
  const urlMatches = text.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g) || [];
  
  for (const url of urlMatches.slice(0, maxResults)) {
    const brandName = extractBrandFromUrl(url);
    if (brandName !== "Unknown") {
      competitors.push({
        name: brandName,
        brand_name: brandName,
        website: url,
        meta_ads_library_url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(brandName)}`,
        metaAdsUrl: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(brandName)}`,
      });
    }
  }

  return competitors;
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
