import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, Zap, Shield } from "lucide-react";

const messages = [
  { icon: Users, text: "12 people are viewing this page" },
  { icon: TrendingUp, text: "8 audits launched in the last 10 minutes" },
  { icon: Zap, text: "Marie just launched her AEO audit" },
  { icon: Shield, text: "23 sites optimized today" },
  { icon: Users, text: "Thomas subscribed to the Pro plan 3 min ago" },
  { icon: TrendingUp, text: "+47% average AI traffic for our clients" },
  { icon: Zap, text: "Sophie generated 30 articles in 1 click" },
  { icon: Users, text: "15 new users this hour" },
];

export const SocialProofToast = () => {
  const [currentMessage, setCurrentMessage] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const initialDelay = setTimeout(() => {
      showRandomToast();
    }, 8000);
    return () => clearTimeout(initialDelay);
  }, []);

  useEffect(() => {
    if (currentMessage === null) return;
    const hideTimer = setTimeout(() => setVisible(false), 5000);
    const nextTimer = setTimeout(() => showRandomToast(), 25000 + Math.random() * 15000);
    return () => { clearTimeout(hideTimer); clearTimeout(nextTimer); };
  }, [currentMessage]);

  const showRandomToast = () => {
    const idx = Math.floor(Math.random() * messages.length);
    setCurrentMessage(idx);
    setVisible(true);
  };

  if (currentMessage === null) return null;

  const msg = messages[currentMessage];
  const Icon = msg.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-4 left-4 z-50 max-w-xs"
          onClick={() => setVisible(false)}
        >
          <div className="flex items-center gap-3 rounded-xl bg-background/95 border border-border/50 shadow-lg backdrop-blur-md px-4 py-3 cursor-pointer hover:shadow-xl transition-shadow">
            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground leading-tight">{msg.text}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {Math.floor(Math.random() * 5) + 1} min ago
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
