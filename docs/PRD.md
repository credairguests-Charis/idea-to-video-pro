# Product Requirements Document — Agent Mode

## 1. Goal of Agent Mode

Enable fully autonomous, end-to-end ad creation that researches competitors, analyzes trends, generates creative concepts, and produces videos with minimal human intervention. The agent should intelligently infer from stored memory and only ask users when truly uncertain.

## 2. User Stories

### Primary User Story
**As a marketer**, I want to click "Agent Mode" and have the system autonomously:
- Analyze my brand positioning and target audience
- Research competitor ads across Meta, TikTok, and YouTube
- Extract winning hooks, angles, and formats
- Identify current trends in my niche
- Generate multiple video concepts
- Create video scripts with hooks and CTAs
- Produce videos using Sora 2
- Deliver finished ads to my project library

**Without** requiring me to manually research, write scripts, or configure settings.

### Secondary User Stories
- **As a returning user**, I want the agent to remember my brand voice, preferences, and past performance so it improves over time
- **As a user**, I want to see real-time progress of what the agent is doing and why
- **As a user**, I want to be able to review the agent's research and insights before video generation
- **As a user**, I want the agent to ask me clarifying questions only when it cannot infer from memory

## 3. Success Criteria

### Quantitative
- Agent completes full workflow (research → video) in under 5 minutes
- 90% of agent runs complete without user intervention
- Memory retrieval accuracy > 95% for brand preferences
- Tool execution success rate > 98%
- User satisfaction score > 4.5/5

### Qualitative
- Users feel the agent "understands" their brand
- Agent-generated videos match brand voice and style
- Research insights are actionable and relevant
- UI provides transparency into agent reasoning
- Error recovery feels natural, not broken

## 4. Non-Goals (V1)

- ❌ Multi-language support (English only for V1)
- ❌ Custom tool development by users
- ❌ Agent-to-agent collaboration
- ❌ Real-time voice interaction with agent
- ❌ A/B testing within agent mode
- ❌ Social media posting automation
- ❌ Budget optimization algorithms

## 5. Constraints

### Technical Constraints
- Must use existing Supabase infrastructure
- Cannot break existing video generation, bulk generation, or project management features
- Must use Sora 2 API (8-second clips with stitching)
- Memory system must use pgvector for semantic search
- Real-time updates must use Supabase Realtime
- Agent orchestration must be traceable and debuggable

### Business Constraints
- API costs must remain under $5 per agent run
- Execution time must not exceed 10 minutes
- Memory storage per user capped at 10MB
- Tool rate limits must be respected (no user lockouts)

### UX Constraints
- Must maintain existing navigation and sidebar
- Agent Mode must be clearly separated from manual workflow
- Users must be able to cancel agent execution at any time
- All agent actions must be logged and reviewable

## 6. Integration Requirements

### Existing Features That Must Continue Working
- ✅ Manual video generation (NewProjectArcads)
- ✅ Bulk video generation
- ✅ Project workspace and library
- ✅ VideoGenerationTracker
- ✅ All existing UI components and navigation
- ✅ Authentication and subscription system
- ✅ Settings and user preferences

### New Integrations Required
- **MCP Servers**: Meta Ads Library, TikTok Creative Center, YouTube Ads Insights, Video Analysis
- **Tools**: Screenshot tool, Whisper transcription, Sora 2 generation, embedding model
- **Supabase**: Memory tables with RLS, vector search with pgvector, realtime channels
- **Edge Functions**: Agent orchestration, memory read/write, tool execution, status updates

## 7. UX Requirements

### Agent Mode Entry Point
- New "Agent Mode" button in sidebar (distinct from "New Project")
- Opens full-screen agent dashboard
- Clear indication that agent is "thinking" and autonomous

### Real-Time Feedback
- Live console showing agent's current step
- Progress bar with percentage and time estimate
- Expandable step cards showing:
  - Tool being used
  - Raw data fetched
  - Insights extracted
  - Any errors or retries
- Chain-of-thought explanations ("I'm researching competitors because...")

### User Interaction Points
- Agent asks clarifying questions when uncertain (modal or inline)
- User can cancel execution at any time
- User can review research before proceeding to video generation
- User can approve or reject generated scripts

### Results Delivery
- Generated videos appear in project library (existing UI)
- Downloadable research report (competitor analysis + trends)
- Memory updated automatically with insights

## 8. Telemetry & Logging Requirements

### Metrics to Track
- Agent run success/failure rate
- Average execution time per step
- Tool call success rate per tool
- Memory retrieval accuracy
- User intervention frequency
- Error types and frequencies
- Video generation success rate via agent
- User satisfaction (post-run survey)

### Logging Requirements
- All agent actions logged with timestamps
- Tool calls and responses logged (with sanitization)
- Memory reads/writes logged
- User interactions logged
- Errors logged with full context and stack traces
- Performance metrics logged (latency per step)

### Log Storage
- Store in Supabase table: `agent_execution_logs`
- Retention: 90 days
- Admins can view logs in admin dashboard
- Users can view their own logs in agent history

## 9. Autonomy Rules

### Decision-Making Hierarchy
1. **Check memory first**: Brand voice, ICP, past performance, user preferences
2. **Infer from context**: If 80%+ confidence, proceed autonomously
3. **Ask user**: Only if confidence < 80% or critical decision (e.g., budget approval)

### Examples
- ✅ **Autonomous**: Selecting hooks based on competitor analysis + memory
- ✅ **Autonomous**: Choosing video format based on brand memory
- ❓ **Ask User**: If brand memory is empty or contradictory
- ❓ **Ask User**: If multiple equally-weighted options exist
- ❌ **Never Autonomous**: Spending user budget without confirmation

## 10. Success Milestones

### MVP (V1)
- ✅ Agent can execute full workflow autonomously
- ✅ Real-time UI shows agent progress
- ✅ Memory system stores and retrieves brand/user data
- ✅ MCP tools integrate successfully
- ✅ Videos generated via Sora 2 and delivered to library

### V2 (Future)
- Multi-language support
- A/B testing recommendations
- Performance-based memory learning
- Custom tool integration
- Social media posting automation
