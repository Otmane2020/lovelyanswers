import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Lovely Answers <support@lovelyanswers.com>";
const ADMIN_EMAIL = "support@lovelyanswers.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, any>;
  old_record?: Record<string, any>;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: WebhookPayload = await req.json();
    console.log("[db-email-trigger] Received:", payload.type, payload.table);

    // Handle new profile creation (welcome email)
    if (payload.table === "profiles" && payload.type === "INSERT") {
      const profile = payload.record;
      if (profile.email) {
        console.log("[db-email-trigger] Sending welcome email to:", profile.email);
        
        await sendEmail({
          to: profile.email,
          subject: "Bienvenue sur Lovely Answers! 🎉",
          html: generateWelcomeEmail(profile.full_name || profile.email.split("@")[0]),
        });
      }
    }

    // Handle new support ticket (notify admin)
    if (payload.table === "support_tickets" && payload.type === "INSERT") {
      const ticket = payload.record;
      console.log("[db-email-trigger] New ticket, notifying admin");
      
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `🎫 Nouveau ticket: ${ticket.subject}`,
        html: generateAdminTicketNotification(ticket),
      });
    }

    // Handle new support message from admin (notify user)
    if (payload.table === "support_messages" && payload.type === "INSERT") {
      const message = payload.record;
      
      if (message.sender_type === "admin" || message.sender_type === "support") {
        // Get ticket details
        const { data: ticket } = await supabase
          .from("support_tickets")
          .select("id, subject, user_email, user_id")
          .eq("id", message.ticket_id)
          .single();

        if (ticket && ticket.user_email) {
          // Get user name
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", ticket.user_id)
            .single();

          console.log("[db-email-trigger] Admin replied, notifying user:", ticket.user_email);
          
          await sendEmail({
            to: ticket.user_email,
            subject: `Réponse à votre ticket: ${ticket.subject}`,
            html: generateTicketReplyEmail(
              profile?.full_name || ticket.user_email.split("@")[0],
              ticket.subject,
              message.message
            ),
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[db-email-trigger] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

async function sendEmail(options: { to: string; subject: string; html: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      reply_to: "support@lovelyanswers.com",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[db-email-trigger] Resend error:", error);
    throw new Error(error.message || "Failed to send email");
  }

  const data = await response.json();
  console.log("[db-email-trigger] Email sent:", data.id);
  return data;
}

function generateWelcomeEmail(name: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#F9FAFB;-webkit-font-smoothing:antialiased;">
  <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:12px 16px;border-radius:12px;">
        <span style="color:white;font-size:18px;font-weight:800;letter-spacing:-0.3px;">Lovely Answers</span>
      </div>
    </div>
    <div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07);">
      <div style="background:linear-gradient(135deg,#1E1B4B,#312E81,#4338CA);padding:40px 32px;text-align:center;">
        <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:16px;display:inline-block;margin-bottom:16px;line-height:56px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.2)" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h1 style="font-size:26px;font-weight:800;color:white;margin:0 0 8px;letter-spacing:-0.5px;">Bienvenue, ${name} !</h1>
        <p style="font-size:15px;color:rgba(255,255,255,0.75);margin:0;">Votre compte est prêt.</p>
      </div>
      <div style="padding:32px 28px;">
        <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">Merci de nous avoir rejoint ! Voici ce que vous pouvez faire :</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:12px 0;border-bottom:1px solid #F3F4F6;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:40px;vertical-align:top;"><div style="width:32px;height:32px;background:#EEF2FF;border-radius:10px;text-align:center;line-height:32px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div></td>
              <td><div style="font-size:14px;font-weight:600;color:#111827;">Réponses AEO optimisées</div><div style="font-size:13px;color:#6B7280;margin-top:2px;">Contenu citable par les moteurs IA</div></td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:12px 0;border-bottom:1px solid #F3F4F6;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:40px;vertical-align:top;"><div style="width:32px;height:32px;background:#ECFDF5;border-radius:10px;text-align:center;line-height:32px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div></td>
              <td><div style="font-size:14px;font-weight:600;color:#111827;">30 articles SEO/mois</div><div style="font-size:13px;color:#6B7280;margin-top:2px;">Publiés automatiquement</div></td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:12px 0;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:40px;vertical-align:top;"><div style="width:32px;height:32px;background:#FEF3C7;border-radius:10px;text-align:center;line-height:32px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M18 20V10M12 20V4M6 20v-6" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div></td>
              <td><div style="font-size:14px;font-weight:600;color:#111827;">Analytics & GSC</div><div style="font-size:13px;color:#6B7280;margin-top:2px;">Performances en temps réel</div></td>
            </tr></table>
          </td></tr>
        </table>
        <div style="text-align:center;margin-top:28px;">
          <a href="https://lovelyanswers.lovable.app/dashboard" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(79,70,229,0.4);">Accéder à mon dashboard</a>
        </div>
      </div>
    </div>
    <div style="text-align:center;padding:24px 0 8px;">
      <p style="font-size:11px;color:#9CA3AF;margin:0;">Lovely Answers — Optimisez votre contenu pour l'ère de l'IA</p>
      <a href="https://lovelyanswers.com" style="font-size:11px;color:#6366F1;text-decoration:none;font-weight:600;">lovelyanswers.com</a>
    </div>
  </div>
</body>
</html>`;
}

function generateAdminTicketNotification(ticket: Record<string, any>): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#F9FAFB;-webkit-font-smoothing:antialiased;">
  <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:12px 16px;border-radius:12px;">
        <span style="color:white;font-size:18px;font-weight:800;">Lovely Answers</span>
      </div>
    </div>
    <div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07);">
      <div style="background:linear-gradient(135deg,#DC2626,#EF4444);padding:24px 32px;text-align:center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:8px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="22,6 12,13 2,6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <h1 style="display:inline;font-size:20px;font-weight:800;color:white;vertical-align:middle;">Nouveau Ticket Support</h1>
      </div>
      <div style="padding:28px;">
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px;margin-bottom:20px;">
          <div style="font-size:13px;color:#991B1B;font-weight:600;margin-bottom:8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:6px;"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#991B1B" stroke-width="2" stroke-linecap="round"/><circle cx="8.5" cy="7" r="4" stroke="#991B1B" stroke-width="2"/></svg>
            ${ticket.user_email}
          </div>
          <div style="font-size:15px;font-weight:700;color:#111827;">${ticket.subject}</div>
        </div>
        <div style="background:#F9FAFB;border-radius:12px;padding:16px;border:1px solid #E5E7EB;">
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;">${ticket.message}</p>
        </div>
        <div style="text-align:center;margin-top:24px;">
          <a href="https://lovelyanswers.lovable.app/super-admin" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;box-shadow:0 4px 14px rgba(79,70,229,0.3);">Répondre au ticket</a>
        </div>
        <p style="font-size:11px;color:#9CA3AF;margin:16px 0 0;text-align:center;">Ticket ID: ${ticket.id}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function generateTicketReplyEmail(name: string, subject: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#F9FAFB;-webkit-font-smoothing:antialiased;">
  <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:12px 16px;border-radius:12px;">
        <span style="color:white;font-size:18px;font-weight:800;">Lovely Answers</span>
      </div>
    </div>
    <div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07);">
      <div style="background:linear-gradient(135deg,#1E1B4B,#312E81,#4338CA);padding:32px;text-align:center;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style="display:inline-block;margin-bottom:12px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.15)" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <h1 style="font-size:22px;font-weight:800;color:white;margin:0;">Nouvelle réponse à votre ticket</h1>
      </div>
      <div style="padding:28px;">
        <p style="font-size:15px;color:#374151;margin:0 0 8px;">Bonjour ${name},</p>
        <p style="font-size:14px;color:#6B7280;margin:0 0 20px;">Notre équipe a répondu à "<strong style="color:#111827;">${subject}</strong>" :</p>
        <div style="background:#ECFDF5;border-left:4px solid #059669;border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;color:#065F46;line-height:1.6;white-space:pre-wrap;">${message}</p>
        </div>
        <div style="text-align:center;">
          <a href="https://lovelyanswers.lovable.app/support" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;box-shadow:0 4px 14px rgba(79,70,229,0.3);">Voir la conversation</a>
        </div>
        <p style="font-size:13px;color:#6B7280;margin:20px 0 0;text-align:center;">Cordialement,<br><strong style="color:#111827;">L'équipe Lovely Answers</strong></p>
      </div>
    </div>
    <div style="text-align:center;padding:24px 0 8px;">
      <p style="font-size:10px;color:#D1D5DB;margin:0;">Répondez directement à ce mail pour continuer la conversation.</p>
    </div>
  </div>
</body>
</html>`;
}
