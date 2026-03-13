"use client";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Key, 
  Loader2, 
  Search,
  TrendingUp,
  Target,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";

interface Keyword {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  trend: string;
  aeo_score: number;
}

interface KeywordCluster {
  name: string;
  intent: string;
  keywords: Keyword[];
}

interface KeywordResponse {
  clusters: KeywordCluster[];
  summary: {
    total_keywords: number;
    avg_difficulty: number;
    best_opportunities: string[];
  };
}

export default function AeoKeywords() {
  const [seedKeywords, setSeedKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<KeywordResponse | null>(null);
  const { project } = useActiveProject();
  const { toast } = useToast();

  const runResearch = async () => {
    if (!seedKeywords || !project) {
      toast({ title: "Error", description: "Please enter seed keywords", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("keyword-research", {
        body: { 
          projectId: project.id, 
          seedKeywords: seedKeywords.split(",").map(k => k.trim()),
          language: project.language || "en",
          country: "us"
        }
      });

      if (error) throw error;
      setData(result);
      toast({ title: "Research Complete", description: "Keyword research has finished." });
    } catch (err: any) {
      toast({ title: "Research Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 30) return "bg-emerald-500/20 text-emerald-500";
    if (difficulty <= 60) return "bg-amber-500/20 text-amber-500";
    return "bg-red-500/20 text-red-500";
  };

  const getIntentColor = (intent: string) => {
    switch (intent.toLowerCase()) {
      case "informational": return "bg-blue-500/20 text-blue-500";
      case "transactional": return "bg-emerald-500/20 text-emerald-500";
      case "navigational": return "bg-violet-500/20 text-violet-500";
      case "commercial": return "bg-amber-500/20 text-amber-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          icon={Key}
          title="Keyword Research"
          description="Discover high-impact keywords for your content"
          gradientFrom="from-amber-500/10"
          gradientVia="via-yellow-500/10"
          gradientTo="to-orange-500/10"
          iconFrom="from-amber-500"
          iconTo="to-yellow-600"
        />

        {/* Input */}
        <GlassCard className="p-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter seed keywords (comma separated)"
                value={seedKeywords}
                onChange={(e) => setSeedKeywords(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={runResearch} disabled={loading || !project}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Researching...</>
              ) : (
                <><Search className="mr-2 h-4 w-4" />Research</>
              )}
            </Button>
          </div>
          {!project && (
            <p className="text-sm text-muted-foreground mt-2">
              Please complete onboarding to run keyword research.
            </p>
          )}
        </GlassCard>

        {/* Results */}
        {data && (
          <>
            {/* Summary */}
            <div className="grid gap-6 md:grid-cols-3">
              <GlassCard className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Keywords</p>
                    <p className="text-2xl font-bold">{data.summary.total_keywords}</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                    <Target className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Difficulty</p>
                    <p className="text-2xl font-bold">{data.summary.avg_difficulty}</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clusters Found</p>
                    <p className="text-2xl font-bold">{data.clusters.length}</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Clusters */}
            <div className="space-y-6">
              {data.clusters.map((cluster, i) => (
                <GlassCard key={i} className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-semibold">{cluster.name}</h3>
                    <Badge className={getIntentColor(cluster.intent)}>
                      {cluster.intent}
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 font-medium">Keyword</th>
                          <th className="text-right py-2 font-medium">Volume</th>
                          <th className="text-right py-2 font-medium">Difficulty</th>
                          <th className="text-right py-2 font-medium">AEO Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cluster.keywords.map((kw, j) => (
                          <tr key={j} className="border-b border-border/50">
                            <td className="py-2">{kw.keyword}</td>
                            <td className="text-right py-2">{kw.volume?.toLocaleString() || "-"}</td>
                            <td className="text-right py-2">
                              <Badge className={getDifficultyColor(kw.difficulty)}>
                                {kw.difficulty}
                              </Badge>
                            </td>
                            <td className="text-right py-2">
                              <Badge variant="secondary">{kw.aeo_score || "-"}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!data && !loading && (
          <GlassCard className="p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Start Keyword Research</h3>
            <p className="text-muted-foreground mt-1">
              Enter seed keywords above to discover content opportunities.
            </p>
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  );
}
