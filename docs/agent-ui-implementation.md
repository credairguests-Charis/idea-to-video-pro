# Agent Mode UI Implementation

## Overview

The **Agent Mode UI** provides a real-time interface for monitoring and interacting with the autonomous competitor research workflow orchestrator. It displays live execution logs, step-by-step progress, and final synthesis results.

## Architecture

### Layout (Non-Negotiable 2-Column Design)

```
┌─────────────────────────────────────────────────────────────┐
│  Header (Session Info, Stop Button)                        │
├──────────────────────┬──────────────────────────────────────┤
│  Left Column         │  Right Column                        │
│  (460px fixed width) │  (Flexible width)                    │
│                      │                                      │
│  ┌────────────────┐  │  ┌────────────────────────────────┐ │
│  │  Console Tab   │  │  │                                │ │
│  │  Timeline Tab  │  │  │    Preview Panel               │ │
│  ├────────────────┤  │  │                                │ │
│  │                │  │  │  • Synthesis Results           │ │
│  │  Step Cards    │  │  │  • UGC Scripts                 │ │
│  │  with Status   │  │  │  • Ad Analysis                 │ │
│  │                │  │  │  • Insights & Trends           │ │
│  │  • Progress    │  │  │  • Recommendations             │ │
│  │  • Icons       │  │  │                                │ │
│  │  • Expandable  │  │  │  (Tabbed Interface)            │ │
│  │                │  │  │                                │ │
│  └────────────────┘  │  └────────────────────────────────┘ │
│  ┌────────────────┐  │                                      │
│  │  Input Form    │  │                                      │
│  └────────────────┘  │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

## Components

### 1. AgentMode.tsx (Main Page)
- **Location**: `/src/pages/AgentMode.tsx`
- **Purpose**: Orchestrates the entire agent workflow UI
- **Features**:
  - Manages workflow session state
  - Subscribes to Supabase real-time updates
  - Handles workflow execution via `agent-workflow` edge function
  - Coordinates left panel (console) and right panel (preview)

### 2. WorkflowStepCard.tsx
- **Location**: `/src/components/agent/WorkflowStepCard.tsx`
- **Purpose**: Displays individual workflow steps with expandable details
- **Features**:
  - Step-specific icons and colors
  - Status indicators (running, completed, failed)
  - Progress bars for running steps
  - Expandable input/output data
  - Duration tracking
  - Error message display

**Step Metadata:**
```typescript
{
  deep_research: {
    label: "Deep Research",
    icon: Telescope,
    description: "Discovering competitors and Meta Ads campaigns",
    color: "text-blue-500",
  },
  meta_ads_extraction: {
    label: "Meta Ads Extraction",
    icon: Image,
    description: "Extracting ad creative data and video URLs",
    color: "text-purple-500",
  },
  video_analysis: {
    label: "Video Analysis",
    icon: Video,
    description: "Processing videos via Azure Video Indexer",
    color: "text-orange-500",
  },
  llm_synthesis: {
    label: "LLM Synthesis",
    icon: Sparkles,
    description: "Generating final insights and UGC scripts",
    color: "text-green-500",
  },
}
```

### 3. AgentConsole.tsx
- **Location**: `/src/components/agent/AgentConsole.tsx`
- **Purpose**: Live console displaying workflow execution
- **Features**:
  - Groups logs by workflow step
  - Displays step cards with status
  - Auto-scrolls to bottom with new logs
  - Shows "scroll to bottom" button when scrolled up
  - Overall progress bar
  - Active step indicator with pulse animation

### 4. AgentInput.tsx
- **Location**: `/src/components/agent/AgentInput.tsx`
- **Purpose**: Form for starting agent workflow
- **Features**:
  - Brand name and product category inputs
  - Target audience and brand voice fields
  - Key messages (comma-separated)
  - Competitor query textarea
  - Submit button with loading state
  - Form validation

### 5. AgentPreview.tsx
- **Location**: `/src/components/agent/AgentPreview.tsx`
- **Purpose**: Displays final synthesis results
- **Features**:
  - Tabbed interface (Scripts, Analysis, Insights, Trends)
  - UGC script cards with hooks and CTAs
  - Ad analysis with video previews
  - Market insights and opportunities
  - Recommendations and competitive advantages
  - Summary statistics

## Real-Time Updates

### Supabase Channels

The UI subscribes to two Supabase channels for real-time updates:

```typescript
// 1. Session updates (progress, state, current step)
supabase
  .channel(`agent-session:${sessionId}`)
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "agent_sessions",
      filter: `id=eq.${sessionId}`,
    },
    (payload) => {
      setSession(payload.new as AgentSession);
      // Update progress bar and state
    }
  )
  .subscribe();

