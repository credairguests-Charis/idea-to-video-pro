-- Add has_unlimited_access column to profiles table
-- This allows admins to grant unlimited access to any user
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_unlimited_access BOOLEAN DEFAULT false;

-- Add granted_unlimited_at timestamp to track when access was granted
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS unlimited_access_granted_at TIMESTAMP WITH TIME ZONE;

-- Add granted_unlimited_by to track which admin granted access
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS unlimited_access_granted_by UUID;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_unlimited_access ON public.profiles(has_unlimited_access) WHERE has_unlimited_access = true;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.has_unlimited_access IS 'When true, user can use all features without credit limits';
COMMENT ON COLUMN public.profiles.unlimited_access_granted_at IS 'Timestamp when unlimited access was granted';
COMMENT ON COLUMN public.profiles.unlimited_access_granted_by IS 'Admin user ID who granted the unlimited access';