import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { 
  Zap, 
  ArrowRight, 
  Check, 
  Sparkles,
  FileText,
  Link as LinkIcon,
  Search,
  Languages,
  Bot,
  Globe,
  Wrench,
  MessageSquare,
  Loader2,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const features = [
  { icon: FileText, text: "30 SEO/LLM optimized articles per month" },
  { icon: Sparkles, text: "Citations, internal links & branded infographics" },
  { icon: LinkIcon, text: "Automatic quality backlinks ($800+ value)" },
  { icon: Wrench, text: "Technical SEO audit for Google & ChatGPT" },
  { icon: Search, text: "Real-time research and expert insights" },
  { icon: Bot, text: "Automated keyword research & clustering" },
  { icon: MessageSquare, text: "Reddit agent for brand visibility" },
  { icon: Globe, text: "WordPress, Webflow, Shopify, Wix & API" },
  { icon: FileText, text: "JSON-LD schema markup" },
  { icon: Languages, text: "20+ languages supported" },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      
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
      
      // Redirect to Stripe checkout
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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-bg shadow-glow-sm">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Aeo<span className="gradient-text">reply</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            Secure checkout powered by Stripe
          </div>
        </div>
      </nav>

      {/* Checkout Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] opacity-30" />
        
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-6 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              ✓ Project created successfully
            </Badge>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Start Your{" "}
              <span className="gradient-text">3-Day Free Trial</span>
            </h1>
            
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
              Your project is ready! Activate your subscription to unlock all features.
            </p>
          </div>

          {/* Pricing Card */}
          <div className="mt-12 max-w-xl mx-auto">
            <GlassCard gradient className="p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  Most Popular
                </Badge>
              </div>
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">All-In-One</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Full access to all features. Cancel anytime.
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-2xl text-muted-foreground line-through">$247</span>
                  <span className="text-6xl font-bold">$99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-sm text-emerald-500 font-medium">
                  3-day free trial • No charge today
                </p>
              </div>

              <Button 
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full gap-2 gradient-bg text-primary-foreground shadow-glow mb-8" 
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Redirecting to checkout...
                  </>
                ) : (
                  <>
                    Start Free Trial
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  What's included:
                </h3>
                <ul className="grid grid-cols-1 gap-2">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 shrink-0">
                        <Check className="h-3 w-3 text-emerald-500" />
                      </div>
                      <span className="text-sm">{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trust badges */}
              <div className="mt-8 pt-6 border-t border-border/50">
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4" />
                    SSL Secure
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-4 w-4" />
                    Cancel anytime
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4" />
                    Instant access
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* FAQ note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Questions?{" "}
              <Link to="/pricing" className="text-primary hover:underline">
                View full pricing details & FAQs
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col items-center justify-center gap-2">
          <p className="text-sm text-muted-foreground">
            © 2024 Aeoreply. Secure payment by Stripe.
          </p>
        </div>
      </footer>
    </div>
  );
}
