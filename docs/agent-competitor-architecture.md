# Agent Competitor Research + Video Analysis - System Architecture

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ AgentMode    │  │ AgentConsole │  │ AgentTimeline│  │ AgentPreview│ │
│  │ Page         │  │ (Logs)       │  │ (Steps)      │  │ (Results)   │ │
│  └──────┬───────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│         │                                                                │
│         │ User submits prompt with workflow_type = 'competitor_research'│
└─────────┼────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   SUPABASE EDGE FUNCTIONS (Deno)                        │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  agent-workflow-orchestrator (Main Coordinator)                    │ │
│  │  - Receives user prompt + workflow_type                            │ │
│  │  - Creates agent_session record                                    │ │
│  │  - Dispatches to workflow-specific handler                         │ │
│  │  - Publishes real-time updates via Supabase Realtime               │ │
│  │  - Handles error recovery and fallbacks                            │ │
│  └────┬─────────────────────────────────────────────────────────────┬─┘ │
│       │                                                              │   │
│       ▼                                                              │   │
│  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  agent-competitor-workflow (Competitor Research Handler)        │ │   │
│  │  Step 1: Call mcp-firecrawl-tool                                │ │   │
│  │  Step 2: Call meta-ads-extractor                                │ │   │
│  │  Step 3: Call azure-video-analyzer (for each video)             │ │   │
│  │  Step 4: Call llm-synthesis-engine                              │ │   │
│  │  Step 5: Store results in agent_memory + competitor_videos      │ │   │
│  └────┬─────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ├─────────────┬─────────────┬──────────────┬──────────────────────┤
│       ▼             ▼             ▼              ▼                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────────┐  ┌──────────────────┐      │
│  │ mcp-    │  │ meta-   │  │ azure-video │  │ llm-synthesis-   │      │
│  │ fire-   │  │ ads-    │  │ -analyzer   │  │ engine           │      │
│  │ crawl-  │  │ extrac- │  │             │  │                  │      │
│  │ tool    │  │ tor     │  │             │  │                  │      │
│  └────┬────┘  └────┬────┘  └──────┬──────┘  └────┬─────────────┘      │
│       │            │              │              │                      │
└───────┼────────────┼──────────────┼──────────────┼──────────────────────┘
        │            │              │              │
        ▼            ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES / APIs                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Klavis       │  │ Meta Ads     │  │ Azure Video  │  │ Lovable AI  │ │
│  │ Firecrawl    │  │ Library      │  │ Indexer      │  │ Gateway     │ │
│  │ MCP Server   │  │ (Public)     │  │ REST API     │  │ (GPT-4.1)   │ │
│  │              │  │              │  │              │  │             │ │
│  │ https://     │  │ Web scraping │  │ Auth: Azure  │  │ Auth:       │ │
│  │ strata.      │  │ or API       │  │ AD / API Key │  │ LOVABLE_    │ │
│  │ klavis.ai/   │  │              │  │              │  │ API_KEY     │ │
│  │ mcp/         │  │              │  │              │  │             │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
        │            │              │              │
        └────────────┴──────────────┴──────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     SUPABASE POSTGRESQL DATABASE                        │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│  │ agent_sessions   │  │ agent_execution_ │  │ competitor_videos  │   │
│  │                  │  │ logs             │  │                    │   │
│  │ - id             │  │                  │  │ - id               │   │
│  │ - user_id        │  │ - session_id     │  │ - session_id       │   │
│  │ - workflow_type  │  │ - step_name      │  │ - user_id          │   │
│  │ - state          │  │ - tool_name      │  │ - competitor_name  │   │
│  │ - progress       │  │ - status         │  │ - meta_ads_url     │   │
│  │ - current_step   │  │ - input_data     │  │ - video_url        │   │
│  │ - competitor_    │  │ - output_data    │  │ - video_metadata   │   │
│  │   data (JSONB)   │  │ - duration_ms    │  │ - azure_insights   │   │
│  │ - video_insights │  │ - error_message  │  │ - synthesis_output │   │
│  │   (JSONB)        │  │                  │  │                    │   │
│  │ - synthesis_     │  │                  │  │                    │   │
│  │   output (JSONB) │  │                  │  │                    │   │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘   │
│                                                                          │
│  ┌──────────────────┐                                                   │
│  │ agent_memory     │  (Stores synthesized insights for future use)    │
│  │                  │                                                   │
│  │ - id             │                                                   │
│  │ - user_id        │                                                   │
│  │ - memory_type    │  (e.g., 'competitor_insight')                    │
│  │ - content        │  (Structured synthesis JSON)                     │
│  │ - embedding      │  (Vector for semantic search)                    │
│  │ - metadata       │  (Competitor name, ad URL, etc.)                 │
│  └──────────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. Component Architecture

