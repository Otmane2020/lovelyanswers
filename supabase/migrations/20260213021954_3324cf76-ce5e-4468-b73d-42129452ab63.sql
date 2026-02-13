-- Drop the broken policy and recreate proper ones
DROP POLICY IF EXISTS "Users manage own ads reports" ON public.ads_reports;

CREATE POLICY "Users can select own ads reports"
  ON public.ads_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ads reports"
  ON public.ads_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ads reports"
  ON public.ads_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Also fix ads_actions if same issue
DROP POLICY IF EXISTS "Users manage own ads actions" ON public.ads_actions;

CREATE POLICY "Users can select own ads actions"
  ON public.ads_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ads actions"
  ON public.ads_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ads actions"
  ON public.ads_actions FOR UPDATE
  USING (auth.uid() = user_id);
