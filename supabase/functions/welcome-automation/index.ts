import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ELEVEN_KEY   = Deno.env.get("ELEVENLABS_API_KEY")!;
const TWILIO_SID   = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_FROM  = Deno.env.get("TWILIO_PHONE_NUMBER")!;   // +1XXXXXXXXXX
const WA_FROM      = Deno.env.get("TWILIO_WHATSAPP_NUMBER")!; // whatsapp:+1XXXXXXXXXX

// ElevenLabs Conversational AI agent IDs per language
const AGENTS: Record<string, string> = {
  en: "agent_4701kmaktabje0mrwkr4hstzwjdt",
  fr: "agent_6301kmaktc90ex2tg3zzh0s9tv8p",
};

// Map country code → language
function getLang(country: string): string {
  const fr = ["FR", "BE", "CH", "LU", "MC", "CI", "SN", "CM", "MG", "BF"];
  return fr.includes(country?.toUpperCase()) ? "fr" : "en";
}

// WhatsApp messages per language
const WA_MSG: Record<string, (name: string) => string> = {
  en: (name) =>
    `👋 Hi ${name || "there"}! Welcome to *AutoPilotGeo*.\n\n` +
    `Your account is ready. Here's what happens next:\n` +
    `1️⃣ Go to your dashboard → autopilotgeo.com/dashboard\n` +
    `2️⃣ Enter your website URL\n` +
    `3️⃣ We'll publish your first 30 SEO articles automatically\n\n` +
    `You'll start appearing in ChatGPT, Gemini & Perplexity within days. 🚀\n\n` +
    `Any questions? Just reply here!`,
  fr: (name) =>
    `👋 Bonjour ${name || ""} ! Bienvenue sur *AutoPilotGeo*.\n\n` +
    `Votre compte est prêt. Voici les prochaines étapes :\n` +
    `1️⃣ Allez sur votre dashboard → autopilotgeo.com/dashboard\n` +
    `2️⃣ Entrez l'URL de votre site\n` +
    `3️⃣ Nous publions automatiquement vos 30 premiers articles SEO\n\n` +
    `Vous apparaîtrez dans ChatGPT, Gemini & Perplexity en quelques jours. 🚀\n\n` +
    `Des questions ? Répondez directement ici !`,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    console.log("[welcome-automation] Payload:", JSON.stringify(payload));

    // Support direct call or webhook from db-email-trigger
    const profile = payload.record || payload;
    const { full_name, email, phone, country } = profile;

    const lang    = getLang(country || "");
    const agentId = AGENTS[lang] || AGENTS["en"];
    const results: Record<string, unknown> = { lang, email, phone: !!phone };

    // ── 1. ElevenLabs outbound call (if phone provided) ──────────
    if (phone && TWILIO_SID && ELEVEN_KEY) {
      try {
        // Register phone number with ElevenLabs via Twilio
        const callRes = await fetch(
          `https://api.elevenlabs.io/v1/convai/twilio/outbound-call`,
          {
            method: "POST",
            headers: {
              "xi-api-key": ELEVEN_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              agent_id: agentId,
              agent_phone_number_id: TWILIO_FROM,
              to_number: phone,
              conversation_initiation_client_data: {
                dynamic_variables: {
                  user_name: full_name || email?.split("@")[0] || "there",
                  user_email: email,
                  language: lang,
                },
              },
            }),
          }
        );

        const callData = await callRes.json();
        console.log("[call] ElevenLabs response:", JSON.stringify(callData));
        results.call = callData.call_sid || callData;
      } catch (err) {
        console.error("[call] Error:", err);
        results.call_error = String(err);
      }
    }

    // ── 2. WhatsApp message via Twilio ────────────────────────────
    if (phone && TWILIO_SID && WA_FROM) {
      try {
        const waBody = WA_MSG[lang](full_name || "");
        const waTo   = `whatsapp:${phone}`;

        const form = new URLSearchParams({
          From: WA_FROM,
          To:   waTo,
          Body: waBody,
        });

        const waRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
            },
            body: form.toString(),
          }
        );
        const waData = await waRes.json();
        console.log("[whatsapp] Twilio response:", JSON.stringify(waData));
        results.whatsapp = waData.sid || waData;
      } catch (err) {
        console.error("[whatsapp] Error:", err);
        results.whatsapp_error = String(err);
      }
    }

    // ── 3. Log result in Supabase ─────────────────────────────────
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("automation_logs").insert({
        email,
        phone,
        lang,
        results: JSON.stringify(results),
        created_at: new Date().toISOString(),
      });
    } catch (_) { /* log table optional */ }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[welcome-automation] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
