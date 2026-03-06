import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { trackPurchase } from "@/lib/gtag-conversions";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";

export default function ThankYou() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verified, setVerified] = useState<boolean | null>(null);
  const sessionId = searchParams.get("session_id");

  // Force light theme
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    if (!sessionId) {
      navigate("/dashboard", { replace: true });
      return;
    }

    let tracked = false;

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-checkout-session", {
          body: { session_id: sessionId },
        });

        if (error || !data?.paid) {
          console.warn("[ThankYou] Payment not verified:", error);
          setVerified(false);
          return;
        }

        setVerified(true);

        // Fire Google Ads conversion only once
        if (!tracked) {
          tracked = true;
          const value = data.amount ? data.amount / 100 : 29;
          trackPurchase(value, sessionId);
          // Second account purchase conversion (AW-17956394555)
          if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "conversion", {
              send_to: "AW-17956394555/lC8cCNymrfkbELuso_JC",
              value: value,
              currency: "USD",
              transaction_id: sessionId || "",
            });
          }
          // Tapfiliate trial conversion
          if (typeof window !== "undefined" && (window as any).tap && data.customer_id) {
            (window as any).tap("trial", data.customer_id);
            console.log("[ThankYou] Tapfiliate trial fired:", data.customer_id);
          }
          console.log("[ThankYou] Purchase conversion fired (both accounts):", { value, sessionId });
        }
      } catch (err) {
        console.error("[ThankYou] Verification error:", err);
        setVerified(false);
      }
    };

    verify();
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-4 px-4 border-b border-border">
        <div className="container flex items-center justify-center">
          <Link to="/" className="flex items-center">
            <AnimatedLogo size="md" />
          </Link>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center space-y-8">
          {verified === null && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Verifying your payment...</p>
            </div>
          )}

          {verified === true && (
            <>
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Payment confirmed! 🎉
                </h1>
                <p className="text-muted-foreground text-lg">
                  Welcome to AutoPilot Geo. Your subscription is now active.
                </p>
              </div>
              <Button
                onClick={() => navigate("/dashboard")}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 transition-opacity rounded-xl"
              >
                Go to Dashboard
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </>
          )}

          {verified === false && (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Something went wrong
                </h1>
                <p className="text-muted-foreground">
                  We couldn't verify your payment. If you were charged, please contact support.
                </p>
              </div>
              <Button
                onClick={() => navigate("/dashboard")}
                variant="outline"
                className="w-full h-12 rounded-xl"
              >
                Go to Dashboard
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
