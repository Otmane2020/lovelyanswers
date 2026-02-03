-- Add audiences column to onboarding_sessions
ALTER TABLE public.onboarding_sessions 
ADD COLUMN IF NOT EXISTS audiences text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.onboarding_sessions.audiences IS 'Target audiences detected during onboarding';