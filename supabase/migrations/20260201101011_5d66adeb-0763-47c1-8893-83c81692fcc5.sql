-- Change default value for auto_publish_enabled to true for new projects
ALTER TABLE public.project_settings 
ALTER COLUMN auto_publish_enabled SET DEFAULT true;