# Memory System Design

## 1. Overview

The Agent Mode memory system stores brand guidelines, user preferences, competitive insights, task history, and performance metrics using Supabase with pgvector for semantic search and RLS for data isolation.

## 2. Database Schema

### Core Memory Table

```sql
create extension if not exists vector;

create table public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  memory_type text not null check (memory_type in (
    'brand_memory',
    'user_preferences',
    'competitive_memory',
    'task_memory',
    'performance_memory'
  )),
  content text not null,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone
);

-- Index for vector similarity search
create index on agent_memory using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Index for memory type filtering
create index on agent_memory (user_id, memory_type);

-- Index for expiration cleanup
create index on agent_memory (expires_at) where expires_at is not null;

-- Enable RLS
alter table agent_memory enable row level security;

-- RLS Policies
create policy "Users can read their own memory"
  on agent_memory for select
  using (auth.uid() = user_id);

create policy "Users can insert their own memory"
  on agent_memory for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own memory"
  on agent_memory for update
  using (auth.uid() = user_id);

create policy "Users can delete their own memory"
  on agent_memory for delete
  using (auth.uid() = user_id);

-- Admins can view all memory (for support)
create policy "Admins can view all memory"
  on agent_memory for select
  using (has_role(auth.uid(), 'admin'));

-- Update timestamp trigger
create trigger update_agent_memory_updated_at
  before update on agent_memory
  for each row
  execute function public.update_updated_at_column();
```

### Agent Sessions Table

```sql
create table public.agent_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'initializing' check (status in (
    'initializing',
    'analyzing_brand',
    'researching_competitors',
    'analyzing_trends',
    'generating_concepts',
    'generating_scripts',
    'awaiting_approval',
    'generating_videos',
    'updating_memory',
    'completed',
    'error',
    'cancelled'
  )),
  current_step text,
  progress_percentage integer default 0 check (progress_percentage >= 0 and progress_percentage <= 100),
  total_steps integer default 8,
  completed_steps text[] default array[]::text[],
  error_message text,
  session_data jsonb default '{}'::jsonb,
  started_at timestamp with time zone default now() not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table agent_sessions enable row level security;

create policy "Users can read their own sessions"
  on agent_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on agent_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
  on agent_sessions for update
  using (auth.uid() = user_id);

-- Index for real-time queries
create index on agent_sessions (user_id, status);
create index on agent_sessions (user_id, created_at desc);

-- Update timestamp trigger
create trigger update_agent_sessions_updated_at
  before update on agent_sessions
  for each row
  execute function public.update_updated_at_column();

-- Enable realtime
alter publication supabase_realtime add table agent_sessions;
```

### Agent Execution Logs Table

```sql
create table public.agent_execution_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references agent_sessions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  step_name text not null,
  tool_name text,
  action_type text not null check (action_type in (
    'tool_call',
    'memory_read',
    'memory_write',
    'reasoning',
    'user_interaction',
    'error',
    'decision'
  )),
  input_data jsonb,
  output_data jsonb,
  reasoning text,
  confidence_score numeric(3,2) check (confidence_score >= 0 and confidence_score <= 1),
  execution_time_ms integer,
  status text not null check (status in ('pending', 'running', 'success', 'error')),
  error_message text,
  created_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table agent_execution_logs enable row level security;

create policy "Users can read their own logs"
  on agent_execution_logs for select
  using (auth.uid() = user_id);

create policy "Service role can insert logs"
  on agent_execution_logs for insert
  with check (true);

create policy "Admins can view all logs"
  on agent_execution_logs for select
  using (has_role(auth.uid(), 'admin'));

-- Index for fast session log retrieval
create index on agent_execution_logs (session_id, created_at);
create index on agent_execution_logs (user_id, created_at desc);

-- Enable realtime
alter publication supabase_realtime add table agent_execution_logs;
```

## 3. Memory Types and Schemas

### 1. Brand Memory

**Purpose**: Store brand voice, messaging, ICP, brand guidelines

