
-- Create project_backlinks table for cross-project authority linking
CREATE TABLE IF NOT EXISTS public.project_backlinks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_project_id UUID NOT NULL,
  target_project_id UUID NOT NULL,
  target_name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  target_description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  anchor_examples TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_project_id, target_project_id)
);

-- Enable RLS
ALTER TABLE public.project_backlinks ENABLE ROW LEVEL SECURITY;

-- Users can view their own backlinks
CREATE POLICY "Users can view their own backlinks"
ON public.project_backlinks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_backlinks.source_project_id
    AND projects.user_id = auth.uid()
  )
);

-- Users can insert backlinks for their projects
CREATE POLICY "Users can insert their own backlinks"
ON public.project_backlinks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_backlinks.source_project_id
    AND projects.user_id = auth.uid()
  )
);

-- Users can update their own backlinks
CREATE POLICY "Users can update their own backlinks"
ON public.project_backlinks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_backlinks.source_project_id
    AND projects.user_id = auth.uid()
  )
);

-- Users can delete their own backlinks
CREATE POLICY "Users can delete their own backlinks"
ON public.project_backlinks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_backlinks.source_project_id
    AND projects.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_project_backlinks_updated_at
BEFORE UPDATE ON public.project_backlinks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default backlink opportunities for all existing projects
-- (Platform partner sites that are available for cross-linking)
INSERT INTO public.project_backlinks (source_project_id, target_project_id, target_name, target_url, target_description, anchor_examples, is_enabled)
SELECT 
  p.id as source_project_id,
  p.id as target_project_id, -- self-reference placeholder, will be overridden
  'Vends-le' as target_name,
  'https://vends-le.fr' as target_url,
  'Marketplace de vente de meubles et objets d''occasion entre particuliers' as target_description,
  ARRAY['Vends-le', 'marketplace de meubles d''occasion', 'annonces entre particuliers'] as anchor_examples,
  false as is_enabled
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_backlinks pb 
  WHERE pb.source_project_id = p.id AND pb.target_url = 'https://vends-le.fr'
)
ON CONFLICT DO NOTHING;
