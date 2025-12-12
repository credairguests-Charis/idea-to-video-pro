/**
 * Firecrawl MCP Client
 * 
 * Client for interacting with the Firecrawl MCP Server via HTTP Streamable transport.
 * Uses the remote hosted URL: https://mcp.firecrawl.dev/{FIRECRAWL_API_KEY}/v2/mcp
 */

export interface FirecrawlMCPConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  success: boolean;
  content?: any;
  error?: string;
}

// Tool argument interfaces
export interface ScrapeArgs {
  url: string;
  formats?: ("markdown" | "html" | "rawHtml" | "links" | "screenshot")[];
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
  mobile?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
}

export interface BatchScrapeArgs {
  urls: string[];
  options?: {
    formats?: string[];
    onlyMainContent?: boolean;
  };
}

export interface MapArgs {
  url: string;
  search?: string;
  sitemap?: "include" | "skip" | "only";
  includeSubdomains?: boolean;
  limit?: number;
  ignoreQueryParameters?: boolean;
}

export interface SearchArgs {
  query: string;
  limit?: number;
  lang?: string;
  country?: string;
  tbs?: string;
  scrapeOptions?: {
    formats?: string[];
  };
}

export interface CrawlArgs {
  url: string;
  limit?: number;
  maxDepth?: number;
  includePaths?: string[];
  excludePaths?: string[];
  scrapeOptions?: {
    formats?: string[];
  };
}

export interface ExtractArgs {
  urls: string[];
  prompt?: string;
  schema?: Record<string, any>;
  enableWebSearch?: boolean;
  showSources?: boolean;
}

/**
 * Firecrawl MCP Client for HTTP Streamable transport
 */
export class FirecrawlMCPClient {
  private config: FirecrawlMCPConfig;
  private mcpEndpoint: string;

  constructor(config: FirecrawlMCPConfig) {
    this.config = {
      timeout: 60000,
      baseUrl: "https://mcp.firecrawl.dev",
      ...config,
    };
    this.mcpEndpoint = `${this.config.baseUrl}/${this.config.apiKey}/v2/mcp`;
  }

  /**
   * Make a JSON-RPC 2.0 call to the MCP server
   */
  private async makeRequest(method: string, params?: Record<string, any>): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.mcpEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MCP request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`MCP error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      return data.result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`MCP request timed out after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Call an MCP tool
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<MCPToolResult> {
    try {
      const result = await this.makeRequest("tools/call", {
        name: toolName,
        arguments: args,
      });

      return {
        success: true,
        content: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<any> {
    return this.makeRequest("tools/list");
  }

  /**
   * Test connection to the MCP server
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listTools();
      return true;
    } catch {
      return false;
    }
  }

  // ============ Convenience Methods ============

  /**
   * Scrape a single URL
   */
  async scrape(args: ScrapeArgs): Promise<MCPToolResult> {
    return this.callTool("firecrawl_scrape", args);
  }

  /**
   * Batch scrape multiple URLs
   */
  async batchScrape(args: BatchScrapeArgs): Promise<MCPToolResult> {
    return this.callTool("firecrawl_batch_scrape", args);
  }

  /**
   * Check batch scrape status
   */
  async checkBatchStatus(id: string): Promise<MCPToolResult> {
    return this.callTool("firecrawl_check_batch_status", { id });
  }

  /**
   * Map a website to discover all URLs
   */
  async map(args: MapArgs): Promise<MCPToolResult> {
    return this.callTool("firecrawl_map", args);
  }

  /**
   * Search the web
   */
  async search(args: SearchArgs): Promise<MCPToolResult> {
    return this.callTool("firecrawl_search", args);
  }

  /**
   * Crawl a website
   */
  async crawl(args: CrawlArgs): Promise<MCPToolResult> {
    return this.callTool("firecrawl_crawl", args);
  }

  /**
   * Check crawl status
   */
  async checkCrawlStatus(id: string): Promise<MCPToolResult> {
    return this.callTool("firecrawl_check_crawl_status", { id });
  }

  /**
   * Extract structured data from URLs using AI
   */
  async extract(args: ExtractArgs): Promise<MCPToolResult> {
    return this.callTool("firecrawl_extract", args);
  }

  /**
   * Scrape Meta Ads Library for a brand
   * This is a convenience method that combines search and scrape
   */
  async scrapeMetaAds(brandName: string, maxAds: number = 10): Promise<MCPToolResult> {
    const metaAdsUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(brandName)}&search_type=keyword_unordered&media_type=all`;
    
    // First try to scrape directly with longer wait time for JS rendering
    const scrapeResult = await this.scrape({
      url: metaAdsUrl,
      formats: ["markdown", "html", "screenshot"],
      waitFor: 6000,
      timeout: 45000,
      onlyMainContent: false,
    });

    if (scrapeResult.success && scrapeResult.content) {
      return {
        success: true,
        content: {
          brandName,
          metaAdsUrl,
          scraped: scrapeResult.content,
          maxAds,
        },
      };
    }

    // Fallback: Use extract with AI to find ad information
    const extractResult = await this.extract({
      urls: [metaAdsUrl],
      prompt: `Extract all video ads for ${brandName}. For each ad, get: video URL, thumbnail, ad copy, CTA button text, and any other relevant information. Return up to ${maxAds} ads.`,
      schema: {
        type: "object",
        properties: {
          ads: {
            type: "array",
            items: {
              type: "object",
              properties: {
                advertiser: { type: "string" },
                videoUrl: { type: "string" },
                thumbnailUrl: { type: "string" },
                adCopy: { type: "string" },
                ctaText: { type: "string" },
                platform: { type: "string" },
              },
            },
          },
        },
      },
      enableWebSearch: true,
    });

    return extractResult;
  }
}

/**
 * Create a Firecrawl MCP client from environment variables
 */
export function createFirecrawlMCPClient(apiKey: string): FirecrawlMCPClient {
  return new FirecrawlMCPClient({ apiKey });
}
