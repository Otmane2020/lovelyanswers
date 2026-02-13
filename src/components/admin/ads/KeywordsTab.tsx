import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Key, Zap, AlertTriangle, Plus, MinusCircle, CheckCircle2, Search } from "lucide-react";
import { useAdsStreaming } from "@/hooks/useAdsStreaming";
import { AdsAnalysisReport } from "@/components/admin/AdsAnalysisReport";
import { Input } from "@/components/ui/input";

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
}

export function KeywordsTab() {
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [subTab, setSubTab] = useState("all");
  const { text, isStreaming, startAnalysis, ref } = useAdsStreaming();

  useEffect(() => {
    loadKeywords();
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
        .order("clicks", { ascending: false })
        .limit(500);
      setKeywords((data as KeywordRow[]) || []);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMicros = (v: number | null) => v ? (v / 1000000).toFixed(2) : "0.00";

  const filtered = keywords.filter(k => 
    !filter || k.keyword_text.toLowerCase().includes(filter.toLowerCase())
  );

  // Categorize keywords
  const highSpendNoConv = filtered.filter(k => (k.cost_micros || 0) > 1000000 && !(k.conversions));
  const lowQS = filtered.filter(k => k.quality_score !== null && k.quality_score < 5);
  const topPerformers = filtered.filter(k => (k.conversions || 0) > 0).sort((a, b) => (b.conversions || 0) - (a.conversions || 0));

  const getQSColor = (qs: number | null) => {
    if (!qs) return "";
    if (qs >= 7) return "bg-green-100 text-green-800 border-green-300";
    if (qs >= 4) return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6" ref={ref}>
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
            <p className="text-[10px] text-red-500">Dépenses élevées, 0 conv.</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-amber-600 uppercase">QS faible (&lt;5)</p>
            <p className="text-2xl font-bold mt-1 text-amber-700">{lowQS.length}</p>
            <p className="text-[10px] text-amber-500">À optimiser</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-green-600 uppercase">Performants</p>
            <p className="text-2xl font-bold mt-1 text-green-700">{topPerformers.length}</p>
            <p className="text-[10px] text-green-500">Avec conversions</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs for keyword categories */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Tableau récapitulatif des mots-clés
              </CardTitle>
              <CardDescription>{keywords.length} mots-clés synchronisés</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filtrer..." 
                  value={filter} 
                  onChange={e => setFilter(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={subTab} onValueChange={setSubTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all" className="gap-1">
                Tous <Badge variant="secondary" className="text-[10px] ml-1">{filtered.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="exclude" className="gap-1 text-red-600">
                <MinusCircle className="h-3 w-3" /> À exclure <Badge variant="destructive" className="text-[10px] ml-1">{highSpendNoConv.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="optimize" className="gap-1 text-amber-600">
                <AlertTriangle className="h-3 w-3" /> À optimiser <Badge variant="outline" className="text-[10px] ml-1">{lowQS.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="keep" className="gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" /> À conserver <Badge variant="outline" className="text-[10px] ml-1">{topPerformers.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {["all", "exclude", "optimize", "keep"].map(tab => {
              const data = tab === "exclude" ? highSpendNoConv :
                           tab === "optimize" ? lowQS :
                           tab === "keep" ? topPerformers : filtered;
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
                          <TableHead>Impr.</TableHead>
                          <TableHead>Coût</TableHead>
                          <TableHead>Conv.</TableHead>
                          <TableHead>Ad Group</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.slice(0, 100).map(kw => (
                          <TableRow key={kw.id} className={
                            tab === "exclude" ? "bg-red-50/50" :
                            tab === "optimize" ? "bg-amber-50/50" :
                            tab === "keep" ? "bg-green-50/50" : ""
                          }>
                            <TableCell className="font-medium text-sm">{kw.keyword_text}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{kw.match_type}</Badge>
                            </TableCell>
                            <TableCell>
                              {kw.quality_score !== null ? (
                                <Badge variant="outline" className={`text-[10px] ${getQSColor(kw.quality_score)}`}>
                                  {kw.quality_score}/10
                                </Badge>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">{kw.clicks || 0}</TableCell>
                            <TableCell className="text-sm">{kw.impressions || 0}</TableCell>
                            <TableCell className="text-sm">{formatMicros(kw.cost_micros)}€</TableCell>
                            <TableCell className="text-sm font-medium">
                              {(kw.conversions || 0) > 0 ? (
                                <span className="text-green-600">{kw.conversions}</span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{kw.ad_group_name}</TableCell>
                            <TableCell>
                              {(kw.cost_micros || 0) > 1000000 && !(kw.conversions) ? (
                                <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px]">Exclure</Badge>
                              ) : kw.quality_score !== null && kw.quality_score < 5 ? (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">Optimiser</Badge>
                              ) : (kw.conversions || 0) > 0 ? (
                                <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px]">Conserver</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">Surveiller</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  {data.length > 100 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Affichage limité à 100/{data.length} résultats
                    </p>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Recommandations IA — Mots-clés
              </CardTitle>
              <CardDescription>Analyse approfondie des mots-clés avec actions concrètes</CardDescription>
            </div>
            <Button onClick={() => startAnalysis("keywords")} disabled={isStreaming}>
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
