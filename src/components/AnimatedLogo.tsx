import autopilotGeoLogo from "@/assets/autopilotgeo-logo.png";
import autopilotGeoIcon from "@/assets/autopilotgeo-icon.svg";

interface AnimatedLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon";
  className?: string;
}

const sizeClasses = {
  full: {
    sm: "h-12 w-auto",
    md: "h-14 w-auto",
    lg: "h-18 w-auto",
  },
  icon: {
    sm: "h-10 w-10",
    md: "h-12 w-12",
    lg: "h-14 w-14",
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
