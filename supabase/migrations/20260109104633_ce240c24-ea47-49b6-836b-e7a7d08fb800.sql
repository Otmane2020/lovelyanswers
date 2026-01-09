-- Add auto-publish settings columns to project_settings
ALTER TABLE public.project_settings 
ADD COLUMN IF NOT EXISTS auto_publish_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS publish_hour TEXT DEFAULT '08';