import { NavLink } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { cn } from "@/lib/utils";

interface AeoNavigationProps {
  className?: string;
}

export default function AeoNavigation({ className }: AeoNavigationProps) {
  const { language } = useTranslation();

  const navItems = [
    { href: "/dashboard", label: language === "fr" ? "Tableau de bord" : "Dashboard" },
    { href: "/opportunities", label: language === "fr" ? "Opportunités" : "Opportunities" },
    { href: "/answers", label: language === "fr" ? "Réponses" : "Answers" },
    { href: "/articles", label: language === "fr" ? "Articles" : "Articles" },
  ];

  return (
    <nav className={cn("flex gap-2 mb-6", className)}>
      {navItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          className={({ isActive }) =>
            cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
