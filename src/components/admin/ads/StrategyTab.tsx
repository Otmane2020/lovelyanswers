import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lightbulb, Zap, Settings, Target } from "lucide-react";
import { useAdsStreaming } from "@/hooks/useAdsStreaming";
import { AdsAnalysisReport } from "@/components/admin/AdsAnalysisReport";
import { ReportHistory } from "./ReportHistory";
import { CampaignSelectDialog } from "./CampaignSelectDialog";

interface SyncedCampaign {
  id: string;
  name: string;
  status: string | null;
  advertising_channel_type: string | null;
  bidding_strategy_type: string | null;
  budget_amount_micros: number | null;
  spend_7d: number | null;
  clicks_7d: number | null;
  impressions_7d: number | null;
  conversions_7d: number | null;
  revenue_7d: number | null;
  ctr_7d: number | null;
  cpc_7d: number | null;
  roas_7d: number | null;
  primary_status: string | null;
  primary_status_reasons?: string[] | null;
}

interface StrategyTabProps {
  campaigns: SyncedCampaign[];
}

export function StrategyTab({ campaigns }: StrategyTabProps) {
  const [showCampaignPicker, setShowCampaignPicker] = useState(false);
  const [selectedCampaignName, setSelectedCampaignName] = useState<string | null>(null);
  const { text, isStreaming, startAnalysis, ref, previousReports, isLoadingHistory, loadPreviousReports, loadReport } = useAdsStreaming();

  useEffect(() => {
    loadPreviousReports("strategy");
  }, []);

  const handleLaunchAnalysis = () => setShowCampaignPicker(true);
  const handleCampaignSelected = (campaignId: string | null, campaignName: string) => {
    setSelectedCampaignName(campaignName);
    startAnalysis("strategy", campaignId || undefined);
  };

  const totalSpend = campaigns.reduce((s, c) => s + (c.spend_7d || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks_7d || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions_7d || 0), 0);
  const avgCTR = campaigns.length > 0 ? campaigns.reduce((s, c) => s + (c.ctr_7d || 0), 0) / campaigns.length : 0;

  const diagnostics: { label: string; status: "good" | "warning" | "bad"; detail: string }[] = [];
  const biddingTypes = [...new Set(campaigns.map(c => c.bidding_strategy_type).filter(Boolean))];
  diagnostics.push({ label: "Stratégies d'enchères", status: biddingTypes.length > 3 ? "warning" : "good", detail: biddingTypes.join(", ") || "Aucune" });
  const channelTypes = [...new Set(campaigns.map(c => c.advertising_channel_type).filter(Boolean))];
  diagnostics.push({ label: "Types de campagnes", status: channelTypes.length === 1 ? "warning" : "good", detail: channelTypes.join(", ") || "Aucun" });
  const pausedCampaigns = campaigns.filter(c => c.status !== "ENABLED");
  if (pausedCampaigns.length > 0) diagnostics.push({ label: "Campagnes en pause", status: "warning", detail: `${pausedCampaigns.length} non actives` });
  diagnostics.push({ label: "CTR moyen", status: avgCTR < 0.02 ? "bad" : avgCTR < 0.05 ? "warning" : "good", detail: `${(avgCTR * 100).toFixed(2)}%` });
  const convRate = totalClicks > 0 ? totalConversions / totalClicks : 0;
  diagnostics.push({ label: "Taux de conversion", status: convRate < 0.01 ? "bad" : convRate < 0.03 ? "warning" : "good", detail: `${(convRate * 100).toFixed(2)}%` });
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget_amount_micros || 0), 0) / 1000000 * 7;
  const budgetUtilization = totalBudget > 0 ? totalSpend / totalBudget : 0;
  diagnostics.push({ label: "Utilisation budget", status: budgetUtilization < 0.5 ? "warning" : budgetUtilization > 0.95 ? "warning" : "good", detail: `${(budgetUtilization * 100).toFixed(0)}%` });

  const statusColor = (s: "good" | "warning" | "bad") => s === "good" ? "bg-green-100 text-green-700 border-green-300" : s === "warning" ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-red-100 text-red-700 border-red-300";
  const statusIcon = (s: "good" | "warning" | "bad") => s === "good" ? "✓" : s === "warning" ? "⚠" : "✗";

  return (
    <div className="space-y-6" ref={ref}>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> Diagnostic rapide</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {diagnostics.map((d, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                <span className="text-sm font-medium">{d.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{d.detail}</span>
                  <Badge variant="outline" className={`text-[10px] ${statusColor(d.status)}`}>{statusIcon(d.status)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Configuration des campagnes</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaigns.map(c => (
              <div key={c.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{c.advertising_channel_type}</Badge>
                    <Badge variant="outline" className="text-[10px]">{c.bidding_strategy_type}</Badge>
                    <span className="text-xs text-muted-foreground">Budget: {c.budget_amount_micros ? (c.budget_amount_micros / 1000000).toFixed(0) + "€/j" : "—"}</span>
                  </div>
                </div>
                <Badge variant={c.status === "ENABLED" ? "default" : "outline"} className="text-[10px]">{c.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ReportHistory reports={previousReports} isLoading={isLoadingHistory} onLoad={loadReport} focusType="strategy" onRefresh={loadPreviousReports} />

      <CampaignSelectDialog open={showCampaignPicker} onOpenChange={setShowCampaignPicker} onSelect={handleCampaignSelected} title="Analyser la stratégie" />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Recommandations IA — Stratégie</CardTitle>
              <CardDescription>
                Quick wins et optimisations
                {selectedCampaignName && <Badge variant="outline" className="ml-2 text-[10px]">{selectedCampaignName}</Badge>}
              </CardDescription>
            </div>
            <Button onClick={handleLaunchAnalysis} disabled={isStreaming}>
              {isStreaming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Analyser la stratégie
            </Button>
          </div>
        </CardHeader>
        {(text || isStreaming) && (
          <CardContent>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              <AdsAnalysisReport text={text} isStreaming={isStreaming} />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
