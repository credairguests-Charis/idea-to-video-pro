-- Fix search_path for the trigger function we just created
CREATE OR REPLACE FUNCTION public.update_total_credits()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.credits := COALESCE(NEW.free_credits, 0) + COALESCE(NEW.paid_credits, 0);
  RETURN NEW;
END;
$$;