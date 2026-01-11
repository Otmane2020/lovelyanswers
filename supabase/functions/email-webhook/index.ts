import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Webhook to receive incoming emails from Resend
// Configure at: https://resend.com/webhooks
// Endpoint: https://your-project.supabase.co/functions/v1/email-webhook

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log("[email-webhook] Received:", JSON.stringify(payload));

    // Resend webhook event types:
    // - email.sent
    // - email.delivered
    // - email.bounced
    // - email.complained
    // - email.opened
    // - email.clicked

    const eventType = payload.type;
    const emailData = payload.data;

    // Handle incoming email (email replies)
    // This requires Resend Inbound Email feature
    if (eventType === "email.received" || payload.from) {
      console.log("[email-webhook] Incoming email from:", payload.from || emailData?.from);
      
      // Extract ticket reference from subject or email
      // Format: "Re: Ticket reçu: [Subject]" or similar
      const subject = payload.subject || emailData?.subject || "";
      const fromEmail = payload.from || emailData?.from || "";
      const body = payload.text || payload.html || emailData?.text || "";

      // Find user by email
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("email", fromEmail)
        .single();

      if (profile) {
        // Find most recent open ticket for this user
        const { data: ticket } = await supabase
          .from("support_tickets")
          .select("id, subject")
          .eq("user_id", profile.id)
          .in("status", ["open", "in_progress"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();

        if (ticket) {
          // Add reply as new message
          await supabase.from("support_messages").insert({
            ticket_id: ticket.id,
            sender_type: "user",
            message: body,
          });

          // Update ticket timestamp
          await supabase
            .from("support_tickets")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", ticket.id);

          console.log("[email-webhook] Added reply to ticket:", ticket.id);
        }
      }

      return new Response(JSON.stringify({ success: true, action: "email_received" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Log other events
    console.log(`[email-webhook] Event ${eventType} for email:`, emailData?.email_id);

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
