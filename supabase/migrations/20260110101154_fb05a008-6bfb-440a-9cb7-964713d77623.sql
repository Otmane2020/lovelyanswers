-- Add timezone column to project_settings
ALTER TABLE public.project_settings 
ADD COLUMN timezone text DEFAULT 'Europe/Paris';