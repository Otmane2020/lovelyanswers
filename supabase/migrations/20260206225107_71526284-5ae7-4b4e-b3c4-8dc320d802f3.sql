
-- Add column for tracking the 3rd (final) abandoned cart email
ALTER TABLE public.onboarding_sessions
ADD COLUMN IF NOT EXISTS final_email_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS final_email_sent_at timestamp with time zone;

ALTER TABLE public.carts
ADD COLUMN IF NOT EXISTS final_email_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS final_email_sent_at timestamp with time zone;
