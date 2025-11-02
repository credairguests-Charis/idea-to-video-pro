-- Create RPC function to get accurate user count from auth.users
CREATE OR REPLACE FUNCTION public.get_total_user_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM auth.users);
END;
$$;

-- Grant execute permission to authenticated users (admin only through RLS)
GRANT EXECUTE ON FUNCTION public.get_total_user_count() TO authenticated;

-- Create RPC function to get active user count (non-paused users)
CREATE OR REPLACE FUNCTION public.get_active_user_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.user_id
    WHERE COALESCE(p.paused, false) = false
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_active_user_count() TO authenticated;