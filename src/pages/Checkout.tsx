import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
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
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// Stripe price IDs
const PRICE_MONTHLY = "price_1Sw4JNEfti9t9nN9Z88uua20"; // $29/month
const PRICE_ANNUAL = "price_1Sw4LaEfti9t9nN97pvV9rYI"; // $279/year

const features = [
  "AEO Answers: Rank #1 on ChatGPT, Gemini and Perplexity",
  "30 SEO-optimized articles auto-published monthly",
  "Local AEO: Dominate local AI search results",
  "Auto-posting to WordPress, Shopify, Webflow and more",
  "Automated keyword research and SERP clustering",
  "Reddit Agent for brand visibility and backlinks",
  "Technical SEO audit (Google + AI crawlers)",
  "20+ languages supported worldwide",
];

export default function Checkout() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isSubscribed, isTrial, isLoading: subLoading } = useSubscriptionContext();
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

  // Force light theme
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    return () => {};
  }, []);

  // Redirect unauthenticated users to auth
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Redirect subscribed users to dashboard
  useEffect(() => {
    if (!subLoading && (isSubscribed || isTrial)) {
      navigate("/dashboard", { replace: true });
    }
  }, [isSubscribed, isTrial, subLoading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: billingCycle }
      });
      
      if (error || !data?.url) {
        console.error("Checkout error:", error);
        toast({ 
          title: "Checkout error", 
          description: "Please try again or contact support.", 
          variant: "destructive" 
        });
        setIsLoading(false);
        return;
      }
      
      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout failed:", err);
      toast({ 
        title: "Error", 
        description: "Failed to start checkout. Please try again.", 
        variant: "destructive" 
      });
      setIsLoading(false);
    }
  };

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

  // Pricing
  const monthlyPrice = 29;
  const originalMonthlyPrice = 58;
  const annualPrice = 279;
  const annualMonthlyEquiv = Math.round(annualPrice / 12); // ~$23/month

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-4 px-4 border-b border-border">
        <div className="container flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <AnimatedLogo size="md" />
            <span className="text-xl font-bold tracking-tight text-foreground">
              Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">Answers</span>
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
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Choose your plan</h1>
            <p className="text-muted-foreground">Everything you need to dominate AI search results</p>
          </div>

          {/* Pricing Cards */}
          <div className="space-y-3">
            {/* Annual - Best Value */}
            <button
              onClick={() => setBillingCycle("annual")}
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
                    <span className="text-lg text-muted-foreground line-through">${originalMonthlyPrice}</span>
                    <span className="text-3xl font-bold text-foreground">${annualMonthlyEquiv}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Billed ${annualPrice}/year</p>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  billingCycle === "annual" 
                    ? "border-primary bg-primary" 
                    : "border-muted-foreground/30"
                )}>
                  {billingCycle === "annual" && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>
            </button>

            {/* Monthly */}
            <button
              onClick={() => setBillingCycle("monthly")}
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
                    <span className="text-3xl font-bold text-foreground">${monthlyPrice}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Billed monthly</p>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  billingCycle === "monthly" 
                    ? "border-primary bg-primary" 
                    : "border-muted-foreground/30"
                )}>
                  {billingCycle === "monthly" && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 transition-opacity rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Redirecting to checkout...
              </>
            ) : (
              <>
                Start now — ${billingCycle === "monthly" ? monthlyPrice : annualMonthlyEquiv}/mo
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>

          {/* Guarantee */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <span>14-day money-back guarantee</span>
          </div>

          {/* TrustAvis Social Proof */}
          <a 
            href="https://trust-avis.com/entreprise/lovelyanswers" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 py-3 px-5 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors mx-auto"
          >
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <div className="text-sm">
              <span className="font-semibold text-foreground">4.9</span>
              <span className="text-muted-foreground"> · 289 reviews</span>
            </div>
            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Excellent
            </span>
          </a>

          {/* Features */}
          <div className="pt-6 border-t border-border">
            <p className="text-sm font-semibold text-foreground mb-4">Included with your subscription:</p>
            <ul className="space-y-3">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
