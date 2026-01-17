import { motion } from "framer-motion";
import lovableLogo from "@/assets/lovable-logo.svg";

interface AnimatedLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-7 w-7",
  md: "h-8 w-8 md:h-9 md:w-9",
  lg: "h-10 w-10 md:h-12 md:w-12",
};

export function AnimatedLogo({ size = "md", className = "" }: AnimatedLogoProps) {
  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      animate={{
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.div
        className="absolute inset-0 rounded-xl bg-gradient-to-br from-pink-500/40 via-violet-500/40 to-blue-500/40 blur-lg"
        animate={{
          opacity: [0.5, 0.8, 0.5],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <img
        src={lovableLogo}
        alt="LovelyAnswers"
        className={`relative z-10 ${sizeClasses[size]}`}
      />
    </motion.div>
  );
}
