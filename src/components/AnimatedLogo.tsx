import autopilotGeoLogo from "@/assets/autopilotgeo-logo-light.svg";

interface AnimatedLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-auto",
  md: "h-10 w-auto",
  lg: "h-14 w-auto",
};

export function AnimatedLogo({ size = "md", className = "" }: AnimatedLogoProps) {
  return (
    <img
      src={autopilotGeoLogo}
      alt="AutoPilot Geo"
      className={`${sizeClasses[size]} ${className}`}
    />
  );
}