### 2.1 Frontend Components (React)

```
src/pages/AgentMode.tsx
├── Uses agent-workflow-orchestrator via Supabase Functions
├── Subscribes to Realtime updates on agent_sessions & agent_execution_logs
├── Renders:
    ├── AgentConsole (live logs)
    ├── AgentTimeline (progress steps)
    └── AgentPreview (competitor insights cards)

src/components/agent/
├── AgentConsole.tsx (Real-time log viewer)
├── AgentTimeline.tsx (Visual step progress)
├── AgentPreview.tsx (Results display)
└── AgentInput.tsx (Prompt input with voice)

New: src/components/agent/CompetitorInsightCard.tsx
├── Display single competitor analysis
├── Sections: Hook, Script, CTA, Insights, Video Player
└── Export button (JSON/PDF)
```

### 2.2 Backend Edge Functions (Supabase/Deno)

```
supabase/functions/
├── agent-workflow-orchestrator/
│   ├── index.ts
│   ├── Receives user prompt + workflow_type
│   ├── Routes to appropriate workflow handler
│   ├── Publishes Realtime updates
│   └── Handles cancellation requests
│
├── agent-competitor-workflow/
│   ├── index.ts (Main workflow coordinator)
│   ├── Step 1: Call mcp-firecrawl-tool
│   ├── Step 2: Call meta-ads-extractor
│   ├── Step 3: Call azure-video-analyzer (parallel)
│   ├── Step 4: Call llm-synthesis-engine
│   └── Step 5: Write to database
│
├── mcp-firecrawl-tool/
│   ├── index.ts
│   ├── Constructs MCP request to Klavis Firecrawl
│   ├── Authenticates via Bearer token (from Supabase secrets)
│   ├── Parses competitor data + Meta Ads URLs
│   └── Returns structured JSON
│
├── meta-ads-extractor/
│   ├── index.ts
│   ├── Accepts Meta Ads Library URL
│   ├── Extracts video URL, copy, CTA, audience
│   └── Returns metadata JSON
│
├── azure-video-analyzer/
│   ├── index.ts
│   ├── Uploads video to Azure Video Indexer
│   ├── Polls for processing completion
│   ├── Extracts transcript, scenes, objects, sentiment
│   └── Returns insights JSON
│
└── llm-synthesis-engine/
    ├── index.ts
    ├── Accepts: video_metadata + azure_insights + user_brand_memory
    ├── Constructs LLM prompt with structured output schema
    ├── Calls Lovable AI Gateway (google/gemini-2.5-pro)
    └── Returns synthesis JSON (hook, script, CTA, insights, etc.)
```

### 2.3 Database Schema Extensions

```sql
-- New columns in agent_sessions
ALTER TABLE agent_sessions 
  ADD COLUMN workflow_type TEXT DEFAULT 'general',
  ADD COLUMN competitor_data JSONB,
  ADD COLUMN video_insights JSONB,
  ADD COLUMN synthesis_output JSONB;

-- New table for competitor videos
CREATE TABLE competitor_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  competitor_name TEXT NOT NULL,
  meta_ads_url TEXT,
  video_url TEXT NOT NULL,
  video_metadata JSONB,      -- Meta Ads data
  azure_insights JSONB,       -- Azure Video Indexer output
  synthesis_output JSONB,     -- LLM synthesis
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_competitor_videos_session ON competitor_videos(session_id);
CREATE INDEX idx_competitor_videos_user ON competitor_videos(user_id);

-- RLS policies
ALTER TABLE competitor_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own competitor videos"
  ON competitor_videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own competitor videos"
  ON competitor_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## 3. Data Flow Sequence

### 3.1 Happy Path (Successful Workflow)

```
User → AgentMode (Submit prompt: "Analyze top 3 DTC skincare brands")
  ↓
