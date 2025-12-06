-- Create agent_chat_messages table for persistent conversation history
CREATE TABLE public.agent_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_streaming BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_agent_chat_messages_session_id ON public.agent_chat_messages(session_id);
CREATE INDEX idx_agent_chat_messages_created_at ON public.agent_chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.agent_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages for their sessions
CREATE POLICY "Users can view their session messages"
  ON public.agent_chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agent_sessions 
    WHERE agent_sessions.id = agent_chat_messages.session_id 
    AND agent_sessions.user_id = auth.uid()
  ));

-- Users can insert messages for their sessions
CREATE POLICY "Users can insert messages for their sessions"
  ON public.agent_chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agent_sessions 
    WHERE agent_sessions.id = agent_chat_messages.session_id 
    AND agent_sessions.user_id = auth.uid()
  ));

-- Users can update messages for their sessions (for streaming updates)
CREATE POLICY "Users can update their session messages"
  ON public.agent_chat_messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.agent_sessions 
    WHERE agent_sessions.id = agent_chat_messages.session_id 
    AND agent_sessions.user_id = auth.uid()
  ));

-- Service can insert/update messages (for AI responses)
CREATE POLICY "Service can manage messages"
  ON public.agent_chat_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime for live streaming updates
ALTER TABLE public.agent_chat_messages REPLICA IDENTITY FULL;

-- Create updated_at trigger
CREATE TRIGGER update_agent_chat_messages_updated_at
  BEFORE UPDATE ON public.agent_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();