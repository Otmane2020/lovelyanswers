import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  gradient?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, hover = false, gradient = false, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        style={style}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl",
          hover && "transition-all duration-300 hover:border-primary/30 hover:shadow-soft hover:-translate-y-0.5",
          gradient && "bg-gradient-to-br from-card via-card to-primary/5",
          className
        )}
        {...props}
      >
        {gradient && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        )}
        <div className="relative">{children}</div>
      </div>
    );
  }
);
GlassCard.displayName = "GlassCard";

export { GlassCard };
