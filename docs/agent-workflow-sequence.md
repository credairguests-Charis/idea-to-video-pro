# Agent Competitor Research + Video Analysis - Workflow Sequence

## 1. Workflow Overview

This document defines the exact step-by-step sequence for the Agent Competitor Research workflow, including all API calls, data transformations, error handling, and user interactions.

---

## 2. Workflow Trigger

### 2.1 User Initiates Workflow

**Location**: `AgentMode` page  
**User Action**: Submits prompt via `AgentInput` component

**Example Prompts**:
- "Analyze the top 3 DTC skincare brands running ads on Meta"
- "Research competitor video ads for fitness supplements"
- "Find winning UGC ads in the pet food niche"

**Frontend Logic**:
```typescript
const handleStartAgent = async (prompt: string) => {
  // Create agent session
  const { data: session, error } = await supabase
    .from('agent_sessions')
    .insert({
      user_id: userId,
      state: 'pending',
      workflow_type: 'competitor_research',  // NEW
      metadata: { prompt }
    })
    .select()
    .single();

  // Invoke orchestrator
  await supabase.functions.invoke('agent-workflow-orchestrator', {
    body: {
      session_id: session.id,
      prompt,
      workflow_type: 'competitor_research'
    }
  });
};
```

---

## 3. Workflow Steps (Sequential Execution)

### STEP 0: Initialization

**Edge Function**: `agent-workflow-orchestrator`

**Actions**:
1. Validate user authentication
2. Fetch user's brand memory from `agent_memory` table:
   ```sql
   SELECT * FROM agent_memory 
   WHERE user_id = $1 AND memory_type IN ('brand_voice', 'icp', 'preferences')
   ORDER BY created_at DESC LIMIT 10;
   ```
3. Update session state to "running"
4. Log to `agent_execution_logs`:
   ```json
   {
     "session_id": "...",
     "step_name": "Initialization",
     "status": "success",
     "input_data": { "prompt": "...", "workflow_type": "..." },
     "output_data": { "brand_memory_count": 5 }
   }
   ```
5. Publish Realtime update:
   ```typescript
   supabase.channel('agent-session-{id}').send({
     type: 'broadcast',
     event: 'step_update',
     payload: { step: 'Initialization', status: 'running' }
   });
   ```

**UI Update**: AgentConsole shows "🔄 Initializing workflow..."

---

### STEP 1: Deep Competitor Research (Klavis Firecrawl MCP)

**Edge Function**: `mcp-firecrawl-tool`

**Input**:
```json
{
  "prompt": "Analyze the top 3 DTC skincare brands running ads on Meta",
  "max_competitors": 3
}
```

**API Call**:
```typescript
const response = await fetch('https://strata.klavis.ai/mcp/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${KLAVIS_MCP_BEARER_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'deep_research',
      arguments: {
        query: 'top DTC skincare brands Meta Ads Library active campaigns',
        max_results: 3,
        include_video_urls: true
      }
    }
  })
});
```

