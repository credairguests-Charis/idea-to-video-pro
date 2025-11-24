/**
 * Supabase Edge Function: MCP Firecrawl Tool
 * 
 * Handles Firecrawl Deep Research MCP tool calls for agent workflow
 * 
 * Environment Variables Required:
 * - KLAVIS_MCP_ENDPOINT: MCP server endpoint
 * - KLAVIS_MCP_BEARER_TOKEN: Authentication token
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============= MCP Types =============

interface MCPRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, any>;
}

interface MCPResponse<T = any> {
  jsonrpc: "2.0";
  id: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface FirecrawlDeepResearchQuery {
  query: string;
  max_results?: number;
  include_video_urls?: boolean;
  platforms?: string[];
}

interface CompetitorBrand {
  brand_name: string;
  meta_ads_library_url: string;
  video_ads: any[];
  description?: string;
  niche?: string;
}

// ============= MCP Client =============

class FirecrawlMCPClient {
  private endpoint: string;
  private bearerToken: string;
  private requestId = 0;

  constructor(endpoint: string, bearerToken: string) {
    this.endpoint = endpoint;
    this.bearerToken = bearerToken;
  }

  private generateRequestId(): number {
    return ++this.requestId;
  }

  async makeRequest<T>(
    method: string,
    params?: Record<string, any>,
    timeout = 60000
  ): Promise<T> {
    const request: MCPRequest = {
      jsonrpc: "2.0",
      id: this.generateRequestId(),
      method,
      params,
    };

    console.log(`[MCP] Request ${request.id}: ${method}`, params);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: MCPResponse<T> = await response.json();

      if (data.error) {
        throw new Error(`MCP Error ${data.error.code}: ${data.error.message}`);
      }

      console.log(`[MCP] Response ${request.id}: Success`);
      return data.result as T;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async deepResearch(query: FirecrawlDeepResearchQuery): Promise<any> {
    return this.makeRequest("tools/call", {
      name: "deep_research",
      arguments: {
        query: query.query,
        max_results: query.max_results || 3,
        include_video_urls: query.include_video_urls !== false,
        platforms: query.platforms || ["meta", "facebook", "instagram"],
      },
    });
  }
}

// ============= Main Handler =============

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const mcpEndpoint = Deno.env.get("KLAVIS_MCP_ENDPOINT");
    const mcpBearerToken = Deno.env.get("KLAVIS_MCP_BEARER_TOKEN");

    if (!mcpEndpoint || !mcpBearerToken) {
      throw new Error(
        "Missing environment variables: KLAVIS_MCP_ENDPOINT or KLAVIS_MCP_BEARER_TOKEN"
      );
    }

    // Parse request body
    const { query, max_results, session_id } = await req.json();

    if (!query) {
      throw new Error("Missing required parameter: query");
    }

    console.log("[mcp-firecrawl-tool] Starting deep research:", query);

    // Initialize MCP client
    const mcpClient = new FirecrawlMCPClient(mcpEndpoint, mcpBearerToken);

    // Execute deep research
    const startTime = Date.now();
    const result = await mcpClient.deepResearch({
      query,
      max_results: max_results || 3,
      include_video_urls: true,
    });
    const duration = Date.now() - startTime;

    // Parse result to extract competitors
    const competitors: CompetitorBrand[] = parseFirecrawlResult(result);

    console.log(
      `[mcp-firecrawl-tool] Research complete (${duration}ms): Found ${competitors.length} competitors`
    );

    // Log to Supabase if session_id provided
    if (session_id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase.from("agent_execution_logs").insert({
          session_id,
          step_name: "Firecrawl Deep Research",
          tool_name: "klavis_firecrawl_mcp",
          status: "success",
          duration_ms: duration,
          input_data: { query, max_results },
          output_data: { competitors_found: competitors.length },
        });
      } catch (logError) {
        console.error("[mcp-firecrawl-tool] Failed to log to Supabase:", logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        competitors,
        total_found: competitors.length,
        query,
        duration_ms: duration,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[mcp-firecrawl-tool] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ============= Helper Functions =============

function parseFirecrawlResult(result: any): CompetitorBrand[] {
  if (result.competitors && Array.isArray(result.competitors)) {
    return result.competitors.map(normalizeCompetitor);
  }

  if (result.content && Array.isArray(result.content)) {
    const competitors: CompetitorBrand[] = [];
    for (const item of result.content) {
      if (item.type === "resource" && item.resource) {
        const comp = parseResourceToCompetitor(item.resource);
        if (comp) competitors.push(comp);
      }
    }
    return competitors;
  }

  if (Array.isArray(result)) {
    return result.map(normalizeCompetitor);
  }

  return [];
}

function normalizeCompetitor(data: any): CompetitorBrand {
  return {
    brand_name: data.brand_name || data.name || "Unknown Brand",
    meta_ads_library_url: data.meta_ads_library_url || data.url || "",
    video_ads: Array.isArray(data.video_ads)
      ? data.video_ads.map((ad: any) => ({
          ad_id: ad.ad_id || ad.id || `ad_${Date.now()}`,
          video_url: ad.video_url || ad.url || "",
          thumbnail_url: ad.thumbnail_url || ad.thumbnail,
          ad_copy: ad.ad_copy || ad.copy || ad.text,
          cta_button: ad.cta_button || ad.cta,
          target_audience: ad.target_audience || ad.audience,
          launch_date: ad.launch_date || ad.date,
          duration_seconds: ad.duration_seconds || ad.duration,
        }))
      : [],
    description: data.description,
    niche: data.niche || data.category,
  };
}

function parseResourceToCompetitor(resource: any): CompetitorBrand | null {
  try {
    const brandName = resource.uri?.replace("competitor://", "") || resource.name;
    return {
      brand_name: brandName,
      meta_ads_library_url: resource.url || "",
      video_ads: [],
      description: resource.description,
      niche: resource.category,
    };
  } catch {
    return null;
  }
}
