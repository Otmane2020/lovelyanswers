-- Add new columns to answers table for AEO system
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS 
  supporting_content jsonb DEFAULT '{"bullets": [], "faq": []}';

ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS 
  intent text;

ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS 
  difficulty text DEFAULT 'medium';

ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS 
  article_id uuid REFERENCES articles(id);

-- Create index for faster intent filtering
CREATE INDEX IF NOT EXISTS idx_answers_intent ON public.answers(intent);

-- Create index for faster article lookup
CREATE INDEX IF NOT EXISTS idx_answers_article_id ON public.answers(article_id);