**Expected Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found 3 competitor brands with active Meta Ads campaigns"
      },
      {
        "type": "resource",
        "resource": {
          "uri": "competitor://glowskin",
          "name": "GlowSkin",
          "description": "DTC skincare brand targeting 25-40 female",
          "mimeType": "application/json"
        }
      }
    ],
    "competitors": [
      {
        "brand_name": "GlowSkin",
        "meta_ads_library_url": "https://www.facebook.com/ads/library/?id=123456789",
        "video_ads": [
          {
            "ad_id": "123456789",
            "video_url": "https://video.xx.fbcdn.net/...",
            "thumbnail_url": "https://...",
            "ad_copy": "Transform your skin in 30 days...",
            "cta_button": "Shop Now",
            "target_audience": "25-40, Female, US",
            "launch_date": "2024-01-15"
          }
        ]
      },
      {
        "brand_name": "PureGlow",
        "meta_ads_library_url": "https://www.facebook.com/ads/library/?id=987654321",
        "video_ads": [...]
      },
      {
        "brand_name": "DermLux",
        "meta_ads_library_url": "https://www.facebook.com/ads/library/?id=555555555",
        "video_ads": [...]
      }
    ]
  }
}
```

**Data Transformation**:
```typescript
const competitors = response.result.competitors.map(comp => ({
  name: comp.brand_name,
  meta_ads_url: comp.meta_ads_library_url,
  video_ads: comp.video_ads.map(ad => ({
    ad_id: ad.ad_id,
    video_url: ad.video_url,
    thumbnail_url: ad.thumbnail_url,
    metadata: {
      copy: ad.ad_copy,
      cta: ad.cta_button,
      audience: ad.target_audience,
      launch_date: ad.launch_date
    }
  }))
}));
```

**Error Handling**:
- **Timeout (>60s)**: Retry once, then fallback
- **No results**: Return error, prompt user for manual URLs
- **Auth failure (401/403)**: Log error, notify admin

**Database Write**:
```typescript
await supabase
  .from('agent_sessions')
  .update({ 
    competitor_data: competitors,
    current_step: 'Firecrawl Research',
    progress: 20 
  })
  .eq('id', sessionId);
```

**Log Entry**:
```json
{
  "session_id": "...",
  "step_name": "Firecrawl Research",
  "tool_name": "klavis_firecrawl_mcp",
  "status": "success",
  "duration_ms": 25000,
  "input_data": { "prompt": "...", "max_competitors": 3 },
  "output_data": { "competitors_found": 3, "total_video_ads": 5 }
}
```

**UI Update**: AgentConsole shows "✅ Found 3 competitors with 5 video ads"

---

### STEP 2: Meta Ads Library Data Extraction

**Edge Function**: `meta-ads-extractor`

**Input**: For each competitor's Meta Ads Library URL

**Logic**:
```typescript
for (const competitor of competitors) {
  for (const videoAd of competitor.video_ads) {
    // Already have video_url + metadata from Firecrawl
    // Optionally: Enrich with additional scraping if needed
    
    // Validate video URL
    const videoValid = await validateVideoUrl(videoAd.video_url);
    if (!videoValid) {
      console.error(`Invalid video URL for ${competitor.name}`);
      continue;
    }

    // Store in temporary array for next step
    videosToAnalyze.push({
      competitor_name: competitor.name,
      ad_id: videoAd.ad_id,
      video_url: videoAd.video_url,
      metadata: videoAd.metadata
    });
  }
}
```

**Database Write**:
```typescript
await supabase
  .from('agent_sessions')
  .update({ 
    current_step: 'Meta Ads Extraction',
    progress: 35 
  })
  .eq('id', sessionId);
```

**UI Update**: AgentConsole shows "📊 Extracted metadata for 5 video ads"

---

### STEP 3: Azure Video Indexer Processing (Parallel)

**Edge Function**: `azure-video-analyzer`

**Input**: Array of video URLs from Step 2

**Processing Strategy**:
- Process up to 3 videos in parallel (Azure rate limit: 20/hour)
- Queue remaining videos if >3

**For Each Video**:

#### 3.1 Upload Video to Azure Video Indexer

```typescript
const uploadResponse = await fetch(
  `https://api.videoindexer.ai/${AZURE_VIDEO_INDEXER_LOCATION}/Accounts/${AZURE_VIDEO_INDEXER_ACCOUNT_ID}/Videos`,
  {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_VIDEO_INDEXER_API_KEY,
      'Content-Type': 'multipart/form-data'
    },
    body: formData  // Contains video file or URL
  }
);

const { id: videoId } = await uploadResponse.json();
```

#### 3.2 Poll for Processing Completion

```typescript
let processingComplete = false;
let attempts = 0;
const maxAttempts = 60;  // 10 minutes max

