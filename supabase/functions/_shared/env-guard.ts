/**
 * Vercel env vars marked "Sensitive" get replaced with a short placeholder
 * (e.g. "[SENSITIVE]") when `vercel env pull` runs in CI, which then gets
 * synced into Supabase secrets as if it were the real value — every call
 * using it then fails on an obviously-bogus credential instead of being
 * treated as "not configured". Catch that shape here so callers can skip a
 * poisoned secret immediately (with a log line naming the cause) instead of
 * burning a request on it and surfacing a cryptic 401 from the provider.
 */
function looksLikeRealSecret(value: string): boolean {
  const v = value.trim();
  if (v.length < 16) return false;
  if (/[\[\]<>\s"]/.test(v)) return false;
  if (/sensitive|placeholder|redacted/i.test(v)) return false;
  return true;
}

/** Reads an env var and returns it only if it looks like a real secret, not a Vercel placeholder. */
export function getUsableSecret(name: string): string | undefined {
  const v = Deno.env.get(name);
  if (!v) return undefined;
  if (!looksLikeRealSecret(v)) {
    console.warn(`[ENV] ${name} is set but doesn't look like a real value (got "${v.slice(0, 20)}") — treating as missing. If this env var is marked "Sensitive" in Vercel, the CI secrets-sync step only ever receives a placeholder; uncheck Sensitive and redeploy.`);
    return undefined;
  }
  return v;
}
