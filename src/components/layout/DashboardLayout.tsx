import { ReactNode, useEffect } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AeoSidebar } from "./AeoSidebar";
import { TranslationProvider } from "@/lib/language";
import { useGeneration } from "@/contexts/GenerationContext";
import { Progress } from "@/components/ui/progress";
import { Loader2, Menu, ArrowRight, Sparkles } from "lucide-react";
import autopilotLogo from "@/assets/autopilot-geo-logo-full.png";
import { NavLink, useNavigate } from "react-router-dom";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isGenerating, generationProgress, generationMessage } = useGeneration();
  const { isSubscribed, isTrial, isLoading: subLoading } = useSubscriptionContext();
  const navigate = useNavigate();

  // Force light theme on dashboard
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const showUpgradeBanner = !subLoading && !isSubscribed;

  return (
    <TranslationProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AeoSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            {/* Persistent Upgrade Banner */}
            {showUpgradeBanner && (
              <div className="bg-gradient-to-r from-primary to-violet-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 z-40">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Unlock all features — 30 SEO articles, AEO answers, auto-publish & more</span>
                  <span className="sm:hidden">Unlock all features</span>
                </div>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => navigate("/checkout")}
                  className="shrink-0 bg-white text-primary hover:bg-white/90 font-semibold text-xs h-8 px-3"
                >
                  Upgrade now <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}

            {/* Mobile-first app header */}
            <header className="h-14 flex items-center justify-between px-4 bg-transparent border-b border-border/10 sticky top-0 z-30 backdrop-blur-sm">
              <NavLink to="/dashboard" className="flex items-center gap-2.5">
                <AnimatedLogo size="sm" />
                <span className="font-bold text-lg text-foreground tracking-tight">AutoPilot Geo</span>
              </NavLink>
              <SidebarTrigger className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-muted/60 active:scale-95 transition-all duration-150">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="17" y2="12" />
                  <line x1="3" y1="18" x2="13" y2="18" />
                </svg>
              </SidebarTrigger>
            </header>
            
            {/* Global Progress Bar */}
            {isGenerating && (
              <>
                {/* Desktop progress bar */}
                <div className="hidden md:block border-b bg-background/95 backdrop-blur-sm px-4 py-3">
                  <div className="container">
                    <div className="flex items-center gap-4">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm font-medium text-muted-foreground min-w-[200px]">
                        {generationMessage || "Generating content..."}
                      </span>
                      <div className="flex-1">
                        <Progress value={generationProgress} className="h-2" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground w-12 text-right">
                        {generationProgress}%
                      </span>
                    </div>
                  </div>
                </div>
                {/* Mobile toast */}
                <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 animate-fade-in">
                  <div className="bg-foreground text-background rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{generationMessage || "Generating..."}</p>
                      <Progress value={generationProgress} className="h-1.5 mt-1.5 [&>div]:bg-primary" />
                    </div>
                    <span className="text-xs font-bold shrink-0">{generationProgress}%</span>
                  </div>
                </div>
              </>
            )}
            
            <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
              <div className="container py-8">
                {children}
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TranslationProvider>
  );
}