while (!processingComplete && attempts < maxAttempts) {
  const statusResponse = await fetch(
    `https://api.videoindexer.ai/${AZURE_VIDEO_INDEXER_LOCATION}/Accounts/${AZURE_VIDEO_INDEXER_ACCOUNT_ID}/Videos/${videoId}/Index`,
    {
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_VIDEO_INDEXER_API_KEY
      }
    }
  );

  const status = await statusResponse.json();
  
  if (status.state === 'Processed') {
    processingComplete = true;
  } else if (status.state === 'Failed') {
    throw new Error(`Azure Video Indexer failed: ${status.failureMessage}`);
  } else {
    // Still processing, wait 10s
    await new Promise(resolve => setTimeout(resolve, 10000));
    attempts++;
  }
}
```

#### 3.3 Extract Insights

```typescript
const insightsResponse = await fetch(
  `https://api.videoindexer.ai/${AZURE_VIDEO_INDEXER_LOCATION}/Accounts/${AZURE_VIDEO_INDEXER_ACCOUNT_ID}/Videos/${videoId}/Index?includeStreamingUrls=false`,
  {
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_VIDEO_INDEXER_API_KEY
    }
  }
);

const insights = await insightsResponse.json();
```

**Extracted Data Structure**:
```json
{
  "video_id": "...",
  "duration": "00:00:45",
  "transcript": [
    {
      "id": 1,
      "text": "Are you tired of dull skin?",
      "confidence": 0.95,
      "speakerId": 1,
      "language": "en-US",
      "instances": [
        { "start": "00:00:00", "end": "00:00:03" }
      ]
    },
    ...
  ],
  "scenes": [
    {
      "id": 1,
      "description": "Close-up of woman applying skincare product",
      "start": "00:00:00",
      "end": "00:00:05",
      "keyFrames": [
        { "id": 1, "thumbnailUrl": "...", "timestamp": "00:00:02" }
      ]
    },
    ...
  ],
  "objects": [
    {
      "name": "skincare_bottle",
      "confidence": 0.89,
      "instances": [
        { "start": "00:00:03", "end": "00:00:08" }
      ]
    },
    ...
  ],
  "sentiments": [
    {
      "sentimentKey": "Positive",
      "seenDurationRatio": 0.7,
      "instances": [
        { "start": "00:00:00", "end": "00:00:30" }
      ]
    },
    ...
  ],
  "keywords": [
    { "name": "glowing skin", "appearances": 3 },
    { "name": "natural ingredients", "appearances": 2 }
  ]
}
```

**Database Write** (per video):
```typescript
await supabase
  .from('competitor_videos')
  .insert({
    session_id: sessionId,
    user_id: userId,
    competitor_name: video.competitor_name,
    meta_ads_url: video.meta_ads_url,
    video_url: video.video_url,
    video_metadata: video.metadata,
    azure_insights: insights
  });
```

**Log Entry**:
```json
{
  "session_id": "...",
  "step_name": "Azure Video Analysis",
  "tool_name": "azure_video_indexer",
  "status": "success",
  "duration_ms": 180000,  // 3 minutes
  "input_data": { "video_url": "...", "competitor_name": "GlowSkin" },
  "output_data": { 
    "transcript_word_count": 150,
    "scenes_count": 8,
    "objects_detected": 12,
    "sentiment": "Positive (70%)"
  }
}
```

**UI Update**: AgentConsole shows "🎬 Processed video 1/5 for GlowSkin"

---

### STEP 4: LLM Synthesis (Per Video)

**Edge Function**: `llm-synthesis-engine`

**Input**:
```json
{
  "competitor_name": "GlowSkin",
  "video_metadata": {
    "ad_copy": "Transform your skin in 30 days...",
    "cta": "Shop Now",
    "audience": "25-40, Female, US"
  },
  "azure_insights": {
    "transcript": [...],
    "scenes": [...],
    "objects": [...],
    "sentiments": [...]
  },
  "brand_memory": {
    "brand_voice": "Professional yet approachable",
    "icp": "Health-conscious women 30-50",
    "past_preferences": [...]
  }
}
```

**LLM Prompt Construction**:
```typescript
const systemPrompt = `You are an expert video ad analyst. Analyze the provided competitor video ad and extract structured insights.

Output must be valid JSON matching this schema:
{
  "hook": {
    "text": "Opening hook text (first 3-5 seconds)",
    "duration_seconds": number,
    "visual_elements": ["element1", "element2"],
    "effectiveness_score": 1-10
  },
  "script": [
    { "timestamp": "00:00:00", "speaker": "Narrator/Actor", "text": "..." },
    ...
  ],
  "cta": {
    "type": "shop_now|learn_more|sign_up|download",
    "text": "Exact CTA text",
    "placement": "end_card|overlay|voiceover",
    "urgency_level": "low|medium|high"
  },
  "storytelling_structure": {
    "problem": "Pain point addressed",
    "solution": "Product benefit highlighted",
    "social_proof": "Testimonials/results shown",
    "emotion": "Primary emotion evoked"
  },
  "editing_style": {
    "pacing": "slow|medium|fast",
    "transitions": ["jump_cut", "fade", "wipe"],
    "text_overlays": boolean,
    "background_music": "upbeat|calm|dramatic|none"
  },
  "conversion_drivers": [
    "emotional_appeal|social_proof|urgency|authority|scarcity"
  ],
  "improvements": [
    "Actionable improvement 1",
    "Actionable improvement 2",
    "Actionable improvement 3"
  ],
  "brand_script_template": "A UGC script template adapted for the user's brand voice and ICP"
}`;

