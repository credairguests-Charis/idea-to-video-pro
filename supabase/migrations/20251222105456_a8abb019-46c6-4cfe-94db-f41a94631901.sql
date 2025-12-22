-- Add email tracking and onboarding flags to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_email_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Update existing profiles to mark them as completed (they are existing users)
UPDATE public.profiles 
SET onboarding_completed = true, 
    welcome_email_sent = true
WHERE onboarding_completed IS NULL OR onboarding_completed = false;