-- Create planning_days table with strict constraints
-- This ensures 30 rolling days are always filled with both answer and article

CREATE TABLE public.planning_days (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  answer_id uuid NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Unique constraint: one entry per project per day
  CONSTRAINT planning_days_unique_project_date UNIQUE (project_id, scheduled_date)
);

-- Create index for faster lookups
CREATE INDEX idx_planning_days_project_date ON public.planning_days(project_id, scheduled_date);
CREATE INDEX idx_planning_days_scheduled_date ON public.planning_days(scheduled_date);

-- Enable RLS
ALTER TABLE public.planning_days ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own planning days"
ON public.planning_days FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = planning_days.project_id 
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create planning days for their projects"
ON public.planning_days FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = planning_days.project_id 
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can update their own planning days"
ON public.planning_days FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = planning_days.project_id 
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own planning days"
ON public.planning_days FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = planning_days.project_id 
  AND projects.user_id = auth.uid()
));

-- Function to check planning completeness (30 days from today)
CREATE OR REPLACE FUNCTION public.check_planning_completeness(p_project_id uuid)
RETURNS TABLE (
  total_days integer,
  filled_days integer,
  missing_dates date[],
  is_today_filled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_end_date date := CURRENT_DATE + INTERVAL '29 days';
  v_missing_dates date[];
  v_filled_count integer;
  v_today_filled boolean;
BEGIN
  -- Get count of filled days
  SELECT COUNT(*)::integer INTO v_filled_count
  FROM planning_days
  WHERE project_id = p_project_id
    AND scheduled_date >= v_today
    AND scheduled_date <= v_end_date;
  
  -- Check if today is filled
  SELECT EXISTS(
    SELECT 1 FROM planning_days
    WHERE project_id = p_project_id
      AND scheduled_date = v_today
  ) INTO v_today_filled;
  
  -- Get array of missing dates
  SELECT ARRAY_AGG(d::date ORDER BY d) INTO v_missing_dates
  FROM generate_series(v_today, v_end_date, INTERVAL '1 day') AS d
  WHERE NOT EXISTS (
    SELECT 1 FROM planning_days
    WHERE project_id = p_project_id
      AND scheduled_date = d::date
  );
  
  RETURN QUERY SELECT 
    30::integer AS total_days,
    v_filled_count AS filled_days,
    COALESCE(v_missing_dates, ARRAY[]::date[]) AS missing_dates,
    v_today_filled AS is_today_filled;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_planning_days_updated_at
BEFORE UPDATE ON public.planning_days
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();