Frontend → Supabase Functions: POST /agent-workflow-orchestrator
  Body: { prompt: "...", workflow_type: "competitor_research" }
  ↓
agent-workflow-orchestrator:
  1. Create agent_session record (state: "running")
  2. Dispatch to agent-competitor-workflow
  ↓
agent-competitor-workflow:
  Step 1: POST /mcp-firecrawl-tool
    → Klavis Firecrawl MCP API
    ← Returns: [
        { brand: "GlowSkin", meta_ads_url: "...", video_url: "..." },
        { brand: "PureGlow", meta_ads_url: "...", video_url: "..." },
        { brand: "DermLux", meta_ads_url: "...", video_url: "..." }
      ]
    → Log to agent_execution_logs (step: "Firecrawl Research", status: "success")
    → Publish Realtime update
  
  Step 2: POST /meta-ads-extractor (for each competitor)
    → Scrape Meta Ads Library page
    ← Returns: { copy: "...", cta: "Shop Now", audience: "25-45, Female" }
    → Log to agent_execution_logs
  
  Step 3: POST /azure-video-analyzer (parallel for all 3 videos)
    → Upload video to Azure Video Indexer
    → Poll status every 10s
    ← Returns: {
        transcript: [...],
        scenes: [...],
        objects: [...],
        sentiment: {...}
      }
    → Log to agent_execution_logs
  
  Step 4: POST /llm-synthesis-engine (for each video)
    Body: {
      video_metadata: {...},
      azure_insights: {...},
      brand_memory: {...}  // User's brand voice/ICP from agent_memory
    }
    → Lovable AI Gateway (google/gemini-2.5-pro)
    ← Returns: {
        hook: {...},
        script: [...],
        cta: {...},
        storytelling_structure: {...},
        conversion_drivers: [...],
        improvements: [...],
        brand_script_template: "..."
      }
    → Log to agent_execution_logs
  
  Step 5: Write results
    → INSERT INTO competitor_videos (all data)
    → UPDATE agent_sessions SET synthesis_output = [...]
    → INSERT INTO agent_memory (type: 'competitor_insight')
    → UPDATE agent_sessions SET state = 'completed', progress = 100
    → Publish Realtime update
  ↓
Frontend receives Realtime update:
  → AgentConsole shows "✅ Workflow complete!"
  → AgentPreview renders CompetitorInsightCard for each competitor
  → User can export results
```

### 3.2 Error Handling Flow

```
If mcp-firecrawl-tool fails:
  → Log error to agent_execution_logs
  → Fallback: Prompt user to manually input competitor URLs
  → Continue workflow with manual URLs

If meta-ads-extractor fails:
  → Log error
  → Use partial data (video URL only)
  → Continue to Azure Video Indexer

If azure-video-analyzer fails:
  → Log error
  → Fallback: Use video file analysis only (no Azure insights)
  → LLM synthesis proceeds with limited data

If llm-synthesis-engine fails:
  → Log error
  → Retry once with simplified prompt
  → If still fails: Store raw data, mark synthesis as "pending_retry"
  → Notify user: "Insights generation failed, raw data saved"

If workflow cancelled by user:
  → agent-workflow-orchestrator receives cancellation request
  → Set agent_sessions.state = 'cancelled'
  → Abort in-progress API calls (where possible)
  → Save partial results
  → Notify user: "Workflow cancelled, partial results saved"
```

## 4. API Authentication & Secrets

### 4.1 Supabase Secrets (Edge Function Environment Variables)

```bash
# Klavis Firecrawl MCP
KLAVIS_MCP_ENDPOINT=https://strata.klavis.ai/mcp/
KLAVIS_MCP_BEARER_TOKEN=ey•••••••••••••••••IRmEi-sY

# Azure Video Indexer
AZURE_VIDEO_INDEXER_ACCOUNT_ID=<azure_account_id>
AZURE_VIDEO_INDEXER_LOCATION=<region>  # e.g., "eastus"
AZURE_VIDEO_INDEXER_API_KEY=<api_key>
# OR (if using Azure AD)
AZURE_TENANT_ID=<tenant_id>
AZURE_CLIENT_ID=<client_id>
AZURE_CLIENT_SECRET=<client_secret>

