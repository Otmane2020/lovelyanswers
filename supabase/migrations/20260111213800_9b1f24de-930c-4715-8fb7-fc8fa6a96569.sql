-- Trigger function: Clean up all project data BEFORE project deletion
CREATE OR REPLACE FUNCTION public.delete_project_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all related data before the project is deleted
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for project deletion cleanup
DROP TRIGGER IF EXISTS on_project_delete ON public.projects;
CREATE TRIGGER on_project_delete
BEFORE DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.delete_project_content();

-- Trigger function: Reset content when website_url changes
CREATE OR REPLACE FUNCTION public.on_project_url_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if website_url actually changed
  IF OLD.website_url IS DISTINCT FROM NEW.website_url THEN
    -- Delete all generated content (keep settings, integrations, team)
    DELETE FROM public.planning WHERE project_id = NEW.id;
    DELETE FROM public.articles WHERE project_id = NEW.id;
    DELETE FROM public.answers WHERE project_id = NEW.id;
    DELETE FROM public.keywords WHERE project_id = NEW.id;
    DELETE FROM public.reddit_responses WHERE project_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for URL change
DROP TRIGGER IF EXISTS on_project_url_update ON public.projects;
CREATE TRIGGER on_project_url_update
AFTER UPDATE OF website_url ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.on_project_url_change();