// 2. Execution logs (step completion, tool output)
supabase
  .channel(`agent-logs:${sessionId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "agent_execution_logs",
      filter: `session_id=eq.${sessionId}`,
    },
    (payload) => {
      setLogs((prev) => [...prev, payload.new as AgentLog]);
      // Add new log to console
    }
  )
  .subscribe();
```

## Workflow Execution Flow

### 1. User Input
```typescript
{
  brandName: "Acme Corp",
  productCategory: "SaaS",
  targetAudience: "B2B marketers",
  brandVoice: "Professional, friendly",
  keyMessages: ["Fast", "Reliable", "Secure"],
  competitorQuery: "marketing automation SaaS competitors",
  maxCompetitors: 3,
}
```

### 2. Agent Workflow Invocation
```typescript
const { data, error } = await supabase.functions.invoke("agent-workflow", {
  body: { input: workflowInput }
});
```

### 3. Real-Time Log Stream
```
[Step 1] Deep Research - Running...
  → Accessing Firecrawl MCP...
  → Found 3 competitors
  → Status: Completed (35s)

[Step 2] Meta Ads Extraction - Running...
  → Fetching Meta ads for Competitor A...
  → Fetching Meta ads for Competitor B...
  → Extracted 8 ads total
  → Status: Completed (12s)

[Step 3] Video Analysis - Running...
  → Uploading video to Azure...
  → Processing video insights...
  → Analyzing transcripts and scenes...
  → Status: Completed (142s)

[Step 4] LLM Synthesis - Running...
  → Generating UGC scripts...
  → Analyzing conversion factors...
  → Creating recommendations...
  → Status: Completed (18s)
```

### 4. Final Output Display
- **Scripts Tab**: UGC script recommendations with hooks, CTAs, visual guidelines
- **Analysis Tab**: Individual ad analyses with effectiveness scores
- **Insights Tab**: Market trends, opportunity gaps, competitive advantages
- **Trends Tab**: Summary statistics and key patterns

## Visual States

### Step Status Indicators

| Status | Icon | Color | Description |
|--------|------|-------|-------------|
| Running | Spinning loader | Primary | Step is currently executing |
| Completed | Check circle | Green | Step completed successfully |
| Failed | X circle | Destructive | Step failed with error |
| Pending | Clock | Muted | Step not started yet |

### Progress Visualization

1. **Overall Progress Bar**: Shows total workflow progress (0-100%)
2. **Step-Level Progress**: Individual progress for running steps
3. **Active Step Indicator**: Pulsing card showing current step
4. **Completion Status**: Success/failure badges

## Styling Guidelines

### Design System Tokens

All colors use HSL semantic tokens from `index.css`:
- `--primary`: Main brand color
- `--foreground`: Primary text
- `--muted-foreground`: Secondary text
- `--border`: Borders and dividers
- `--card`: Card backgrounds
- `--success`: Green for completed states
- `--destructive`: Red for errors

### Animations

```css
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
```

Applied to new log entries for smooth appearance.

## User Experience

### Auto-Scroll Behavior
- Console automatically scrolls to bottom when new logs arrive
- "Scroll to bottom" button appears when user scrolls up
- Auto-scroll resumes when near bottom
- Prevents jarring jumps during manual scrolling

### Loading States
1. **No Session**: Placeholder with "Ready to Start" message
2. **Initializing**: Spinning loader with "Initializing Workflow"
3. **Running**: Active step cards with progress bars
4. **Completed**: Success message with full results
5. **Failed**: Error state with detailed error messages

### Error Handling
- Inline error messages in step cards
- Toast notifications for critical failures
- Detailed error information in expanded view
- Retry information displayed when applicable

## Testing

### Test Workflow Execution

1. Navigate to `/app/agent-mode`
2. Fill in the brand input form:
   - Brand Name: "Test Brand"
   - Product Category: "SaaS"
   - Target Audience: "Developers"
   - Brand Voice: "Technical, friendly"
   - Key Messages: "Fast, Reliable, Secure"
   - Competitor Query: "developer tools SaaS"
3. Click "Start Agent Workflow"
4. Observe real-time logs in console
5. Wait for completion (~2-5 minutes)
6. Review synthesis results in preview panel

### Monitor Real-Time Updates

Open browser DevTools and watch:
```javascript
// In browser console
const channel = supabase.channel('agent-session:YOUR_SESSION_ID');
channel.subscribe((status) => {
  console.log('Channel status:', status);
});
```

## Performance

### Typical Workflow Duration
- Deep Research: 30-60 seconds
- Meta Ads Extraction: 5-15 seconds
- Video Analysis: 60-180 seconds
- LLM Synthesis: 10-30 seconds
- **Total**: 2-5 minutes

### UI Responsiveness
- Real-time updates appear within 100-300ms
- Progress bars update smoothly
- No UI blocking during workflow execution
- Smooth animations and transitions

## Next Steps

1. ✅ Real-time workflow console with step cards
2. ✅ Live progress tracking and status indicators
3. ✅ Synthesis results preview with tabs
4. ⏳ Export synthesis results to project
5. ⏳ Retry failed steps manually
6. ⏳ Save and resume workflow sessions
7. ⏳ Advanced analytics dashboard
