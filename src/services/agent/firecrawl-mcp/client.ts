/**
 * Firecrawl Deep Research MCP Client
 * 
 * JSON-RPC 2.0 client for Klavis Firecrawl MCP server
 * Implements Model Context Protocol specification with Strata pattern support
 */

import {
  MCPRequest,
  MCPResponse,
  MCPClientConfig,
  FirecrawlMCPError,
  MCPErrorCode,
  FirecrawlDeepResearchQuery,
  FirecrawlDeepResearchResult,
  CompetitorBrand,
  StrataDiscoveryRequest,
  StrataDiscoveryResult,
  StrataExecuteRequest,
  StrataExecuteResult,
  StrataDetailLevel,
} from "./types";

export class FirecrawlMCPClient {
  private config: Required<Omit<MCPClientConfig, 'bearerToken'>> & { bearerToken?: string };
  private requestId = 0;

  constructor(config: MCPClientConfig) {
    this.config = {
      timeout: 60000, // 60 seconds
      maxRetries: 2,
      retryDelay: 2000, // 2 seconds
      ...config,
    };
  }

  /**
   * Generate unique request ID for JSON-RPC
   */
  private generateRequestId(): number {
    return ++this.requestId;
  }

  /**
   * Make JSON-RPC 2.0 request to MCP server
   */
  private async makeRequest<T>(
    method: string,
    params?: Record<string, any>,
    retryCount = 0
  ): Promise<T> {
    const request: MCPRequest = {
      jsonrpc: "2.0",
      id: this.generateRequestId(),
      method,
      params,
    };

    console.log(`[FirecrawlMCP] Request ${request.id}: ${method}`, params);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Only add Authorization header if bearer token is provided
      // Klavis Streamable HTTP URLs contain auth in the URL itself
      if (this.config.bearerToken) {
        headers.Authorization = `Bearer ${this.config.bearerToken}`;
      }

      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new FirecrawlMCPError(
            MCPErrorCode.AUTH_ERROR,
            "Authentication failed. Check your Klavis MCP URL or bearer token.",
            { status: response.status }
          );
        }

        if (response.status === 429) {
          throw new FirecrawlMCPError(
            MCPErrorCode.RATE_LIMIT_ERROR,
            "Rate limit exceeded. Please try again later.",
            { status: response.status }
          );
        }

