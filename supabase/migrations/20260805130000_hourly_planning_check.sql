-- ============================================================================
-- check-planning-completeness triggers generate-30-gso-contents, which only
-- fills a capped batch of (day, type) slots per invocation to avoid timing
-- out (MAX_SLOTS_PER_RUN, default 8 = 2 days of the 4-type GEO/SEO/AEO/Local
-- AEO set). At the previous once-daily schedule, a project starting from
-- zero would take ~15 days to reach a full 30-day-ahead window. Hourly lets
-- it converge in hours instead, while each tick still only ever generates
-- what's actually missing — never a duplicate, per generate-30-gso-contents'
-- own day+type gap check against the database.
-- ============================================================================

select cron.unschedule('apg-check-planning-completeness');

select cron.schedule(
  'apg-check-planning-completeness',
  '0 * * * *',
  $$ select public.invoke_edge_function('check-planning-completeness'); $$
);

-- Verify: select jobname, schedule, active from cron.job order by jobname;
