/**
 * Secrets are set directly in Supabase (Project Settings > Edge Functions >
 * Secrets) — nothing syncs them in from elsewhere anymore. This guard exists
 * for the failure mode that got us here: a placeholder value (an unset
 * secret pasted as literal text like "[SENSITIVE]"/"placeholder"/"redacted",
 * or a stray copy-paste artifact) sitting in a real secret's slot, which
 * used to make every call fail on an obviously-bogus credential instead of
 * being treated as "not configured". Catch that shape here so callers can
 * skip a poisoned secret immediately (with a log line naming the cause)
 * instead of burning a request on it and surfacing a cryptic 401.
 */
function looksLikeRealSecret(value: string): boolean {
  const v = value.trim();
  if (v.length < 16) return false;
  if (/[\[\]<>\s"]/.test(v)) return false;
  if (/sensitive|placeholder|redacted/i.test(v)) return false;
  return true;
}

/** Reads an env var and returns it only if it looks like a real secret, not a placeholder. */
export function getUsableSecret(name: string): string | undefined {
  const v = Deno.env.get(name);
  if (!v) return undefined;
  if (!looksLikeRealSecret(v)) {
    console.warn(`[ENV] ${name} is set but doesn't look like a real value (got "${v.slice(0, 20)}") — treating as missing. Check Project Settings > Edge Functions > Secrets in the Supabase dashboard and paste the real value.`);
    return undefined;
  }
  return v;
}
