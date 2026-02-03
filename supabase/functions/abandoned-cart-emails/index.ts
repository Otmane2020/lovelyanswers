import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const FROM_EMAIL = "Lovely Answers <support@lovelyanswers.com>";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ABANDONED-CART-EMAILS] ${step}${detailsStr}`);
};

// Get or create a 50% discount coupon
async function getOrCreatePromoCoupon(stripe: Stripe): Promise<string | null> {
  try {
    // Try to find existing coupon
    const coupons = await stripe.coupons.list({ limit: 100 });
    const existingCoupon = coupons.data.find((c: Stripe.Coupon) => 
      c.name === "WELCOME50" && c.percent_off === 50 && c.duration === "once"
    );
    
    if (existingCoupon) {
      logStep("Found existing WELCOME50 coupon", { id: existingCoupon.id });
      return existingCoupon.id;
    }
    
    // Create new coupon
    const newCoupon = await stripe.coupons.create({
      name: "WELCOME50",
      percent_off: 50,
      duration: "once",
      max_redemptions: 1000,
    });
    
    logStep("Created new WELCOME50 coupon", { id: newCoupon.id });
    return newCoupon.id;
  } catch (error) {
    logStep("Error with coupon", { error: String(error) });
    return null;
  }
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      reply_to: "support@lovelyanswers.com",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Resend API error: ${response.status}`);
  }

  return response.json();
}

// Email template for 3h reminder
function get3HourReminderEmail(name?: string, brandName?: string): { subject: string; html: string } {
  return {
    subject: "Complete your subscription to Lovely Answers 🚀",
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #7c3aed;">Hey${name ? ` ${name}` : ""}! 👋</h1>
        
        <p>We noticed you started setting up Lovely Answers${brandName ? ` for <strong>${brandName}</strong>` : ""} but didn't complete your subscription.</p>
        
        <p>Don't miss out on:</p>
        <ul>
          <li>🎯 AI-optimized content that ranks in search engines</li>
          <li>📝 Automatic article generation</li>
          <li>🔗 Direct publishing to your CMS</li>
          <li>📊 Performance tracking with Google Search Console</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://lovelyanswers.com/checkout" style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Complete Your Subscription →</a>
        </div>
        
        <p>Questions? Reply to this email - we're here to help!</p>
        
        <p>Best,<br><strong>The Lovely Answers Team</strong></p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #888; text-align: center;">
          <a href="https://lovelyanswers.com" style="color: #7c3aed;">lovelyanswers.com</a>
        </p>
      </body>
      </html>
    `,
  };
}

// Email template for 2-day promo
function get2DayPromoEmail(name?: string, couponCode: string = "WELCOME50"): { subject: string; html: string } {
  return {
    subject: "🎁 Special offer: 50% off your first month!",
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; font-size: 28px;">50% OFF Your First Month! 🎉</h1>
        </div>
        
        <p>Hey${name ? ` ${name}` : ""}!</p>
        
        <p>We really want to help you grow your organic traffic with AI-optimized content. That's why we're offering you an exclusive discount:</p>
        
        <div style="background: linear-gradient(135deg, #7c3aed10, #a855f720); padding: 25px; border-radius: 12px; text-align: center; margin: 25px 0; border: 2px dashed #7c3aed;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #666;">Use code at checkout:</p>
          <p style="margin: 0; font-size: 32px; font-weight: bold; color: #7c3aed; letter-spacing: 2px;">${couponCode}</p>
          <p style="margin: 10px 0 0; font-size: 18px; color: #333;">50% off your first month!</p>
        </div>
        
        <p>This offer expires in <strong>48 hours</strong>, so don't wait!</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://lovelyanswers.com/checkout" style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px;">Claim My 50% Discount →</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">What you'll get:</p>
        <ul style="color: #666; font-size: 14px;">
          <li>500 AI credits per month</li>
          <li>Unlimited article generation</li>
          <li>CMS auto-publishing</li>
          <li>Priority support</li>
        </ul>
        
        <p>See you inside! 🚀<br><strong>The Lovely Answers Team</strong></p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #888; text-align: center;">
          <a href="https://lovelyanswers.com" style="color: #7c3aed;">lovelyanswers.com</a>
        </p>
      </body>
      </html>
    `,
  };
}

serve(async (req) => {
  try {
    logStep("Function started");

    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000); // Window: 3-4 hours ago
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // Window: 2-3 days ago

    let emailsSent = 0;

    // 1. Send 3-hour reminder emails
    logStep("Checking for 3-hour abandoned carts");
    
    const { data: threeHourSessions, error: threeHourError } = await supabaseAdmin
      .from("onboarding_sessions")
      .select("*")
      .not("checkout_started_at", "is", null)
      .is("converted_at", null)
      .eq("abandoned_email_sent", false)
      .not("email", "is", null)
      .lt("checkout_started_at", threeHoursAgo.toISOString())
      .gt("checkout_started_at", fourHoursAgo.toISOString());

    if (threeHourError) {
      logStep("Error fetching 3-hour sessions", { error: threeHourError.message });
    } else {
      logStep(`Found ${threeHourSessions?.length || 0} sessions for 3-hour reminder`);
      
      for (const session of threeHourSessions || []) {
        try {
          const { subject, html } = get3HourReminderEmail(session.brand_name, session.brand_name);
          await sendEmail(session.email!, subject, html);
          
          // Mark as sent
          await supabaseAdmin
            .from("onboarding_sessions")
            .update({ 
              abandoned_email_sent: true, 
              abandoned_email_sent_at: new Date().toISOString() 
            })
            .eq("id", session.id);
          
          emailsSent++;
          logStep("Sent 3-hour reminder", { email: session.email });
        } catch (error) {
          logStep("Error sending 3-hour email", { email: session.email, error: String(error) });
        }
      }
    }

    // 2. Send 2-day promo emails with discount code
    logStep("Checking for 2-day promo emails");
    
    const { data: twoDaySessions, error: twoDayError } = await supabaseAdmin
      .from("onboarding_sessions")
      .select("*")
      .not("checkout_started_at", "is", null)
      .is("converted_at", null)
      .eq("abandoned_email_sent", true) // Must have received 3h email first
      .eq("promo_email_sent", false)
      .not("email", "is", null)
      .lt("checkout_started_at", twoDaysAgo.toISOString())
      .gt("checkout_started_at", threeDaysAgo.toISOString());

    if (twoDayError) {
      logStep("Error fetching 2-day sessions", { error: twoDayError.message });
    } else {
      logStep(`Found ${twoDaySessions?.length || 0} sessions for 2-day promo`);
      
      // Get/create the promo coupon in Stripe
      let couponCode = "WELCOME50";
      if (STRIPE_SECRET_KEY) {
        const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
        await getOrCreatePromoCoupon(stripe);
      }
      
      for (const session of twoDaySessions || []) {
        try {
          const { subject, html } = get2DayPromoEmail(session.brand_name, couponCode);
          await sendEmail(session.email!, subject, html);
          
          // Mark as sent
          await supabaseAdmin
            .from("onboarding_sessions")
            .update({ 
              promo_email_sent: true, 
              promo_email_sent_at: new Date().toISOString() 
            })
            .eq("id", session.id);
          
          emailsSent++;
          logStep("Sent 2-day promo", { email: session.email });
        } catch (error) {
          logStep("Error sending 2-day promo email", { email: session.email, error: String(error) });
        }
      }
    }

    logStep("Function completed", { emailsSent });

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent,
      timestamp: new Date().toISOString()
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
