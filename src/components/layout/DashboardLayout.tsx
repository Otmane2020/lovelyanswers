import { ReactNode, useEffect } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AeoSidebar } from "./AeoSidebar";
import { TranslationProvider } from "@/lib/language";
import { useGeneration } from "@/contexts/GenerationContext";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

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
            <header className="h-12 flex items-center px-4 bg-background/50 backdrop-blur-sm">
              <SidebarTrigger className="mr-4 hover:bg-muted/50 transition-colors" />
            </header>
            
            {/* Global Progress Bar - Persists across route changes */}
            {isGenerating && (
              <div className="border-b bg-background/95 backdrop-blur-sm px-4 py-3">
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
