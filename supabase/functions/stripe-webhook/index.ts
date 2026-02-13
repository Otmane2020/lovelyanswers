import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature) {
    logStep("ERROR: No signature provided");
    return new Response("No signature", { status: 400 });
  }

  if (!webhookSecret) {
    logStep("ERROR: STRIPE_WEBHOOK_SECRET not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  try {
    const body = await req.text();
    // Use async version for Deno/Edge runtime
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(invoice);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logStep("ERROR processing webhook", { error: errorMessage });
    return new Response(`Webhook error: ${errorMessage}`, { status: 400 });
  }
});

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  logStep("Processing paid invoice", { invoiceId: invoice.id, customerId: invoice.customer });

  // Get customer email to find user
  const customer = await stripe.customers.retrieve(invoice.customer as string);
  if (customer.deleted) {
    logStep("Customer deleted, skipping");
    return;
  }

  const email = (customer as Stripe.Customer).email;
  if (!email) {
    logStep("No email found for customer");
    return;
  }

  // Find user by email
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (!profile) {
    logStep("No user found for email", { email });
    return;
  }

  // Insert invoice record
  const { error } = await supabaseAdmin.from("invoices").upsert({
    stripe_invoice_id: invoice.id,
    user_id: profile.id,
    amount: (invoice.amount_paid || 0) / 100, // Convert from cents
    currency: invoice.currency || "usd",
    status: "paid",
    billing_date: new Date(invoice.created * 1000).toISOString(),
    pdf_url: invoice.invoice_pdf || null,
  }, { onConflict: "stripe_invoice_id" });

  if (error) {
    logStep("Error inserting invoice", { error: error.message });
  } else {
    logStep("Invoice saved successfully", { invoiceId: invoice.id, userId: profile.id });
  }
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  logStep("Processing failed invoice", { invoiceId: invoice.id });

  // Update invoice status if it exists
  const { error } = await supabaseAdmin
    .from("invoices")
    .update({ status: "failed" })
    .eq("stripe_invoice_id", invoice.id);

  if (error) {
    logStep("Error updating invoice status", { error: error.message });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  logStep("Subscription updated", { 
    subscriptionId: subscription.id, 
    status: subscription.status,
    customerId: subscription.customer 
  });

  // Get customer email
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if (customer.deleted) return;

  const email = (customer as Stripe.Customer).email;
  if (!email) return;

  // Find user and update credits based on subscription status
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (!profile) return;

  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const creditsTotal = subscription.status === "trialing" ? 50 : (isActive ? 500 : 0);

  await supabaseAdmin.from("credits").upsert({
    user_id: profile.id,
    credits_total: creditsTotal,
    credits_used: 0,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });

  logStep("Credits updated", { userId: profile.id, credits: creditsTotal });

  // AUTO-UNLOCK: When subscription becomes active, unlock all locked articles
  if (isActive) {
    try {
      // Find user's project
      const { data: projects } = await supabaseAdmin
        .from("projects")
        .select("id")
        .eq("user_id", profile.id)
        .limit(1);

      if (projects && projects.length > 0) {
        const projectId = projects[0].id;

        // Get locked articles
        const { data: lockedArticles } = await supabaseAdmin
          .from("articles")
          .select("id, title")
          .eq("project_id", projectId)
          .eq("status", "locked");

        if (lockedArticles && lockedArticles.length > 0) {
          logStep("Found locked articles to unlock", { count: lockedArticles.length, projectId });

          // Update status from locked to scheduled
          const articleIds = lockedArticles.map(a => a.id);
          await supabaseAdmin
            .from("articles")
            .update({ status: "scheduled" })
            .in("id", articleIds);

          // Trigger generation for each article
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

          for (const article of lockedArticles) {
            try {
              await fetch(`${supabaseUrl}/functions/v1/generate-aeo-article`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${serviceRoleKey}`,
                },
                body: JSON.stringify({ articleId: article.id }),
              });
              logStep("Triggered generation for article", { articleId: article.id });
            } catch (genErr) {
              logStep("Error triggering generation", { articleId: article.id, error: String(genErr) });
            }
          }

          logStep("Unlocked articles after subscription activation", { count: lockedArticles.length });
        }
      }
    } catch (unlockErr) {
      logStep("Error in auto-unlock process", { error: String(unlockErr) });
    }
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  logStep("Subscription canceled", { subscriptionId: subscription.id });

  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if (customer.deleted) return;

  const email = (customer as Stripe.Customer).email;
  if (!email) return;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (!profile) return;

  // Reset credits to 0 on cancellation
  await supabaseAdmin.from("credits").upsert({
    user_id: profile.id,
    credits_total: 0,
    credits_used: 0,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });

  logStep("Credits reset for canceled subscription", { userId: profile.id });
}
