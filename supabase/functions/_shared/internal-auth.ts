// Shared auth helpers for edge functions that must work BOTH from the browser
// (user JWT) and from backend orchestrators / cron (service role).
//
// Why: onboarding-pipeline, cron jobs and "Refresh project context" run with no
// browser session. Functions that only accepted a user JWT returned 401 in that
// path. These helpers keep the user check for browser calls while letting a
// service-role caller through.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function bearer(req: Request): string | null {
  const h = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7).trim() : h.trim();
}

/** True when the caller presented the service-role key (backend-to-backend). */
export function isServiceRoleRequest(req: Request): boolean {
  const token = bearer(req);
  if (!token) return false;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) return true;
  // Legacy JWT service keys: decode the role claim without verifying (the key
  // itself is the secret — an attacker able to forge it already has it).
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

export interface CallerIdentity {
  ok: boolean;
  isService: boolean;
  userId: string | null;
  error?: string;
}

/**
 * Accepts a service-role call, otherwise validates the user JWT.
 * Returns `{ ok: false }` with a reason so the caller can answer 401.
 */
export async function authenticateCaller(req: Request): Promise<CallerIdentity> {
  const token = bearer(req);
  if (!token) return { ok: false, isService: false, userId: null, error: "Missing authorization header" };
  if (isServiceRoleRequest(req)) return { ok: true, isService: true, userId: null };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return { ok: false, isService: false, userId: null, error: "Unauthorized" };
  return { ok: true, isService: false, userId: data.user.id };
}
