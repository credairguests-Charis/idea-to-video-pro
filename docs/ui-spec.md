# UI/UX Specification — Agent Mode

## 1. Overview

Agent Mode provides a full-screen, real-time dashboard that shows the agent's progress, reasoning, and execution steps. Users can monitor the agent as it autonomously researches, generates, and delivers video ads.

The UI follows a Lovable-style timeline animation with expandable step cards, live logs, and chain-of-thought explanations.

---

## 2. Entry Point

### Location
**Sidebar**: New "Agent Mode" button below "New Project"

### Design
- Icon: 🤖 (robot icon from lucide-react)
- Label: "Agent Mode"
- Badge: "BETA" (optional)
- Hover effect: Highlight with gradient (primary to accent)

### Behavior
- Clicking "Agent Mode" opens full-screen agent dashboard
- If user has never used Agent Mode before, show onboarding modal:
  - "Welcome to Agent Mode"
  - "The agent will autonomously research competitors, analyze trends, and generate videos for you."
  - "You can monitor progress in real-time and approve scripts before generation."
  - Button: "Start Agent Mode"

---

## 3. Agent Mode Dashboard (Full Screen)

### Layout

```
┌─────────────────────────────────────────────────────┐
│ [← Back to Projects]      Agent Mode - Session #123 │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🤖 Agent Status: Researching Competitors      │  │
│  │ Progress: 35% • Step 2 of 8 • 2m 30s elapsed │  │
│  │ ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  └──────────────────────────────────────────────┘  │
│                                                       │
│  ┌──────────────────────────────────────────────┐  │
│  │ Real-Time Execution Log                       │  │
│  ├──────────────────────────────────────────────┤  │
│  │ ✓ Step 1: Analyzed brand memory (95% conf.)  │◄─ Completed
│  │   ├─ Found brand voice: "Professional yet    │  │
│  │   │  approachable"                            │  │
│  │   ├─ ICP: B2B SaaS companies                 │  │
│  │   └─ Reasoning: "Using stored brand memory   │  │
│  │      from previous interactions"             │  │
│  │                                                │  │
│  │ ⏳ Step 2: Researching competitors (running) │◄─ Active
│  │   ├─ Meta Ads Library: Fetching ads...       │  │
│  │   ├─ TikTok Trends: Analyzing trends...      │  │
│  │   └─ YouTube Ads: Searching videos...        │  │
│  │                                                │  │
│  │ ⏸ Step 3: Generating concepts (queued)       │◄─ Queued
│  │ ⏸ Step 4: Generating scripts (queued)        │  │
│  │ ⏸ Step 5: Generating videos (queued)         │  │
│  └──────────────────────────────────────────────┘  │
│                                                       │
│  [Cancel Agent Run]  [Review Progress]              │
└─────────────────────────────────────────────────────┘
```

### Components

#### Header
- **Back Button**: Return to projects page (confirm if agent is running)
- **Session ID**: Display current session ID for reference
- **Timestamp**: Show elapsed time since agent started

#### Status Card
- **Agent Status**: Current step in plain English (e.g., "Researching Competitors")
- **Progress Bar**: Visual progress indicator (0-100%)
- **Progress Text**: "Step X of Y • Xm Ys elapsed"
- **Color Coding**:
  - Blue: Running
  - Green: Completed
  - Yellow: Awaiting user input
  - Red: Error

#### Real-Time Execution Log
- **Step Cards**: Expandable cards for each agent step
- **Status Icons**:
  - ✓ (green checkmark): Completed
  - ⏳ (blue spinner): Running
  - ⏸ (gray): Queued
  - ❌ (red X): Error
- **Expandable Details**: Click to expand and see:
  - Raw tool output
  - Extracted insights
  - Reasoning explanation
  - Errors (if any)

#### Action Buttons
- **Cancel Agent Run**: Stop execution (confirm modal)
- **Review Progress**: Open detailed report modal

---

## 4. Step Card Design

### Collapsed State (Default)

```
┌──────────────────────────────────────────────────┐
│ ✓ Step 1: Analyzed brand memory (95% confidence) │
│   Reasoning: "Using stored brand memory from     │
│   previous interactions"                          │
│                                                    │
│   [▼ View Details]                                │
└──────────────────────────────────────────────────┘
```

### Expanded State

