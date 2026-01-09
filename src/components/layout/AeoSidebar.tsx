import {
  Home,
  FileText,
  BarChart3,
  Link2,
  Search,
  MessageSquareText,
  Settings,
  CreditCard,
  LogOut,
  Heart,
  CalendarDays,
  History,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

export function AeoSidebar() {
  const { state, isMobile: sidebarIsMobile, openMobile, toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();

  const mainMenuItems = [
    { title: "Overview", url: "/dashboard", icon: Home },
    { title: "AEO Answers", url: "/answers", icon: FileText },
    { title: "Planning", url: "/planning", icon: CalendarDays },
    { title: "History", url: "/history", icon: History },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Integrations", url: "/integrations", icon: Link2 },
    { title: "GEO Audit", url: "/seo-audit", icon: Search, badge: "New" },
    { title: "Reddit", url: "/reddit", icon: MessageSquareText, badge: "New" },
  ];

  const otherMenuItems = [
    { title: "Settings", url: "/settings", icon: Settings },
    { title: "Billing", url: "/billing", icon: CreditCard },
  ];

  const isActive = (path: string) => currentPath === path;

  const handleNavClick = () => {
    if ((sidebarIsMobile || isMobile) && openMobile) {
      toggleSidebar();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} className="border-r border-border/50">
      {/* Logo Header */}
      <div className="p-4 pb-6">
        <NavLink 
          to="/dashboard" 
          onClick={handleNavClick} 
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          {state === "expanded" && (
            <span className="font-bold text-lg text-foreground">
              Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">Answers</span>
            </span>
          )}
        </NavLink>
      </div>

      <SidebarContent className="px-3">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className={`
                      h-10 rounded-lg transition-all duration-200
                      hover:bg-muted
                      data-[active=true]:bg-primary/5 
                      data-[active=true]:text-primary
                      data-[active=true]:border-l-2 
                      data-[active=true]:border-primary
                      data-[active=true]:font-medium
                    `}
                  >
                    <NavLink to={item.url} onClick={handleNavClick} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </div>
                      {item.badge && state === "expanded" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-primary/10 text-primary border-0">
                          {item.badge}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Other Section */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Other
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {otherMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className={`
                      h-10 rounded-lg transition-all duration-200
                      hover:bg-muted
                      data-[active=true]:bg-primary/5 
                      data-[active=true]:text-primary
                      data-[active=true]:border-l-2 
                      data-[active=true]:border-primary
                      data-[active=true]:font-medium
                    `}
                  >
                    <NavLink to={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-3 mt-auto">
        
        {user && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {state === "expanded" && "Sign out"}
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
