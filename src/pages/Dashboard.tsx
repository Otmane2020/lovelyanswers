import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useActiveProject } from "@/hooks/useProjects";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AuditIssue {
  id: string;
  title: string;
  severity: "High" | "Medium" | "Low";
  fixed: boolean;
}

export default function Dashboard() {
  const { project } = useActiveProject();
  const { subscribed, trial, isLoading } = useSubscription();
  const [onboardingProgress, setOnboardingProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState("17 minutes");
  const [geoScore, setGeoScore] = useState(78);
  const [isOpen, setIsOpen] = useState(true);
  
  const [auditIssues, setAuditIssues] = useState<AuditIssue[]>([
    { id: "1", title: "Missing llms.txt", severity: "High", fixed: true },
    { id: "2", title: "Missing JSON-LD schema", severity: "High", fixed: false },
    { id: "3", title: "Duplicated H1s", severity: "High", fixed: false },
    { id: "4", title: "Broken Internal Link", severity: "Low", fixed: false },
    { id: "5", title: "Irrelevant Meta Description", severity: "Medium", fixed: false },
  ]);

  useEffect(() => {
    // Simulate onboarding progress
    const timer = setInterval(() => {
      setOnboardingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 1;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "High":
        return "text-destructive";
      case "Medium":
        return "text-amber-500";
      case "Low":
        return "text-emerald-500";
      default:
        return "text-muted-foreground";
    }
  };

  const issuesCount = auditIssues.filter((i) => !i.fixed).length;
  const isOnboarding = !subscribed && !trial;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Onboarding Progress Card */}
        <Card className="p-6 border border-border/50 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-foreground">{onboardingProgress}%</span>
              </div>
              <div className="w-24 h-1 bg-primary rounded-full mt-2" />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="w-4 h-4" />
              <span>{timeLeft} left</span>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold text-foreground mb-1">
            Onboarding in progress...
          </h2>
          <p className="text-muted-foreground text-sm">
            You can leave this page, we'll email you when everything is ready.
          </p>
        </Card>

        {/* GEO Audit Card */}
        <Card className="border border-border/50 shadow-sm overflow-hidden">
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="font-medium text-foreground">
                    {project?.website_url || "www.yoursite.com"}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">GEO Score </span>
                    <span className="font-semibold text-primary">{geoScore}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Issues: </span>
                    <span className="font-semibold text-foreground">{issuesCount}</span>
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="border-t border-border/50">
                {auditIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-center justify-between px-6 py-4 border-b border-border/30 last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-foreground">{issue.title}</span>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-medium ${getSeverityColor(issue.severity)}`}>
                        {issue.severity}
                      </span>
                      {issue.fixed ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Fixed
                        </Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          className="bg-foreground hover:bg-foreground/90 text-background h-8 px-4"
                        >
                          Fix <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Info Text */}
        <p className="text-center text-muted-foreground text-sm">
          We are finding technical issues on your website that are preventing{" "}
          <span className="font-medium text-foreground">Google</span> and{" "}
          <span className="font-medium text-foreground">ChatGPT</span> from properly reading and ranking your site.
        </p>
      </div>
    </DashboardLayout>
  );
}