```
┌──────────────────────────────────────────────────┐
│ ✓ Step 1: Analyzed brand memory (95% confidence) │
│                                                    │
│   Reasoning: "Using stored brand memory from     │
│   previous interactions"                          │
│                                                    │
│   ┌─ Raw Memory Data ───────────────────────────┐│
│   │ Brand: TechFlow                             ││
│   │ Voice: Professional yet approachable        ││
│   │ ICP: B2B SaaS companies, 10-500 employees   ││
│   │ Messaging: "Automate your workflow..."      ││
│   └──────────────────────────────────────────────┘│
│                                                    │
│   ┌─ Extracted Insights ─────────────────────────┐│
│   │ • Target audience: B2B SaaS decision-makers ││
│   │ • Tone: Professional but not stuffy         ││
│   │ • Key messaging: Automation + efficiency    ││
│   └──────────────────────────────────────────────┘│
│                                                    │
│   ┌─ Decision Made ──────────────────────────────┐│
│   │ Proceeding with competitor research focused ││
│   │ on B2B SaaS industry                         ││
│   └──────────────────────────────────────────────┘│
│                                                    │
│   [▲ Hide Details]                                │
└──────────────────────────────────────────────────┘
```

### Components

- **Step Title**: Brief description of step
- **Status Icon**: Visual indicator of step status
- **Confidence Score**: (if applicable) percentage confidence
- **Reasoning**: Chain-of-thought explanation ("I'm doing X because Y")
- **Raw Data**: (expandable) Raw tool output
- **Insights**: (expandable) Extracted insights
- **Decision**: (expandable) What the agent decided and why

---

## 5. User Interaction Points

### 1. Clarifying Questions (Modal)

**Trigger**: Agent confidence < 80% and needs user input

**Design**:
```
┌──────────────────────────────────────────────────┐
│ 🤖 Agent Question                                 │
├──────────────────────────────────────────────────┤
│                                                    │
│ I found multiple brand voices in your memory:    │
│  • "Professional and authoritative"              │
│  • "Friendly and conversational"                 │
│                                                    │
│ Which tone should I use for this campaign?       │
│                                                    │
│ ○ Professional and authoritative                 │
│ ○ Friendly and conversational                    │
│ ○ Let the agent decide                           │
│                                                    │
│ [Cancel]  [Submit Answer]                        │
└──────────────────────────────────────────────────┘
```

**Behavior**:
- Modal appears in center of screen (overlay)
- Agent pauses execution until user responds
- User can select option or cancel
- If user doesn't respond in 2 minutes, agent proceeds with best guess

### 2. Script Approval (Modal)

**Trigger**: After Step 4 (script generation)

**Design**:
```
┌──────────────────────────────────────────────────┐
│ 📝 Review Generated Scripts                      │
├──────────────────────────────────────────────────┤
│                                                    │
│ The agent has generated 3 video scripts.         │
│ Please review and approve before proceeding.     │
│                                                    │
│ ┌─ Script 1: Problem-Solution Hook ─────────────┐│
│ │ "Tired of spending 10 hours a week on manual  ││
│ │ data entry? TechFlow automates your workflow  ││
│ │ so you can focus on what matters."            ││
│ │                                                 ││
│ │ [View Full Script] [Approve] [Reject]          ││
│ └─────────────────────────────────────────────────┘│
│                                                    │
│ ┌─ Script 2: Customer Testimonial ──────────────┐│
│ │ "After switching to TechFlow, we saved 20     ││
│ │ hours per week. It's a game-changer."         ││
│ │                                                 ││
│ │ [View Full Script] [Approve] [Reject]          ││
│ └─────────────────────────────────────────────────┘│
│                                                    │
│ [Approve All]  [Regenerate Scripts]  [Cancel]    │
└──────────────────────────────────────────────────┘
```

**Behavior**:
- User can approve, reject, or regenerate scripts
- If "Regenerate", agent goes back to Step 4 with new parameters
- If "Approve", agent proceeds to video generation

### 3. Error Recovery (Modal)

**Trigger**: Tool fails or error occurs

**Design**:
```
┌──────────────────────────────────────────────────┐
│ ⚠️ Agent Encountered an Issue                    │
├──────────────────────────────────────────────────┤
│                                                    │
│ The Meta Ads Library tool failed (rate limit).   │
│                                                    │
│ Options:                                          │
│ ○ Retry (wait 5 minutes)                         │
│ ○ Skip competitor research and proceed           │
│ ○ Cancel agent run                               │
│                                                    │
│ [Cancel]  [Choose Option]                        │
└──────────────────────────────────────────────────┘
```

**Behavior**:
- User can choose recovery strategy
- Agent logs decision and proceeds

---

## 6. Results Delivery

### Success (Modal)

**Trigger**: Agent completes successfully

