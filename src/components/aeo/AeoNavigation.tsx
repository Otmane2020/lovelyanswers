"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AeoNavigationProps {
  className?: string;
}

export default function AeoNavigation({ className }: AeoNavigationProps) {
  const pathname = usePathname();
  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/opportunities", label: "Opportunities" },
    { href: "/answers", label: "Answers" },
    { href: "/articles", label: "Articles" },
  ];

  return (
    <nav className={cn("flex gap-2 mb-6", className)}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname === item.href
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
