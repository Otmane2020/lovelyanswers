-- Initialize project_settings for all existing projects that don't have settings
-- This fixes the cron job which was finding 0 projects with auto_publish_enabled = true

INSERT INTO project_settings (project_id, auto_publish_enabled, publish_hour, timezone)
SELECT p.id, true, '10', 'Europe/Paris'
FROM projects p
WHERE p.id NOT IN (SELECT project_id FROM project_settings WHERE project_id IS NOT NULL)
ON CONFLICT (project_id) DO NOTHING;