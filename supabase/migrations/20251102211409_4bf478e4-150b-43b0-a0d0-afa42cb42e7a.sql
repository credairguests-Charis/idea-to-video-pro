-- Fix search_path security warning for get_user_stats function
DROP FUNCTION IF EXISTS get_user_stats(UUID);

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;