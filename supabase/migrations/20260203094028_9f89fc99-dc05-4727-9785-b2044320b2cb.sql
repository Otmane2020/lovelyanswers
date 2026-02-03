-- Add columns to track abandoned cart emails
ALTER TABLE public.onboarding_sessions 
ADD COLUMN IF NOT EXISTS abandoned_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS abandoned_email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS promo_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS promo_email_sent_at TIMESTAMPTZ;

-- Also add to carts table if not already present
ALTER TABLE public.carts
ADD COLUMN IF NOT EXISTS promo_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS promo_email_sent_at TIMESTAMPTZ;