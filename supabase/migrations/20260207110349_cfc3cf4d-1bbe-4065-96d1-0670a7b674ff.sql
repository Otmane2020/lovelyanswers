
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  slug text NOT NULL UNIQUE,
  company_info jsonb DEFAULT '{}',
  scores jsonb DEFAULT '{}',
  macro_analysis jsonb DEFAULT '{}',
  micro_analysis jsonb DEFAULT '{}',
  recommendations jsonb DEFAULT '{}',
  kpi_tracking jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reports" ON public.reports
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert reports" ON public.reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update reports" ON public.reports
  FOR UPDATE USING (true);
