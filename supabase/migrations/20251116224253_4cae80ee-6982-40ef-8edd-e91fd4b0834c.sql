-- Add RLS policy to allow service role to insert agent execution logs
CREATE POLICY "Service can insert execution logs"
ON agent_execution_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add RLS policy to allow service role to update agent sessions
CREATE POLICY "Service can update sessions"
ON agent_sessions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);