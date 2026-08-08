-- ============================================================================
-- Generation and publishing are already scheduled for GEO/SEO/AEO/Local AEO:
--   - generate-30-gso-contents rotates geo -> seo -> aeo -> local_aeo ->
--     shopping (one slot/day/type), driven hourly by check-planning-completeness.
--   - publish-geo-content (06:00 daily) publishes geo_contents (the "geo" type).
--   - publish-scheduled-answers (hourly) publishes answers/articles/local_answers
--     (seo, aeo, local_aeo).
--
-- Shopping was the one type with no publish step scheduled: generate-30-gso-
-- contents enriches the product and writes a shopping_planning row, but
-- publish-shopping-products (which reads shopping_planning and pushes to the
-- connected CMS via cms-publish) was never on a cron — shopping content sat
-- generated and scheduled but never went live on its own.
-- ============================================================================

select cron.schedule(
  'apg-publish-shopping-products',
  '15 6 * * *',
  $$ select public.invoke_edge_function('publish-shopping-products'); $$
);

-- Verify: select jobname, schedule, active from cron.job where jobname = 'apg-publish-shopping-products';
