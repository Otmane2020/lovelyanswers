"use client";
import { ReactNode, useEffect } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AeoSidebar } from "./AeoSidebar";
import { AppTopbar } from "./AppTopbar";
import { TranslationProvider } from "@/lib/language";
import { useGeneration } from "@/contexts/GenerationContext";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: ReactNode;
}

const NO_PROJECT_ALLOWED = ["/wizard", "/onboarding", "/auth", "/checkout", "/pricing", "/billing", "/subscription", "/thank-you", "/support", "/account", "/settings"];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isGenerating, generationProgress, generationMessage } = useGeneration();
  const { isSubscribed, isTrial, isLoading: subLoading } = useSubscriptionContext();
  const { user, isLoading: authLoading } = useAuth();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const router = useRouter();
  const pathname = usePathname();

  // Force light theme on dashboard
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // Redirect users without any project to the wizard (forces onboarding)
  useEffect(() => {
    if (!authLoading && user && !projectsLoading && projects && projects.length === 0) {
      const isAllowed = NO_PROJECT_ALLOWED.some((p) => pathname?.startsWith(p));
      if (!isAllowed) {
        router.push("/wizard");
      }
    }
  }, [authLoading, user, projectsLoading, projects, pathname, router]);

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
                  onClick={() => router.push("/checkout")}
                  className="shrink-0 bg-white text-primary hover:bg-white/90 font-semibold text-xs h-8 px-3"
                >
                  Upgrade now <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}


            
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
