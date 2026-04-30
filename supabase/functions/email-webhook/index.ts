import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

// Webhook to receive incoming emails from Resend
// Endpoint: https://pnohfokjlhpzrkczruju.supabase.co/functions/v1/email-webhook
// Configure at: https://resend.com/webhooks (event: email.received)

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log("[email-webhook] Received:", JSON.stringify(payload).slice(0, 500));

    const eventType = payload.type;
    const emailData = payload.data || payload;

    // Handle inbound email
    if (eventType === "email.received" || eventType === "inbound.email" || payload.from) {
      // Resend inbound payload formats vary; try multiple paths
      const fromRaw = emailData.from || payload.from || "";
      const fromEmail = typeof fromRaw === "string"
        ? (fromRaw.match(/<(.+?)>/)?.[1] || fromRaw).trim().toLowerCase()
        : (fromRaw.email || "").toLowerCase();
      const fromName = typeof fromRaw === "string"
        ? fromRaw.replace(/<.+?>/, "").trim().replace(/^"|"$/g, "")
        : fromRaw.name || null;

      const toRaw = emailData.to || payload.to || "";
      const toEmail = Array.isArray(toRaw) ? toRaw[0] : (typeof toRaw === "string" ? toRaw : toRaw?.email || "");

      const subject = emailData.subject || payload.subject || "(no subject)";
      const bodyText = emailData.text || payload.text || emailData.plain || "";
      const bodyHtml = emailData.html || payload.html || "";
      const resendId = emailData.email_id || emailData.id || payload.id || null;

      // Save EVERY incoming email
      const { data: inserted, error: insertErr } = await supabase
        .from("inbox_emails")
        .insert({
          from_email: fromEmail,
          from_name: fromName,
          to_email: toEmail,
          subject,
          body_text: bodyText,
          body_html: bodyHtml,
          resend_email_id: resendId,
          raw_payload: payload,
        })
        .select()
        .single();

      if (insertErr) {
        console.error("[email-webhook] Insert inbox_emails error:", insertErr);
      } else {
        console.log("[email-webhook] Saved inbox email:", inserted?.id);
      }

      // Also try to link to existing ticket if from a known user
      if (fromEmail) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", fromEmail)
          .maybeSingle();

        if (profile) {
          const { data: ticket } = await supabase
            .from("support_tickets")
            .select("id")
            .eq("user_id", profile.id)
            .in("status", ["open", "in_progress"])
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (ticket) {
            await supabase.from("support_messages").insert({
              ticket_id: ticket.id,
              sender_type: "user",
              message: bodyText || bodyHtml,
            });
            await supabase
              .from("support_tickets")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", ticket.id);
            console.log("[email-webhook] Linked to ticket:", ticket.id);
          }
        }
      }

      return new Response(JSON.stringify({ success: true, action: "email_received" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[email-webhook] Event ${eventType} ignored`);
    return new Response(JSON.stringify({ success: true, event: eventType }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[email-webhook] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
