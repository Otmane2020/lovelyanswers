-- ============================================================================
-- Fix the scheduled jobs — nothing was actually running.
--
-- Two separate causes:
--
--   1. supabase/config.toml declared `schedule = "..."` under [functions.x] for
--      6 functions. That is not a Supabase feature: only verify_jwt, import_map
--      and entrypoint exist there. Those 6 functions were never scheduled.
--
--   2. The only real pg_cron jobs both called publish-scheduled-answers and both
--      failed on every run:
--        - 'publish-scheduled-content' read
--          current_setting('app.settings.service_role_key', true) → NULL
--          (missing_ok), so 'Bearer ' || NULL = NULL → unauthenticated → 401.
--        - 'publish-scheduled-answers-hourly' read
--          current_setting('app.settings.supabase_url') without missing_ok →
--          raised an exception every run.
--      Those app.settings.* GUCs are read in 3 migrations but never set anywhere.
--
-- The fix reads the service role key from Vault instead of an unset GUC, so the
-- key never lands in this file (which is committed to git).
--
-- PREREQUISITE — run once, before this migration:
--     select vault.create_secret('<YOUR_SERVICE_ROLE_KEY>', 'service_role_key');
-- ============================================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Fail loudly now rather than silently every run, which is exactly the failure
-- mode this migration exists to remove.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'service_role_key') then
    raise exception using
      message = 'Vault secret "service_role_key" is missing.',
      hint    = 'Run: select vault.create_secret(''<YOUR_SERVICE_ROLE_KEY>'', ''service_role_key''); then re-run this migration.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Remove the broken jobs (and any earlier attempt at the new ones, so this
-- migration stays re-runnable).
-- ---------------------------------------------------------------------------
do $$
declare
  job text;
begin
  foreach job in array array[
    'publish-scheduled-content',
    'publish-scheduled-answers-hourly',
    'apg-publish-scheduled-answers',
    'apg-daily-content-rotation',
    'apg-publish-geo-content',
    'apg-daily-planning-fill',
    'apg-index-published-articles'
  ] loop
    if exists (select 1 from cron.job where jobname = job) then
      perform cron.unschedule(job);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Helper: POST to an edge function with the service role key from Vault.
-- ---------------------------------------------------------------------------
create or replace function public.invoke_edge_function(function_name text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  request_id bigint;
  key text;
begin
  select decrypted_secret into key
  from vault.decrypted_secrets
  where name = 'service_role_key';

  if key is null then
    raise exception 'Vault secret "service_role_key" is missing; cron job % cannot authenticate', function_name;
  end if;

  select net.http_post(
    url := 'https://pnohfokjlhpzrkczruju.supabase.co/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || key
    ),
    body := '{}'::jsonb
  ) into request_id;

  return request_id;
end $$;

comment on function public.invoke_edge_function(text) is
  'Calls a Supabase edge function from pg_cron, authenticating with the service role key held in Vault.';

-- ---------------------------------------------------------------------------
-- Schedule the jobs. All times UTC.
-- ---------------------------------------------------------------------------

-- One piece of content a day per active project, cycling
-- GEO → SEO → AEO → Local AEO.
select cron.schedule(
  'apg-daily-content-rotation',
  '0 5 * * *',
  $$ select public.invoke_edge_function('daily-content-rotation'); $$
);

-- Publishes whatever is due, an hour after generation.
select cron.schedule(
  'apg-publish-geo-content',
  '0 6 * * *',
  $$ select public.invoke_edge_function('publish-geo-content'); $$
);

select cron.schedule(
  'apg-publish-scheduled-answers',
  '0 * * * *',
  $$ select public.invoke_edge_function('publish-scheduled-answers'); $$
);

select cron.schedule(
  'apg-daily-planning-fill',
  '30 4 * * *',
  $$ select public.invoke_edge_function('daily-planning-fill'); $$
);

select cron.schedule(
  'apg-index-published-articles',
  '30 * * * *',
  $$ select public.invoke_edge_function('index-published-articles'); $$
);

-- ---------------------------------------------------------------------------
-- Verify:
--   select jobname, schedule, active from cron.job order by jobname;
--   select j.jobname, d.status, d.return_message, d.start_time
--     from cron.job_run_details d join cron.job j using (jobid)
--    order by d.start_time desc limit 20;
-- The second query is the one that proves the jobs actually succeed.
-- ---------------------------------------------------------------------------
