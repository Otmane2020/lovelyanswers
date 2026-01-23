-- Create carts table for abandoned cart tracking
CREATE TABLE public.carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'eur',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'converted')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  abandoned_email_sent BOOLEAN DEFAULT false,
  abandoned_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own carts"
  ON public.carts FOR SELECT
  USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can create carts"
  ON public.carts FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own carts"
  ON public.carts FOR UPDATE
  USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can delete their own carts"
  ON public.carts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for abandoned cart queries
CREATE INDEX idx_carts_status ON public.carts(status);
CREATE INDEX idx_carts_user_id ON public.carts(user_id);
CREATE INDEX idx_carts_created_at ON public.carts(created_at);