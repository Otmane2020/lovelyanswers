import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  ArrowRight, 
  Check, 
  Loader2,
  Shield,
  MessageSquare,
  TrendingUp,
  Globe,
  LogOut,
} from "lucide-react";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { cn } from "@/lib/utils";
import chatgptIcon from "@/assets/chatgpt-icon.png";

const highlights = [
  "30 AEO LovelyAnswers",
  "30 AEO/SEO articles",
  "Keyword research",
  "Auto-publishing",
  "20+ languages",
];

interface AeoExample {
  question: string;
  score: number;
}

export default function Checkout() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isSubscribed, isTrial, isLoading: subLoading } = useSubscriptionContext();
  const [isLoading, setIsLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"weekly" | "annual">("weekly");
  const [aeoExamples, setAeoExamples] = useState<AeoExample[]>([]);
  const [brandName, setBrandName] = useState<string>("");

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

  // Fetch real answers from user's project
  useEffect(() => {
    const fetchProjectAnswers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log("No user found for checkout");
          return;
        }

        // Get user's most recent project (not just active)
        const { data: projects, error: projectError } = await supabase
          .from("projects")
          .select("id, brand_name")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (projectError) {
          console.error("Project fetch error:", projectError);
          return;
        }

        const project = projects?.[0];
        if (!project) {
          console.log("No project found for user");
          return;
        }
        
        setBrandName(project.brand_name || "");

        // Get answers for this project
        const { data: answers, error: answersError } = await supabase
          .from("answers")
          .select("question, score")
          .eq("project_id", project.id)
          .order("score", { ascending: false })
          .limit(3);

        if (answersError) {
          console.error("Answers fetch error:", answersError);
          return;
        }

        if (answers && answers.length > 0) {
          setAeoExamples(
            answers.map(a => ({
              question: a.question,
              score: a.score || 85
            }))
          );
        } else {
          console.log("No answers found for project:", project.id);
        }
      } catch (err) {
        console.error("Failed to fetch project answers:", err);
      }
    };

    fetchProjectAnswers();
  }, []);

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

  // Show loading while checking subscription
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

  // Pricing calculations
  const weeklyPrice = 29;
  const originalWeeklyPrice = 99; // $99 before discount
  const annualPrice = 1206; // $29 × 52 × 0.8 = $1,206.40 rounded
  const annualMonthlyEquiv = Math.round(annualPrice / 12);
  const weeklySavings = Math.round((weeklyPrice * 52 - annualPrice));

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24 md:pb-0">
      {/* Announcement Bar */}
      <div className="bg-gradient-to-r from-pink-500 via-violet-500 to-blue-500 text-white py-1.5 md:py-2 px-2 md:px-4 text-center text-xs md:text-sm font-medium">
        <span className="inline-flex flex-wrap items-center justify-center gap-1 md:gap-2">
          <span className="hidden md:inline">👉</span>
          <span><span className="line-through opacity-75">$99</span> → <span className="font-bold">$29</span></span>
          <span className="hidden sm:inline">•</span>
          <span><span className="font-bold">70% OFF</span> Code</span>
          <span className="bg-white/20 px-1.5 md:px-2 py-0.5 rounded font-bold">FLASHSALE</span>
          <span className="hidden sm:inline text-white/90">only first month</span>
        </span>
      </div>
      
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <AnimatedLogo size="md" />
            <span className="text-xl font-bold tracking-tight">
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
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight mb-2">
                  Start Your Free Trial
                </h1>
                <p className="text-muted-foreground text-sm">
                  3 days free, cancel anytime
                </p>
              </div>

              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <button
                  onClick={() => setBillingCycle("weekly")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    billingCycle === "weekly"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setBillingCycle("annual")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all relative",
                    billingCycle === "annual"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  Annual
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                    -20%
                  </span>
                </button>
              </div>

              {/* Price */}
              {billingCycle === "weekly" ? (
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-lg text-muted-foreground line-through">${originalWeeklyPrice}</span>
                    <span className="text-5xl font-bold">${weeklyPrice}</span>
                    <span className="text-muted-foreground">/week</span>
                  </div>
                  <p className="text-sm text-emerald-600 font-medium mt-1">
                    20% OFF applied
                  </p>
                </div>
              ) : (
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-lg text-muted-foreground line-through">${weeklyPrice * 52}</span>
                    <span className="text-5xl font-bold">${annualPrice}</span>
                    <span className="text-muted-foreground">/year</span>
                  </div>
                  <p className="text-sm text-emerald-600 font-medium mt-1">
                    Save ${weeklySavings}/year • ${annualMonthlyEquiv}/month
                  </p>
                </div>
              )}

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

      {/* Sticky bottom CTA for mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border md:hidden z-50">
        <Button 
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full h-14 gap-2 bg-foreground text-background hover:bg-foreground/90 text-lg font-medium" 
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              Start Free Trial ({billingCycle === "weekly" ? `$${weeklyPrice}/week` : `$${annualPrice}/year`})
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
