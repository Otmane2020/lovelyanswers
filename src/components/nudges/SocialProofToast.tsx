import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, Zap, Shield } from "lucide-react";

const messages = [
  { icon: Users, text: "12 personnes consultent cette page", textEn: "12 people are viewing this page" },
  { icon: TrendingUp, text: "8 audits lancés dans les 10 dernières minutes", textEn: "8 audits launched in the last 10 minutes" },
  { icon: Zap, text: "Marie vient de lancer son audit AEO", textEn: "Marie just launched her AEO audit" },
  { icon: Shield, text: "23 sites optimisés aujourd'hui", textEn: "23 sites optimized today" },
  { icon: Users, text: "Thomas a souscrit au plan Pro il y a 3 min", textEn: "Thomas subscribed to the Pro plan 3 min ago" },
  { icon: TrendingUp, text: "+47% de trafic IA moyen pour nos clients", textEn: "+47% average AI traffic for our clients" },
  { icon: Zap, text: "Sophie a généré 30 articles en 1 clic", textEn: "Sophie generated 30 articles in 1 click" },
  { icon: Users, text: "15 nouveaux utilisateurs cette heure", textEn: "15 new users this hour" },
];

// Random names for variety
const firstNames = ["Marie", "Thomas", "Sophie", "Lucas", "Emma", "Hugo", "Léa", "Louis", "Chloé", "Nathan", "Sarah", "Alex", "Julie", "Pierre", "Clara"];
const cities = ["Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux", "London", "New York", "Berlin", "Barcelona", "Amsterdam"];

export const SocialProofToast = () => {
  const [currentMessage, setCurrentMessage] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show first toast after 8s, then every 25-40s
    const initialDelay = setTimeout(() => {
      showRandomToast();
    }, 8000);

    return () => clearTimeout(initialDelay);
  }, []);

  useEffect(() => {
    if (currentMessage === null) return;

    // Hide after 5s
    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 5000);

    // Show next after 25-40s
    const nextTimer = setTimeout(() => {
      showRandomToast();
    }, 25000 + Math.random() * 15000);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
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
                Il y a {Math.floor(Math.random() * 5) + 1} min
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
