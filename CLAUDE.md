# AutoPilot GEO — notes for Claude Code

## Never sync/write Supabase Edge Function secrets from a workflow or script

Supabase Edge Function secrets (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DATAFORSEO_LOGIN`/`PASSWORD`, etc.) are managed
**by hand only**, directly in the Supabase dashboard: Project Settings → Edge Functions → Secrets.

Do not add any step to `.github/workflows/deploy-supabase-functions.yml` (or any other workflow)
that pulls values from Vercel, GitHub Actions secrets, or anywhere else and writes them into
Supabase via `supabase secrets set`. This already happened once (08 Aug 2026): a `vercel env pull`
step silently failed/returned garbage one morning, and the sync step that followed it wrote that
garbage into six Supabase secrets simultaneously (and left five others empty) — breaking Stripe
billing and every AI provider call at once, with no error until something tried to use them.

The current workflow only ever deploys function *code*. Keep it that way. If secrets ever need to
change, that's a manual dashboard edit — never automated.
