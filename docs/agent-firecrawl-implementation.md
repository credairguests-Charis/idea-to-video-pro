# Firecrawl MCP Integration - Implementation Notes

## ✅ Implementation Complete

The Firecrawl Deep Research MCP integration layer has been successfully implemented as an isolated service layer.

## 📁 File Structure

```
src/services/agent/firecrawl-mcp/
├── types.ts              # MCP protocol types & Firecrawl-specific types
├── client.ts             # MCP JSON-RPC 2.0 client implementation
├── tool-handler.ts       # Tool call orchestration layer
├── test-harness.ts       # Minimal test suite
└── index.ts              # Public API exports

supabase/functions/
└── mcp-firecrawl-tool/
    └── index.ts          # Edge function for MCP calls
```

## 🔑 Environment Variables

The following secrets have been configured in Supabase:

- `KLAVIS_MCP_ENDPOINT`: MCP server endpoint (https://strata.klavis.ai/mcp/)
- `KLAVIS_MCP_BEARER_TOKEN`: Authentication bearer token

## 🎯 Key Features

### 1. MCP JSON-RPC 2.0 Client (`client.ts`)

- **Protocol Compliance**: Full JSON-RPC 2.0 implementation
- **Authentication**: Bearer token via Authorization header
- **Timeout Handling**: 60s default with configurable retry logic
- **Error Mapping**: Maps MCP error codes to application-specific errors
- **Result Parsing**: Handles multiple Firecrawl response formats:
  - `result.competitors[]` (direct array)
  - `result.content[]` (MCP resource format)
  - Fallback to flat array structure

### 2. Tool Call Handler (`tool-handler.ts`)

- **Orchestration**: Manages tool call lifecycle
- **Error Recovery**: Provides fallback actions for each error type
- **Performance Tracking**: Records duration_ms for all operations
- **Logging**: Structured console logging for debugging

### 3. Edge Function (`mcp-firecrawl-tool`)

- **Serverless**: Runs on Supabase Edge Functions (Deno)
- **Logging**: Writes to `agent_execution_logs` table
- **CORS**: Configured for cross-origin requests
- **Error Handling**: Catches and returns structured errors

### 4. Test Harness (`test-harness.ts`)

Includes 5 test scenarios:
1. MCP client connection test
2. List available tools
3. Deep research query execution
4. Tool handler integration
5. Error handling validation

## 🔄 MCP Request/Response Flow

```
Client Request (Frontend)
  ↓
Supabase Edge Function (mcp-firecrawl-tool)
  ↓
MCP JSON-RPC 2.0 Request
  {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "deep_research",
      "arguments": {
        "query": "DTC skincare brands on Meta Ads",
        "max_results": 3,
        "include_video_urls": true
      }
    }
  }
  ↓
Klavis Firecrawl MCP Server
  ↓
MCP Response
  {
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
      "competitors": [...]
    }
  }
  ↓
Parse & Normalize
  ↓
Return Structured Data
```

## 📊 Data Structures

### Input: `FirecrawlDeepResearchQuery`
```typescript
{
  query: string;              // e.g., "DTC skincare brands on Meta Ads"
  max_results?: number;       // Default: 3
  include_video_urls?: boolean; // Default: true
  platforms?: string[];       // Default: ["meta", "facebook", "instagram"]
}
```

### Output: `FirecrawlDeepResearchResult`
```typescript
{
  success: boolean;
  competitors: CompetitorBrand[];
  total_found: number;
  query: string;
  timestamp: string;
}
```

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

## 🛡️ Error Handling

### Error Types

| Error Code | Description | Fallback Action |
|------------|-------------|-----------------|
| `AUTH_ERROR` | Invalid bearer token | Check KLAVIS_MCP_BEARER_TOKEN in secrets |
| `TIMEOUT_ERROR` | Request timeout (>60s) | Retry with reduced max_results |
| `RATE_LIMIT_ERROR` | Rate limit exceeded | Wait 60s before retrying |
| `INVALID_PARAMS` | Invalid query parameters | Validate input format |
| `SERVER_ERROR` | MCP server error | Contact support or use manual input |

### Retry Logic

- **Max Retries**: 2
- **Retry Delay**: 2 seconds
- **Timeout**: 60 seconds per request
- **Exponential Backoff**: Not implemented (constant delay)

## 🧪 Testing

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

await quickTest(
  "DTC skincare brands on Meta Ads",
  "https://strata.klavis.ai/mcp/",
  "YOUR_BEARER_TOKEN"
);
```

### Expected Test Results

```
✅ PASS  connection
✅ PASS  listTools
✅ PASS  deepResearch
✅ PASS  toolHandler
✅ PASS  errorHandling

5/5 tests passed
🎉 All tests passed! MCP integration is working correctly.
```

## 🔌 Edge Function Usage

### Call from Frontend

```typescript
const { data, error } = await supabase.functions.invoke('mcp-firecrawl-tool', {
  body: {
    query: "DTC skincare brands on Meta Ads",
    max_results: 3,
    session_id: "optional-session-id" // For logging
  }
});

if (data.success) {
  console.log("Found competitors:", data.competitors);
} else {
  console.error("Error:", data.error);
}
```

### Response Format

```typescript
{
  success: true,
  competitors: [
    {
      brand_name: "GlowSkin",
      meta_ads_library_url: "https://...",
      video_ads: [
        {
          ad_id: "123456789",
          video_url: "https://...",
          ad_copy: "Transform your skin...",
          cta_button: "Shop Now"
        }
      ]
    }
  ],
  total_found: 3,
  query: "DTC skincare brands on Meta Ads",
  duration_ms: 25000
}
```

## 🚀 Integration with Agent Workflow

The MCP Firecrawl tool is designed to be called from `agent-competitor-workflow` edge function:

```typescript
// Step 1: Call Firecrawl MCP
const { data: firecrawlResult } = await supabase.functions.invoke(
  'mcp-firecrawl-tool',
  {
    body: {
      query: userPrompt,
      max_results: 3,
      session_id: sessionId
    }
  }
);

// Step 2: Use competitors for next steps
const competitors = firecrawlResult.competitors;

// Continue workflow...
```

## ⚠️ Important Notes

### 1. No UI Changes

This implementation is **backend-only**. The UI integration will be implemented in a separate phase.

### 2. Isolation

All code is isolated in:
- `src/services/agent/firecrawl-mcp/` (client-side utilities)
- `supabase/functions/mcp-firecrawl-tool/` (edge function)

No existing functionality has been modified.

### 3. MCP Protocol Compliance

The implementation follows the Model Context Protocol specification:
- JSON-RPC 2.0 message format
- Standard error codes
- Tool call patterns
- Resource references

### 4. Production Readiness

✅ Ready for:
- Connection testing
- Tool listing
- Deep research queries
- Error handling
- Logging to database

❌ Not yet implemented:
- Rate limit queuing
- Caching layer
- UI components
- Workflow orchestration

## 🔮 Next Steps

1. **Test Connection**: Use test harness to verify MCP endpoint connectivity
2. **Validate Bearer Token**: Ensure KLAVIS_MCP_BEARER_TOKEN is correct
3. **Run Integration Tests**: Execute full test suite
4. **Monitor Edge Function Logs**: Check Supabase logs for any issues
5. **Proceed to Next Phase**: Azure Video Indexer integration

## 📝 Architecture Alignment

This implementation aligns with:
- ✅ **AgentPRD.md**: FR-1.1 through FR-1.4 (Klavis Firecrawl Integration)
- ✅ **agent-competitor-architecture.md**: MCP Client Wrapper section
- ✅ **agent-workflow-sequence.md**: Step 1 (Deep Competitor Research)

## 🎓 Learning Resources

- [Model Context Protocol Spec](https://spec.modelcontextprotocol.io/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [Klavis Firecrawl Documentation](https://www.klavis.ai/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**STATUS**: ✅ Phase 1 (MCP Firecrawl Integration) Complete - Awaiting testing & next phase approval
