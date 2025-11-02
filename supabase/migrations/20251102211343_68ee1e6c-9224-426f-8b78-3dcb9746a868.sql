-- Add paused column to profiles for user pause functionality
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_paused ON profiles(paused);

-- Create admin edge function to get detailed user stats
CREATE OR REPLACE FUNCTION get_user_stats(target_user_id UUID)
RETURNS TABLE (
  video_count BIGINT,
  last_login TIMESTAMP WITH TIME ZONE,
  total_logins BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT p.id) as video_count,
    MAX(pr.updated_at) as last_login,
    1::BIGINT as total_logins
  FROM profiles pr
  LEFT JOIN projects p ON p.user_id = target_user_id
  WHERE pr.user_id = target_user_id
  GROUP BY pr.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (admin check will be in edge function)
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;