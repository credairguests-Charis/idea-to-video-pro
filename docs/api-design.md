# API Design — Agent Mode Backend

## Overview

Agent Mode requires several backend endpoints and edge functions to orchestrate the agent workflow, manage memory, and provide real-time updates to the frontend.

All endpoints use Supabase Edge Functions with proper authentication and RLS.

---

## 1. POST /agent/start

### Purpose
Initialize a new agent session and start the autonomous workflow.

### Edge Function
**File**: `supabase/functions/agent-start/index.ts`

### Request

```typescript
POST https://kopclhksdjbheypwsvxz.supabase.co/functions/v1/agent-start

Headers:
  Authorization: Bearer <user_token>
  Content-Type: application/json

Body:
{
  "goal": "Generate video ads for my SaaS product",
  "reference_video_url": "https://example.com/video.mp4", // optional
  "constraints": {
    "max_videos": 3,
    "max_duration_seconds": 30,
    "aspect_ratio": "9:16"
  }
}
```

### Response (Success)

```typescript
{
  "session_id": "abc-123-def-456",
  "status": "initializing",
  "estimated_completion_time_ms": 300000, // 5 minutes
  "steps": [
    { "step_index": 1, "step_name": "Analyze brand memory", "status": "queued" },
    { "step_index": 2, "step_name": "Research competitors", "status": "queued" },
    // ... more steps
  ]
}
```

### Response (Error)

```typescript
{
  "error": "User has no brand memory. Please complete onboarding first.",
  "error_code": "MISSING_BRAND_MEMORY"
}
```

