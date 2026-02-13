import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  AlertCircle, AlertTriangle, CheckCircle2, TrendingUp, 
  ArrowRight, Lightbulb, Target, Loader2, Pause, Play, 
  MinusCircle, PlusCircle, Zap
} from "lucide-react";

interface AdsAnalysisReportProps {
  text: string;
  isStreaming: boolean;
  onActionExecuted?: () => void;
}

interface ReportSection {
  title: string;
  severity: "critical" | "important" | "improvement" | "info";
  content: string;
  actions: ParsedAction[];
}

interface ParsedAction {
  text: string;
  type: "pause_ad_group" | "enable_ad_group" | "add_negative_keyword" | "generic";
  targetName?: string;
}

function parseSeverity(title: string): "critical" | "important" | "improvement" | "info" {
  const lower = title.toLowerCase();
  if (lower.includes("🔴") || lower.includes("critique") || lower.includes("critical") || lower.includes("exclure") || lower.includes("pause")) return "critical";
  if (lower.includes("🟡") || lower.includes("important") || lower.includes("optimiser") || lower.includes("améliorer")) return "important";
  if (lower.includes("🟢") || lower.includes("amélioration") || lower.includes("conserver") || lower.includes("booster")) return "improvement";
  if (lower.includes("🔵") || lower.includes("ajouter") || lower.includes("créer")) return "info";
  return "info";
}

function detectActionType(text: string): ParsedAction {
  const lower = text.toLowerCase();
  
  // Detect pause ad group actions
  const pauseMatch = lower.match(/(?:mett(?:re|ez)\s+en\s+pause|pause[rz])\s+(?:le\s+)?(?:ad\s+group|groupe)\s+["«]?([^"»,.\n]+)/i)
    || lower.match(/(?:mett(?:re|ez)\s+en\s+pause|pause[rz])\s+["«]?([^"»,.\n]+)/i);
  if (pauseMatch || lower.includes("mettre en pause") || lower.includes("pausez")) {
    return { text, type: "pause_ad_group", targetName: pauseMatch?.[1]?.trim() };
  }

  // Detect enable/reactivate
  const enableMatch = lower.match(/(?:réactiv|activ|enabl)\w*\s+(?:le\s+)?(?:ad\s+group|groupe|mot-clé)\s+["«\[]?([^"»\],.\n]+)/i);
  if (enableMatch || lower.includes("réactiv") || lower.includes("activez")) {
    return { text, type: "enable_ad_group", targetName: enableMatch?.[1]?.trim() };
  }

  // Detect negative keywords
  if (lower.includes("négatif") || lower.includes("exclure") || lower.includes("negative")) {
    return { text, type: "add_negative_keyword" };
  }

  return { text, type: "generic" };
}

function parseMarkdownSections(text: string): { summary: string; sections: ReportSection[] } {
  const lines = text.split("\n");
  let summary = "";
  const sections: ReportSection[] = [];
  let currentSection: ReportSection | null = null;
  let inSummary = true;
  let contentBuffer: string[] = [];

  for (const line of lines) {
    if (line.startsWith("### ")) {
      if (currentSection) {
        currentSection.content = contentBuffer.join("\n").trim();
        currentSection.actions = extractActions(currentSection.content);
        sections.push(currentSection);
        contentBuffer = [];
      }
      inSummary = false;
      const title = line.replace(/^###\s*/, "").trim();
      currentSection = { title, severity: parseSeverity(title), content: "", actions: [] };
    } else if (line.startsWith("## ") && !line.toLowerCase().includes("recommandation") && !line.toLowerCase().includes("analyse")) {
      if (currentSection) {
        currentSection.content = contentBuffer.join("\n").trim();
        currentSection.actions = extractActions(currentSection.content);
        sections.push(currentSection);
        contentBuffer = [];
      }
      if (!line.toLowerCase().includes("analyse globale") && !line.toLowerCase().includes("kpi")) {
        inSummary = false;
      }
      if (inSummary) summary += line + "\n";
    } else if (currentSection) {
      contentBuffer.push(line);
    } else if (inSummary) {
      summary += line + "\n";
    }
  }

  if (currentSection) {
    currentSection.content = contentBuffer.join("\n").trim();
    currentSection.actions = extractActions(currentSection.content);
    sections.push(currentSection);
  }

  return { summary: summary.trim(), sections };
}

function extractActions(content: string): ParsedAction[] {
  const actions: ParsedAction[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      (trimmed.startsWith("*   **Action") || trimmed.startsWith("- **Action") || trimmed.startsWith("*  **Action")) ||
      (trimmed.match(/^\d+\.\s+\*\*/) && (trimmed.includes("Action") || trimmed.includes("Mettre") || trimmed.includes("Ajouter") || trimmed.includes("Optimiser") || trimmed.includes("Vérifi") || trimmed.includes("Créer") || trimmed.includes("Supprim") || trimmed.includes("Paus") || trimmed.includes("Réactiv")))
    ) {
      const cleaned = trimmed
        .replace(/^\*\s+/, "").replace(/^-\s+/, "").replace(/^\d+\.\s+/, "")
        .replace(/\*\*/g, "").replace(/^Action\s*:\s*/i, "").replace(/^Action concrète\s*:\s*/i, "")
        .trim();
      if (cleaned.length > 10) {
        actions.push(detectActionType(cleaned));
      }
    }
  }
  return actions.slice(0, 8);
}

