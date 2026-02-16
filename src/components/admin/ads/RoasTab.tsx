import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, TrendingUp, Zap, ArrowUp, ArrowDown, DollarSign, Target, BarChart3, Settings } from "lucide-react";
import { useAdsStreaming } from "@/hooks/useAdsStreaming";
import { AdsAnalysisReport } from "@/components/admin/AdsAnalysisReport";
import { ReportHistory } from "./ReportHistory";
import { CampaignSelectDialog } from "./CampaignSelectDialog";
import { CampaignSettingsDialog } from "./CampaignSettingsDialog";
import { toast } from "@/hooks/use-toast";

interface SyncedCampaign {
  id: string;
  google_campaign_id?: string;
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
}

interface RoasTabProps {
  campaigns: SyncedCampaign[];
  googleCustomerId?: string;
  onRefreshCampaigns?: () => void;
}

export function RoasTab({ campaigns, googleCustomerId, onRefreshCampaigns }: RoasTabProps) {
  const [showCampaignPicker, setShowCampaignPicker] = useState(false);
  const [selectedCampaignName, setSelectedCampaignName] = useState<string | null>(null);
  const [settingsCampaign, setSettingsCampaign] = useState<SyncedCampaign | null>(null);
  const { text, isStreaming, startAnalysis, ref, previousReports, isLoadingHistory, loadPreviousReports, loadReport } = useAdsStreaming();

  useEffect(() => {
    loadPreviousReports("roas");
  }, []);

  const handleLaunchAnalysis = () => setShowCampaignPicker(true);
  const handleCampaignSelected = (campaignId: string | null, campaignName: string) => {
    setSelectedCampaignName(campaignName);
    startAnalysis("roas", campaignId || undefined);
  };

  const totalSpend = campaigns.reduce((s, c) => s + (c.spend_7d || 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue_7d || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions_7d || 0), 0);
  const globalROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const globalCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;

  const getRoasBadge = (roas: number) => {
    if (roas >= 4) return { label: `${roas.toFixed(1)}x`, color: "bg-green-100 text-green-700 border-green-300" };
    if (roas >= 2) return { label: `${roas.toFixed(1)}x`, color: "bg-emerald-100 text-emerald-700 border-emerald-300" };
    if (roas >= 1) return { label: `${roas.toFixed(1)}x`, color: "bg-amber-100 text-amber-700 border-amber-300" };
    return { label: `${roas.toFixed(1)}x`, color: "bg-red-100 text-red-700 border-red-300" };
  };

  const handleScaleAction = (c: SyncedCampaign) => {
    const currentBudget = c.budget_amount_micros ? (c.budget_amount_micros / 1000000) : 0;
    const suggestedBudget = Math.round(currentBudget * 1.3);
    toast({
      title: "📈 Scaler cette campagne",
      description: `"${c.name}" — ROAS ${(c.roas_7d || 0).toFixed(1)}x. Budget actuel: ${currentBudget}€/j → Suggéré: ${suggestedBudget}€/j (+30%). Augmentez le budget dans Google Ads.`,
    });
  };

  const handleReduceAction = (c: SyncedCampaign) => {
    const currentBudget = c.budget_amount_micros ? (c.budget_amount_micros / 1000000) : 0;
    const suggestedBudget = Math.max(5, Math.round(currentBudget * 0.5));
    toast({
      title: "⚠️ Réduire cette campagne",
      description: `"${c.name}" — ROAS ${(c.roas_7d || 0).toFixed(1)}x, dépense ${(c.spend_7d || 0).toFixed(0)}€ sans rentabilité. Réduisez le budget à ${suggestedBudget}€/j ou mettez en pause.`,
    });
  };

  const handleOptimizeAction = (c: SyncedCampaign) => {
    toast({
      title: "🔧 Optimiser cette campagne",
      description: `"${c.name}" — ROAS ${(c.roas_7d || 0).toFixed(1)}x. Testez de nouvelles annonces, affinez les mots-clés, et améliorez les landing pages.`,
    });
  };

  const sorted = [...campaigns].sort((a, b) => (b.roas_7d || 0) - (a.roas_7d || 0));

  return (
    <div className="space-y-6" ref={ref}>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className={globalROAS >= 2 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">ROAS Global</p>
            <p className={`text-3xl font-bold mt-1 ${globalROAS >= 2 ? "text-green-700" : "text-red-700"}`}>
              {globalROAS.toFixed(2)}x
            </p>
            <p className="text-[10px] text-muted-foreground">{globalROAS >= 2 ? "✓ Rentable" : "⚠️ Non rentable"}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Dépenses 7j</p>
            <p className="text-2xl font-bold mt-1">{totalSpend.toFixed(0)}€</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Revenue 7j</p>
            <p className="text-2xl font-bold mt-1">{totalRevenue.toFixed(0)}€</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">CPA moyen</p>
            <p className="text-2xl font-bold mt-1">{globalCPA.toFixed(2)}€</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Conversions</p>
            <p className="text-2xl font-bold mt-1">{totalConversions.toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign ROAS Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Performance ROAS par campagne
          </CardTitle>
          <CardDescription>Cliquez sur les actions pour obtenir des recommandations concrètes</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campagne</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Enchère</TableHead>
                  <TableHead>Budget/j</TableHead>
                  <TableHead>Dépenses</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Conv.</TableHead>
                  <TableHead>CPA</TableHead>
                  <TableHead>ROAS</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(c => {
                  const roas = c.roas_7d || 0;
                  const cpa = (c.conversions_7d || 0) > 0 ? (c.spend_7d || 0) / (c.conversions_7d || 1) : 0;
                  const roasBadge = getRoasBadge(roas);
                  return (
                    <TableRow key={c.id} className={roas < 1 && (c.spend_7d || 0) > 0 ? "bg-red-50/50" : roas >= 3 ? "bg-green-50/50" : ""}>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">{c.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{c.advertising_channel_type}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.bidding_strategy_type}</TableCell>
                      <TableCell className="text-sm">{c.budget_amount_micros ? (c.budget_amount_micros / 1000000).toFixed(0) + "€" : "—"}</TableCell>
                      <TableCell className="text-sm">{(c.spend_7d || 0).toFixed(2)}€</TableCell>
                      <TableCell className="text-sm font-medium">{(c.revenue_7d || 0).toFixed(2)}€</TableCell>
                      <TableCell className="text-sm">{(c.conversions_7d || 0).toFixed(0)}</TableCell>
                      <TableCell className="text-sm">{cpa > 0 ? cpa.toFixed(2) + "€" : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${roasBadge.color}`}>{roasBadge.label}</Badge>
                      </TableCell>
                      <TableCell className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] border"
                          onClick={() => setSettingsCampaign(c)}
                          title="Paramètres"
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        {roas >= 3 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] bg-green-100 hover:bg-green-200 text-green-700 border border-green-300"
                            onClick={() => handleScaleAction(c)}
                          >
                            <ArrowUp className="h-3 w-3 mr-1" /> Scaler
                          </Button>
                        ) : roas < 1 && (c.spend_7d || 0) > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] bg-red-100 hover:bg-red-200 text-red-700 border border-red-300"
                            onClick={() => handleReduceAction(c)}
                          >
                            <ArrowDown className="h-3 w-3 mr-1" /> Réduire
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] border"
                            onClick={() => handleOptimizeAction(c)}
                          >
                            Optimiser
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <ReportHistory reports={previousReports} isLoading={isLoadingHistory} onLoad={loadReport} focusType="roas" onRefresh={loadPreviousReports} />

      <CampaignSelectDialog open={showCampaignPicker} onOpenChange={setShowCampaignPicker} onSelect={handleCampaignSelected} title="Analyser le ROAS" googleCustomerId={googleCustomerId} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Recommandations IA — ROAS & Rentabilité
              </CardTitle>
              <CardDescription>
                Optimisation budget, enchères et allocation
                {selectedCampaignName && <Badge variant="outline" className="ml-2 text-[10px]">{selectedCampaignName}</Badge>}
              </CardDescription>
            </div>
            <Button onClick={handleLaunchAnalysis} disabled={isStreaming}>
              {isStreaming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Analyser le ROAS
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

      {settingsCampaign && (
        <CampaignSettingsDialog
          open={!!settingsCampaign}
          onOpenChange={(open) => { if (!open) setSettingsCampaign(null); }}
          campaignId={settingsCampaign.google_campaign_id || settingsCampaign.id}
          campaignName={settingsCampaign.name}
          onUpdated={onRefreshCampaigns}
        />
      )}
    </div>
  );
}
