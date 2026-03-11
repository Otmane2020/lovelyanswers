import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = "AutoPilot Geo <support@autopilotgeo.com>";

interface EmailRequest {
  type: "welcome" | "ticket_created" | "ticket_reply" | "custom";
  to: string;
  name?: string;
  subject?: string;
  ticketId?: string;
  ticketSubject?: string;
  message?: string;
  html?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: EmailRequest = await req.json();
    console.log("[send-email] Request:", data.type, data.to);

    let subject: string;
    let html: string;

    switch (data.type) {
      case "welcome":
        subject = "Bienvenue sur AutoPilot Geo! 🎉";
        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7c3aed; margin: 0;">Bienvenue sur AutoPilot Geo! 🎉</h1>
            </div>
            
            <p>Bonjour ${data.name || ""},</p>
            
            <p>Merci de nous avoir rejoint! Nous sommes ravis de vous compter parmi nous.</p>
            
            <p>Avec AutoPilot Geo, vous pouvez:</p>
            <ul>
              <li>🚀 Générer des réponses AEO optimisées pour les moteurs de recherche</li>
              <li>📝 Créer des articles de blog automatiquement</li>
              <li>📊 Suivre vos performances avec Google Search Console</li>
              <li>🔗 Publier directement sur WordPress, Shopify, Wix et plus</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://app.autopilotgeo.com/dashboard" style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accéder à mon dashboard</a>
            </div>
            
            <p>Si vous avez des questions, n'hésitez pas à nous contacter via le support.</p>
            
            <p>À bientôt,<br><strong>L'équipe AutoPilot Geo</strong></p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">
              AutoPilot Geo - Optimisez votre contenu pour l'ère de l'IA<br>
              <a href="https://autopilotgeo.com" style="color: #7c3aed;">autopilotgeo.com</a>
            </p>
          </body>
          </html>
        `;
        break;

      case "ticket_created":
        subject = `Ticket reçu: ${data.ticketSubject || "Votre demande"}`;
        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7c3aed;">Nous avons bien reçu votre demande 📩</h2>
            
            <p>Bonjour ${data.name || ""},</p>
            
            <p>Votre ticket de support a été créé avec succès. Notre équipe va l'examiner et vous répondre dans les plus brefs délais.</p>
            
            <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Sujet:</strong> ${data.ticketSubject}</p>
              <p style="margin: 10px 0 0;"><strong>Votre message:</strong></p>
              <p style="margin: 5px 0 0; color: #555;">${data.message}</p>
            </div>
            
            <p>Vous pouvez suivre l'état de votre ticket depuis votre dashboard.</p>
            
            <p>Cordialement,<br><strong>L'équipe Support AutoPilot Geo</strong></p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">
              Cet email a été envoyé automatiquement. Répondez directement à ce mail pour continuer la conversation.
            </p>
          </body>
          </html>
        `;
        break;

      case "ticket_reply":
        subject = `Réponse à votre ticket: ${data.ticketSubject || "Support"}`;
        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7c3aed;">Nouvelle réponse à votre ticket 💬</h2>
            
            <p>Bonjour ${data.name || ""},</p>
            
            <p>Notre équipe support a répondu à votre demande:</p>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 20px 0;">
              <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://app.autopilotgeo.com/support" style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">Voir la conversation</a>
            </div>
            
            <p>Cordialement,<br><strong>L'équipe Support AutoPilot Geo</strong></p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">
              Répondez directement à ce mail pour continuer la conversation.
            </p>
          </body>
          </html>
        `;
        break;

      case "custom":
        subject = data.subject || "Message de AutoPilot Geo";
        html = data.html || `<p>${data.message}</p>`;
        break;

      default:
        throw new Error(`Unknown email type: ${data.type}`);
    }

    // Send email using Resend API directly (fetch)
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [data.to],
        subject,
        html,
        reply_to: "support@autopilotgeo.com",
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("[send-email] Resend API error:", errorData);
      throw new Error(errorData.message || `Resend API error: ${emailResponse.status}`);
    }

    const responseData = await emailResponse.json();
    console.log("[send-email] Sent successfully:", responseData);

    return new Response(JSON.stringify({ success: true, id: responseData.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[send-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
