"use client";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RefreshCw, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useActiveProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  pending: "Not started",
  scraping: "Analysing website pages…",
  analysing_business: "Analysing business…",
  researching_keywords: "Researching keywords…",
  analysing_competitors: "Analysing competitors…",
  building_context: "Building project context…",
  planning: "Planning content…",
  generating: "Generating content…",
  completed: "Completed",
  partial: "Partially completed",
  failed: "Failed",
};

/** Human labels for the provenance of each context block. */
const SOURCE_LABELS: Record<string, string> = {
  scraping: "Website scraping",
  analyze_website: "Business analysis",
  dataforseo: "DataForSEO (volume / CPC)",
  competitors: "Competitors",
  google_business: "Google Business",
  shopping: "Shopping products",
  user_input: "Manual settings",
};

interface ContextSource {
  status: "present" | "missing" | "stale";
  count: number;
  last_updated: string | null;
  feeds?: string[];
  detail?: string;
}

interface ContextRow {
  readiness: string | null;
  context_version: number | null;
  stale: boolean | null;
  refreshed_at: string | null;
  context: any;
}

export function ProjectContextCard() {
  const { project } = useActiveProject();
  const [status, setStatus] = useState<string>("pending");
  const [progress, setProgress] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [ctx, setCtx] = useState<ContextRow | null>(null);
  const [rescrape, setRescrape] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    if (!project?.id) return;
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase
        .from("projects")
        .select("onboarding_status, onboarding_progress, onboarding_last_error")
        .eq("id", project.id)
        .maybeSingle(),
      supabase
        .from("project_context")
        .select("readiness, context_version, stale, refreshed_at, context")
        .eq("project_id", project.id)
        .maybeSingle(),
    ]);
    if (p) {
      setStatus((p as any).onboarding_status || "pending");
      setProgress((p as any).onboarding_progress || 0);
      setLastError((p as any).onboarding_last_error || null);
    }
    setCtx((c as any) || null);
  }, [project?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    if (!project?.id) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("onboarding-pipeline", {
        body: { projectId: project.id, mode: "refresh", rescrape },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Context rebuilt (v${data.contextVersion}, ${data.readiness})`);
      } else {
        toast.error(data?.error || "Context refresh failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Context refresh failed");
    } finally {
      setRunning(false);
      load();
    }
  };

  const readiness = ctx?.readiness || "unknown";
  const pages = ctx?.context?.website?.pages_count ?? 0;
  const keywords = ctx?.context?.keywords?.length ?? 0;
  const competitors = ctx?.context?.competitors?.length ?? 0;
  const sources = Object.entries(
    (ctx?.context?.sources || {}) as Record<string, ContextSource>,
  );

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            Project context
            <Badge variant={readiness === "ready" ? "default" : readiness === "partial" ? "secondary" : "outline"}>
              {readiness}
            </Badge>
            {ctx?.stale && <Badge variant="destructive">stale</Badge>}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {STATUS_LABELS[status] || status}
            {progress > 0 && progress < 100 ? ` · ${progress}%` : ""}
          </p>
        </div>
        {readiness === "ready" ? (
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border p-3">
          <div className="text-xl font-semibold">{pages}</div>
          <div className="text-muted-foreground text-xs">pages analysed</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xl font-semibold">{keywords}</div>
          <div className="text-muted-foreground text-xs">keywords</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xl font-semibold">{competitors}</div>
          <div className="text-muted-foreground text-xs">competitors</div>
        </div>
      </div>

      {sources.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data sources</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {sources.map(([key, src]) => (
              <div key={key} className="flex items-start gap-2 rounded-lg border p-2.5">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    src.status === "present"
                      ? "bg-primary"
                      : src.status === "stale"
                        ? "bg-muted-foreground"
                        : "bg-destructive"
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {SOURCE_LABELS[key] || key}{" "}
                    <span className="text-muted-foreground font-normal">({src.count})</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {src.status === "present"
                      ? src.last_updated
                        ? `Updated ${new Date(src.last_updated).toLocaleDateString()}`
                        : "Available"
                      : src.detail || src.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lastError && <p className="text-xs text-destructive">{lastError}</p>}

      {ctx?.refreshed_at && (
        <p className="text-xs text-muted-foreground">
          Last refresh: {new Date(ctx.refreshed_at).toLocaleString()} · v{ctx.context_version}
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Checkbox id="rescrape" checked={rescrape} onCheckedChange={(v) => setRescrape(!!v)} />
          <Label htmlFor="rescrape" className="text-sm font-normal">
            Re-scrape website pages
          </Label>
        </div>
        <Button onClick={handleRefresh} disabled={running || !project?.id} size="sm">
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {running ? "Refreshing…" : "Refresh project context"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Rebuilding the context never touches published content or already generated slots.
      </p>
    </Card>
  );
}
