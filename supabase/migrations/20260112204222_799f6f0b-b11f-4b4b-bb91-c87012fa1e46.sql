-- Enable pg_net extension for HTTP calls from cron
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Create the cron job to run every hour
SELECT cron.schedule(
  'publish-scheduled-content',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pnohfokjlhpzrkczruju.supabase.co/functions/v1/publish-scheduled-answers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);