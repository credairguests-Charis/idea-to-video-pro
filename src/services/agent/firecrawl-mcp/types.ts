/**
 * Firecrawl Deep Research MCP - Type Definitions
 * 
 * Model Context Protocol (MCP) JSON-RPC 2.0 types for Klavis Firecrawl integration
 * Updated for Klavis Strata pattern support
 */

// ============= MCP Protocol Types =============

export interface MCPRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, any>;
}

export interface MCPResponse<T = any> {
  jsonrpc: "2.0";
  id: number | string;
  result?: T;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// ============= MCP Tool Types =============

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCallRequest {
  method: "tools/call";
  params: {
    name: string;
    arguments: Record<string, any>;
  };
}

export interface MCPResourceReference {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// ============= Klavis Strata Pattern Types =============

export type StrataDetailLevel = "categories_only" | "categories_and_actions" | "full_details";

export interface StrataDiscoveryRequest {
  user_query: string;
  server_names?: string[];
  detail_level?: StrataDetailLevel;
}

export interface StrataAction {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface StrataCategory {
  name: string;
  description: string;
  actions?: StrataAction[];
}

export interface StrataServer {
  name: string;
  description: string;
  categories?: StrataCategory[];
}

export interface StrataDiscoveryResult {
  servers?: StrataServer[];
  categories?: StrataCategory[];
  actions?: StrataAction[];
}

export interface StrataExecuteRequest {
  server_name: string;
  category_name: string;
  action_name: string;
  body_schema: string; // JSON stringified parameters
}

export interface StrataExecuteResult {
  success: boolean;
  content?: any;
  data?: any;
  error?: string;
}

// ============= Firecrawl Deep Research Types =============

export interface FirecrawlDeepResearchQuery {
  query: string;
  max_results?: number;
  include_video_urls?: boolean;
  platforms?: ("meta" | "facebook" | "instagram")[];
  maxDepth?: number;
  maxUrls?: number;
  timeLimit?: number;
}

export interface CompetitorVideoAd {
  ad_id: string;
  video_url: string;
  thumbnail_url?: string;
  ad_copy?: string;
  cta_button?: string;
  target_audience?: string;
  launch_date?: string;
  duration_seconds?: number;
}

export interface CompetitorBrand {
  brand_name: string;
  meta_ads_library_url: string;
  video_ads: CompetitorVideoAd[];
  description?: string;
  niche?: string;
}

export interface FirecrawlDeepResearchResult {
  success: boolean;
  competitors: CompetitorBrand[];
  total_found: number;
  query: string;
  timestamp: string;
  source?: "klavis_mcp" | "fallback";
  methods_tried?: string[];
}

// ============= MCP Client Config =============

export interface MCPClientConfig {
  endpoint: string;
  bearerToken?: string; // Optional - Klavis Streamable HTTP URL contains auth
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

// ============= Error Types =============

export enum MCPErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  SERVER_ERROR = -32000,
  TIMEOUT_ERROR = -32001,
  AUTH_ERROR = -32002,
  RATE_LIMIT_ERROR = -32003,
}

export class FirecrawlMCPError extends Error {
  constructor(
    public code: MCPErrorCode,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = "FirecrawlMCPError";
  }
}
