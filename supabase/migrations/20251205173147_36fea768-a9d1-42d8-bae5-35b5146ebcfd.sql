-- Allow users to delete their own agent sessions
CREATE POLICY "Users can delete their own sessions"
ON public.agent_sessions
FOR DELETE
USING (auth.uid() = user_id);