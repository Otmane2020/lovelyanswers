import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ExitIntentPopupProps {
  /** Where to redirect on CTA click */
  ctaUrl?: string;
  /** Headline */
  headline?: string;
  /** Description */
  description?: string;
  /** CTA label */
  ctaLabel?: string;
}

export const ExitIntentPopup = ({
  ctaUrl = "/audit",
  headline = "Attendez ! Ne partez pas les mains vides 🎁",
  description = "Obtenez votre audit AEO gratuit en 30 secondes et découvrez comment apparaître dans ChatGPT et Google AI.",
  ctaLabel = "Obtenir mon audit gratuit",
}: ExitIntentPopupProps) => {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only trigger when mouse moves to the top of the viewport
    if (e.clientY <= 5 && !sessionStorage.getItem("exit_intent_shown")) {
      setShow(true);
      sessionStorage.setItem("exit_intent_shown", "true");
    }
  }, []);

  useEffect(() => {
    // Don't show on mobile (no reliable exit intent)
    if (window.innerWidth < 768) return;
    
    // Delay listening to avoid triggering immediately
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 5000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseLeave]);

  const handleCta = () => {
    setShow(false);
    navigate(ctaUrl);
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={() => setShow(false)}
          />

          {/* Popup */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-0 z-[61] flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md bg-background rounded-2xl border border-border shadow-2xl overflow-hidden">
              {/* Gradient header */}
              <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-8 text-center">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Gift className="h-12 w-12 text-primary-foreground mx-auto mb-3" />
                </motion.div>
                <h3 className="text-xl font-bold text-primary-foreground">
                  {headline}
                </h3>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShow(false)}
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-primary-foreground" />
              </button>

              {/* Body */}
              <div className="px-6 py-6 text-center">
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {description}
                </p>

                <Button
                  onClick={handleCta}
                  size="lg"
                  className="w-full gap-2 text-base font-semibold"
                >
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <button
                  onClick={() => setShow(false)}
                  className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Non merci, je préfère passer à côté
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
