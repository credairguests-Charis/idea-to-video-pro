# Agent Workflow - Final Integration Documentation

## System Overview

The Agent Workflow system is a complete autonomous pipeline for competitor ad analysis, integrating four major components into a seamless workflow that generates actionable UGC video scripts based on competitor research.

## Architecture

### High-Level Flow
```
User Input (Brand Data + Query)
    ↓
Agent Workflow Orchestrator (Edge Function)
    ↓
┌─────────────────────────────────────────────┐
│ Step 1: Deep Research (Firecrawl MCP)      │
│ - Discovers competitors                     │
│ - Extracts Meta Ads Library URLs           │
│ - Returns structured competitor data        │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Step 2: Meta Ads Extraction                │
│ - Fetches ad creatives                     │
│ - Extracts video URLs, copy, CTAs         │
│ - Returns ad metadata                       │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Step 3: Video Analysis (Azure)             │
│ - Uploads videos to Azure Video Indexer   │
│ - Extracts transcripts, scenes, objects    │
│ - Returns video insights                   │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Step 4: LLM Synthesis (Lovable AI)         │
│ - Merges all data sources                  │
│ - Generates UGC scripts                     │
│ - Provides actionable recommendations      │
└─────────────────────────────────────────────┘
    ↓
Final Output (Structured JSON)
    ↓
UI (Real-time Preview)
```

## Component Integration

### 1. Firecrawl MCP Integration
**Location**: `src/services/agent/firecrawl-mcp/`
**Edge Function**: `supabase/functions/mcp-firecrawl-tool/`

**Purpose**: Performs deep web research to discover competitors and extract Meta Ads Library URLs.

**Input**:
```typescript
{
  query: string;           // "marketing automation SaaS competitors"
  max_results: number;     // 3-5 competitors
}
```

**Output**:
```typescript
{
  success: boolean;
  data: {
    query: string;
    competitors: CompetitorBrand[];
    timestamp: string;
  }
}
```

**Integration Points**:
- Called by orchestrator in Step 1
- Results stored in workflow state
- Logs execution to `agent_execution_logs`
- Broadcasts progress via Supabase real-time

### 2. Meta Ads Extractor Integration
**Location**: `src/services/agent/meta-ads/`
**Edge Function**: `supabase/functions/meta-ads-extractor/`

**Purpose**: Extracts ad creative data from Meta Ads Library URLs.

**Input**:
```typescript
{
  url: string;            // Meta Ads Library URL
  session_id: string;     // For logging
}
```

**Output**:
```typescript
{
  success: boolean;
  creative: {
    ad_archive_id: string;
    page_name: string;
    media_type: string;
    body_text: string;
    caption: string;
    video_url: string;
    cta_text: string;
    link_url: string;
  }
}
```

**Integration Points**:
- Called once per competitor in Step 2
- Results aggregated into array
- Handles missing/invalid URLs gracefully
- Logs each extraction attempt

### 3. Azure Video Indexer Integration
**Location**: `src/services/agent/video-indexer/`
**Edge Function**: `supabase/functions/azure-video-analyzer/`

**Purpose**: Analyzes video content to extract transcripts, scenes, objects, and insights.

**Input**:
```typescript
{
  videoUrl: string;         // Video URL from Meta ads
  videoName: string;        // Unique identifier
  sessionId: string;        // For logging
  waitForCompletion: boolean; // Wait for processing
}
```

**Output**:
```typescript
{
  success: boolean;
  insights: {
    transcript: Transcript[];
    scenes: Scene[];
    faces: Face[];
    keywords: string[];
    topics: Topic[];
    emotions: Emotion[];
    brands: Brand[];
  }
}
```

**Integration Points**:
- Called once per video in Step 3
- Polling mechanism for processing status
- Timeout handling (5 minutes default)
- Logs upload and processing steps

### 4. LLM Synthesis Integration
**Location**: `src/services/agent/llm-synthesizer/`
**Edge Function**: `supabase/functions/llm-synthesis-engine/`

**Purpose**: Synthesizes all data into actionable UGC scripts and recommendations.

**Input**:
```typescript
{
  brandMemory: BrandMemory;
  competitorData: CompetitorResearchData;
  metaAds: MetaAdCreative[];
  videoInsights: VideoInsights[];
}
```

**Output**:
```typescript
{
  success: boolean;
  output: {
    ugcScripts: UGCScript[];
    adAnalyses: AdAnalysis[];
    marketInsights: MarketInsights;
    recommendations: string[];
  }
}
```

**Integration Points**:
- Called in Step 4 with all aggregated data
- Uses Lovable AI (google/gemini-2.5-flash)
- Structured output via prompt engineering
- Final result stored in session metadata

## State Management

### Database Tables

#### agent_sessions
```sql
CREATE TABLE agent_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  state TEXT NOT NULL,           -- 'running', 'completed', 'failed', 'cancelled'
  current_step TEXT,              -- Current workflow step
  progress INTEGER,               -- 0-100
  metadata JSONB,                 -- Input, intermediate data, final synthesis
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

#### agent_execution_logs
```sql
CREATE TABLE agent_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES agent_sessions(id),
  step_name TEXT NOT NULL,        -- 'deep_research', 'meta_ads_extraction', etc.
  tool_name TEXT,                 -- 'firecrawl_mcp', 'meta_ads_extractor', etc.
  status TEXT NOT NULL,           -- 'running', 'completed', 'failed'
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Real-time Updates

