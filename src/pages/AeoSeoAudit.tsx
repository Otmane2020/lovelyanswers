import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Globe,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";

interface AuditResult {
  category: string;
  status: "pass" | "warning" | "fail";
  title: string;
  description: string;
  impact: string;
  recommendation: string;
}

interface AuditResponse {
  success: boolean;
  url: string;
  scores: {
    overall: number;
    seo: number;
    aeo: number;
  };
  results: AuditResult[];
}

export default function AeoSeoAudit() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const { project } = useActiveProject();
  const { toast } = useToast();

  const runAudit = async () => {
    if (!url || !project) {
      toast({ title: "Error", description: "Please enter a URL", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-audit", {
        body: { projectId: project.id, url }
      });

      if (error) throw error;
      setAuditData(data);
      toast({ title: "Audit Complete", description: "Your SEO audit has finished." });
    } catch (err: any) {
      toast({ title: "Audit Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "fail": return <XCircle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">SEO Audit</h1>
          <p className="text-muted-foreground mt-1">
            Analyze your website for SEO and AEO issues
          </p>
        </div>

        {/* URL Input */}
        <GlassCard className="p-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="https://yourwebsite.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={runAudit} disabled={loading || !project}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</>
              ) : (
                <><Search className="mr-2 h-4 w-4" />Run Audit</>
              )}
            </Button>
          </div>
          {!project && (
            <p className="text-sm text-muted-foreground mt-2">
              Please complete onboarding to run an audit.
            </p>
          )}
        </GlassCard>

        {/* Results */}
        {auditData && (
          <>
            {/* Scores */}
            <div className="grid gap-6 md:grid-cols-3">
              <GlassCard className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
                <p className={`text-5xl font-bold ${getScoreColor(auditData.scores.overall)}`}>
                  {auditData.scores.overall}
                </p>
                <Progress value={auditData.scores.overall} className="mt-4" />
              </GlassCard>
              <GlassCard className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">SEO Score</p>
                <p className={`text-5xl font-bold ${getScoreColor(auditData.scores.seo)}`}>
                  {auditData.scores.seo}
                </p>
                <Progress value={auditData.scores.seo} className="mt-4" />
              </GlassCard>
              <GlassCard className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">AEO Score</p>
                <p className={`text-5xl font-bold ${getScoreColor(auditData.scores.aeo)}`}>
                  {auditData.scores.aeo}
                </p>
                <Progress value={auditData.scores.aeo} className="mt-4" />
              </GlassCard>
            </div>

            {/* Issues List */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Audit Results</h2>
              <div className="space-y-4">
                {auditData.results.map((result, i) => (
                  <GlassCard key={i} className="p-4">
                    <div className="flex items-start gap-4">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{result.title}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {result.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{result.description}</p>
                        {result.recommendation && (
                          <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm"><strong>Recommendation:</strong> {result.recommendation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!auditData && !loading && (
          <GlassCard className="p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Run Your First Audit</h3>
            <p className="text-muted-foreground mt-1">
              Enter your website URL above to analyze SEO and AEO performance.
            </p>
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  );
}
