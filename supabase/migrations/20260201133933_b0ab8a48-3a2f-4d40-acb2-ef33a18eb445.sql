-- Add publish_frequency column to project_settings
ALTER TABLE public.project_settings 
ADD COLUMN IF NOT EXISTS publish_frequency text DEFAULT 'daily';

-- Add comment for documentation
COMMENT ON COLUMN public.project_settings.publish_frequency IS 'Publishing frequency: daily, weekly, monthly';