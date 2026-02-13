
-- Create shopping_planning table for 30-day product scheduling
CREATE TABLE public.shopping_planning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shopping_products(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, scheduled_date, product_id)
);

-- Enable RLS
ALTER TABLE public.shopping_planning ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their project shopping planning"
ON public.shopping_planning FOR SELECT
USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their project shopping planning"
ON public.shopping_planning FOR INSERT
WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their project shopping planning"
ON public.shopping_planning FOR UPDATE
USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their project shopping planning"
ON public.shopping_planning FOR DELETE
USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_shopping_planning_updated_at
BEFORE UPDATE ON public.shopping_planning
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
