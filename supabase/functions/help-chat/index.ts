import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { chatCompletion } from "../_shared/ai-call.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KNOWLEDGE_BASE = `
AutoPilot GEO is a platform that gets businesses recommended by AI assistants (ChatGPT, Gemini, Perplexity, Claude) and ranked on Google, by automatically generating and publishing content.

CONTENT TYPES it generates, each in its own format:
- GEO (Generative Engine Optimization): long, citation-ready pieces written so ChatGPT/Gemini/Perplexity can quote them directly as a source.
- AEO (Answer Engine Optimization): short, direct question-and-answer pairs — one question, a concise citable answer.
- SEO: classic long-form structured articles (H2/H3, meta description) for Google ranking.
- Local AEO: location-grounded answers (city, service area, hours) — only generated once Google Business Profile is connected.
- Shopping: AI-enriched product listings (title, description, Q&A) for the catalog — only generated once products exist.

HOW IT WORKS:
1. Onboarding: enter your site URL, the AI analyzes it (category, language, competitors, description) and creates your project.
2. Payment: Starter plan is the current live tier.
3. After payment, content starts generating automatically — 1 piece a day, cycling through the angles above depending on what's connected.
4. To actually go live, connect your CMS/site (WordPress, Shopify, Wix, Webflow, BigCommerce, Framer, or a custom API/webhook) in Settings → Connect. Nothing publishes until that's done.
5. The dashboard has 5 tabs: Today (overview), Content (everything generated, list/calendar view), Presence (integrations), Results (AI visibility tracking — mentions across ChatGPT/Gemini/Perplexity/Claude), Settings (project, account, billing, connections).

COMMON ISSUES:
- "Nothing published yet, X waiting" — completely normal until the CMS is connected; connect it in Settings to start publishing the backlog.
- Content generation can take a few minutes on first visit to the dashboard.
- "Do it for me" in Settings → Connect lets the team connect the CMS on the customer's behalf — no password needed, just inviting support@autopilotgeo.com as a collaborator on their platform.
- Billing/subscription: managed via the Stripe customer portal, reachable from Settings → Manage or the sidebar Upgrade button. Cancel anytime, takes effect immediately.

WHAT YOU CANNOT DO: you cannot see or change billing details, cannot access other customers' data, cannot make code changes. For anything beyond answering questions, tell the user to use "Contact support" instead.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, history = [], projectContext } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are the AutoPilot GEO support assistant, embedded in the app's Help panel. Answer clearly and concisely (a few sentences, use short lists when helpful). Only answer using the knowledge base below and, if given, the user's own project context — never invent features, prices or policies that aren't described here. If a question needs a human (billing dispute, refund, account deletion, a bug you can't explain from this knowledge base), say so plainly and point to "Contact support" instead of guessing.

${KNOWLEDGE_BASE}
${projectContext ? `\nTHIS USER'S PROJECT:\n${projectContext}` : ""}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content).slice(0, 2000),
      })),
      { role: "user", content: message.slice(0, 2000) },
    ];

    const aiResponse = await chatCompletion({
      messages,
      temperature: 0.4,
      max_tokens: 600,
    });

    const reply = aiResponse.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Empty AI response");

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[help-chat] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
