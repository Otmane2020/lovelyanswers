import autopilotGeoLogo from "@/assets/autopilotgeo-logo.png";
import autopilotGeoIcon from "@/assets/autopilotgeo-icon.svg";

interface AnimatedLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon";
  className?: string;
}

const sizeClasses = {
  full: {
    sm: "h-9 w-auto",
    md: "h-11 w-auto",
    lg: "h-14 w-auto",
  },
  icon: {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  },
};

export function AnimatedLogo({ size = "md", variant = "full", className = "" }: AnimatedLogoProps) {
  const src = variant === "icon" ? autopilotGeoIcon : autopilotGeoLogo;
  return (
    <img
      src={src}
      alt="AutoPilot Geo"
      className={`${sizeClasses[variant][size]} ${className}`}
    />
  );
}
