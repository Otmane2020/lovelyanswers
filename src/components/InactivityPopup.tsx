import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Gift, ArrowRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface InactivityPopupProps {
  /** Time of inactivity in seconds before showing the popup */
  inactivityDelay?: number;
  /** Only show once per session */
  oncePerSession?: boolean;
}

export function InactivityPopup({ inactivityDelay = 45, oncePerSession = true }: InactivityPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  const dismiss = useCallback(() => {
    setIsVisible(false);
    if (oncePerSession) {
      sessionStorage.setItem("inactivity_popup_shown", "true");
    }
  }, [oncePerSession]);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (oncePerSession && sessionStorage.getItem("inactivity_popup_shown")) return;

    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      // Don't restart if already shown and dismissed
      if (isVisible) return;
      timer = setTimeout(() => setIsVisible(true), inactivityDelay * 1000);
    };

    const events = ["mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));

    // Start initial timer
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [inactivityDelay, oncePerSession, isVisible]);

  const handleCTA = () => {
    dismiss();
    navigate("/onboarding?promo=2MONTHSFREE");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl border border-border overflow-hidden pointer-events-auto">
              {/* Close button */}
              <button
                onClick={dismiss}
                className="absolute right-3 top-3 z-10 p-1.5 rounded-full bg-muted/80 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Gradient header */}
              <div className="bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 px-6 pt-8 pb-10 text-center text-white">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4"
                >
                  <Gift className="h-8 w-8" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-1">Wait — Don't Leave!</h2>
                <p className="text-white/80 text-sm">We have a special offer just for you</p>
              </div>

              {/* Content */}
              <div className="px-6 -mt-4">
                <div className="bg-background border-2 border-primary/30 rounded-xl p-5 text-center shadow-lg">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold text-primary uppercase tracking-wide">Limited Time Offer</span>
                  </div>
                  <h3 className="text-3xl font-extrabold mb-1">
                    2 Months <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">FREE</span>
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Start your annual plan and get 2 months free — that's <span className="font-semibold text-foreground">$58 saved</span>
                  </p>
                </div>
              </div>

              {/* CTA */}
              <div className="px-6 pt-5 pb-6 space-y-3">
                <Button
                  onClick={handleCTA}
                  className="w-full h-12 gap-2 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white text-base font-semibold shadow-xl hover:opacity-90"
                >
                  Claim My 2 Free Months
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <button
                  onClick={dismiss}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  No thanks, I'll pay full price
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
