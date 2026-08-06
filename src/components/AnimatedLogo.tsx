import { BrandMark } from "@/components/brand/BrandMark";

interface AnimatedLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon";
  theme?: "auto" | "light" | "dark";
  className?: string;
}

const sizePx = { sm: 32, md: 40, lg: 48 };

/** Thin wrapper around the v4 BrandMark, kept under the old name/props so
 * every existing call site (public pages, PDFs, emails-adjacent views)
 * picks up the current gold sparkle mark without touching each one. */
export function AnimatedLogo({ size = "md", variant = "full", theme = "auto", className = "" }: AnimatedLogoProps) {
  return (
    <div className={className} style={{ display: "inline-flex" }}>
      <BrandMark size={sizePx[size]} withText={variant === "full"} light={theme === "dark"} />
    </div>
  );
}
