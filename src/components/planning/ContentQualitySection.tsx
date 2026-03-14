import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ContentQualitySectionProps {
  projectId: string;
}

export function ContentQualitySection({ projectId }: ContentQualitySectionProps) {
  const [stats, setStats] = useState<{
    totalArticles: number;
    avgScore: number;
    lowQualityCount: number;
  }>({ totalArticles: 0, avgScore: 0, lowQualityCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRewriting, setIsRewriting] = useState(false);

  useEffect(() => {
    loadStats();
  }, [projectId]);

  const loadStats = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { data: articles } = await supabase
        .from("articles")
        .select("aeo_score, word_count")
        .eq("project_id", projectId);

      if (articles && articles.length > 0) {
        const scores = articles.map((a) => a.aeo_score || 0);
        const avgScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
        const lowQuality = articles.filter((a) => (a.aeo_score || 0) < 70 || (a.word_count || 0) < 1000).length;

        setStats({
          totalArticles: articles.length,
          avgScore,
          lowQualityCount: lowQuality,
        });
      }
    } catch (err) {
      console.error("Error loading quality stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkRewrite = async () => {
    setIsRewriting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in first");
        return;
      }

      toast.info("Rewriting low-quality articles... This may take a few minutes.");

      const { data, error } = await supabase.functions.invoke("rewrite-article", {
        body: { bulkRewrite: true, projectId },
      });

      if (error) throw error;

      toast.success(
        `Done! ${data.rewritten} articles rewritten (avg score: ${data.averageOldScore} -> ${data.averageNewScore})`
      );
      loadStats();
    } catch (err) {
      console.error("Bulk rewrite error:", err);
      toast.error("Failed to rewrite articles");
    } finally {
      setIsRewriting(false);
    }
  };

  if (isLoading) return null;
  if (stats.totalArticles === 0) return null;

  const scoreColor = stats.avgScore >= 80 ? "text-green-600" : stats.avgScore >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg border bg-background">
      <div className="flex items-center gap-2">
        {stats.avgScore >= 70 ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
        <span className="text-sm font-medium">Quality</span>
      </div>

      <Badge variant="outline" className={scoreColor}>
        Avg: {stats.avgScore}/100
      </Badge>

      <span className="text-xs text-muted-foreground">
        {stats.totalArticles} articles
      </span>

      {stats.lowQualityCount > 0 && (
        <>
          <Badge variant="destructive" className="text-xs">
            {stats.lowQualityCount} low quality
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkRewrite}
            disabled={isRewriting}
            className="h-7 text-xs"
          >
            {isRewriting ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Rewrite all
          </Button>
        </>
      )}
    </div>
  );
}
