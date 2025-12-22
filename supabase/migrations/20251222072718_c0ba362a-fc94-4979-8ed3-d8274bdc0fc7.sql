-- Add free_credits and paid_credits columns to profiles table
-- free_credits: Credits given through marketing links, initial signup, etc.
-- paid_credits: Credits purchased via Stripe

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS free_credits integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_credits integer NOT NULL DEFAULT 0;

-- Migrate existing credits: Assume all existing credits are "free" credits
UPDATE public.profiles 
SET free_credits = COALESCE(credits, 0), 
    paid_credits = 0 
WHERE free_credits = 0 AND paid_credits = 0;

-- Create a view/function to get total credits (for backward compatibility)
-- The existing 'credits' column will be computed: credits = free_credits + paid_credits
-- We'll update it via trigger

CREATE OR REPLACE FUNCTION public.update_total_credits()
RETURNS TRIGGER AS $$
BEGIN
  NEW.credits := COALESCE(NEW.free_credits, 0) + COALESCE(NEW.paid_credits, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS sync_total_credits ON public.profiles;

-- Create trigger to keep credits column in sync
CREATE TRIGGER sync_total_credits
  BEFORE INSERT OR UPDATE OF free_credits, paid_credits ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_total_credits();