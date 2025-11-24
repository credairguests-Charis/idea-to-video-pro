# Agent Competitor Research + Video Analysis - Product Requirements Document

## 1. Executive Summary

This PRD defines the integration of an automated competitor ad research and video analysis workflow into the existing Agent Mode. The system will leverage the Klavis AI Firecrawl Deep Research MCP Server, Meta Ads Library data, Azure Video Indexer, and LLM synthesis to autonomously discover, analyze, and extract actionable insights from competitor video ads.

## 2. Problem Statement

Currently, the agent mode has placeholders for competitor research but lacks:
- **Automated competitor discovery**: Manual competitor URL collection is time-consuming
- **Deep ad analysis**: No automated video content extraction beyond basic metadata
- **Structured insights**: No unified format for ad hooks, scripts, CTAs, and conversion drivers
- **Scalable research**: Cannot process multiple competitors simultaneously

## 3. Goals & Success Metrics

### Primary Goals
1. Enable fully autonomous competitor ad research via Klavis Firecrawl MCP
2. Extract rich video insights via Azure Video Indexer (transcript, scenes, objects, sentiment)
3. Synthesize actionable creative briefs via LLM layer (GPT-4.1 equivalent)
4. Maintain existing functionality without breaking changes

### Success Metrics
- **Workflow Completion Rate**: >90% successful end-to-end execution
- **Data Quality**: >85% accuracy in hook/CTA extraction (human-validated sample)
- **Execution Time**: Complete workflow in <5 minutes per competitor
- **User Satisfaction**: Agent-generated insights rated 4+/5 by users

## 4. User Stories

### Primary User Story
**As a marketer**, I want the agent to autonomously research my top 3 competitors, analyze their video ads, and generate creative briefs so I can quickly understand what's working in my niche without manual research.

### Secondary User Stories
- **As a user**, I want real-time progress updates showing which step the agent is executing
- **As a user**, I want structured outputs (hook, script, CTA, insights) in a downloadable format
- **As a user**, I want the agent to ask clarifying questions if competitor data is ambiguous

## 5. Functional Requirements

### 5.1 Klavis Firecrawl Deep Research Integration

**FR-1.1**: The system SHALL accept a text prompt describing competitor/niche (e.g., "DTC skincare brands on Meta Ads")

**FR-1.2**: The system SHALL use the Klavis Firecrawl MCP server endpoint:
- Endpoint: `https://strata.klavis.ai/mcp/`
- Authentication: Bearer token via custom headers
- Request format: MCP-compliant JSON

**FR-1.3**: The system SHALL extract from Firecrawl response:
- Competitor brand names
- Meta Ads Library URLs
- Ad metadata (copy, CTA, audience)
- Video download URLs

**FR-1.4**: The system SHALL handle Firecrawl errors:
- Timeout (>60s): Retry once, then fallback to manual URL input
- Auth failure: Prompt user to check MCP credentials
- No results: Ask user to refine search query

### 5.2 Meta Ads Library Data Extraction

**FR-2.1**: The system SHALL extract from Meta Ads Library URLs:
- Video file URL (mp4)
- Ad copy/headline
- CTA button text
- Target audience (if available)
- Launch date and status

**FR-2.2**: The system SHALL validate video files:
- Format: MP4, MOV, or WebM
- Max size: 500MB
- Duration: 5s - 180s

### 5.3 Azure Video Indexer Integration

**FR-3.1**: The system SHALL authenticate with Azure Video Indexer:
- Use Azure AD service principal or API key
- Store credentials in Supabase secrets

**FR-3.2**: The system SHALL upload video to Azure Video Indexer and extract:
- **Transcript**: Full speech-to-text with timestamps
- **Scenes**: Scene boundaries and descriptions
- **Objects**: Visual objects detected per frame
- **Shot changes**: Editing cut points
- **Speaker segments**: Speaker diarization (if multiple speakers)
- **Sentiment**: Audio tone analysis (positive/negative/neutral)
- **Keywords**: Auto-extracted topics

**FR-3.3**: The system SHALL handle Azure Video Indexer processing:
- Poll status every 10s until "Processed" state
- Timeout after 10 minutes
- Extract insights JSON via API

### 5.4 LLM Synthesis Layer

**FR-4.1**: The system SHALL use Lovable AI (google/gemini-2.5-pro or gpt-4.1 equivalent) to synthesize:
- **Hook**: Opening 3-5 seconds analysis
- **Full Script**: Timestamped script with speaker notes
- **CTA Analysis**: Type (shop now, learn more), placement, urgency
- **Storytelling Structure**: Problem → Solution → CTA flow
- **Editing Style**: Pacing, transitions, text overlays
- **Conversion Drivers**: What makes the ad effective
- **Improvement Opportunities**: 3-5 actionable recommendations
- **Brand-Aligned UGC Script**: New script template based on user's brand memory

**FR-4.2**: The system SHALL structure LLM output as JSON:
```json
{
  "hook": { "text": "...", "duration_seconds": 3, "visual_elements": [...] },
  "script": [
    { "timestamp": "00:00", "speaker": "Narrator", "text": "..." },
    ...
  ],
  "cta": { "type": "shop_now", "placement": "end_card", "urgency_level": "high" },
  "storytelling_structure": { "problem": "...", "solution": "...", "social_proof": "..." },
  "editing_style": { "pacing": "fast", "transitions": ["jump_cut", "fade"], "text_overlays": true },
  "conversion_drivers": ["emotional_appeal", "social_proof", "urgency"],
  "improvements": ["...", "...", "..."],
  "brand_script_template": "..."
}
```

