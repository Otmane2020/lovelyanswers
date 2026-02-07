import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Loader2,
  Lock,
  Shield,
  Target,
  Users,
  Zap,
  TrendingUp,
} from "lucide-react";

interface AuditPaywallProps {
  urlInput: string;
  setUrlInput: (value: string) => void;
  error: string | null;
}

export function AuditPaywall({ urlInput, setUrlInput, error }: AuditPaywallProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsCheckingOut(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-audit-checkout", {
        body: { url: urlInput.trim() },
      });

      if (fnError) throw fnError;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("[audit-paywall] Checkout error:", err);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const features = [
    { icon: Users, text: "Competitor AI visibility comparison" },
    { icon: Shield, text: "Full schema markup audit (implemented vs missing)" },
    { icon: Target, text: "90-day strategic action plan with KPIs" },
    { icon: TrendingUp, text: "Market trends & content gap analysis" },
    { icon: Zap, text: "Key questions to target with priority ranking" },
  ];

  return (
    <section className="py-16 md:py-24">
      <div className="container px-4 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Badge className="mb-4 bg-amber-100 text-amber-700 border-amber-200">
            <BarChart3 className="mr-1 h-3 w-3" />
            Premium Audit
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Get a <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">10x Deeper</span> AEO/GSO Audit
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Competitor analysis, AI citation scoring, content gap mapping, and a full strategic roadmap.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-yellow-500/10 border-2 border-amber-300/50 rounded-2xl p-8 relative overflow-hidden"
        >
          <div className="absolute top-4 right-4">
            <Badge className="bg-amber-500 text-white border-0 text-sm font-bold px-3 py-1">
              $9.99
            </Badge>
          </div>

          <h2 className="text-xl font-bold mb-4">What you'll get:</h2>

          <ul className="space-y-3 mb-8">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{feature.text}</span>
              </li>
            ))}
          </ul>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleCheckout} className="space-y-4">
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://yourwebsite.com"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="pl-12 h-14 text-lg border-2 border-amber-300/50 focus:border-amber-500 bg-white dark:bg-background"
                required
                disabled={isCheckingOut}
              />
            </div>
            <Button
              type="submit"
              disabled={isCheckingOut || !urlInput.trim()}
              size="lg"
              className="w-full h-14 text-lg gap-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 shadow-lg"
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Redirecting to checkout...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Pay $9.99 & Get Premium Audit
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Shield className="h-3 w-3" />
              Secure payment via Stripe · One-time purchase · Instant access
            </p>
          </form>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Already used by <span className="font-semibold text-foreground">500+</span> companies to optimize their AI visibility
          </p>
        </motion.div>
      </div>
    </section>
  );
}
