import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Key, Zap, AlertTriangle, MinusCircle, CheckCircle2, Search, Ban, Eye, TrendingUp, Shield } from "lucide-react";
import { useAdsStreaming } from "@/hooks/useAdsStreaming";
import { AdsAnalysisReport } from "@/components/admin/AdsAnalysisReport";
import { ReportHistory } from "./ReportHistory";
import { CampaignSelectDialog } from "./CampaignSelectDialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface KeywordRow {
  id: string;
  keyword_text: string;
  match_type: string | null;
  status: string | null;
  quality_score: number | null;
  quality_score_creative: string | null;
  quality_score_landing: string | null;
  quality_score_expected_ctr: string | null;
  clicks: number | null;
  impressions: number | null;
  cost_micros: number | null;
  conversions: number | null;
  conversions_value: number | null;
  ad_group_name: string | null;
  cpc_bid_micros: number | null;
  first_page_cpc_micros: number | null;
  google_ad_group_id: string | null;
  campaign_sync_id: string | null;
}

export function KeywordsTab() {
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [subTab, setSubTab] = useState("all");
  const [showCampaignPicker, setShowCampaignPicker] = useState(false);
  const [selectedCampaignName, setSelectedCampaignName] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [excludedKeywords, setExcludedKeywords] = useState<Set<string>>(new Set());
  const { text, isStreaming, startAnalysis, ref, previousReports, isLoadingHistory, loadPreviousReports, loadReport } = useAdsStreaming();

  useEffect(() => {
    loadKeywords();
    loadPreviousReports("keywords");
  }, []);

  const loadKeywords = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("keywords_sync")
        .select("*")
        .eq("user_id", session.user.id)
        .order("clicks", { ascending: false });
      setKeywords((data as KeywordRow[]) || []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcludeKeyword = async (kw: KeywordRow) => {
    setActionLoading(kw.id);
    try {
      const { data, error } = await supabase.functions.invoke("add-negative-keyword", {
        body: {
          keyword: kw.keyword_text,
          adGroupId: kw.google_ad_group_id || undefined,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Échec");

      setExcludedKeywords(prev => new Set([...prev, kw.id]));
      toast({
        title: "✅ Mot-clé exclu",
        description: `"${kw.keyword_text}" ajouté en négatif (${data.level === "ad_group" ? "Ad Group" : "Campagne"})`,
      });

      // Track action
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("ads_actions").insert({
          user_id: session.user.id,
          action_type: "exclude_keyword",
          target_name: kw.keyword_text,
          target_id: kw.id,
          description: `Exclu "${kw.keyword_text}" comme mot-clé négatif`,
          status: "executed",
          executed_at: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'exclure ce mot-clé",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLaunchAnalysis = () => {
    setShowCampaignPicker(true);
  };

  const handleCampaignSelected = (campaignId: string | null, campaignName: string) => {
    setSelectedCampaignName(campaignName);
    startAnalysis("keywords", campaignId || undefined);
  };

  const formatMicros = (v: number | null) => v ? (v / 1000000).toFixed(2) : "0.00";

  const filtered = keywords.filter(k => 
    !filter || k.keyword_text.toLowerCase().includes(filter.toLowerCase())
  );

  const highSpendNoConv = filtered.filter(k => (k.cost_micros || 0) > 1000000 && !(k.conversions));
  const lowQS = filtered.filter(k => k.quality_score !== null && k.quality_score < 5);
  const topPerformers = filtered.filter(k => (k.conversions || 0) > 0).sort((a, b) => (b.conversions || 0) - (a.conversions || 0));

  const getQSColor = (qs: number | null) => {
    if (!qs) return "";
    if (qs >= 7) return "bg-green-100 text-green-800 border-green-300";
    if (qs >= 4) return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const getActionForKeyword = (kw: KeywordRow): { type: "exclude" | "optimize" | "keep" | "watch"; label: string } => {
    if ((kw.cost_micros || 0) > 1000000 && !(kw.conversions)) return { type: "exclude", label: "Exclure" };
    if (kw.quality_score !== null && kw.quality_score < 5) return { type: "optimize", label: "Optimiser" };
    if ((kw.conversions || 0) > 0) return { type: "keep", label: "Conserver" };
    return { type: "watch", label: "Surveiller" };
  };

  const renderActionButton = (kw: KeywordRow) => {
    const isExcluded = excludedKeywords.has(kw.id);
    if (isExcluded) {
      return (
        <Badge className="bg-muted text-muted-foreground border text-[10px]">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Exclu
        </Badge>
      );
    }

    const action = getActionForKeyword(kw);
    const isLoadingThis = actionLoading === kw.id;

    switch (action.type) {
      case "exclude":
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] bg-red-100 hover:bg-red-200 text-red-700 border border-red-300"
            onClick={(e) => { e.stopPropagation(); handleExcludeKeyword(kw); }}
            disabled={isLoadingThis}
          >
            {isLoadingThis ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Ban className="h-3 w-3 mr-1" />}
            Exclure
          </Button>
        );
      case "optimize":
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300"
            onClick={(e) => {
              e.stopPropagation();
              toast({
                title: "💡 Optimisation suggérée",
                description: `"${kw.keyword_text}" — QS ${kw.quality_score}/10. Améliorez la pertinence de l'annonce et de la landing page.`,
              });
            }}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Optimiser
          </Button>
        );
      case "keep":
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] bg-green-100 hover:bg-green-200 text-green-700 border border-green-300"
            onClick={(e) => {
              e.stopPropagation();
              toast({
                title: "🏆 Mot-clé performant",
                description: `"${kw.keyword_text}" — ${kw.conversions} conversion(s) pour ${formatMicros(kw.cost_micros)}€. Augmentez le budget si possible.`,
              });
            }}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Conserver
          </Button>
        );
      default:
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] border"
            onClick={(e) => {
              e.stopPropagation();
              toast({
                title: "👀 En surveillance",
                description: `"${kw.keyword_text}" — Pas encore assez de données. Continuez à surveiller les performances.`,
              });
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            Surveiller
          </Button>
        );
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6" ref={ref}>
      <CampaignSelectDialog
        open={showCampaignPicker}
        onOpenChange={setShowCampaignPicker}
        onSelect={handleCampaignSelected}
        title="Analyser les mots-clés"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Total mots-clés</p>
            <p className="text-2xl font-bold mt-1">{keywords.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-red-600 uppercase">À exclure</p>
            <p className="text-2xl font-bold mt-1 text-red-700">{highSpendNoConv.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-amber-600 uppercase">QS faible (&lt;5)</p>
            <p className="text-2xl font-bold mt-1 text-amber-700">{lowQS.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-green-600 uppercase">Performants</p>
            <p className="text-2xl font-bold mt-1 text-green-700">{topPerformers.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Keywords Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Tableau des mots-clés
              </CardTitle>
              <CardDescription>{keywords.length} mots-clés synchronisés</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrer..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-9 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={subTab} onValueChange={setSubTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Tous <Badge variant="secondary" className="text-[10px] ml-1">{filtered.length}</Badge></TabsTrigger>
              <TabsTrigger value="exclude" className="text-red-600"><MinusCircle className="h-3 w-3 mr-1" /> Exclure <Badge variant="destructive" className="text-[10px] ml-1">{highSpendNoConv.length}</Badge></TabsTrigger>
              <TabsTrigger value="optimize" className="text-amber-600"><AlertTriangle className="h-3 w-3 mr-1" /> Optimiser <Badge variant="outline" className="text-[10px] ml-1">{lowQS.length}</Badge></TabsTrigger>
              <TabsTrigger value="keep" className="text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Conserver <Badge variant="outline" className="text-[10px] ml-1">{topPerformers.length}</Badge></TabsTrigger>
            </TabsList>
            {["all", "exclude", "optimize", "keep"].map(tab => {
              const data = tab === "exclude" ? highSpendNoConv : tab === "optimize" ? lowQS : tab === "keep" ? topPerformers : filtered;
              return (
                <TabsContent key={tab} value={tab}>
                  <ScrollArea className="max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mot-clé</TableHead>
                          <TableHead>Match</TableHead>
                          <TableHead>QS</TableHead>
                          <TableHead>Clics</TableHead>
                          <TableHead>Coût</TableHead>
                          <TableHead>Conv.</TableHead>
                          <TableHead>Ad Group</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.slice(0, 100).map(kw => (
                          <TableRow key={kw.id}>
                            <TableCell className="font-medium text-sm">{kw.keyword_text}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{kw.match_type}</Badge></TableCell>
                            <TableCell>
                              {kw.quality_score !== null ? (
                                <Badge variant="outline" className={`text-[10px] ${getQSColor(kw.quality_score)}`}>{kw.quality_score}/10</Badge>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">{kw.clicks || 0}</TableCell>
                            <TableCell className="text-sm">{formatMicros(kw.cost_micros)}€</TableCell>
                            <TableCell className="text-sm font-medium">
                              {(kw.conversions || 0) > 0 ? <span className="text-green-600">{kw.conversions}</span> : <span className="text-muted-foreground">0</span>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{kw.ad_group_name}</TableCell>
                            <TableCell>
                              {renderActionButton(kw)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Report History */}
      <ReportHistory 
        reports={previousReports} 
        isLoading={isLoadingHistory} 
        onLoad={loadReport} 
        focusType="keywords"
        onRefresh={loadPreviousReports}
      />

      {/* AI Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Recommandations IA — Mots-clés</CardTitle>
              <CardDescription>
                Analyse avec actions concrètes
                {selectedCampaignName && <Badge variant="outline" className="ml-2 text-[10px]">{selectedCampaignName}</Badge>}
              </CardDescription>
            </div>
            <Button onClick={handleLaunchAnalysis} disabled={isStreaming}>
              {isStreaming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Analyser les mots-clés
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
