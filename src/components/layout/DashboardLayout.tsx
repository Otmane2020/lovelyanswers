import { ReactNode, useEffect } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AeoSidebar } from "./AeoSidebar";
import { TranslationProvider } from "@/lib/language";
import { useGeneration } from "@/contexts/GenerationContext";
import { Progress } from "@/components/ui/progress";
import { Loader2, Menu } from "lucide-react";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { NavLink } from "react-router-dom";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isGenerating, generationProgress, generationMessage } = useGeneration();

  // Force light theme on dashboard
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <TranslationProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AeoSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            {/* Mobile-first app header */}
            <header className="h-14 flex items-center justify-between px-4 bg-background border-b border-border/30 sticky top-0 z-30">
              <NavLink to="/dashboard" className="flex items-center gap-2.5">
                <AnimatedLogo size="sm" />
                <span className="font-bold text-lg text-foreground tracking-tight">LovelyAnswers</span>
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
