-- ============================================================================
-- Stop scheduling daily-content-rotation — it duplicated a more complete
-- system that already existed in this codebase.
--
-- daily-planning-fill + check-planning-completeness already maintain a
-- rolling 30-day content calendar per project (AEO answers/articles track +
-- GSO/geo_contents track), generated via generate-30-days-content and
-- backfilled a few days at a time on every cron run. daily-content-rotation
-- (added this session, before this was discovered) only produced one plain
-- piece a day with no real 30-day queue and no relationship to the existing
-- `planning` table — a shallower, competing implementation.
--
-- check-planning-completeness was never actually scheduled despite being the
-- system's own health-check/regeneration safety net; adding it here.
-- ============================================================================

select cron.unschedule('apg-daily-content-rotation');

select cron.schedule(
  'apg-check-planning-completeness',
  '0 5 * * *',
  $$ select public.invoke_edge_function('check-planning-completeness'); $$
);

-- Verify: select jobname, schedule, active from cron.job order by jobname;