**Supabase Realtime Subscriptions**:
```typescript
// Subscribe to session updates
supabase
  .channel(`agent-session:${sessionId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'agent_sessions',
    filter: `id=eq.${sessionId}`
  }, (payload) => {
    // Update UI with new session state
  })
  .subscribe();

// Subscribe to execution logs
supabase
  .channel(`agent-session:${sessionId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'agent_execution_logs',
    filter: `session_id=eq.${sessionId}`
  }, (payload) => {
    // Add new log to console
  })
  .subscribe();
```

## Error Handling & Recovery

### Error Categories

1. **Validation Errors**
   - Missing required inputs
   - Invalid data types
   - **Handling**: Return 400 error immediately

2. **Network Errors**
   - API timeouts
   - Connection failures
   - **Handling**: Retry with exponential backoff (max 2 retries)

3. **Data Errors**
   - No competitors found
   - Empty results
   - **Handling**: Log warning, continue workflow with empty data

4. **Processing Errors**
   - Step execution failure
   - LLM synthesis failure
   - **Handling**: Mark session as failed, log error details

### Retry Logic

```typescript
// Implemented in orchestrator
maxRetries: 2
retryDelay: 3000ms
```

### Graceful Degradation

- **No competitors found**: Continue with empty data, inform user
- **No Meta ads**: Continue without ads, synthesis uses available data
- **No videos**: Skip video analysis, synthesis uses competitor + ads data
- **Partial failures**: Complete workflow with available data

## Performance Optimization

### Caching Strategy
- **Competitor data**: Cache for 24 hours
- **Meta ads**: Cache for 6 hours
- **Video insights**: Cache indefinitely (expensive operation)

### Parallel Processing
- Meta ads extraction: Sequential (rate limit concerns)
- Video analysis: Sequential (resource intensive)
- Consider future parallelization with queue system

### Resource Management
- Maximum concurrent workflows: 10
- Database connection pooling: Enabled
- Edge function timeout: 300 seconds

## Monitoring & Observability

### Key Metrics
- Workflow completion rate
- Average execution time per step
- Error rate by step
- API usage and costs
- Real-time connection stability

### Logging
- All steps logged to `agent_execution_logs`
- Edge function console logs
- Error tracking with full stack traces

### Alerts
- Workflow failures > 10% in 1 hour
- API rate limit reached
- Database connection issues
- Real-time subscription failures

## Security

### API Key Management
- All keys stored as Supabase secrets
- Never exposed to client-side
- Rotated regularly

### Data Privacy
- User data isolated by user_id
- No PII stored in logs
- Competitor data anonymized where possible

### Rate Limiting
- Respect upstream API limits
- Implement backoff strategies
- Monitor usage patterns

## Deployment

### Edge Functions
All edge functions deploy automatically via Lovable:
- `agent-workflow` - Main orchestrator
- `mcp-firecrawl-tool` - Deep research
- `meta-ads-extractor` - Ad extraction
- `azure-video-analyzer` - Video analysis
- `llm-synthesis-engine` - LLM synthesis

### Database Migrations
All schema changes applied via Supabase migrations:
- `agent_sessions` table
- `agent_execution_logs` table
- Indexes and constraints

### Frontend
- React components in `/components/agent/`
- Agent Mode page at `/pages/AgentMode.tsx`
- Real-time updates via Supabase client

## Usage Guide

### Starting a Workflow
1. Navigate to `/app/agent-mode`
2. Fill in brand information form
3. Enter competitor query
4. Click "Start Agent Workflow"
5. Monitor progress in Console tab
6. View results in Preview panel

### Interpreting Results
- **UGC Scripts**: Ready-to-use video scripts with hooks, body, CTAs
- **Ad Analyses**: Detailed breakdown of competitor ads
- **Market Insights**: Trends and patterns across competitors
- **Recommendations**: Actionable next steps

### Exporting Results
- Preview panel displays structured JSON
- Copy sections as needed
- Future: PDF/CSV export functionality

## Troubleshooting

### Workflow Stuck
1. Check edge function logs in Supabase dashboard
2. Verify API connectivity (Firecrawl, Azure, Lovable AI)
3. Check Supabase real-time status
4. Review execution logs for last completed step

### Real-time Updates Not Showing
1. Check browser console for connection errors
2. Verify Supabase real-time enabled
3. Check network tab for websocket connections
4. Refresh page to reconnect

### Synthesis Fails
1. Verify LOVABLE_API_KEY is configured
2. Check token limits (4096 max)
3. Review input data completeness
4. Check edge function logs for specific error

## Future Enhancements

### Phase 2
- [ ] Parallel processing for ads/videos
- [ ] Result caching layer
- [ ] PDF/CSV export
- [ ] Workflow templates
- [ ] Historical analysis

### Phase 3
- [ ] Multi-brand comparison
- [ ] Trend analysis over time
- [ ] Automated recommendations
- [ ] Integration with video generation
- [ ] Scheduling and automation

## Support & Maintenance

### Regular Maintenance
- Monitor API usage and costs
- Review error logs weekly
- Update dependencies monthly
- Optimize slow queries
- Refresh caches as needed

### User Support
- Comprehensive documentation
- Example queries and results
- Troubleshooting guides
- Direct support channel

## Conclusion

The Agent Workflow system is a robust, production-ready solution for autonomous competitor ad analysis. It integrates multiple AI services into a cohesive pipeline that delivers actionable insights and ready-to-use UGC scripts. The system is designed for reliability, observability, and extensibility, with comprehensive error handling and real-time feedback.

**System Status**: ✅ Production Ready
**Last Updated**: 2025-11-24
**Version**: 1.0.0