const userPrompt = `Analyze this competitor video ad:

**Competitor**: ${competitor_name}
**Ad Copy**: ${video_metadata.ad_copy}
**CTA**: ${video_metadata.cta}
**Target Audience**: ${video_metadata.audience}

**Video Transcript**:
${azure_insights.transcript.map(t => `[${t.instances[0].start}] ${t.text}`).join('\n')}

**Visual Scenes**:
${azure_insights.scenes.map(s => `[${s.start}-${s.end}] ${s.description}`).join('\n')}

**Detected Objects**: ${azure_insights.objects.map(o => o.name).join(', ')}

**Sentiment**: ${azure_insights.sentiments[0]?.sentimentKey || 'Neutral'}

**User's Brand Context**:
- Brand Voice: ${brand_memory.brand_voice}
- ICP: ${brand_memory.icp}

Extract structured insights following the JSON schema.`;
```

**API Call to Lovable AI**:
```typescript
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-pro',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' }  // Force JSON output
  })
});

const completion = await response.json();
const synthesisOutput = JSON.parse(completion.choices[0].message.content);
```

**Database Write**:
```typescript
await supabase
  .from('competitor_videos')
  .update({ synthesis_output: synthesisOutput })
  .eq('id', videoId);

// Also store in agent_memory for future reference
await supabase
  .from('agent_memory')
  .insert({
    user_id: userId,
    memory_type: 'competitor_insight',
    content: JSON.stringify(synthesisOutput),
    metadata: {
      competitor_name: competitor_name,
      ad_id: video_metadata.ad_id,
      analyzed_at: new Date().toISOString()
    }
    // embedding: <vector> (optional: generate embedding for semantic search)
  });
```

**Log Entry**:
```json
{
  "session_id": "...",
  "step_name": "LLM Synthesis",
  "tool_name": "lovable_ai_gemini_2.5_pro",
  "status": "success",
  "duration_ms": 8000,
  "input_data": { 
    "competitor_name": "GlowSkin",
    "transcript_length": 150,
    "scenes_count": 8
  },
  "output_data": { 
    "hook_effectiveness": 8,
    "conversion_drivers_count": 5,
    "improvements_count": 3
  }
}
```

**UI Update**: AgentConsole shows "🤖 Generated insights for GlowSkin"

---

### STEP 5: Finalization

**Edge Function**: `agent-competitor-workflow`

**Actions**:
1. Aggregate all competitor insights
2. Update session state to "completed"
3. Update progress to 100%
4. Publish final Realtime update

**Database Write**:
```typescript
await supabase
  .from('agent_sessions')
  .update({
    state: 'completed',
    progress: 100,
    current_step: 'Completed',
    completed_at: new Date().toISOString(),
    synthesis_output: {
      competitors_analyzed: competitors.length,
      total_videos: videosAnalyzed.length,
      insights_generated: true
    }
  })
  .eq('id', sessionId);
