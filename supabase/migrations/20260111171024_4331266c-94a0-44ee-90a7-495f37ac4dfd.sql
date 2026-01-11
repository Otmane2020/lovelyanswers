
-- Table planning: 1 answer + 1 article max par jour
CREATE TABLE public.planning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  answer_id UUID REFERENCES public.answers(id) ON DELETE SET NULL,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contrainte: un seul enregistrement par projet par jour
  CONSTRAINT planning_project_day_unique UNIQUE (project_id, day)
);

-- Index pour performance
CREATE INDEX idx_planning_project_day ON public.planning(project_id, day);
CREATE INDEX idx_planning_day ON public.planning(day);

-- Enable RLS
ALTER TABLE public.planning ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own project's planning
CREATE POLICY "Users can view their project planning" 
ON public.planning 
FOR SELECT 
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their project planning" 
ON public.planning 
FOR INSERT 
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their project planning" 
ON public.planning 
FOR UPDATE 
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their project planning" 
ON public.planning 
FOR DELETE 
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

-- Trigger pour updated_at
CREATE TRIGGER update_planning_updated_at
BEFORE UPDATE ON public.planning
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for planning updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.planning;
