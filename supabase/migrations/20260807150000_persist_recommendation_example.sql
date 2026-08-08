-- The onboarding "Avec AutopilotGEO" preview shows a real AI-written
-- recommendation example the first time analyze-website succeeds, but it
-- only ever lived in React state — never persisted. Any resumed/reloaded
-- onboarding session (existing project, not yet subscribed) lost it and
-- permanently fell back to generic placeholder copy instead of the real
-- AI output. Persisting it lets a resume restore the real value.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS recommendation_example text;
