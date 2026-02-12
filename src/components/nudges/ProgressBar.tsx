import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  className?: string;
}

export const ProgressBar = ({ currentStep, totalSteps, labels, className = "" }: ProgressBarProps) => {
  const progress = Math.min((currentStep / totalSteps) * 100, 100);

  return (
    <div className={`w-full ${className}`}>
      {/* Progress bar only */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
        />
      </div>
    </div>
  );
};
