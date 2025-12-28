import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Sparkles,
  MessageSquare,
  Lightbulb,
  FileText,
  Newspaper,
  Plug,
  Settings,
  User,
  ChevronLeft,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "AEO Engine", href: "/engine", icon: Sparkles, badge: "New" },
];

const contentNav: NavItem[] = [
  { title: "Assistant", href: "/assistant", icon: MessageSquare },
  { title: "Opportunities", href: "/opportunities", icon: Lightbulb },
  { title: "Answers", href: "/answers", icon: FileText },
  { title: "Articles", href: "/articles", icon: Newspaper },
];

const settingsNav: NavItem[] = [
  { title: "Integrations", href: "/integrations", icon: Plug },
  { title: "Settings", href: "/settings", icon: Settings },
  { title: "Account", href: "/account", icon: User },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          "hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-primary/10 text-primary shadow-sm",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
        {!collapsed && (
          <>
            <span className="flex-1">{item.title}</span>
            {item.badge && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.title}
            {item.badge && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                {item.badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-16 items-center border-b border-border px-4", collapsed && "justify-center px-2")}>
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-bg shadow-glow-sm">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold tracking-tight">
              Aeo<span className="gradient-text">reply</span>
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto p-3">
        {/* Main */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Overview
            </p>
          )}
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Content */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Content
            </p>
          )}
          {contentNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Settings */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Settings
            </p>
          )}
          {settingsNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("w-full justify-center", !collapsed && "justify-start")}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
