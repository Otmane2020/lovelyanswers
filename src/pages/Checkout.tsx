import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Shield,
  LogOut,
  Star,
  CheckCircle2,
} from "lucide-react";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { cn } from "@/lib/utils";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

// TODO: Replace with your actual Stripe publishable key
const stripePromise = loadStripe("pk_live_51Ssm3vEfti9t9nN9JMgVg7zMlGJ2lZYMvWjrKpKWlXJ6oqP5rjJYNMEZlBRHeWlw06BKHiWBJfvqjM3oLxfPMqWb00dZZPLkUa");

const features = [
  { label: "AEO Answers", desc: "Rank #1 on ChatGPT, Gemini & Perplexity" },
  { label: "30 Articles/month", desc: "SEO-optimized, auto-published" },
  { label: "Local AEO", desc: "Dominate local AI search results" },
  { label: "Auto-publishing", desc: "WordPress, Shopify, Webflow & more" },
  { label: "Keyword Research", desc: "Automated SERP clustering" },
  { label: "Reddit Agent", desc: "Brand visibility & backlinks" },
  { label: "Technical SEO Audit", desc: "Google + AI crawlers" },
  { label: "20+ Languages", desc: "Supported worldwide" },
];

export default function Checkout() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isSubscribed, isTrial, isLoading: subLoading } = useSubscriptionContext();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [showCheckout, setShowCheckout] = useState(false);

  // Force light theme
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    return () => {};
  }, []);

  // Redirect subscribed users
  useEffect(() => {
    if (!subLoading && (isSubscribed || isTrial)) {
      navigate("/dashboard", { replace: true });
    }
  }, [isSubscribed, isTrial, subLoading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Fetch client secret for embedded checkout
  const fetchClientSecret = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { plan: billingCycle, embedded: true },
    });

    if (error || !data?.clientSecret) {
      console.error("Embedded checkout error:", error);
      toast({
        title: "Checkout error",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
      throw new Error("Failed to create checkout session");
    }

    return data.clientSecret as string;
  }, [billingCycle, toast]);

  if (subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking subscription...</p>
        </div>
      </div>
    );
  }

  const monthlyPrice = 29;
  const originalMonthlyPrice = 58;
  const annualPrice = 279;
  const annualMonthlyEquiv = Math.round(annualPrice / 12);

  // Calculate trial end date
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 3);
  const trialEndFormatted = trialEndDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-4 px-4 border-b border-border">
        <div className="container flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <AnimatedLogo size="md" />
            <span className="text-xl font-bold tracking-tight text-foreground">
              Lovely
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">
                Answers
              </span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Plan Selection + Features */}
        <div className="lg:w-1/2 flex flex-col items-center justify-center px-4 py-8 lg:py-12">
          <div className="w-full max-w-md space-y-6">
            {/* Title */}
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-primary">Hire Lovely</p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Your 24/7 AI Marketing Agent
              </h1>
            </div>

            {/* Plan Toggle */}
            <div className="space-y-3">
              {/* Annual */}
              <button
                onClick={() => {
                  setBillingCycle("annual");
                  setShowCheckout(false);
                }}
                className={cn(
                  "w-full p-5 rounded-2xl border-2 text-left transition-all relative",
                  billingCycle === "annual"
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <div className="absolute -top-3 left-4">
                  <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    2 months free
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg text-muted-foreground line-through">
                        ${originalMonthlyPrice}
                      </span>
                      <span className="text-3xl font-bold text-foreground">
                        ${annualMonthlyEquiv}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Billed ${annualPrice}/year
                    </p>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      billingCycle === "annual"
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {billingCycle === "annual" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </button>

              {/* Monthly */}
              <button
                onClick={() => {
                  setBillingCycle("monthly");
                  setShowCheckout(false);
                }}
                className={cn(
                  "w-full p-5 rounded-2xl border-2 text-left transition-all relative",
                  billingCycle === "monthly"
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">
                        ${monthlyPrice}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Billed monthly
                    </p>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      billingCycle === "monthly"
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {billingCycle === "monthly" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </button>
            </div>

            {/* Trial info */}
            <p className="text-center text-sm text-muted-foreground">
              Free for 3 days · You'll be charged on {trialEndFormatted}
            </p>

            {/* Buy Now button (shows embedded checkout) */}
            {!showCheckout && (
              <Button
                onClick={() => setShowCheckout(true)}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 transition-opacity rounded-xl"
              >
                Buy now for ${billingCycle === "monthly" ? monthlyPrice : annualMonthlyEquiv}/m
              </Button>
            )}

            {/* Guarantee */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>14-day money-back guarantee</span>
            </div>

            {/* Features */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Everything included
              </p>
              <ul className="grid grid-cols-1 gap-2">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-foreground">{f.label}</span>
                      <span className="text-muted-foreground ml-1">— {f.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* TrustAvis */}
            <a
              href="https://trust-avis.com/entreprise/lovelyanswers"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm">
                <span className="font-semibold text-foreground">4.9</span>
                <span className="text-muted-foreground"> · 289 reviews</span>
              </span>
            </a>
          </div>
        </div>

        {/* Right: Embedded Stripe Checkout */}
        <div className="lg:w-1/2 bg-muted/30 border-l border-border flex items-center justify-center px-4 py-8 lg:py-12">
          <div className="w-full max-w-lg">
            {showCheckout ? (
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ fetchClientSecret }}
              >
                <EmbeddedCheckout className="rounded-xl overflow-hidden" />
              </EmbeddedCheckoutProvider>
            ) : (
              <div className="text-center space-y-4 py-16">
                <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center bg-gradient-to-br from-primary/20 to-violet-500/20">
                  <Shield className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  Secure Checkout
                </h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Select your plan and click "Buy now" to proceed with the secure payment form powered by Stripe.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