```

**Log Entry**:
```json
{
  "session_id": "...",
  "step_name": "Finalization",
  "status": "success",
  "duration_ms": 500,
  "output_data": { 
    "competitors_analyzed": 3,
    "videos_analyzed": 5,
    "total_workflow_duration_ms": 420000  // 7 minutes
  }
}
```

**UI Update**: 
- AgentConsole shows "✅ Workflow complete! Analyzed 3 competitors, 5 video ads"
- AgentPreview renders `CompetitorInsightCard` for each competitor

---

## 4. User Interactions During Workflow

### 4.1 Real-Time Progress Updates

**Realtime Subscription** (Frontend):
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`agent-session-${sessionId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'agent_sessions',
      filter: `id=eq.${sessionId}`
    }, (payload) => {
      setSession(payload.new);
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'agent_execution_logs',
      filter: `session_id=eq.${sessionId}`
    }, (payload) => {
      setLogs(prev => [...prev, payload.new]);
    })
    .subscribe();

  return () => { channel.unsubscribe(); };
}, [sessionId]);
```

**UI Updates**:
- **AgentConsole**: Live log stream
- **AgentTimeline**: Progress bar per step
- **AgentPreview**: Loading skeleton → Competitor cards

### 4.2 Cancellation

**User Action**: Click "Stop" button

**Frontend**:
```typescript
const handleStopAgent = async () => {
  await supabase
    .from('agent_sessions')
    .update({ state: 'cancelled' })
    .eq('id', sessionId);
};
```

**Backend**: `agent-workflow-orchestrator` checks session state before each step:
```typescript
const session = await supabase
  .from('agent_sessions')
  .select('state')
  .eq('id', sessionId)
  .single();

if (session.state === 'cancelled') {
  console.log('Workflow cancelled by user');
  throw new Error('Workflow cancelled');
}
```

---

## 5. Error Recovery Flows

### 5.1 Klavis Firecrawl MCP Failure

**Error**: No competitors found

**Recovery**:
1. Log error to `agent_execution_logs`
2. Show modal to user: "No competitors found. Enter URLs manually?"
3. If user provides URLs, skip Step 1 → proceed to Step 2
4. If user cancels, mark session as "failed"

### 5.2 Azure Video Indexer Failure

**Error**: Video processing timeout (>10 min)

**Recovery**:
1. Log error with video URL
2. Skip Azure insights for this video
3. Continue LLM synthesis with limited data (transcript from Whisper fallback)
4. Mark video as "partial_analysis" in database

### 5.3 LLM Synthesis Failure

**Error**: JSON parsing error or API timeout

**Recovery**:
1. Retry once with simplified prompt
2. If still fails, save raw data
3. Mark synthesis as "pending_retry" in database
4. Show user: "Insights generation failed for 1 video. Retry?"

---

## 6. Success Criteria

| Metric | Target | Actual (After Implementation) |
|--------|--------|-------------------------------|
| Workflow completion rate | >90% | TBD |
| Average execution time | <5 min | TBD |
| Firecrawl success rate | >95% | TBD |
| Azure Video Indexer success rate | >90% | TBD |
| LLM synthesis success rate | >98% | TBD |
| User satisfaction | 4+/5 | TBD |

---

## 7. Next Steps

After completing the workflow sequence:

1. **Review & Approve**: User/stakeholder sign-off on PRD, Architecture, Workflow
2. **API Documentation Research**: Read official docs for Klavis, Azure, Lovable AI
3. **Implementation Phase**: Build edge functions, database schema, UI components
4. **Testing Phase**: Unit tests, integration tests, end-to-end tests
5. **Beta Release**: Enable for 5-10 beta users, collect feedback
6. **General Availability**: Roll out to all users

---

**STATUS**: ⏸️ Workflow sequence complete. Awaiting approval to proceed with implementation.