**Metadata Schema**:
```typescript
interface BrandMemoryMetadata {
  brand_name?: string;
  industry?: string;
  target_audience?: string;
  tone?: string[]; // e.g., ['professional', 'friendly', 'authoritative']
  keywords?: string[];
  competitors?: string[];
  source?: 'user_input' | 'agent_inferred' | 'uploaded_doc';
}
```

**Example Content**:
```
Brand: TechFlow
Voice: Professional yet approachable, technical but not jargon-heavy
ICP: B2B SaaS companies, 10-500 employees, looking to streamline operations
Messaging: "Automate your workflow, amplify your impact"
```

### 2. User Preferences

**Purpose**: Store preferred formats, actors, music, tone

**Metadata Schema**:
```typescript
interface UserPreferencesMetadata {
  preference_type: 'video_format' | 'actor' | 'music' | 'tone' | 'platform';
  confidence_score: number; // how certain we are about this preference
  last_updated: string;
  source?: 'explicit_choice' | 'inferred_from_usage';
}
```

**Example Content**:
```
Preferred video format: Portrait 9:16
Preferred video length: 15-30 seconds
Preferred actors: Diverse representation, professional setting
Preferred tone: Energetic, motivational
Preferred platforms: TikTok, Instagram Reels
```

### 3. Competitive Memory

**Purpose**: Store competitor strategies, winning hooks, successful formats

**Metadata Schema**:
```typescript
interface CompetitiveMemoryMetadata {
  competitor_name?: string;
  platform?: 'meta' | 'tiktok' | 'youtube';
  ad_id?: string;
  performance_metrics?: {
    engagement_rate?: number;
    view_count?: number;
    share_count?: number;
  };
  date_captured?: string;
  hook_type?: string;
  cta_type?: string;
}
```

**Example Content**:
```
Competitor: Acme Corp
Hook: "Stop wasting 10 hours a week on manual data entry"
Format: Problem-Solution-CTA in 20 seconds
Platform: Meta Ads Library
Performance: High engagement (10k+ likes)
Key insight: Direct pain point addressing works better than feature-first
```

### 4. Task Memory

**Purpose**: Store past agent runs, decisions made, outcomes

**Metadata Schema**:
```typescript
interface TaskMemoryMetadata {
  session_id: string;
  task_type: 'full_agent_run' | 'research_only' | 'script_generation' | 'video_generation';
  outcome: 'success' | 'partial_success' | 'failure';
  user_feedback?: 'positive' | 'neutral' | 'negative';
  decisions_made?: string[];
  tools_used?: string[];
}
```

**Example Content**:
```
Task: Full agent run for TikTok ad campaign
Outcome: Success (3 videos generated, all approved by user)
Key decisions:
- Used competitor hook from Nike campaign
- Selected energetic background music
- Chose portrait format for mobile optimization
User feedback: Positive
```

**Expiration**: 90 days (configurable)

### 5. Performance Memory

**Purpose**: Store video performance metrics, A/B test results

**Metadata Schema**:
```typescript
interface PerformanceMemoryMetadata {
  video_id: string;
  platform?: string;
  metrics?: {
    views?: number;
    engagement_rate?: number;
    conversion_rate?: number;
    ctr?: number;
  };
  campaign_context?: string;
  what_worked?: string;
  what_didnt_work?: string;
}
```

**Example Content**:
```
Video: "TechFlow Demo - Problem-Solution Hook"
Platform: TikTok
Performance: 50k views, 8% engagement rate, 2% CTR
What worked: Direct problem statement in first 3 seconds
What didn't work: CTA was too subtle, needed stronger call-to-action
Insight: Pain point hooks outperform feature-first hooks 3:1
```

## 4. Vector Search Function

