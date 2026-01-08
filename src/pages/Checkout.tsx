import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  ArrowRight, 
  Check, 
  Loader2,
  Shield,
  Rocket,
  MessageSquare,
  TrendingUp,
  Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import chatgptIcon from "@/assets/chatgpt-icon.png";

const highlights = [
  "Unlimited AEO Answers",
  "30 SEO articles/month",
  "Automatic backlinks",
  "GEO Audit & Reddit",
  "20+ languages",
];

const aeoExamples = [
  { question: "What is the best CRM for small business?", score: 94 },
  { question: "How to improve website SEO in 2025?", score: 91 },
  { question: "What are the benefits of AI automation?", score: 88 },
];

export default function Checkout() {
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-bg shadow-glow-sm">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Aeo<span className="gradient-text">reply</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-start">
          
          {/* Left: AEO Answers Preview */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <img src={chatgptIcon} alt="ChatGPT" className="h-8 w-8" />
              <div>
                <h2 className="text-xl font-bold">AEO Answers</h2>
                <p className="text-sm text-muted-foreground">Get cited by ChatGPT, Gemini, Claude...</p>
              </div>
            </div>

            {/* Example Answers */}
            <div className="space-y-3">
              {aeoExamples.map((example, i) => (
                <div 
                  key={i}
                  className="p-4 rounded-xl border border-border bg-card/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm font-medium">{example.question}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-medium text-emerald-600">{example.score}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-primary" />
                AI-optimized content
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4 text-primary" />
                Public answer pages
              </div>
            </div>
          </div>

          {/* Right: Checkout Card */}
          <div>
            {/* Success indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-sm text-muted-foreground">Project created successfully</span>
            </div>

            {/* Card */}
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight mb-2">
                  Start Your Free Trial
                </h1>
                <p className="text-muted-foreground text-sm">
                  3 days free, then $99/month
                </p>
              </div>

              {/* Price */}
              <div className="flex items-baseline justify-center gap-2 mb-8">
                <span className="text-lg text-muted-foreground line-through">$247</span>
                <span className="text-5xl font-bold">$99</span>
                <span className="text-muted-foreground">/mo</span>
              </div>

              {/* CTA Button */}
              <Button 
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full h-14 gap-2 bg-foreground text-background hover:bg-foreground/90 text-lg font-medium mb-6" 
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    Start Free Trial
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>

              {/* Highlights */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {highlights.map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full"
                  >
                    <Check className="h-3 w-3 text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>

              {/* Trust */}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
                <div className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  Secure
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  Instant access
                </div>
              </div>
            </div>

            {/* Footer link */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              Questions?{" "}
              <Link to="/pricing" className="text-primary hover:underline">
                View pricing & FAQs
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
