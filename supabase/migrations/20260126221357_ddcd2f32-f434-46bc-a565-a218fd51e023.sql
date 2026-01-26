-- Create function to auto-create generation_settings when a project is created
CREATE OR REPLACE FUNCTION public.handle_new_project_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Automatically create generation_settings with project language
  INSERT INTO public.generation_settings (
    project_id,
    website_url,
    language,
    brand_name
  )
  VALUES (
    NEW.id,
    NEW.website_url,
    NEW.language,
    NEW.brand_name
  )
  ON CONFLICT (project_id) DO UPDATE SET
    language = EXCLUDED.language,
    website_url = EXCLUDED.website_url;
  
  RETURN NEW;
END;
$$;

-- Create trigger on projects table
DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_project_settings();