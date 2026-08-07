// Backend-to-backend edge function invocation.
// Always authenticates with the service role key so pipelines, cron jobs and
// "Refresh project context" never depend on a browser session.

export interface InternalInvokeResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

export async function invokeInternal<T = any>(
  name: string,
  body: unknown,
  opts: { timeoutMs?: number } = {},
): Promise<InternalInvokeResult<T>> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 240_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        // Lets a called function log/branch on "this came from the backend".
        "x-internal-call": "1",
      },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });

    const text = await res.text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: parsed,
        error: parsed?.error || `${name} returned ${res.status}`,
      };
    }
    return { ok: true, status: res.status, data: parsed as T };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, data: null, error: `${name}: ${message}` };
  } finally {
    clearTimeout(timer);
  }
}
