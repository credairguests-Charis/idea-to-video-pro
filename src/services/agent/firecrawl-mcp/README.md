# Firecrawl MCP Client

Model Context Protocol (MCP) client for Klavis Firecrawl Deep Research integration.

## Overview

This directory contains the isolated MCP integration layer for the Firecrawl Deep Research tool. It follows the JSON-RPC 2.0 specification and implements the Model Context Protocol standard.

## Files

- **`types.ts`**: TypeScript type definitions for MCP protocol and Firecrawl-specific types
- **`client.ts`**: Core MCP JSON-RPC 2.0 client implementation
- **`tool-handler.ts`**: Tool call orchestration and error handling layer
- **`test-harness.ts`**: Test suite for validating MCP integration
- **`index.ts`**: Public API exports

## Quick Start

### 1. Import the Client

```typescript
import { FirecrawlMCPClient } from "@/services/agent/firecrawl-mcp";

const client = new FirecrawlMCPClient({
  endpoint: "https://strata.klavis.ai/mcp/",
  bearerToken: "YOUR_BEARER_TOKEN",
  timeout: 60000,
  maxRetries: 2
});
```

### 2. Execute Deep Research

```typescript
const result = await client.deepResearch({
  query: "DTC skincare brands on Meta Ads",
  max_results: 3,
  include_video_urls: true
});

console.log(`Found ${result.competitors.length} competitors`);
```

### 3. Use Tool Handler (Recommended)

```typescript
import { FirecrawlMCPToolHandler } from "@/services/agent/firecrawl-mcp";

const handler = new FirecrawlMCPToolHandler(
  "https://strata.klavis.ai/mcp/",
  "YOUR_BEARER_TOKEN"
);

const result = await handler.executeDeepResearch({
  query: "fitness supplement video ads"
});

if (result.success) {
  console.log("Competitors:", result.data?.competitors);
} else {
  console.error("Error:", result.error);
  console.log("Fallback:", handler.getFallbackAction(result.error.code));
}
```

## API Reference

### `FirecrawlMCPClient`

#### Constructor

```typescript
new FirecrawlMCPClient(config: MCPClientConfig)
```

**Config Options:**
- `endpoint: string` - MCP server URL (required)
- `bearerToken: string` - Authentication token (required)
- `timeout?: number` - Request timeout in ms (default: 60000)
- `maxRetries?: number` - Max retry attempts (default: 2)
- `retryDelay?: number` - Delay between retries in ms (default: 2000)

#### Methods

##### `deepResearch(query: FirecrawlDeepResearchQuery): Promise<FirecrawlDeepResearchResult>`

Execute competitor deep research.

**Parameters:**
```typescript
{
  query: string;                    // Search query
  max_results?: number;             // Max competitors (default: 3)
  include_video_urls?: boolean;     // Include video URLs (default: true)
  platforms?: string[];             // Platforms to search (default: ["meta", "facebook", "instagram"])
}
```

**Returns:**
```typescript
{
  success: boolean;
  competitors: CompetitorBrand[];
  total_found: number;
  query: string;
  timestamp: string;
}
```

##### `listTools(): Promise<any>`

List available MCP tools on the server.

##### `testConnection(): Promise<boolean>`

Test connection to MCP server.

### `FirecrawlMCPToolHandler`

Higher-level abstraction with error handling and logging.

#### Constructor

```typescript
new FirecrawlMCPToolHandler(endpoint: string, bearerToken: string)
```

#### Methods

##### `executeDeepResearch(query: FirecrawlDeepResearchQuery): Promise<ToolCallResult>`

Execute deep research with enhanced error handling.

**Returns:**
```typescript
{
  success: boolean;
  data?: FirecrawlDeepResearchResult;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  duration_ms: number;
}
```

##### `testConnection(): Promise<ToolCallResult>`

Test MCP connection with structured result.

##### `getFallbackAction(errorCode: string): string`

Get recommended fallback action for error code.

## Error Handling

### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `AUTH_ERROR` | Authentication failed | Check bearer token in secrets |
| `TIMEOUT_ERROR` | Request timeout | Reduce max_results or retry |
| `RATE_LIMIT_ERROR` | Rate limit exceeded | Wait 60s before retry |
| `INVALID_PARAMS` | Invalid parameters | Validate query format |
| `SERVER_ERROR` | MCP server error | Contact support |

### Example

```typescript
try {
  const result = await client.deepResearch({ query: "..." });
} catch (error) {
  if (error instanceof FirecrawlMCPError) {
    console.error(`MCP Error ${error.code}: ${error.message}`);
    console.log("Details:", error.data);
  }
}
```

## Testing

### Run Full Test Suite

```typescript
import { runAllTests } from "@/services/agent/firecrawl-mcp/test-harness";

await runAllTests(
  "https://strata.klavis.ai/mcp/",
  "YOUR_BEARER_TOKEN"
);
```

### Run Quick Test

```typescript
import { quickTest } from "@/services/agent/firecrawl-mcp/test-harness";

await quickTest("DTC skincare brands");
```

## Edge Function Integration

This client is used by the `mcp-firecrawl-tool` edge function:

```typescript
// In edge function
const { data } = await supabase.functions.invoke('mcp-firecrawl-tool', {
  body: {
    query: "DTC skincare brands on Meta Ads",
    max_results: 3,
    session_id: sessionId // Optional, for logging
  }
});
```

## Type Definitions

### `CompetitorBrand`

```typescript
{
  brand_name: string;
  meta_ads_library_url: string;
  video_ads: CompetitorVideoAd[];
  description?: string;
  niche?: string;
}
```

### `CompetitorVideoAd`

```typescript
{
  ad_id: string;
  video_url: string;
  thumbnail_url?: string;
  ad_copy?: string;
  cta_button?: string;
  target_audience?: string;
  launch_date?: string;
  duration_seconds?: number;
}
```

## Best Practices

1. **Use Tool Handler**: Prefer `FirecrawlMCPToolHandler` over direct client usage
2. **Error Handling**: Always check `result.success` before accessing data
3. **Timeouts**: Adjust timeout based on `max_results` (more results = longer time)
4. **Rate Limits**: Implement exponential backoff for rate limit errors
5. **Logging**: Use structured logging for debugging MCP calls
6. **Secrets**: Never hardcode bearer tokens, use Supabase secrets

## Environment Variables

Required in Supabase Edge Functions:

```bash
KLAVIS_MCP_ENDPOINT=https://strata.klavis.ai/mcp/
KLAVIS_MCP_BEARER_TOKEN=<your_token>
```

Set these in: **Supabase Dashboard → Settings → Edge Functions → Secrets**

## Architecture Notes

- **Isolation**: No dependencies on other agent services
- **Protocol Compliance**: Follows JSON-RPC 2.0 and MCP spec
- **Error Recovery**: Automatic retry with exponential backoff
- **Type Safety**: Full TypeScript coverage
- **Testing**: Comprehensive test harness included

## Related Documentation

- [AgentPRD.md](../../../../docs/AgentPRD.md) - Product requirements
- [agent-competitor-architecture.md](../../../../docs/agent-competitor-architecture.md) - System architecture
- [agent-workflow-sequence.md](../../../../docs/agent-workflow-sequence.md) - Workflow sequence
- [agent-firecrawl-implementation.md](../../../../docs/agent-firecrawl-implementation.md) - Implementation details

## Support

For issues or questions:
1. Check implementation notes in `docs/agent-firecrawl-implementation.md`
2. Review test harness output for diagnostics
3. Check Supabase Edge Function logs
4. Verify bearer token is correctly set in secrets

---

**Status**: ✅ Phase 1 Complete - Ready for Testing
