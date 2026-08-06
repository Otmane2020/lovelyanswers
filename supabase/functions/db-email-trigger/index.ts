import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "AutoPilot Geo <support@autopilotgeo.com>";
const ADMIN_EMAIL = "support@autopilotgeo.com";
const SIGNUP_NOTIFICATION_EMAIL = "oben.rockman@gmail.com";

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

    // Handle new profile creation (welcome email + AI automation)
    if (payload.table === "profiles" && payload.type === "INSERT") {
      const profile = payload.record;
      if (profile.email) {
        console.log("[db-email-trigger] Sending welcome email to:", profile.email);

        await sendEmail({
          to: profile.email,
          subject: "Bienvenue sur AutoPilot Geo! 🎉",
          html: generateWelcomeEmail(profile.full_name || profile.email.split("@")[0]),
        });

        // Notify admin of the new registration
        await sendEmail({
          to: SIGNUP_NOTIFICATION_EMAIL,
          subject: `🆕 Nouvel utilisateur inscrit: ${profile.email}`,
          html: generateNewUserNotification(profile),
        }).catch((err) => console.error("[db-email-trigger] signup notification error:", err));

        // Trigger AI welcome call + WhatsApp (fire & forget)
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        fetch(`${supabaseUrl}/functions/v1/welcome-automation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ record: profile }),
        }).catch((err) => console.error("[db-email-trigger] welcome-automation error:", err));
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
      reply_to: "support@autopilotgeo.com",
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
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2e3a8c; margin: 0;">Bienvenue sur AutoPilot Geo! 🎉</h1>
      </div>
      
      <p>Bonjour ${name},</p>
      
      <p>Merci de nous avoir rejoint! Nous sommes ravis de vous compter parmi nous.</p>
      
      <p>Avec AutoPilot Geo, vous pouvez:</p>
      <ul>
        <li>🚀 Générer des réponses AEO optimisées pour les moteurs de recherche</li>
        <li>📝 Créer des articles de blog automatiquement</li>
        <li>📊 Suivre vos performances avec Google Search Console</li>
        <li>🔗 Publier directement sur WordPress, Shopify, Wix et plus</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://app.autopilotgeo.com/dashboard" style="background: linear-gradient(135deg, #2e3a8c, #5f6ce0); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accéder à mon dashboard</a>
      </div>
      
      <p>Si vous avez des questions, n'hésitez pas à nous contacter via le support.</p>
      
      <p>À bientôt,<br><strong>L'équipe AutoPilot Geo</strong></p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #888; text-align: center;">
        AutoPilot Geo - Optimisez votre contenu pour l'ère de l'IA<br>
        <a href="https://autopilotgeo.com" style="color: #2e3a8c;">autopilotgeo.com</a>
      </p>
    </body>
    </html>
  `;
}

function generateNewUserNotification(profile: Record<string, any>): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2e3a8c;">🆕 Nouvel utilisateur inscrit</h2>

      <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Nom:</strong> ${profile.full_name || "N/A"}</p>
        <p style="margin: 10px 0 0;"><strong>Email:</strong> ${profile.email}</p>
        <p style="margin: 10px 0 0;"><strong>ID:</strong> ${profile.id}</p>
      </div>
    </body>
    </html>
  `;
}

function generateAdminTicketNotification(ticket: Record<string, any>): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2e3a8c;">🎫 Nouveau Ticket de Support</h2>
      
      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <p style="margin: 0;"><strong>De:</strong> ${ticket.user_email}</p>
        <p style="margin: 10px 0 0;"><strong>Sujet:</strong> ${ticket.subject}</p>
      </div>
      
      <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; white-space: pre-wrap;">${ticket.message}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://app.autopilotgeo.com/super-admin" style="background: linear-gradient(135deg, #2e3a8c, #5f6ce0); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">Répondre au ticket</a>
      </div>
      
      <p style="font-size: 12px; color: #888;">Ticket ID: ${ticket.id}</p>
    </body>
    </html>
  `;
}

function generateTicketReplyEmail(name: string, subject: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2e3a8c;">Nouvelle réponse à votre ticket 💬</h2>
      
      <p>Bonjour ${name},</p>
      
      <p>Notre équipe support a répondu à votre demande "<strong>${subject}</strong>":</p>
      
      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 20px 0;">
        <p style="margin: 0; white-space: pre-wrap;">${message}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://autopilotgeo.com/support" style="background: linear-gradient(135deg, #2e3a8c, #5f6ce0); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">Voir la conversation</a>
      </div>
      
      <p>Cordialement,<br><strong>L'équipe Support AutoPilot Geo</strong></p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #888; text-align: center;">
        Répondez directement à ce mail pour continuer la conversation.
      </p>
    </body>
    </html>
  `;
}