### Implementation

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { goal, reference_video_url, constraints } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Create agent session
    const { data: session, error: sessionError } = await supabase
      .from('agent_sessions')
      .insert({
        user_id: user.id,
        status: 'initializing',
        current_step: 'Initializing agent',
        progress_percentage: 0,
        total_steps: 8,
        session_data: { goal, reference_video_url, constraints },
      })
      .select()
      .single();
    
    if (sessionError) throw sessionError;
    
    // Trigger agent workflow (async)
    // This would typically be handled by a separate orchestration function
    // or a queue system (e.g., Supabase Edge Functions + pg_cron)
    
    return new Response(JSON.stringify({
      session_id: session.id,
      status: session.status,
      estimated_completion_time_ms: 300000,
      steps: [
        { step_index: 1, step_name: "Analyze brand memory", status: "queued" },
        { step_index: 2, step_name: "Research competitors", status: "queued" },
        { step_index: 3, step_name: "Analyze trends", status: "queued" },
        { step_index: 4, step_name: "Generate concepts", status: "queued" },
        { step_index: 5, step_name: "Generate scripts", status: "queued" },
        { step_index: 6, step_name: "Generate videos", status: "queued" },
        { step_index: 7, step_name: "Update memory", status: "queued" },
        { step_index: 8, step_name: "Deliver results", status: "queued" },
      ],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

---

## 2. POST /agent/event

### Purpose
Log agent tool results, reasoning, and decisions.

### Edge Function
**File**: `supabase/functions/agent-event/index.ts`

### Request

```typescript
POST https://kopclhksdjbheypwsvxz.supabase.co/functions/v1/agent-event

Headers:
  Authorization: Bearer <user_token>
  Content-Type: application/json

Body:
{
  "session_id": "abc-123-def-456",
  "step_name": "Research competitors",
  "action_type": "tool_call",
  "tool_name": "meta_ads_search",
  "input_data": {
    "search_term": "Nike",
    "limit": 50
  },
  "output_data": {
    "ads": [ /* array of ads */ ]
  },
  "reasoning": "Searching Meta Ads Library for Nike to identify winning hooks",
  "confidence_score": 0.95,
  "execution_time_ms": 2300,
  "status": "success"
}
```

### Response (Success)

```typescript
{
  "log_id": "log-789",
  "status": "logged"
}
```

### Implementation

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const {
      session_id,
      step_name,
      action_type,
      tool_name,
      input_data,
      output_data,
      reasoning,
      confidence_score,
      execution_time_ms,
      status,
      error_message,
    } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Insert log entry
    const { data: log, error: logError } = await supabase
      .from('agent_execution_logs')
      .insert({
        session_id,
        user_id: user.id,
        step_name,
        action_type,
        tool_name,
        input_data,
        output_data,
        reasoning,
        confidence_score,
        execution_time_ms,
        status,
        error_message,
      })
      .select()
      .single();
    
    if (logError) throw logError;
    
    // Trigger real-time update
    await supabase.channel(`agent-session:${session_id}`).send({
      type: 'broadcast',
      event: 'log_entry',
      payload: log,
    });
    
    return new Response(JSON.stringify({
      log_id: log.id,
      status: 'logged',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

---

## 3. GET /agent/status

### Purpose
Get current status of an agent session.

### Edge Function
**File**: `supabase/functions/agent-status/index.ts`

### Request

```typescript
GET https://kopclhksdjbheypwsvxz.supabase.co/functions/v1/agent-status?session_id=abc-123-def-456

Headers:
  Authorization: Bearer <user_token>
```

### Response (Success)

```typescript
{
  "session_id": "abc-123-def-456",
  "status": "researching_competitors",
  "current_step": "Research competitors",
  "progress_percentage": 35,
  "total_steps": 8,
  "completed_steps": ["Analyze brand memory"],
  "started_at": "2025-01-15T10:30:00Z",
  "estimated_completion_at": "2025-01-15T10:35:00Z",
  "error_message": null
}
```

### Implementation

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const session_id = url.searchParams.get('session_id');
    
    if (!session_id) {
      return new Response(JSON.stringify({ error: 'Missing session_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get session status
    const { data: session, error: sessionError } = await supabase
      .from('agent_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();
    
    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Estimate completion time (simple heuristic: 5 minutes total / progress percentage)
    const estimatedCompletionAt = new Date(
      new Date(session.started_at).getTime() + (300000 * (100 / (session.progress_percentage || 1)))
    ).toISOString();
    
    return new Response(JSON.stringify({
      session_id: session.id,
      status: session.status,
      current_step: session.current_step,
      progress_percentage: session.progress_percentage,
      total_steps: session.total_steps,
      completed_steps: session.completed_steps,
      started_at: session.started_at,
      estimated_completion_at: estimatedCompletionAt,
      error_message: session.error_message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

---

## 4. POST /agent/write-memory

### Purpose
Store insights, preferences, or brand data in agent memory.

### Edge Function
**File**: `supabase/functions/agent-memory-write/index.ts` (already defined in memory-design.md)

### Request

```typescript
POST https://kopclhksdjbheypwsvxz.supabase.co/functions/v1/agent-memory-write

Headers:
  Authorization: Bearer <user_token>
  Content-Type: application/json

Body:
{
  "content": "Brand voice: Professional yet approachable...",
  "memory_type": "brand_memory",
  "metadata": {
    "brand_name": "TechFlow",
    "industry": "B2B SaaS",
    "source": "agent_inferred"
  },
  "expires_at": null
}
```

### Response (Success)

```typescript
{
  "memory": {
    "id": "mem-123",
    "user_id": "user-456",
    "memory_type": "brand_memory",
    "content": "Brand voice: Professional yet approachable...",
    "embedding": [0.123, 0.456, ...], // vector
    "metadata": { /* ... */ },
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

---

## 5. GET /agent/read-memory

### Purpose
Query agent memory using semantic search.

### Edge Function
**File**: `supabase/functions/agent-memory-read/index.ts` (already defined in memory-design.md)

### Request

```typescript
GET https://kopclhksdjbheypwsvxz.supabase.co/functions/v1/agent-memory-read?query=brand%20voice&memory_type=brand_memory

Headers:
  Authorization: Bearer <user_token>
```

### Response (Success)

```typescript
{
  "results": [
    {
      "id": "mem-123",
      "content": "Brand voice: Professional yet approachable...",
      "similarity": 0.95,
      "metadata": { /* ... */ },
      "created_at": "2025-01-15T10:30:00Z"
    },
    // ... more results
  ]
}
```

---

## 6. Realtime Channel Spec

### Channel Name
`agent-session:{session_id}`

### Events

#### `step_started`

```typescript
{
  event: "step_started",
  session_id: "abc-123",
  step_name: "Research competitors",
  step_index: 2,
  timestamp: "2025-01-15T10:30:00Z"
}
```

#### `step_progress`

```typescript
{
  event: "step_progress",
  session_id: "abc-123",
  step_name: "Research competitors",
  progress_percentage: 50,
  message: "Fetched 25/50 ads from Meta Ads Library",
  timestamp: "2025-01-15T10:30:30Z"
}
```

#### `step_completed`

```typescript
{
  event: "step_completed",
  session_id: "abc-123",
  step_name: "Research competitors",
  step_index: 2,
  result: {
    ads_found: 50,
    top_hooks: ["Stop wasting time on...", "Automate your workflow..."],
  },
  timestamp: "2025-01-15T10:31:00Z"
}
```

#### `tool_called`

```typescript
{
  event: "tool_called",
  session_id: "abc-123",
  tool_name: "meta_ads_search",
  input: { search_term: "Nike", limit: 50 },
  timestamp: "2025-01-15T10:30:15Z"
}
```

#### `tool_result`

```typescript
{
  event: "tool_result",
  session_id: "abc-123",
  tool_name: "meta_ads_search",
  output: { ads_count: 50, execution_time_ms: 2300 },
  status: "success",
  timestamp: "2025-01-15T10:30:17Z"
}
```

#### `reasoning_update`

```typescript
{
  event: "reasoning_update",
  session_id: "abc-123",
  step_name: "Generate concepts",
  reasoning: "Based on competitor analysis, I'm focusing on problem-solution hooks because they have 3x higher engagement",
  confidence_score: 0.92,
  timestamp: "2025-01-15T10:32:00Z"
}
```

#### `user_input_required`

```typescript
{
  event: "user_input_required",
  session_id: "abc-123",
  question: "Which tone should I use for this campaign?",
  options: [
    { value: "professional", label: "Professional and authoritative" },
    { value: "friendly", label: "Friendly and conversational" },
    { value: "agent_decide", label: "Let the agent decide" }
  ],
  timeout_ms: 120000, // 2 minutes
  timestamp: "2025-01-15T10:33:00Z"
}
```

#### `error`

```typescript
{
  event: "error",
  session_id: "abc-123",
  error_message: "Meta Ads Library rate limit exceeded",
  recovery_strategy: "retry_after_delay",
  retry_after_ms: 300000,
  timestamp: "2025-01-15T10:34:00Z"
}
```

#### `session_completed`

```typescript
{
  event: "session_completed",
  session_id: "abc-123",
  status: "success",
  result: {
    videos_generated: 3,
    research_report_url: "https://...",
  },
  total_duration_ms: 320000,
  timestamp: "2025-01-15T10:35:00Z"
}
```

### Frontend Subscription

```typescript
import { supabase } from '@/integrations/supabase/client';

useEffect(() => {
  const channel = supabase
    .channel(`agent-session:${sessionId}`)
    .on('broadcast', { event: '*' }, (payload) => {
      console.log('Agent event:', payload);
      // Update UI based on event type
    })
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [sessionId]);
```

---

## 7. Error Handling

### Error Codes

| Code | Description | HTTP Status | Recovery |
|------|-------------|-------------|----------|
| `UNAUTHORIZED` | Invalid or missing auth token | 401 | Re-authenticate |
| `SESSION_NOT_FOUND` | Session ID not found | 404 | Create new session |
| `MISSING_BRAND_MEMORY` | No brand memory found | 400 | Complete onboarding |
| `TOOL_RATE_LIMIT` | Tool rate limit exceeded | 429 | Retry after delay |
| `TOOL_TIMEOUT` | Tool execution timeout | 504 | Retry with simpler params |
| `INSUFFICIENT_CREDITS` | User out of credits | 402 | Upgrade plan |
| `INTERNAL_ERROR` | Unexpected error | 500 | Retry or contact support |

### Error Response Format

```typescript
{
  "error": "Human-readable error message",
  "error_code": "TOOL_RATE_LIMIT",
  "details": {
    "tool_name": "meta_ads_search",
    "retry_after_ms": 300000
  },
  "timestamp": "2025-01-15T10:34:00Z"
}
```

---

## 8. Rate Limiting

### Per-User Limits

- **Agent runs**: 10 per day (Free), 50 per day (Paid)
- **Memory writes**: 100 per hour
- **Memory reads**: 500 per hour
- **API calls**: 1000 per hour

### Implementation

Use Supabase Rate Limiting (via edge function headers):

```typescript
// Check rate limit
const { data: rateLimitData, error: rateLimitError } = await supabase
  .rpc('check_rate_limit', {
    user_id: user.id,
    action: 'agent_start',
    limit: 10,
    window_seconds: 86400 // 24 hours
  });

if (rateLimitData.exceeded) {
  return new Response(JSON.stringify({
    error: 'Rate limit exceeded',
    error_code: 'RATE_LIMIT_EXCEEDED',
    retry_after_ms: rateLimitData.retry_after_ms,
  }), {
    status: 429,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

---

## 9. Authentication

### JWT Token

All endpoints require a valid Supabase JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### RLS Enforcement

- All database queries use RLS to isolate user data
- Service role key used only for operations that require elevated privileges (e.g., embedding generation)

---

## 10. Logging and Monitoring

### Logs Table

All API calls logged in `agent_execution_logs` table:

- Request/response body (sanitized)
- Execution time
- Error messages
- User ID and session ID

### Metrics

Track in admin dashboard:

- Agent run success rate
- Average execution time per step
- Tool call success rate
- User intervention frequency
- Error rate per tool

### Alerts

- Error rate > 5%: Notify admins
- Average execution time > 10 minutes: Investigate
- Tool failure rate > 10%: Check tool health
