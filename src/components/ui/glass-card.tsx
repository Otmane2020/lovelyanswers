import { cn } from "@/lib/utils";
import { ReactNode, CSSProperties } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  style?: CSSProperties;
}

export function GlassCard({ children, className, hover = false, gradient = false, style }: GlassCardProps) {
  return (
    <div
      style={style}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl",
        hover && "transition-all duration-300 hover:border-primary/30 hover:shadow-soft hover:-translate-y-0.5",
        gradient && "bg-gradient-to-br from-card via-card to-primary/5",
        className
      )}
    >
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