```sql
create or replace function match_memory(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5,
  memory_type text default null,
  filter_user_id uuid default auth.uid()
)
returns table (
  id uuid,
  content text,
  similarity float,
  metadata jsonb,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    agent_memory.id,
    agent_memory.content,
    1 - (agent_memory.embedding <=> query_embedding) as similarity,
    agent_memory.metadata,
    agent_memory.created_at
  from agent_memory
  where 
    agent_memory.user_id = filter_user_id
    and (memory_type is null or agent_memory.memory_type = match_memory.memory_type)
    and (expires_at is null or expires_at > now())
    and 1 - (agent_memory.embedding <=> query_embedding) > match_threshold
  order by agent_memory.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

## 5. Edge Function: Memory Read

**File**: `supabase/functions/agent-memory-read/index.ts`

**Purpose**: Generate embedding and query vector database

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
    const { query, memory_type, match_threshold = 0.7, match_count = 5 } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Generate embedding using OpenAI
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });
    
    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;
    
    // Search memory
    const { data: results, error: searchError } = await supabase.rpc('match_memory', {
      query_embedding: embedding,
      match_threshold,
      match_count,
      memory_type,
      filter_user_id: user.id,
    });
    
    if (searchError) throw searchError;
    
    return new Response(JSON.stringify({ results }), {
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

## 6. Edge Function: Memory Write

**File**: `supabase/functions/agent-memory-write/index.ts`

**Purpose**: Generate embedding and insert into database

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
    const { content, memory_type, metadata = {}, expires_at = null } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Generate embedding using OpenAI
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: content,
      }),
    });
    
    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;
    
    // Insert memory
    const { data: insertedMemory, error: insertError } = await supabase
      .from('agent_memory')
      .insert({
        user_id: user.id,
        content,
        memory_type,
        embedding,
        metadata,
        expires_at,
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    // Trigger realtime update
    await supabase.channel('agent-memory').send({
      type: 'broadcast',
      event: 'memory_updated',
      payload: { memory_type, user_id: user.id },
    });
    
    return new Response(JSON.stringify({ memory: insertedMemory }), {
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

## 7. Realtime Update Triggers

```sql
-- Trigger to notify on memory updates
create or replace function notify_memory_update()
returns trigger
language plpgsql
security definer
as $$
begin
  perform pg_notify(
    'memory_updated',
    json_build_object(
      'user_id', NEW.user_id,
      'memory_type', NEW.memory_type,
      'operation', TG_OP
    )::text
  );
  return NEW;
end;
$$;

create trigger agent_memory_updated
  after insert or update or delete on agent_memory
  for each row
  execute function notify_memory_update();

-- Enable realtime for agent_memory
alter publication supabase_realtime add table agent_memory;
```

## 8. Memory Cleanup Job

**Purpose**: Delete expired task memory

```sql
-- Function to clean up expired memory
create or replace function cleanup_expired_memory()
returns void
language plpgsql
security definer
as $$
begin
  delete from agent_memory
  where expires_at is not null
    and expires_at < now();
end;
$$;

-- Schedule via pg_cron (configured in Supabase dashboard)
-- Run daily at 2am UTC
-- select cron.schedule('cleanup-expired-memory', '0 2 * * *', 'select cleanup_expired_memory()');
```

## 9. Frontend Memory Hooks

### useAgentMemory Hook

```typescript
import { supabase } from '@/integrations/supabase/client';

export function useAgentMemory() {
  const readMemory = async (query: string, memoryType?: string) => {
    const { data, error } = await supabase.functions.invoke('agent-memory-read', {
      body: { query, memory_type: memoryType },
    });
    
    if (error) throw error;
    return data.results;
  };
  
  const writeMemory = async (content: string, memoryType: string, metadata?: any) => {
    const { data, error } = await supabase.functions.invoke('agent-memory-write', {
      body: { content, memory_type: memoryType, metadata },
    });
    
    if (error) throw error;
    return data.memory;
  };
  
  return { readMemory, writeMemory };
}
```

## 10. Security and Privacy

### Data Isolation

- RLS ensures users can only access their own memory
- Admins require explicit `admin` role to view other users' memory
- Service role used only for embedding generation (no user data exposure)

### Data Encryption

- All data encrypted at rest by Supabase
- Embeddings do not expose raw content (one-way transformation)
- Sensitive metadata (API keys) encrypted separately

### User Controls

- Users can delete all memory via settings page
- Users can export memory as JSON
- Users can disable memory system (agent runs in stateless mode)
- 90-day retention for task memory (auto-deletion)

### Audit Trail

- All memory reads/writes logged in `agent_execution_logs`
- Admin access logged separately
- Users can view their own audit logs
