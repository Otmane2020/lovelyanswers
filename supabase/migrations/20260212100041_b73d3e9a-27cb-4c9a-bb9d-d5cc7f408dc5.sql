
-- Create shopping_products table to store imported products from feeds
CREATE TABLE public.shopping_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'EUR',
  image_url TEXT,
  product_url TEXT,
  brand TEXT,
  category TEXT,
  availability TEXT,
  condition TEXT,
  gtin TEXT,
  mpn TEXT,
  feed_item_id TEXT,
  ai_title TEXT,
  ai_description TEXT,
  ai_faq JSONB,
  ai_schema_markup JSONB,
  ai_score INTEGER,
  status TEXT DEFAULT 'imported',
  scheduled_date DATE,
  published_at TIMESTAMPTZ,
  published_url TEXT,
  language TEXT DEFAULT 'fr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopping_products ENABLE ROW LEVEL SECURITY;

-- Users can view products from their own projects
CREATE POLICY "Users can view their project products"
  ON public.shopping_products FOR SELECT
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Users can insert products into their own projects
CREATE POLICY "Users can insert products into their projects"
  ON public.shopping_products FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Users can update their project products
CREATE POLICY "Users can update their project products"
  ON public.shopping_products FOR UPDATE
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Users can delete their project products
CREATE POLICY "Users can delete their project products"
  ON public.shopping_products FOR DELETE
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_shopping_products_updated_at
  BEFORE UPDATE ON public.shopping_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create shopping_feeds table to track feed imports
CREATE TABLE public.shopping_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  feed_url TEXT,
  feed_type TEXT DEFAULT 'xml',
  last_synced_at TIMESTAMPTZ,
  product_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their project feeds"
  ON public.shopping_feeds FOR ALL
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE TRIGGER update_shopping_feeds_updated_at
  BEFORE UPDATE ON public.shopping_feeds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to project delete cascade
CREATE OR REPLACE FUNCTION public.delete_project_content()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.shopping_products WHERE project_id = OLD.id;
  DELETE FROM public.shopping_feeds WHERE project_id = OLD.id;
  DELETE FROM public.planning WHERE project_id = OLD.id;
  DELETE FROM public.articles WHERE project_id = OLD.id;
  DELETE FROM public.answers WHERE project_id = OLD.id;
  DELETE FROM public.keywords WHERE project_id = OLD.id;
  DELETE FROM public.reddit_responses WHERE project_id = OLD.id;
  DELETE FROM public.generation_settings WHERE project_id = OLD.id;
  DELETE FROM public.integrations WHERE project_id = OLD.id;
  DELETE FROM public.project_settings WHERE project_id = OLD.id;
  DELETE FROM public.team_members WHERE project_id = OLD.id;
  RETURN OLD;
END;
$function$;
