-- track-mentions (the AI Mentions metric's data source) was only ever
-- reachable via the manual "Run first check" button — never scheduled, so
-- the `mentions` table stayed empty and the dashboard correctly showed 0
-- forever unless someone clicked that button. Runs once daily, now looping
-- over every active project when called with no body (see index.ts).
select cron.schedule(
  'apg-track-mentions',
  '0 7 * * *',
  $$ select public.invoke_edge_function('track-mentions'); $$
);
