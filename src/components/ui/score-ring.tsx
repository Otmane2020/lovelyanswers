import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ScoreRing({ score, size = "md", showLabel = true, className }: ScoreRingProps) {
  const sizes = {
    sm: { ring: 40, stroke: 3, text: "text-xs" },
    md: { ring: 56, stroke: 4, text: "text-sm" },
    lg: { ring: 80, stroke: 5, text: "text-lg" },
  };

  const { ring, stroke, text } = sizes[size];
  const radius = (ring - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "stroke-emerald-500";
    if (score >= 60) return "stroke-amber-500";
    return "stroke-red-500";
  };

  const getTextColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={ring} height={ring} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className={cn("transition-all duration-700 ease-out", getScoreColor(score))}
        />
      </svg>
      {showLabel && (
        <span className={cn("absolute font-bold", text, getTextColor(score))}>
          {score}
        </span>
      )}
    </div>
  );
}
