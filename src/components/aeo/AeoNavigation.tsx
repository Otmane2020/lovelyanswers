import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AeoNavigationProps {
  className?: string;
}

export default function AeoNavigation({ className }: AeoNavigationProps) {
  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/opportunities", label: "Opportunities" },
    { href: "/answers", label: "Answers" },
    { href: "/articles", label: "Articles" },
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