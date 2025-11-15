-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create agent_memory table for storing brand, user, and competitive insights
CREATE TABLE IF NOT EXISTS public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('brand', 'user_preferences', 'competitive', 'task', 'performance')),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS agent_memory_embedding_idx ON public.agent_memory 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for user_id and memory_type lookups
CREATE INDEX IF NOT EXISTS agent_memory_user_type_idx ON public.agent_memory(user_id, memory_type);

-- Enable RLS
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_memory
CREATE POLICY "Users can view their own memory"
  ON public.agent_memory
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memory"
  ON public.agent_memory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory"
  ON public.agent_memory
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory"
  ON public.agent_memory
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create agent_sessions table for tracking agent runs
CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'idle' CHECK (state IN (
    'idle', 'initializing', 'analyzing_brand', 'researching_competitors',
    'analyzing_trends', 'generating_concepts', 'generating_scripts',
    'awaiting_approval', 'generating_videos', 'updating_memory',
    'completed', 'error', 'cancelled'
  )),
  current_step TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_sessions
CREATE POLICY "Users can view their own sessions"
  ON public.agent_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.agent_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.agent_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create agent_execution_logs table for detailed step tracking
CREATE TABLE IF NOT EXISTS public.agent_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  tool_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for session lookups
CREATE INDEX IF NOT EXISTS agent_execution_logs_session_idx ON public.agent_execution_logs(session_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.agent_execution_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_execution_logs
CREATE POLICY "Users can view logs for their sessions"
  ON public.agent_execution_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_sessions
      WHERE agent_sessions.id = agent_execution_logs.session_id
      AND agent_sessions.user_id = auth.uid()
    )
  );

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION public.match_agent_memory(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_user_id uuid DEFAULT NULL,
  filter_memory_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  memory_type text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    agent_memory.id,
    agent_memory.user_id,
    agent_memory.memory_type,
    agent_memory.content,
    agent_memory.metadata,
    1 - (agent_memory.embedding <=> query_embedding) as similarity
  FROM public.agent_memory
  WHERE 
    (filter_user_id IS NULL OR agent_memory.user_id = filter_user_id)
    AND (filter_memory_type IS NULL OR agent_memory.memory_type = filter_memory_type)
    AND 1 - (agent_memory.embedding <=> query_embedding) > match_threshold
  ORDER BY agent_memory.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_agent_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_memory_updated_at
  BEFORE UPDATE ON public.agent_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_memory_updated_at();

CREATE TRIGGER agent_sessions_updated_at
  BEFORE UPDATE ON public.agent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for agent_sessions (for live updates in UI)
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_execution_logs;