### 5.5 Workflow Orchestration

**FR-5.1**: The system SHALL execute steps sequentially:
1. Accept user prompt
2. Create agent session in `agent_sessions` table
3. Call Klavis Firecrawl MCP
4. Extract Meta Ads data
5. Process video via Azure Video Indexer
6. Synthesize insights via LLM
7. Store results in `agent_memory` table
8. Update session state to "completed"

**FR-5.2**: The system SHALL log each step to `agent_execution_logs` table with:
- Step name
- Status (running/success/error)
- Input data
- Output data
- Duration (ms)
- Error message (if failed)

**FR-5.3**: The system SHALL support cancellation:
- User can stop agent at any step
- Partial results are saved
- Session state set to "cancelled"

## 6. Non-Functional Requirements

### 6.1 Performance
- **Latency**: Firecrawl MCP response <30s, Azure Video Indexer <5 min, LLM synthesis <30s
- **Concurrency**: Support 5 concurrent agent sessions per user
- **Rate Limits**: Respect Klavis (10 req/min), Azure (20 videos/hour), Lovable AI (100 req/min)

### 6.2 Security
- **Credentials**: Store MCP bearer token, Azure API keys in Supabase secrets
- **RLS**: All agent data isolated by user_id
- **Sanitization**: Strip PII from ad copy before LLM processing

### 6.3 Reliability
- **Error Handling**: Graceful degradation with fallback to manual input
- **Retries**: 1 retry for transient failures (timeouts, 5xx errors)
- **Monitoring**: Log all API failures to admin dashboard

### 6.4 Maintainability
- **Modularity**: Each step (Firecrawl, Azure, LLM) as separate edge function
- **Documentation**: Inline comments for all MCP/API calls
- **Testing**: Unit tests for each workflow step

## 7. Architecture Constraints

### 7.1 Technology Stack
- **Backend**: Supabase Edge Functions (Deno)
- **MCP Integration**: Custom HTTP client for Klavis Firecrawl
- **Video Processing**: Azure Video Indexer REST API
- **LLM**: Lovable AI Gateway (google/gemini-2.5-pro)
- **Database**: Supabase PostgreSQL with existing schema

### 7.2 Existing System Preservation
- **No Breaking Changes**: All new code isolated in `supabase/functions/agent-*` namespace
- **Backward Compatibility**: Existing `agent-stream` function remains unchanged
- **UI Isolation**: New workflow triggered via new agent action type ("competitor_research")

## 8. Data Model Extensions

### 8.1 New Fields in `agent_sessions`
```sql
ALTER TABLE agent_sessions ADD COLUMN workflow_type TEXT DEFAULT 'general'; -- 'competitor_research' or 'general'
ALTER TABLE agent_sessions ADD COLUMN competitor_data JSONB; -- Store Firecrawl results
ALTER TABLE agent_sessions ADD COLUMN video_insights JSONB; -- Store Azure Video Indexer results
ALTER TABLE agent_sessions ADD COLUMN synthesis_output JSONB; -- Store LLM synthesis
```

### 8.2 New Table: `competitor_videos`
```sql
CREATE TABLE competitor_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  competitor_name TEXT NOT NULL,
  meta_ads_url TEXT,
  video_url TEXT NOT NULL,
  video_metadata JSONB, -- Meta Ads data
  azure_insights JSONB, -- Azure Video Indexer output
  synthesis_output JSONB, -- LLM synthesis
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 9. UI/UX Requirements (Not Implemented Yet)

### 9.1 Real-Time Activity Feed
Display in `AgentConsole` component:
- "🔍 Researching competitors via Klavis Firecrawl..."
- "📊 Found 3 competitor ads from Meta Ads Library"
- "🎬 Processing video 1/3 via Azure Video Indexer..."
- "🤖 Synthesizing insights with AI..."
- "✅ Competitor research complete!"

### 9.2 Results Display
New tab in `AgentMode` preview panel:
- **Competitor Cards**: Grid of analyzed ads with thumbnails
- **Insight Panels**: Hook, Script, CTA, Conversion Drivers per ad
- **Export Button**: Download all insights as JSON/PDF

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Klavis MCP downtime | High | Fallback to manual URL input, cache recent results |
| Azure Video Indexer rate limits | Medium | Queue videos, process sequentially, notify user of delay |
| LLM hallucination in synthesis | Medium | Add confidence scores, allow user to regenerate |
| Cost overruns (Azure/LLM) | High | Set per-user monthly limits, alert at 80% usage |

## 11. Success Criteria for MVP

- [ ] Klavis Firecrawl MCP integration working end-to-end
- [ ] Azure Video Indexer successfully extracts transcript + scenes
- [ ] LLM synthesis generates structured JSON output
- [ ] Real-time progress updates in AgentConsole
- [ ] All data stored in database with RLS
- [ ] Error handling for all failure modes
- [ ] No breaking changes to existing features

## 12. Future Enhancements (Post-MVP)

- Multi-platform support (TikTok, YouTube Ads)
- Batch processing (analyze 10+ competitors in parallel)
- Trend analysis (compare ads over time)
- A/B test recommendations based on competitor insights
- Integration with video generation (auto-create UGC from synthesis)

## 13. Stakeholder Sign-Off

| Stakeholder | Role | Approval |
|------------|------|----------|
| User | Product Owner | ✅ Ready to proceed |
| AI Agent | Implementation Lead | 📝 Awaiting architecture review |
