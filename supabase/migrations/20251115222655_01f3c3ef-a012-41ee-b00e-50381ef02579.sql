-- Fix search path for match_agent_memory function
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
SECURITY DEFINER
SET search_path = public
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