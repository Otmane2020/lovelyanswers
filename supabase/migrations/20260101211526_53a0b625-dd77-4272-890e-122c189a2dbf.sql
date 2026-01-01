-- Create project_settings table for article and visual settings
CREATE TABLE public.project_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- Article Settings
  english_type text DEFAULT 'American',
  include_citations boolean DEFAULT true,
  include_toc boolean DEFAULT true,
  include_summary boolean DEFAULT true,
  include_internal_links boolean DEFAULT true,
  include_schema boolean DEFAULT false,
  citations_region text DEFAULT 'Worldwide',
  article_types text DEFAULT 'All allowed',
  article_length integer DEFAULT 2000,
  special_instructions text,
  www_prefix boolean DEFAULT false,
  trailing_slash boolean DEFAULT false,
  article_schedule text[] DEFAULT ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  cta_link text,
  -- Visual Settings
  image_style text DEFAULT 'photo_realistic',
  text_overlay boolean DEFAULT true,
  visual_instructions text,
  include_youtube boolean DEFAULT false,
  include_screenshot boolean DEFAULT true,
  -- Integrations
  auto_publish boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id)
);

-- Enable RLS on project_settings
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_settings
CREATE POLICY "Users can view their project settings" ON public.project_settings
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_settings.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their project settings" ON public.project_settings
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_settings.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their project settings" ON public.project_settings
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_settings.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their project settings" ON public.project_settings
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_settings.project_id AND projects.user_id = auth.uid()
  ));

-- Create team_members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  role text DEFAULT 'member',
  invited_email text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_members
CREATE POLICY "Users can view team members of their projects" ON public.team_members
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = team_members.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can add team members to their projects" ON public.team_members
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = team_members.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update team members in their projects" ON public.team_members
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = team_members.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete team members from their projects" ON public.team_members
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = team_members.project_id AND projects.user_id = auth.uid()
  ));

-- Create integrations table
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform text NOT NULL,
  config jsonb DEFAULT '{}',
  is_connected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on integrations
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- RLS policies for integrations
CREATE POLICY "Users can view their integrations" ON public.integrations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = integrations.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create integrations" ON public.integrations
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = integrations.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their integrations" ON public.integrations
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = integrations.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their integrations" ON public.integrations
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = integrations.project_id AND projects.user_id = auth.uid()
  ));

-- Create invoices table for payment history
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_invoice_id text,
  amount numeric DEFAULT 0,
  currency text DEFAULT 'usd',
  status text DEFAULT 'paid',
  billing_date timestamptz DEFAULT now(),
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY "Users can view their own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

-- Create updated_at trigger for project_settings
CREATE TRIGGER update_project_settings_updated_at
  BEFORE UPDATE ON public.project_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for integrations
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();