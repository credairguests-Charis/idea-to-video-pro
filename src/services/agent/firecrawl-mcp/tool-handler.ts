/**
 * Firecrawl MCP Tool Call Handler
 * 
 * Orchestrates MCP tool calls for agent workflow
 */

import { FirecrawlMCPClient } from "./client";
import {
  FirecrawlDeepResearchQuery,
  FirecrawlDeepResearchResult,
  FirecrawlMCPError,
  MCPErrorCode,
} from "./types";

export interface ToolCallResult {
  success: boolean;
  data?: FirecrawlDeepResearchResult;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  duration_ms: number;
}

export class FirecrawlMCPToolHandler {
  private client: FirecrawlMCPClient;

  constructor(endpoint: string, bearerToken: string) {
    this.client = new FirecrawlMCPClient({
      endpoint,
      bearerToken,
      timeout: 60000, // 60s
      maxRetries: 2,
      retryDelay: 2000,
    });
  }

  /**
   * Execute deep research tool call
   */
  async executeDeepResearch(
    query: FirecrawlDeepResearchQuery
  ): Promise<ToolCallResult> {
    const startTime = Date.now();

    try {
      console.log("[ToolHandler] Executing deep research:", query);

      const result = await this.client.deepResearch(query);

      const duration_ms = Date.now() - startTime;

      console.log(
        `[ToolHandler] Deep research complete (${duration_ms}ms):`,
        `Found ${result.competitors.length} competitors`
      );

      return {
        success: true,
        data: result,
        duration_ms,
      };
    } catch (error) {
      const duration_ms = Date.now() - startTime;

      console.error(`[ToolHandler] Deep research failed (${duration_ms}ms):`, error);

      if (error instanceof FirecrawlMCPError) {
        return {
          success: false,
          error: {
            code: this.mapErrorCode(error.code),
            message: error.message,
            details: error.data,
          },
          duration_ms,
        };
      }

      return {
        success: false,
        error: {
          code: "UNKNOWN_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
          details: error,
        },
        duration_ms,
      };
    }
  }

  /**
   * Test MCP connection
   */
  async testConnection(): Promise<ToolCallResult> {
    const startTime = Date.now();

    try {
      const isConnected = await this.client.testConnection();

      return {
        success: isConnected,
        duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "CONNECTION_FAILED",
          message: error instanceof Error ? error.message : "Connection test failed",
        },
        duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Map MCP error codes to human-readable strings
   */
  private mapErrorCode(code: MCPErrorCode): string {
    switch (code) {
      case MCPErrorCode.AUTH_ERROR:
        return "AUTH_ERROR";
      case MCPErrorCode.TIMEOUT_ERROR:
        return "TIMEOUT_ERROR";
      case MCPErrorCode.RATE_LIMIT_ERROR:
        return "RATE_LIMIT_ERROR";
      case MCPErrorCode.INVALID_PARAMS:
        return "INVALID_PARAMS";
      case MCPErrorCode.METHOD_NOT_FOUND:
        return "METHOD_NOT_FOUND";
      default:
        return "SERVER_ERROR";
    }
  }

  /**
   * Get recommended fallback action for error
   */
  getFallbackAction(errorCode: string): string {
    switch (errorCode) {
      case "AUTH_ERROR":
        return "Check your KLAVIS_MCP_BEARER_TOKEN in Supabase secrets";
      case "TIMEOUT_ERROR":
        return "Retry the request or reduce max_results";
      case "RATE_LIMIT_ERROR":
        return "Wait 60 seconds before retrying";
      case "INVALID_PARAMS":
        return "Check your query parameters";
      default:
        return "Contact support or try manual competitor input";
    }
  }
}
