import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Flame, AlertTriangle } from "lucide-react";

interface UrgencyBannerProps {
  variant?: "timer" | "spots" | "discount";
  className?: string;
}

export const UrgencyBanner = ({ variant = "spots", className = "" }: UrgencyBannerProps) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 47, seconds: 33 });
  const [spotsLeft, setSpotsLeft] = useState(7);

  useEffect(() => {
    if (variant !== "timer") return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) return { hours: 0, minutes: 0, seconds: 0 };
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [variant]);

  useEffect(() => {
    if (variant !== "spots") return;

    const interval = setInterval(() => {
      setSpotsLeft(prev => Math.max(2, prev - 1));
    }, 30000 + Math.random() * 30000);

    return () => clearInterval(interval);
  }, [variant]);

  if (variant === "timer") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center justify-center gap-1.5 sm:gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 ${className}`}
      >
        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
        <span className="text-xs sm:text-sm font-medium text-destructive">
          Offer expires in{" "}
          <span className="font-mono font-bold">
            {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
          </span>
        </span>
      </motion.div>
    );
  }

  if (variant === "spots") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center justify-center gap-1.5 sm:gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 ${className}`}
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex-shrink-0"
        >
          <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
        </motion.div>
        <span className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">
          🔥 Only <span className="font-bold">{spotsLeft} spots</span> left at launch price
        </span>
      </motion.div>
    );
  }

  // discount variant
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-center gap-1.5 sm:gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 text-center ${className}`}
    >
      <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
      <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">
        🎉 <span className="font-bold">-50%</span> for the first 100 sign-ups — Code: <span className="font-mono font-bold">WELCOME50</span>
      </span>
    </motion.div>
  );
};
