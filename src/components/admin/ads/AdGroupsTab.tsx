import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Target, Zap, Pause, Play, PlusCircle, AlertTriangle } from "lucide-react";
import { useAdsStreaming } from "@/hooks/useAdsStreaming";
import { AdsAnalysisReport } from "@/components/admin/AdsAnalysisReport";
import { ReportHistory } from "./ReportHistory";
import { CampaignSelectDialog } from "./CampaignSelectDialog";
import { toast } from "@/hooks/use-toast";

interface AdGroupData {
  ad_group_name: string;
  google_ad_group_id: string | null;
  ads: Array<{
    id: string;
    status: string | null;
    ad_strength: string | null;
    headlines: any;
    descriptions: any;
    clicks: number | null;
    impressions: number | null;
    cost_micros: number | null;
    conversions: number | null;
    google_ad_group_id: string | null;
  }>;
  totalClicks: number;
  totalImpressions: number;
  totalCost: number;
  totalConversions: number;
  avgStrength: string;
  currentStatus: string;
}

export function AdGroupsTab() {
  const [adGroups, setAdGroups] = useState<AdGroupData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [showCampaignPicker, setShowCampaignPicker] = useState(false);
  const [selectedCampaignName, setSelectedCampaignName] = useState<string | null>(null);
  const { text, isStreaming, startAnalysis, ref, previousReports, isLoadingHistory, loadPreviousReports, loadReport } = useAdsStreaming();

  useEffect(() => {
    loadAdGroups();
    loadPreviousReports("ad_groups");
  }, []);

  const loadAdGroups = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: ads } = await supabase
        .from("ads_sync")
        .select("*")
        .eq("user_id", session.user.id)
        .order("clicks", { ascending: false });

      const grouped: Record<string, AdGroupData> = {};
      for (const ad of (ads || [])) {
        const name = ad.ad_group_name || "Sans nom";
        if (!grouped[name]) {
          grouped[name] = {
            ad_group_name: name, google_ad_group_id: ad.google_ad_group_id,
            ads: [], totalClicks: 0, totalImpressions: 0, totalCost: 0, totalConversions: 0,
            avgStrength: "", currentStatus: ad.status || "UNKNOWN",
          };
        }
        grouped[name].ads.push(ad as any);
        grouped[name].totalClicks += ad.clicks || 0;
        grouped[name].totalImpressions += ad.impressions || 0;
        grouped[name].totalCost += ad.cost_micros || 0;
        grouped[name].totalConversions += ad.conversions || 0;
        if (ad.google_ad_group_id) grouped[name].google_ad_group_id = ad.google_ad_group_id;
      }

      for (const g of Object.values(grouped)) {
        const strengths = g.ads.map(a => a.ad_strength).filter(Boolean);
        g.avgStrength = strengths[0] || "UNKNOWN";
        const statuses = g.ads.map(a => a.status).filter(Boolean);
        if (statuses.includes("ENABLED")) g.currentStatus = "ENABLED";
        else if (statuses.includes("PAUSED")) g.currentStatus = "PAUSED";
      }

      setAdGroups(Object.values(grouped).sort((a, b) => b.totalCost - a.totalCost));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchAnalysis = () => {
    setShowCampaignPicker(true);
  };

  const handleCampaignSelected = (campaignId: string | null, campaignName: string) => {
    setSelectedCampaignName(campaignName);
    startAnalysis("ad_groups", campaignId || undefined);
  };

  const toggleAdGroupStatus = async (group: AdGroupData) => {
    const adGroupId = group.google_ad_group_id;
    if (!adGroupId) {
      toast({ title: "Erreur", description: "ID introuvable", variant: "destructive" });
      return;
    }
    const newAction = group.currentStatus === "ENABLED" ? "PAUSED" : "ENABLED";
    setTogglingIds(prev => new Set(prev).add(adGroupId));
    try {
      const { data, error } = await supabase.functions.invoke("toggle-ad-group-status", {
        body: { adGroupId, action: newAction },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAdGroups(prev => prev.map(g => g.google_ad_group_id === adGroupId ? { ...g, currentStatus: newAction } : g));
      toast({
        title: newAction === "PAUSED" ? "⏸️ Ad Group mis en pause" : "▶️ Ad Group activé",
        description: `"${group.ad_group_name}" → ${newAction}`,
      });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setTogglingIds(prev => { const next = new Set(prev); next.delete(adGroupId); return next; });
    }
  };

  const formatMicros = (v: number) => (v / 1000000).toFixed(2);

  const getRecommendation = (g: AdGroupData) => {
    if (g.totalCost > 2000000 && g.totalConversions === 0) return { label: "Mettre en pause", color: "bg-red-100 text-red-700 border-red-300", icon: Pause };
    if (g.totalConversions > 0) return { label: "Conserver", color: "bg-green-100 text-green-700 border-green-300", icon: Play };
    if (g.totalImpressions < 100) return { label: "Booster", color: "bg-blue-100 text-blue-700 border-blue-300", icon: PlusCircle };
    return { label: "Surveiller", color: "bg-amber-100 text-amber-700 border-amber-300", icon: AlertTriangle };
  };

  const getStrengthColor = (s: string) => {
    if (s === "EXCELLENT") return "bg-green-100 text-green-800";
    if (s === "GOOD") return "bg-emerald-100 text-emerald-800";
    if (s === "AVERAGE") return "bg-amber-100 text-amber-800";
    return "bg-red-100 text-red-800";
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const toPause = adGroups.filter(g => g.totalCost > 2000000 && g.totalConversions === 0);
  const toKeep = adGroups.filter(g => g.totalConversions > 0);

  return (
    <div className="space-y-6" ref={ref}>
      <CampaignSelectDialog
        open={showCampaignPicker}
        onOpenChange={setShowCampaignPicker}
        onSelect={handleCampaignSelected}
        title="Analyser les Ad Groups"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-muted/30"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground uppercase">Ad Groups</p><p className="text-2xl font-bold mt-1">{adGroups.length}</p></CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardContent className="p-4 text-center"><p className="text-xs text-red-600 uppercase">À mettre en pause</p><p className="text-2xl font-bold mt-1 text-red-700">{toPause.length}</p></CardContent></Card>
        <Card className="bg-green-50 border-green-200"><CardContent className="p-4 text-center"><p className="text-xs text-green-600 uppercase">À conserver</p><p className="text-2xl font-bold mt-1 text-green-700">{toKeep.length}</p></CardContent></Card>
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4 text-center"><p className="text-xs text-blue-600 uppercase">Total annonces</p><p className="text-2xl font-bold mt-1 text-blue-700">{adGroups.reduce((s, g) => s + g.ads.length, 0)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Synthèse par Ad Group</CardTitle>
          <CardDescription>Cliquez sur le bouton d'action pour activer/désactiver dans Google Ads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
              {adGroups.map((g, idx) => {
                const rec = getRecommendation(g);
                const RecIcon = rec.icon;
                const isToggling = togglingIds.has(g.google_ad_group_id || "");
                const isEnabled = g.currentStatus === "ENABLED";
                return (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{g.ad_group_name}</h4>
                          <Badge variant={isEnabled ? "default" : "outline"} className={`text-[10px] ${isEnabled ? "bg-green-600" : "bg-muted text-muted-foreground"}`}>
                            {isEnabled ? "ACTIF" : "EN PAUSE"}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span>{g.ads.length} annonce{g.ads.length > 1 ? "s" : ""}</span>
                          <span>{g.totalClicks} clics</span>
                          <span>{g.totalImpressions} impr.</span>
                          <span>{formatMicros(g.totalCost)}€</span>
                          <span className="font-medium">{g.totalConversions} conv.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${getStrengthColor(g.avgStrength)}`}>{g.avgStrength}</Badge>
                        <Badge className={`text-[10px] ${rec.color} flex items-center gap-1`}><RecIcon className="h-3 w-3" />{rec.label}</Badge>
                        <Button size="sm" variant={isEnabled ? "destructive" : "default"} className="h-7 text-xs gap-1" disabled={isToggling || !g.google_ad_group_id} onClick={() => toggleAdGroupStatus(g)}>
                          {isToggling ? <Loader2 className="h-3 w-3 animate-spin" /> : isEnabled ? <><Pause className="h-3 w-3" />Pause</> : <><Play className="h-3 w-3" />Activer</>}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {g.ads.slice(0, 3).map((ad, ai) => {
                        const headlines = Array.isArray(ad.headlines) ? ad.headlines.map((h: any) => typeof h === "string" ? h : h.text || "").slice(0, 3) : [];
                        return (
                          <div key={ai} className="bg-muted/30 rounded p-2 text-xs">
                            <div className="flex flex-wrap gap-1 mb-1">
                              {headlines.map((h: string, hi: number) => (<span key={hi} className="text-primary font-medium">{h}{hi < headlines.length - 1 ? " | " : ""}</span>))}
                            </div>
                            <div className="flex gap-3 text-muted-foreground">
                              <span>{ad.clicks || 0} clics</span>
                              <span>{ad.impressions || 0} impr.</span>
                              <Badge variant={ad.status === "ENABLED" ? "default" : "outline"} className="text-[9px]">{ad.status}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
        </CardContent>
      </Card>

      <ReportHistory reports={previousReports} isLoading={isLoadingHistory} onLoad={loadReport} focusType="ad_groups" onRefresh={loadPreviousReports} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Recommandations IA — Ad Groups</CardTitle>
              <CardDescription>
                Analyse avec actions directes
                {selectedCampaignName && <Badge variant="outline" className="ml-2 text-[10px]">{selectedCampaignName}</Badge>}
              </CardDescription>
            </div>
            <Button onClick={handleLaunchAnalysis} disabled={isStreaming}>
              {isStreaming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Analyser les Ad Groups
            </Button>
          </div>
        </CardHeader>
        {(text || isStreaming) && (
          <CardContent>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              <AdsAnalysisReport text={text} isStreaming={isStreaming} onActionExecuted={loadAdGroups} />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
