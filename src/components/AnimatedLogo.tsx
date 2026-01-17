import { motion } from "framer-motion";
import { Heart } from "lucide-react";

interface AnimatedLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-7 w-7",
  md: "h-8 w-8 md:h-9 md:w-9",
  lg: "h-10 w-10 md:h-12 md:w-12",
};

const iconSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5 md:h-6 md:w-6",
  lg: "h-6 w-6 md:h-8 md:w-8",
};

export function AnimatedLogo({ size = "md", className = "" }: AnimatedLogoProps) {
  return (
    <motion.div
      className={`relative flex items-center justify-center ${sizeClasses[size]} ${className}`}
      animate={{
        scale: [1, 1.08, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.div
        className="absolute inset-0 rounded-xl bg-gradient-to-br from-pink-500/50 via-violet-500/50 to-blue-500/50 blur-lg"
        animate={{
          opacity: [0.5, 0.9, 0.5],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className={`relative z-10 flex items-center justify-center ${sizeClasses[size]} rounded-xl bg-gradient-to-br from-pink-500 via-violet-500 to-blue-500 shadow-lg`}>
        <Heart className={`${iconSizes[size]} text-white fill-white`} />
      </div>
    </motion.div>
  );
}