import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ExitIntentPopupProps { ctaUrl?: string; headline?: string; description?: string; ctaLabel?: string; }

export const ExitIntentPopup = ({ ctaUrl = "/signup", headline = "Wait! Don't leave empty-handed 🎁", description = "Get your free AEO audit in 30 seconds and discover how to appear in ChatGPT and Google AI.", ctaLabel = "Get started free", }: ExitIntentPopupProps) => {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const handleMouseLeave = useCallback((e: MouseEvent) => { if (e.clientY <= 5 && !sessionStorage.getItem("exit_intent_shown")) { setShow(true); sessionStorage.setItem("exit_intent_shown", "true"); } }, []);

  useEffect(() => {
    if (window.innerWidth >= 768) { const timer = setTimeout(() => { document.addEventListener("mouseleave", handleMouseLeave); }, 5000); return () => { clearTimeout(timer); document.removeEventListener("mouseleave", handleMouseLeave); }; }
    let lastScrollY = window.scrollY; let mobileTimer: ReturnType<typeof setTimeout>;
    const handleScroll = () => { const currentY = window.scrollY; if (lastScrollY - currentY > 200 && !sessionStorage.getItem("exit_intent_shown")) { setShow(true); sessionStorage.setItem("exit_intent_shown", "true"); window.removeEventListener("scroll", handleScroll); } lastScrollY = currentY; };
    mobileTimer = setTimeout(() => { window.addEventListener("scroll", handleScroll, { passive: true }); }, 10000);
    return () => { clearTimeout(mobileTimer); window.removeEventListener("scroll", handleScroll); };
  }, [handleMouseLeave]);

  const handleCta = () => { setShow(false); navigate(ctaUrl); };

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => setShow(false)} />
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: "spring", damping: 20, stiffness: 300 }} className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="relative w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
              <div className="bg-primary px-4 py-6 sm:px-6 sm:py-8 text-center">
                <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5, delay: 0.3 }}><Gift className="h-10 w-10 sm:h-12 sm:w-12 text-primary-foreground mx-auto mb-2 sm:mb-3" /></motion.div>
                <h3 className="text-lg sm:text-xl font-bold text-primary-foreground">{headline}</h3>
              </div>
              <button onClick={() => setShow(false)} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30 flex items-center justify-center transition-colors"><X className="h-4 w-4 text-primary-foreground" /></button>
              <div className="px-4 py-5 sm:px-6 sm:py-6 text-center">
                <p className="text-sm sm:text-base text-muted-foreground mb-5 sm:mb-6 leading-relaxed">{description}</p>
                <Button onClick={handleCta} size="lg" className="w-full gap-2 text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">{ctaLabel}<ArrowRight className="h-4 w-4" /></Button>
                <button onClick={() => setShow(false)} className="mt-3 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">No thanks, I'll pass</button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