# Lovable AI (already configured)
LOVABLE_API_KEY=<auto_provisioned>
```

### 4.2 Authentication Flows

**Klavis Firecrawl MCP**:
```typescript
const response = await fetch(KLAVIS_MCP_ENDPOINT, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${KLAVIS_MCP_BEARER_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    method: 'deep_research',
    params: { query: 'DTC skincare brands Meta Ads' }
  })
});
```

**Azure Video Indexer**:
```typescript
// Option 1: API Key
const response = await fetch(
  `https://api.videoindexer.ai/${AZURE_VIDEO_INDEXER_LOCATION}/Accounts/${AZURE_VIDEO_INDEXER_ACCOUNT_ID}/Videos`,
  {
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_VIDEO_INDEXER_API_KEY
    }
  }
);

// Option 2: Azure AD (preferred for production)
const token = await getAzureADToken();  // OAuth2 flow
const response = await fetch('...', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Lovable AI**:
```typescript
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-pro',
    messages: [...]
  })
});
```

## 5. Scalability & Performance Considerations

### 5.1 Parallel Processing
- **Azure Video Analyzer**: Process multiple videos in parallel (use `Promise.all()`)
- **Rate Limiting**: Implement queue for Azure (20 videos/hour limit)

### 5.2 Caching Strategy
- **Firecrawl Results**: Cache competitor data for 24 hours (reduce API calls)
- **Azure Insights**: Cache video insights permanently (videos don't change)
- **LLM Synthesis**: Don't cache (may improve with new brand data)

### 5.3 Cost Optimization
- **Azure Video Indexer**: ~$0.03/minute of video
- **Lovable AI**: ~$0.01-0.05 per request (depending on model)
- **Monthly Budget**: Set per-user limits (e.g., max 10 competitor analyses/month)

### 5.4 Monitoring & Alerting
- **Metrics to Track**:
  - Workflow completion rate (target: >90%)
  - Average execution time per step
  - API failure rates
  - Cost per workflow run
- **Alerts**:
  - API downtime (Klavis, Azure, Lovable AI)
  - Budget threshold exceeded (80%)
  - High error rate (>10%)

## 6. Security & Privacy

### 6.1 Data Isolation
- **RLS Policies**: All tables filtered by `user_id`
- **Session Validation**: Verify user owns session before operations

### 6.2 PII Handling
- **Ad Copy**: May contain PII (customer names, emails)
- **Sanitization**: Strip PII before LLM processing (regex-based)
- **Storage**: Flag sensitive data, auto-delete after 30 days

### 6.3 API Key Protection
- **Secrets**: Never expose in client-side code
- **Rotation**: Implement key rotation schedule (quarterly)
- **Audit**: Log all API key usage to `admin_audit_logs`

## 7. Testing Strategy

### 7.1 Unit Tests
- Each edge function tested independently
- Mock external API responses
- Test error handling paths

### 7.2 Integration Tests
- End-to-end workflow with test data
- Verify database writes
- Check Realtime updates

### 7.3 Load Tests
- Simulate 10 concurrent workflows
- Measure API rate limit handling
- Verify queue system works

## 8. Deployment Plan

1. **Phase 1**: Deploy database schema changes (competitor_videos table)
2. **Phase 2**: Deploy edge functions (one by one, test each)
3. **Phase 3**: Update frontend to trigger new workflow
4. **Phase 4**: Enable for beta users (feature flag)
5. **Phase 5**: Monitor metrics for 1 week
6. **Phase 6**: General availability

## 9. Rollback Plan

If critical issues arise:
1. Feature flag OFF (disable workflow_type='competitor_research' in frontend)
2. Existing agent-stream workflow unaffected
3. Data preserved (competitor_videos table remains)
4. No code rollback needed (isolated architecture)

## 10. Future Architecture Enhancements

- **Multi-Platform**: Add TikTok/YouTube adapters (same workflow pattern)
- **Batch Processing**: Queue system for 10+ competitors
- **Trend Analysis**: Time-series comparison of competitor strategies
- **Video Generation**: Auto-create UGC from synthesis output
- **A/B Testing**: Recommend variants based on competitor insights
