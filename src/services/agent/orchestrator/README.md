# Agent Workflow Orchestrator

The **Agent Workflow Orchestrator** coordinates all MCP tools into a complete autonomous competitor research and creative analysis pipeline.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Workflow Orchestrator                     │
├─────────────────────────────────────────────────────────────┤
│  1. Deep Research (Firecrawl MCP)                          │
│     ↓                                                       │
│  2. Meta Ads Extraction                                     │
│     ↓                                                       │
│  3. Video Analysis (Azure Video Indexer)                    │
│     ↓                                                       │
│  4. LLM Synthesis (GPT-4o / Claude / Llama)                │
│     ↓                                                       │
│  5. Final Output (UGC Scripts + Insights)                   │
└─────────────────────────────────────────────────────────────┘
```

## Features

### ✅ Event-Driven Architecture
- `onStepStart(step)` - Triggered when a step begins
- `onStepComplete(step)` - Triggered when a step succeeds
- `onStepProgress(step, progress)` - Triggered during step execution
- `onError(step, error)` - Triggered when a step fails
- `onWorkflowComplete(state)` - Triggered when workflow succeeds
- `onWorkflowFailed(error, state)` - Triggered when workflow fails

### ✅ State Management
- Real-time state tracking
- Session persistence via Supabase
- Progress tracking (0-100%)
- Error history

### ✅ Retry Logic
- Configurable retry attempts
- Exponential backoff
- Per-step retry tracking

### ✅ Real-Time Updates
- Supabase real-time broadcasting
- Live log streaming to UI
- Progress updates

## Usage

### TypeScript/Frontend

```typescript
import { AgentWorkflowOrchestrator } from "@/services/agent/orchestrator";

const orchestrator = new AgentWorkflowOrchestrator({
  firecrawlEndpoint: process.env.KLAVIS_MCP_ENDPOINT!,
  firecrawlBearerToken: process.env.KLAVIS_MCP_BEARER_TOKEN!,
  azureVideoIndexerApiKey: process.env.AZURE_VIDEO_INDEXER_API_KEY!,
  azureVideoIndexerAccountId: process.env.AZURE_VIDEO_INDEXER_ACCOUNT_ID!,
  azureVideoIndexerLocation: process.env.AZURE_VIDEO_INDEXER_LOCATION!,
  llmApiKey: process.env.OPENAI_API_KEY!,
  
  maxRetries: 2,
  retryDelay: 3000,
  
  eventHandlers: {
    onStepStart: (step, state) => {
      console.log(`Step started: ${step}`);
    },
    onStepComplete: (step, state) => {
      console.log(`Step completed: ${step}`);
    },
    onError: (step, error, state) => {
      console.error(`Step failed: ${step}`, error);
    },
    onWorkflowComplete: (state) => {
      console.log("Workflow completed!", state.finalSynthesis);
    },
  },
});

const result = await orchestrator.execute({
  brandName: "Acme Corp",
  productCategory: "SaaS",
  targetAudience: "B2B marketers",
  brandVoice: "professional, helpful",
  keyMessages: ["Save time", "Increase ROI"],
  competitorQuery: "marketing automation SaaS",
  maxCompetitors: 5,
});

console.log(result.synthesis);
```

### Edge Function (Recommended)

```typescript
const { data, error } = await supabase.functions.invoke("agent-workflow", {
  body: {
    input: {
      brandName: "Acme Corp",
      productCategory: "SaaS",
      targetAudience: "B2B marketers",
      brandVoice: "professional, helpful",
      keyMessages: ["Save time", "Increase ROI"],
      competitorQuery: "marketing automation SaaS",
      maxCompetitors: 5,
      userId: user.id,
    },
  },
});

if (data.success) {
  console.log("Workflow completed:", data.synthesis);
}
```

## Workflow Steps

### Step 1: Deep Research
- **Tool**: Firecrawl MCP Deep Research
- **Input**: Competitor query
- **Output**: List of competitors with Meta Ads URLs
- **Progress**: 0% → 15%

### Step 2: Meta Ads Extraction
- **Tool**: Meta Ads Library Fetcher
- **Input**: Meta Ads URLs from Step 1
- **Output**: Ad creative data (video URLs, copy, CTAs)
- **Progress**: 15% → 35%

### Step 3: Video Analysis
- **Tool**: Azure Video Indexer
- **Input**: Video URLs from Step 2
- **Output**: Transcripts, scenes, sentiment, visual tags
- **Progress**: 35% → 65%

### Step 4: LLM Synthesis
- **Tool**: LLM Synthesizer (GPT-4o)
- **Input**: All previous data
- **Output**: UGC scripts, hooks, insights
- **Progress**: 65% → 100%

## State Schema

```typescript
interface WorkflowState {
  sessionId: string;
  userId: string;
  status: "running" | "completed" | "failed" | "paused";
  currentStep: WorkflowStep;
  progress: number; // 0-100
  
  input: WorkflowInput;
  
  competitorData?: FirecrawlDeepResearchResult;
  metaAdsData?: MetaAdFetchResult[];
  videoInsights?: VideoIndexerResult[];
  finalSynthesis?: SynthesisOutput;
  
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  errors: Array<{
    step: WorkflowStep;
    message: string;
    timestamp: Date;
  }>;
}
```

## Error Handling

The orchestrator implements robust error handling:

1. **Per-Step Retries**: Each step retries up to `maxRetries` times
2. **Exponential Backoff**: Retry delay increases with each attempt
3. **Error Logging**: All errors logged to `agent_execution_logs`
4. **Graceful Degradation**: Workflow continues even if non-critical steps fail
5. **State Persistence**: Error state saved to Supabase

## Real-Time Updates

Enable real-time updates to stream progress to the UI:

```typescript
const supabase = createClient(/* ... */);

const channel = supabase
  .channel(`agent_session:${sessionId}`)
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "agent_sessions",
      filter: `id=eq.${sessionId}`,
    },
    (payload) => {
      console.log("Session updated:", payload.new);
      // Update UI with new progress
    }
  )
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "agent_execution_logs",
      filter: `session_id=eq.${sessionId}`,
    },
    (payload) => {
      console.log("New execution log:", payload.new);
      // Display log in console
    }
  )
  .subscribe();
```

## Testing

```bash
# Test via edge function
curl -X POST https://your-project.supabase.co/functions/v1/agent-workflow \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "brandName": "Test Brand",
      "productCategory": "SaaS",
      "targetAudience": "developers",
      "brandVoice": "technical",
      "keyMessages": ["Fast", "Reliable"],
      "competitorQuery": "developer tools SaaS",
      "maxCompetitors": 3
    }
  }'
```

## Performance

| Step | Typical Duration | Timeout |
|------|-----------------|---------|
| Deep Research | 30-60s | 120s |
| Meta Ads Extraction | 5-15s | 60s |
| Video Analysis | 60-180s | 300s |
| LLM Synthesis | 10-30s | 60s |
| **Total** | **~2-5 minutes** | **~9 minutes** |

## Next Steps

1. ✅ Orchestrator implemented
2. ⏳ UI integration (next phase)
3. ⏳ Real-time streaming console
4. ⏳ Advanced analytics dashboard