const severityConfig = {
  critical: {
    color: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-800 border-red-300",
    icon: AlertCircle,
    iconColor: "text-red-600",
    label: "Critique",
  },
  important: {
    color: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    label: "Important",
  },
  improvement: {
    color: "bg-green-50 border-green-200",
    badge: "bg-green-100 text-green-800 border-green-300",
    icon: CheckCircle2,
    iconColor: "text-green-600",
    label: "Amélioration",
  },
  info: {
    color: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
    icon: Lightbulb,
    iconColor: "text-blue-600",
    label: "Info",
  },
};

function renderMarkdownLine(text: string) {
  const parts = text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>');
  return <span dangerouslySetInnerHTML={{ __html: parts }} />;
}

function ActionButton({ action, onExecuted }: { action: ParsedAction; onExecuted?: () => void }) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);

  const executeAction = async () => {
    if (action.type === "generic") return;
    
    setIsExecuting(true);
    try {
      if (action.type === "pause_ad_group" || action.type === "enable_ad_group") {
        // Find the ad group by name
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const targetName = action.targetName?.replace(/['"«»\[\]]/g, "").trim();
        if (!targetName) {
          toast({ title: "Nom du groupe introuvable", description: "Impossible d'identifier l'ad group", variant: "destructive" });
          return;
        }

        // Look up in ads_sync to find google_ad_group_id
        const { data: ads } = await supabase
          .from("ads_sync")
          .select("google_ad_group_id, ad_group_name")
          .eq("user_id", session.user.id)
          .ilike("ad_group_name", `%${targetName}%`)
          .limit(1);

        const adGroupId = ads?.[0]?.google_ad_group_id;
        if (!adGroupId) {
          toast({ title: "Ad Group introuvable", description: `"${targetName}" non trouvé dans les données synchronisées`, variant: "destructive" });
          return;
        }

        const newStatus = action.type === "pause_ad_group" ? "PAUSED" : "ENABLED";
        const { data, error } = await supabase.functions.invoke("toggle-ad-group-status", {
          body: { adGroupId, action: newStatus },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setExecuted(true);
        toast({
          title: newStatus === "PAUSED" ? "⏸️ Ad Group mis en pause" : "▶️ Ad Group activé",
          description: `"${ads?.[0]?.ad_group_name || targetName}" → ${newStatus}`,
        });
        onExecuted?.();
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsExecuting(false);
    }
  };

  if (action.type === "generic") {
    return null;
  }

  const buttonConfig = {
    pause_ad_group: { icon: Pause, label: "Mettre en pause", variant: "destructive" as const },
    enable_ad_group: { icon: Play, label: "Activer", variant: "default" as const },
    add_negative_keyword: { icon: MinusCircle, label: "Ajouter négatif", variant: "outline" as const },
  };

  const config = buttonConfig[action.type];
  const Icon = config.icon;

  return (
    <Button
      size="sm"
      variant={executed ? "outline" : config.variant}
      className="h-7 text-xs gap-1 shrink-0"
      disabled={isExecuting || executed}
      onClick={executeAction}
    >
      {isExecuting ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : executed ? (
        <CheckCircle2 className="h-3 w-3 text-green-600" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {executed ? "Fait ✓" : config.label}
    </Button>
  );
}

export function AdsAnalysisReport({ text, isStreaming, onActionExecuted }: AdsAnalysisReportProps) {
  if (!text && isStreaming) {
    return (
      <div className="flex items-center gap-3 py-8 justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-muted-foreground">Analyse en cours...</span>
      </div>
    );
  }

  if (!text) return null;

  const { summary, sections } = parseMarkdownSections(text);
  const kpis = extractKPIs(summary);

  return (
    <div className="space-y-6">
      {/* KPI Dashboard */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((kpi, i) => (
            <Card key={i} className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                {kpi.status && (
                  <Badge variant="outline" className={`mt-1 text-[10px] ${
                    kpi.status === "bad" ? "text-red-600 border-red-300" : 
                    kpi.status === "ok" ? "text-amber-600 border-amber-300" : 
                    "text-green-600 border-green-300"
                  }`}>
                    {kpi.status === "bad" ? "⚠️ À corriger" : kpi.status === "ok" ? "Acceptable" : "✓ Bon"}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Synthèse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              {summary.split("\n").filter(l => l.trim() && !l.startsWith("#")).map((line, i) => (
                <p key={i}>{renderMarkdownLine(line)}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendation Cards */}
      {sections.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {sections.length} Recommandation{sections.length > 1 ? "s" : ""}
          </h3>
          {sections.map((section, idx) => {
            const config = severityConfig[section.severity];
            const Icon = config.icon;
            const actionableItems = section.actions.filter(a => a.type !== "generic");

            return (
              <Card key={idx} className={`border ${config.color}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm font-semibold leading-tight">
                          {section.title.replace(/🔴|🟡|🟢|🔵/g, "").replace(/Critique\s*:|Important\s*:|Amélioration\s*:/i, "").trim()}
                        </CardTitle>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${config.badge}`}>
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Content */}
                  <div className="text-sm text-muted-foreground leading-relaxed space-y-1.5 mb-3">
                    {section.content.split("\n").filter(l => {
                      const t = l.trim();
                      return t && !t.startsWith("---") && !t.startsWith("###");
                    }).slice(0, 8).map((line, i) => {
                      const trimmed = line.trim();
                      if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
                        const lineText = trimmed.replace(/^\*\s+/, "").replace(/^-\s+/, "");
                        return (
                          <div key={i} className="flex items-start gap-2 pl-1">
                            <ArrowRight className="h-3 w-3 mt-1 shrink-0 text-primary/60" />
                            <span>{renderMarkdownLine(lineText)}</span>
                          </div>
                        );
                      }
                      if (trimmed.match(/^\d+\./)) {
                        const lineText = trimmed.replace(/^\d+\.\s+/, "");
                        return (
                          <div key={i} className="flex items-start gap-2 pl-1">
                            <span className="text-primary font-bold text-xs mt-0.5 shrink-0">{trimmed.match(/^\d+/)?.[0]}.</span>
                            <span>{renderMarkdownLine(lineText)}</span>
                          </div>
                        );
                      }
                      return <p key={i}>{renderMarkdownLine(trimmed)}</p>;
                    })}
                  </div>

                  {/* Actionable CTA buttons */}
                  {section.actions.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" /> Actions
                        </p>
                        {section.actions.map((action, ai) => (
                          <div key={ai} className="flex items-center gap-2 bg-background/80 rounded-lg p-2.5 border border-border/50">
                            <Zap className="h-4 w-4 shrink-0 text-primary" />
                            <span className="text-xs leading-relaxed flex-1">{renderMarkdownLine(action.text)}</span>
                            <ActionButton action={action} onExecuted={onActionExecuted} />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Analyse en cours...</span>
        </div>
      )}
    </div>
  );
}

function extractKPIs(summary: string): { label: string; value: string; status?: "bad" | "ok" | "good" }[] {
  const kpis: { label: string; value: string; status?: "bad" | "ok" | "good" }[] = [];

  const spendMatch = summary.match(/(\d+[.,]\d+)\s*€.*(?:dépens|spend)/i) || summary.match(/(?:dépens|spend).*?(\d+[.,]\d+)\s*€/i);
  if (spendMatch) kpis.push({ label: "Dépenses 7j", value: `${spendMatch[1]}€` });

  const clicksMatch = summary.match(/(\d+)\s*clics/i);
  if (clicksMatch) kpis.push({ label: "Clics 7j", value: clicksMatch[1] });

  const convMatch = summary.match(/(\d+)\s*conversion/i);
  if (convMatch) {
    const val = parseInt(convMatch[1]);
    kpis.push({ label: "Conversions", value: convMatch[1], status: val === 0 ? "bad" : val < 5 ? "ok" : "good" });
  }

  const ctrMatch = summary.match(/CTR.*?(\d+[.,]\d+)\s*%/i) || summary.match(/(\d+[.,]\d+)\s*%.*CTR/i);
  if (ctrMatch) {
    const val = parseFloat(ctrMatch[1].replace(",", "."));
    kpis.push({ label: "CTR moyen", value: `${ctrMatch[1]}%`, status: val < 2 ? "bad" : val < 5 ? "ok" : "good" });
  }

  const roasMatch = summary.match(/ROAS.*?(\d+[.,]\d+)/i);
  if (roasMatch) {
    const val = parseFloat(roasMatch[1].replace(",", "."));
    kpis.push({ label: "ROAS", value: roasMatch[1], status: val < 1 ? "bad" : val < 3 ? "ok" : "good" });
  }

  return kpis.slice(0, 4);
}
