"use client";
import { ReactNode, useEffect } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AeoSidebar } from "./AeoSidebar";
import { AppTopbar } from "./AppTopbar";
import { MobileBottomNav } from "./MobileBottomNav";
import { TranslationProvider } from "@/lib/language";
import { useGeneration } from "@/contexts/GenerationContext";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/hooks/useProjects";


interface DashboardLayoutProps {
  children: ReactNode;
}

const NO_PROJECT_ALLOWED = ["/wizard", "/onboarding", "/auth", "/checkout", "/pricing", "/billing", "/subscription", "/thank-you", "/support", "/account", "/settings"];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isGenerating, generationProgress, generationMessage } = useGeneration();
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

  return (
    <TranslationProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AeoSidebar />
          <SidebarInset className="flex-1 flex flex-col">



            
            {/* Global Sticky-Top Progress Bar — visible across the whole app */}
            {isGenerating && (
              <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md shadow-sm">
                {/* Thin animated strip at the very top */}
                <div className="h-1 w-full bg-primary/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary via-violet-500 to-primary transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.max(5, generationProgress)}%` }}
                  />
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-4">
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-foreground truncate flex-1 min-w-0">
                    {generationMessage || "Working… please wait"}
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground shrink-0 tabular-nums">
                    {generationProgress}%
                  </span>
                </div>
              </div>
            )}
            
            <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5 pb-20 md:pb-0">
              <div className="container py-8">
                {children}
              </div>
            </main>
            <MobileBottomNav />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TranslationProvider>
  );
}