        throw new FirecrawlMCPError(
          MCPErrorCode.SERVER_ERROR,
          `HTTP error ${response.status}`,
          { status: response.status }
        );
      }

      const data: MCPResponse<T> = await response.json();

      if (data.error) {
        throw new FirecrawlMCPError(
          data.error.code as MCPErrorCode,
          data.error.message,
          data.error.data
        );
      }

      if (!data.result) {
        throw new FirecrawlMCPError(
          MCPErrorCode.INTERNAL_ERROR,
          "No result in response"
        );
      }

      console.log(`[FirecrawlMCP] Response ${request.id}: Success`);
      return data.result;
    } catch (error) {
      if (error instanceof FirecrawlMCPError) {
        throw error;
      }

      // Handle timeout
      if (error instanceof Error && error.name === "AbortError") {
        if (retryCount < this.config.maxRetries) {
          console.log(
            `[FirecrawlMCP] Timeout, retrying (${retryCount + 1}/${this.config.maxRetries})...`
          );
          await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay));
          return this.makeRequest<T>(method, params, retryCount + 1);
        }

        throw new FirecrawlMCPError(
          MCPErrorCode.TIMEOUT_ERROR,
          `Request timeout after ${this.config.timeout}ms`,
          { retries: retryCount }
        );
      }

      // Network or parsing error
      throw new FirecrawlMCPError(
        MCPErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : "Unknown error",
        { originalError: error }
      );
    }
  }

  /**
   * List available MCP tools
   */
  async listTools(): Promise<any> {
    return this.makeRequest("tools/list");
  }

  /**
   * Discover available actions using Strata pattern
   */
  async discoverActions(
    query: string,
    serverNames?: string[],
    detailLevel: StrataDetailLevel = "full_details"
  ): Promise<StrataDiscoveryResult> {
    console.log("[FirecrawlMCP] Discovering actions with Strata pattern...");

    const result = await this.makeRequest<any>("tools/call", {
      name: "discover_server_categories_or_actions",
      arguments: {
        user_query: query,
        server_names: serverNames || ["firecrawl"],
        detail_level: detailLevel,
      },
    });

    return result;
  }

  /**
   * Execute action using Strata pattern
   */
  async executeAction(
    serverName: string,
    categoryName: string,
    actionName: string,
    params: Record<string, any>
  ): Promise<StrataExecuteResult> {
    console.log(`[FirecrawlMCP] Executing action: ${serverName}/${categoryName}/${actionName}`);

    const result = await this.makeRequest<any>("tools/call", {
      name: "execute_action",
      arguments: {
        server_name: serverName,
        category_name: categoryName,
        action_name: actionName,
        body_schema: JSON.stringify(params),
      },
    });

    return result;
  }

  /**
   * Execute deep research query via Firecrawl MCP
   * Tries multiple approaches: Strata pattern, then direct tool calls
   */
  async deepResearch(
    query: FirecrawlDeepResearchQuery
  ): Promise<FirecrawlDeepResearchResult> {
    console.log("[FirecrawlMCP] Starting deep research:", query);

    const methodsTried: string[] = [];
    let result: any = null;

    // Approach 1: Try Strata execute_action pattern
    try {
      methodsTried.push("strata_execute_action");
      result = await this.executeAction(
        "firecrawl",
        "scraping",
        "deep_research",
        {
          query: query.query,
          maxDepth: query.maxDepth || 2,
          maxUrls: query.max_results ? query.max_results * 3 : 15,
          timeLimit: query.timeLimit || 60,
        }
      );
    } catch (strataError) {
      console.warn("[FirecrawlMCP] Strata pattern failed, trying direct call:", strataError);

      // Approach 2: Try direct tool call with firecrawl_deep_research
      try {
        methodsTried.push("firecrawl_deep_research");
        result = await this.makeRequest<any>("tools/call", {
          name: "firecrawl_deep_research",
          arguments: {
            query: query.query,
            max_results: query.max_results || 3,
            include_video_urls: query.include_video_urls !== false,
            platforms: query.platforms || ["meta", "facebook", "instagram"],
          },
        });
      } catch (directError) {
        console.warn("[FirecrawlMCP] Direct firecrawl_deep_research failed, trying deep_research:", directError);

        // Approach 3: Try simple deep_research tool name
        try {
          methodsTried.push("deep_research");
          result = await this.makeRequest<any>("tools/call", {
            name: "deep_research",
            arguments: {
              query: query.query,
              max_results: query.max_results || 3,
              include_video_urls: query.include_video_urls !== false,
              platforms: query.platforms || ["meta", "facebook", "instagram"],
            },
          });
        } catch (simpleError) {
          console.error("[FirecrawlMCP] All approaches failed");
          throw simpleError;
        }
      }
    }

    // Parse MCP response structure
    const competitors: CompetitorBrand[] = this.parseFirecrawlResult(result);

    return {
      success: true,
      competitors,
      total_found: competitors.length,
      query: query.query,
      timestamp: new Date().toISOString(),
      source: "klavis_mcp",
      methods_tried: methodsTried,
    };
  }

  /**
   * Parse Firecrawl MCP result into structured format
   */
  private parseFirecrawlResult(result: any): CompetitorBrand[] {
    console.log("[FirecrawlMCP] Parsing result structure:", typeof result);

    // Handle different response structures
    if (result?.competitors && Array.isArray(result.competitors)) {
      return result.competitors.map((comp: any) => this.normalizeCompetitor(comp));
    }

    if (result?.content && Array.isArray(result.content)) {
      // MCP text content format
      const competitors: CompetitorBrand[] = [];
      
      for (const item of result.content) {
        if (item?.type === "text" && item?.text) {
          // Extract URLs and brands from text
          const textCompetitors = this.extractCompetitorsFromText(item.text);
          competitors.push(...textCompetitors);
        } else if (item?.type === "resource" && item?.resource) {
          const comp = this.parseResourceToCompetitor(item.resource);
          if (comp) competitors.push(comp);
        }
      }

      return competitors;
    }

    if (result?.data && Array.isArray(result.data)) {
      return result.data.map((comp: any) => this.normalizeCompetitor(comp));
    }

    // Fallback: try to extract from result directly
    if (Array.isArray(result)) {
      return result.map((comp: any) => this.normalizeCompetitor(comp));
    }

    console.warn("[FirecrawlMCP] Unknown result structure, returning empty array");
    return [];
  }

  /**
   * Extract competitors from text content
   */
  private extractCompetitorsFromText(text: string): CompetitorBrand[] {
    const competitors: CompetitorBrand[] = [];
    const urlMatches = text.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g) || [];

    for (const url of urlMatches.slice(0, 5)) {
      const brandName = this.extractBrandFromUrl(url);
      if (brandName !== "Unknown") {
        competitors.push({
          brand_name: brandName,
          meta_ads_library_url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(brandName)}`,
          video_ads: [],
          description: `Found from: ${url}`,
        });
      }
    }

    return competitors;
  }

  /**
   * Extract brand name from URL
   */
  private extractBrandFromUrl(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      const parts = hostname.replace("www.", "").split(".");
      const name = parts[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      return "Unknown";
    }
  }

  /**
   * Normalize competitor data to standard format
   */
  private normalizeCompetitor(data: any): CompetitorBrand {
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

  /**
   * Parse MCP resource reference to competitor
   */
  private parseResourceToCompetitor(resource: any): CompetitorBrand | null {
    try {
      // Resource URI format: competitor://<brand_name>
      const brandName = resource.uri?.replace("competitor://", "") || resource.name;

      return {
        brand_name: brandName,
        meta_ads_library_url: resource.url || "",
        video_ads: [],
        description: resource.description,
        niche: resource.category,
      };
    } catch (error) {
      console.error("[FirecrawlMCP] Error parsing resource:", error);
      return null;
    }
  }

  /**
   * Test connection to MCP server
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listTools();
      console.log("[FirecrawlMCP] Connection test: SUCCESS");
      return true;
    } catch (error) {
      console.error("[FirecrawlMCP] Connection test: FAILED", error);
      return false;
    }
  }
}