**Design**:
```
┌──────────────────────────────────────────────────┐
│ 🎉 Agent Mode Complete!                          │
├──────────────────────────────────────────────────┤
│                                                    │
│ The agent has successfully generated 3 videos    │
│ based on your brand and competitor research.     │
│                                                    │
│ ┌─ Video 1: Problem-Solution Hook ──────────────┐│
│ │ [Thumbnail]                                    ││
│ │ Duration: 30s • Format: 9:16 (Portrait)       ││
│ │ [Watch] [Download] [Edit]                     ││
│ └─────────────────────────────────────────────────┘│
│                                                    │
│ ┌─ Research Report ──────────────────────────────┐│
│ │ • Analyzed 50 competitor ads                   ││
│ │ • Top hook: "Stop wasting time on..."         ││
│ │ • Trending format: Problem-Solution           ││
│ │ [Download Report]                              ││
│ └─────────────────────────────────────────────────┘│
│                                                    │
│ [View in Project Library]  [Start New Agent Run] │
└──────────────────────────────────────────────────┘
```

**Behavior**:
- Videos automatically added to project library
- User can watch, download, or edit videos
- Research report available for download (PDF/JSON)
- Option to start new agent run

### Failure (Modal)

**Trigger**: Agent fails and cannot recover

**Design**:
```
┌──────────────────────────────────────────────────┐
│ ❌ Agent Mode Failed                             │
├──────────────────────────────────────────────────┤
│                                                    │
│ The agent encountered a critical error and       │
│ could not complete the workflow.                 │
│                                                    │
│ Error: Sora 2 API timeout (Step 5)               │
│                                                    │
│ Partial results:                                  │
│ • Competitor research: ✓ Complete                │
│ • Scripts: ✓ Complete                            │
│ • Videos: ✗ Failed                               │
│                                                    │
│ [Download Partial Results]  [Retry Agent Run]    │
│ [Contact Support]                                 │
└──────────────────────────────────────────────────┘
```

**Behavior**:
- User can download partial results (research, scripts)
- User can retry agent run (state is saved)
- User can contact support with session ID

---

## 7. Real-Time Updates

### WebSocket/Realtime Channel

**Channel**: `agent-session:{session_id}`

**Events**:
- `step_started`: Agent starts a new step
- `step_progress`: Progress update within a step
- `step_completed`: Agent completes a step
- `tool_called`: Agent calls an MCP tool
- `tool_result`: Tool returns result
- `reasoning_update`: Agent shares reasoning
- `user_input_required`: Agent needs user input
- `error`: Error occurred
- `session_completed`: Agent run completed

**Payload Example**:
```typescript
{
  event: "step_started",
  session_id: "abc-123",
  step_name: "Researching Competitors",
  step_index: 2,
  timestamp: "2025-01-15T10:30:00Z"
}
```

### UI Updates

- UI subscribes to `agent-session:{session_id}` channel
- On event received:
  - Update progress bar
  - Add new log entry to execution log
  - Expand/collapse step cards
  - Show/hide user input modals
  - Update status card

---

## 8. Lovable Timeline-Style Animation

### Animation Behavior

- **Step Cards**: Slide in from bottom with fade effect
- **Progress Bar**: Smooth transition (no jumps)
- **Log Entries**: Fade in with staggered delay
- **Status Icons**: Spin (for running), bounce (for completed)
- **Expand/Collapse**: Smooth height transition (300ms ease-in-out)

### Example (Framer Motion)

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
  <StepCard step={step} />
</motion.div>
```

---

## 9. Mobile Responsiveness

### Mobile Layout

- **Header**: Sticky at top, smaller font size
- **Status Card**: Full width, stacked layout
- **Execution Log**: Vertical scroll, touch-friendly expand/collapse
- **Action Buttons**: Bottom fixed bar

### Mobile-Specific Features

- Swipe to expand/collapse step cards
- Pull-to-refresh to update status
- Haptic feedback on step completion

---

## 10. Accessibility

### WCAG 2.1 AA Compliance

- **Color Contrast**: Minimum 4.5:1 for text
- **Focus Indicators**: Visible focus ring on all interactive elements
- **Screen Reader Support**: All status updates announced
- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Esc)
- **ARIA Labels**: Proper labels for all icons and buttons

### Example

```tsx
<button
  aria-label="Expand step details"
  aria-expanded={isExpanded}
  onClick={toggleExpand}
>
  {isExpanded ? <ChevronUp /> : <ChevronDown />}
</button>
```

---

## 11. Theme Integration

### Design System

- Use existing design tokens from `index.css`
- Colors: `primary`, `accent`, `muted`, `background`, `foreground`
- Typography: Existing font stack
- Shadows: `shadow-elegant`, `shadow-glow`

### Dark Mode Support

- All components support dark mode
- Agent status card: Dark gradient background
- Step cards: Dark mode with subtle borders

---

## 12. Performance Optimization

### Lazy Loading

- Only render visible step cards
- Lazy load expanded details
- Virtualize long execution logs (react-window)

### Debouncing

- Debounce real-time updates (max 1 update per 500ms)
- Batch multiple events into single UI update

### Caching

- Cache agent session state in local storage
- Restore session on page refresh
