/**
 * Shared AI caller: OpenRouter free models first, Lovable AI Gateway as fallback.
 *
 * OpenRouter caps `:free` models per account per day (50/day under 10 credits).
 * When that quota is hit every generation function used to hard-fail with 429.
 * This helper walks the free model chain and then falls back to the Lovable AI
 * Gateway (Gemini) so content generation never stops on a provider quota.
 *
 * Keys read here (OPENROUTER_API_KEY, GEMINI_API_KEY, etc.) are synced into
 * Supabase Edge Function secrets by the deploy workflow's Vercel pull step.
 */

export const OPENROUTER_FREE_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "openai/gpt-oss-20b:free",
];

// Google Gemini native API (OpenAI-compatible endpoint), first fallback.
export const GEMINI_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

// DeepSeek API, second fallback.
export const DEEPSEEK_FALLBACK_MODELS = ["deepseek-chat"];

// Lovable AI Gateway models (billed to the workspace, last resort).
export const LOVABLE_FALLBACK_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
];


export interface ChatBody {
  messages: any[];
  temperature?: number;
  max_tokens?: number;
  response_format?: any;
  tools?: any[];
  tool_choice?: any;
  /** Optional override of the OpenRouter free model chain. */
  models?: string[];
  referer?: string;
  title?: string;
}

export interface ChatResult {
  choices: Array<{ message: { content?: string; tool_calls?: any[] } }>;
  model: string;
  provider: "openrouter" | "gemini" | "deepseek" | "lovable";
}

function buildBody(model: string, opts: ChatBody) {
  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.max_tokens ?? 4000,
  };
  if (opts.response_format) body.response_format = opts.response_format;
  if (opts.tools) body.tools = opts.tools;
  if (opts.tool_choice) body.tool_choice = opts.tool_choice;
  return body;
}

async function tryEndpoint(
  url: string,
  apiKey: string,
  model: string,
  opts: ChatBody,
  extraHeaders: Record<string, string> = {},
): Promise<
  | { ok: true; message: any }
  | { ok: false; retry: boolean; status?: number; error: string }
> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(buildBody(model, opts)),
  });

  if ([402, 404, 408, 429].includes(response.status) || response.status >= 500) {
    const text = await response.text().catch(() => "");
    console.warn(`[AI] ${model} unavailable (${response.status}): ${text.slice(0, 160)}`);
    return { ok: false, retry: true, status: response.status, error: text };
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error(`[AI] ${model} error ${response.status}: ${errText.slice(0, 300)}`);
    return { ok: false, retry: false, status: response.status, error: errText };
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message;
  const hasContent = message?.content && String(message.content).trim().length > 0;
  const hasTools = Array.isArray(message?.tool_calls) && message.tool_calls.length > 0;
  if (!message || (!hasContent && !hasTools)) {
    console.warn(`[AI] ${model} returned empty content`);
    return { ok: false, retry: true, error: "empty response" };
  }

  console.log(`[AI] success with ${model}`);
  return { ok: true, message };
}

/**
 * Runs a chat completion with automatic provider fallback.
 * Returns an OpenRouter-shaped payload so call sites stay unchanged.
 */
export async function chatCompletion(opts: ChatBody): Promise<ChatResult> {
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const referer = opts.referer ?? "https://autopilotgeo.com";
  const title = opts.title ?? "AutopilotGEO";

  let lastError = "no provider available";
  let lastStatus: number | undefined;

  if (openrouterKey) {
    const models = opts.models?.length ? opts.models : OPENROUTER_FREE_MODELS;
    for (const model of models) {
      try {
        const r = await tryEndpoint(
          "https://openrouter.ai/api/v1/chat/completions",
          openrouterKey,
          model,
          opts,
          { "HTTP-Referer": referer, "X-Title": title },
        );
        if (r.ok) return { choices: [{ message: r.message }], model, provider: "openrouter" };
        lastError = r.error;
        lastStatus = r.status;
        if (!r.retry) break;
      } catch (err) {
        console.error(`[AI:OpenRouter] ${model} threw:`, err);
        lastError = String(err);
      }
    }
  } else {
    console.warn("[AI] OPENROUTER_API_KEY not set, skipping OpenRouter");
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    console.log("[AI] OpenRouter exhausted, falling back to Gemini API");
    for (const model of GEMINI_FALLBACK_MODELS) {
      try {
        const r = await tryEndpoint(
          "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          geminiKey,
          model,
          opts,
        );
        if (r.ok) return { choices: [{ message: r.message }], model, provider: "gemini" };
        lastError = r.error;
        lastStatus = r.status;
      } catch (err) {
        console.error(`[AI:Gemini] ${model} threw:`, err);
        lastError = String(err);
      }
    }
  } else {
    console.warn("[AI] GEMINI_API_KEY not set, skipping Gemini fallback");
  }

  const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (deepseekKey) {
    console.log("[AI] Gemini unavailable, falling back to DeepSeek");
    for (const model of DEEPSEEK_FALLBACK_MODELS) {
      try {
        const r = await tryEndpoint(
          "https://api.deepseek.com/chat/completions",
          deepseekKey,
          model,
          opts,
        );
        if (r.ok) return { choices: [{ message: r.message }], model, provider: "deepseek" };
        lastError = r.error;
        lastStatus = r.status;
      } catch (err) {
        console.error(`[AI:DeepSeek] ${model} threw:`, err);
        lastError = String(err);
      }
    }
  } else {
    console.warn("[AI] DEEPSEEK_API_KEY not set, skipping DeepSeek fallback");
  }

  if (lovableKey) {
    console.log("[AI] OpenRouter exhausted, falling back to Lovable AI Gateway");
    for (const model of LOVABLE_FALLBACK_MODELS) {
      try {
        const r = await tryEndpoint(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          lovableKey,
          model,
          opts,
        );
        if (r.ok) return { choices: [{ message: r.message }], model, provider: "lovable" };
        lastError = r.error;
        lastStatus = r.status;
      } catch (err) {
        console.error(`[AI:Lovable] ${model} threw:`, err);
        lastError = String(err);
      }
    }
  } else {
    console.warn("[AI] LOVABLE_API_KEY not set, skipping Lovable AI fallback");
  }

  throw new Error(
    `All AI providers exhausted (last status ${lastStatus ?? "n/a"}): ${String(lastError).slice(0, 300)}`,
  );
}

/** Convenience wrapper returning the text content only. */
export async function chatText(opts: ChatBody): Promise<string> {
  const res = await chatCompletion(opts);
  return String(res.choices[0].message.content ?? "").trim();
}
