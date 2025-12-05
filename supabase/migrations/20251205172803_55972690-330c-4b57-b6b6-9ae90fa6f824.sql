-- Add title column to agent_sessions table
ALTER TABLE public.agent_sessions 
ADD COLUMN title text DEFAULT 'Untitled Workspace';

-- Create index for faster lookups
CREATE INDEX idx_agent_sessions_user_title ON public.agent_sessions(user_id, title);