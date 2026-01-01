import {
  LayoutDashboard,
  Search,
  Key,
  FileText,
  MessageSquare,
  Bot,
  Link,
  CreditCard,
  Settings,
  LogOut,
  Rocket,
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
import { useIsMobile } from "@/hooks/use-mobile";

export function AeoSidebar() {
  const { state, isMobile: sidebarIsMobile, openMobile, toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();

  const mainMenuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  ];

  const aeoMenuItems = [
    { title: "SEO Audit", url: "/seo-audit", icon: Search },
    { title: "Keywords", url: "/keywords", icon: Key },
    { title: "Articles", url: "/articles", icon: FileText },
    { title: "Answers", url: "/answers", icon: MessageSquare },
    { title: "Reddit Agent", url: "/reddit", icon: Bot },
  ];

  const publishMenuItems = [
    { title: "Integrations", url: "/integrations", icon: Link },
  ];

  const accountMenuItems = [
    { title: "Subscription", url: "/subscription", icon: CreditCard },
    { title: "Settings", url: "/settings", icon: Settings },
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
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"}>
      {/* Logo Header */}
      <div className="border-b border-primary/20 p-4">
        <NavLink 
          to="/dashboard" 
          onClick={handleNavClick} 
          className="flex items-center gap-3 group transition-all duration-300 hover:scale-105"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-lg shadow-primary/25">
            <Rocket className="w-5 h-5 text-primary-foreground" />
          </div>
          {state === "expanded" && (
            <div className="flex flex-col">
              <span className="font-bold text-xl bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                Aeoreply
              </span>
              <span className="text-[10px] text-muted-foreground -mt-0.5">
                All-in-One AEO Platform
              </span>
            </div>
          )}
        </NavLink>
      </div>

      <SidebarContent className="px-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary/80 uppercase text-xs tracking-wider">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className="hover:bg-primary/10 data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/20 data-[active=true]:to-blue-500/20 data-[active=true]:border-l-2 data-[active=true]:border-primary"
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

        {/* AEO Engine */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary/80 uppercase text-xs tracking-wider">
            AEO Engine
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aeoMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className="hover:bg-primary/10 data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/20 data-[active=true]:to-blue-500/20 data-[active=true]:border-l-2 data-[active=true]:border-primary"
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

        {/* Publish */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary/80 uppercase text-xs tracking-wider">
            Publish
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {publishMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className="hover:bg-primary/10 data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/20 data-[active=true]:to-blue-500/20 data-[active=true]:border-l-2 data-[active=true]:border-primary"
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

        {/* Account */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary/80 uppercase text-xs tracking-wider">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className="hover:bg-primary/10 data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/20 data-[active=true]:to-blue-500/20"
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
      <SidebarFooter className="border-t border-primary/20 p-4">
        {state === "expanded" && user && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-primary-foreground text-sm font-bold">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
