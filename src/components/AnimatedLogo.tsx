import autopilotGeoLogo from "@/assets/autopilot-geo-logo.svg";

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
    <img
      src={autopilotGeoLogo}
      alt="AutoPilot Geo"
      className={`${sizeClasses[size]} ${className}`}
    />
  );
}
