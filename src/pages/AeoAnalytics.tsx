import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, TrendingDown, Eye, ExternalLink,
  Search, ArrowUpRight, MousePointerClick, Target,
  Zap, AlertCircle, CheckCircle2, Loader2, RefreshCw, LogOut
} from "lucide-react";
import { useActiveProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface GSCData {
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  impressionsDelta: number;
  clicksDelta: number;
  topQueries: Array<{
    query: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
    isAeoSignal: boolean;
  }>;
  topPages: Array<{
    page: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
}

export default function AeoAnalytics() {
  const { project: currentProject } = useActiveProject();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gscData, setGscData] = useState<GSCData | null>(null);
  const [answersCount, setAnswersCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [availableSites, setAvailableSites] = useState<string[]>([]);

  // Check for OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    
    if (code) {
      handleOAuthCallback(code);
      window.history.replaceState({}, document.title, "/analytics");
    }
  }, []);

  // Load project stats and check GSC connection
  useEffect(() => {
    if (currentProject?.id && user?.id) {
      loadProjectStats();
      checkGSCConnection();
    }
  }, [currentProject?.id, user?.id]);

  // Load GSC data when domain changes
  useEffect(() => {
    if (isConnected && selectedDomain) {
      loadGSCData();
    }
  }, [isConnected, selectedDomain]);

  const loadProjectStats = async () => {
    if (!currentProject?.id) return;
    
    const { data: answers } = await supabase
      .from("answers")
      .select("score, is_public")
      .eq("project_id", currentProject.id);
    
    if (answers) {
      setAnswersCount(answers.filter(a => a.is_public).length);
      const scores = answers.map(a => a.score || 0).filter(s => s > 0);
      setAvgScore(scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0);
    }
  };

  const checkGSCConnection = async () => {
    if (!user?.id) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("google_oauth_token, google_console_email")
        .eq("id", user.id)
        .single();

      if (profile?.google_oauth_token) {
        setIsConnected(true);
        setGoogleEmail(profile.google_console_email || null);
        await loadAvailableSites();
      }
    } catch (error) {
      console.error("Error checking GSC connection:", error);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/analytics`;
      const { data, error } = await supabase.functions.invoke("google-oauth-token", {
        body: { code, state: redirectUri },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || "Failed to connect");
      }

      toast.success("Google Search Console connecté !");
      setIsConnected(true);
      setGoogleEmail(data.email || null);
      await loadAvailableSites();
    } catch (error: any) {
      toast.error(error.message || "Erreur de connexion à GSC");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableSites = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("list-search-console-sites");
      
      if (error) throw error;

      const sites = (data?.sites || []).map((s: any) => s.siteUrl.replace("sc-domain:", ""));
      setAvailableSites(sites);

      // Auto-select domain matching project website
      if (sites.length > 0 && currentProject?.website_url) {
        const projectDomain = new URL(currentProject.website_url).hostname.replace("www.", "");
        const matchingSite = sites.find((s: string) => s.includes(projectDomain));
        setSelectedDomain(matchingSite || sites[0]);
      } else if (sites.length > 0) {
        setSelectedDomain(sites[0]);
      }
    } catch (error) {
      console.error("Error loading sites:", error);
    }
  };

  const loadGSCData = async () => {
    if (!selectedDomain) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-search-console-data", {
        body: { domain: selectedDomain, days: 30 },
      });

      if (error || data?.error) {
        throw new Error(data?.error || "Failed to load data");
      }

      const rawData = data?.data || [];
      const topQueries = data?.topQueries || [];
      const topPages = data?.topPages || [];

      // Calculate totals and deltas
      const halfLength = Math.floor(rawData.length / 2);
      const recentData = rawData.slice(halfLength);
      const oldData = rawData.slice(0, halfLength);

      const totalImpressions = rawData.reduce((sum: number, d: any) => sum + d.impressions, 0);
      const totalClicks = rawData.reduce((sum: number, d: any) => sum + d.clicks, 0);
      const avgCtr = rawData.length ? rawData.reduce((sum: number, d: any) => sum + d.ctr, 0) / rawData.length : 0;
      const avgPosition = rawData.length ? rawData.reduce((sum: number, d: any) => sum + d.position, 0) / rawData.length : 0;

      const recentImpressions = recentData.reduce((sum: number, d: any) => sum + d.impressions, 0);
      const oldImpressions = oldData.reduce((sum: number, d: any) => sum + d.impressions, 0);
      const impressionsDelta = oldImpressions > 0 ? Math.round(((recentImpressions - oldImpressions) / oldImpressions) * 100) : 0;

      const recentClicks = recentData.reduce((sum: number, d: any) => sum + d.clicks, 0);
      const oldClicks = oldData.reduce((sum: number, d: any) => sum + d.clicks, 0);
      const clicksDelta = oldClicks > 0 ? Math.round(((recentClicks - oldClicks) / oldClicks) * 100) : 0;

      // Mark question queries as AEO signals
      const questionPatterns = ["comment", "pourquoi", "quoi", "quel", "quelle", "où", "quand", "how", "what", "why", "where", "when", "which", "?"];
      
      setGscData({
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: avgCtr,
        position: avgPosition,
        impressionsDelta,
        clicksDelta,
        topQueries: topQueries.map((q: any) => ({
          ...q,
          isAeoSignal: questionPatterns.some(p => q.query.toLowerCase().includes(p)),
        })),
        topPages: topPages,
      });

      toast.success("Données GSC chargées !");
    } catch (error: any) {
      toast.error(error.message || "Erreur de chargement des données");
    } finally {
      setIsLoading(false);
    }
  };

  const connectGSC = async () => {
    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/analytics`;
      const { data, error } = await supabase.functions.invoke("google-oauth-url", {
        body: { redirectUri },
      });

      if (error || !data?.url) {
        throw new Error("Failed to get OAuth URL");
      }

      // Open OAuth in popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        data.url,
        "Google Search Console Authorization",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        // Fallback to redirect
        window.location.href = data.url;
        return;
      }

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data.type === "GOOGLE_OAUTH_CODE" && event.data.code) {
          window.removeEventListener("message", handleMessage);
          await handleOAuthCallback(event.data.code);
        }
      };

      window.addEventListener("message", handleMessage);
      setTimeout(() => window.removeEventListener("message", handleMessage), 5 * 60 * 1000);
    } catch (error: any) {
      toast.error(error.message || "Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectGSC = async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from("profiles")
        .update({
          google_oauth_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
          google_console_email: null,
        })
        .eq("id", user.id);

      setIsConnected(false);
      setGscData(null);
      setGoogleEmail(null);
      setSelectedDomain(null);
      setAvailableSites([]);
      toast.success("Google Search Console déconnecté");
    } catch (error) {
      toast.error("Erreur de déconnexion");
    }
  };

  // Calculate AEO signals from GSC data
  const aeoSignals = gscData ? {
    exposureScore: Math.min(100, Math.round((gscData.impressions / 500) * (1 - gscData.ctr / 100) * 10)),
    questionQueries: gscData.topQueries.filter(q => q.isAeoSignal).length,
    totalQueries: gscData.topQueries.length,
    brandQueries: gscData.topQueries.filter(q => 
      q.query.toLowerCase().includes(currentProject?.brand_name?.toLowerCase() || currentProject?.name?.toLowerCase() || "")
    ).length,
  } : null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Signaux AEO via Google Search Console
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && googleEmail && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {googleEmail}
              </Badge>
            )}
          </div>
        </div>

        {/* Google Search Console Connection */}
        {!isConnected ? (
          <Card className="p-8 border-dashed border-2 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
            <div className="flex flex-col items-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Connecter Google Search Console</h2>
              <p className="text-muted-foreground mb-6">
                Analysez vos signaux AEO : impressions sans clics, requêtes questionnelles, 
                et lift de marque indiquant une exposition IA.
              </p>
              <Button 
                onClick={connectGSC} 
                className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Connecter GSC
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Lecture seule • Données sécurisées • OAuth 2.0
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Domain Selector */}
            {availableSites.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">Domaine :</label>
                    <select
                      value={selectedDomain || ""}
                      onChange={(e) => setSelectedDomain(e.target.value)}
                      className="px-3 py-2 rounded-md border bg-background text-sm"
                    >
                      {availableSites.map((site) => (
                        <option key={site} value={site}>{site}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadGSCData}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Actualiser
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={disconnectGSC}
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnecter
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Loading State */}
            {isLoading && !gscData && (
              <Card className="p-12">
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Chargement des données GSC...</p>
                </div>
              </Card>
            )}

            {/* No Data State */}
            {!isLoading && !gscData && selectedDomain && (
              <Card className="p-8">
                <div className="flex flex-col items-center text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune donnée disponible</h3>
                  <p className="text-muted-foreground mb-4">
                    Vérifiez que le domaine est vérifié dans Google Search Console.
                  </p>
                  <Button onClick={loadGSCData}>Réessayer</Button>
                </div>
              </Card>
            )}

            {gscData && (
              <>
                {/* AEO Signal Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Impressions */}
                  <Card className="p-5 bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Impressions GSC</p>
                        <p className="text-3xl font-bold mt-1">
                          {gscData.impressions.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                          {gscData.impressionsDelta >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`text-sm ${gscData.impressionsDelta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {gscData.impressionsDelta >= 0 ? '+' : ''}{gscData.impressionsDelta}%
                          </span>
                          <span className="text-xs text-muted-foreground">vs période précédente</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </Card>

                  {/* CTR Signal */}
                  <Card className="p-5 bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">CTR Moyen</p>
                        <p className="text-3xl font-bold mt-1">{gscData.ctr.toFixed(1)}%</p>
                        <div className="flex items-center gap-1 mt-2">
                          {gscData.clicksDelta < 0 ? (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {gscData.clicksDelta < 0 ? "Signal AEO positif" : "CTR normal"}
                          </span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <MousePointerClick className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </Card>

                  {/* AEO Exposure Score */}
                  <Card className="p-5 bg-gradient-to-br from-violet-500/5 to-transparent border-violet-500/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Score Exposition IA</p>
                        <p className="text-3xl font-bold mt-1">{aeoSignals?.exposureScore || 0}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <Zap className="w-4 h-4 text-violet-500" />
                          <span className="text-xs text-muted-foreground">
                            Impressions ↑ CTR ↓ = exposition IA
                          </span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </Card>

                  {/* Published Answers */}
                  <Card className="p-5 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Réponses Publiées</p>
                        <p className="text-3xl font-bold mt-1">{answersCount}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs text-muted-foreground">
                            Score moyen: {avgScore}%
                          </span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Top Queries - AEO Signals */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">Requêtes Questionnelles</h3>
                      <p className="text-sm text-muted-foreground">
                        Requêtes type question = signal d'exposition IA
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {aeoSignals?.questionQueries}/{aeoSignals?.totalQueries} AEO
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {gscData.topQueries.slice(0, 10).map((query, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center gap-4 p-3 rounded-lg ${
                          query.isAeoSignal 
                            ? 'bg-violet-500/5 border border-violet-500/20' 
                            : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{query.query}</span>
                            {query.isAeoSignal && (
                              <Badge className="bg-violet-500/10 text-violet-600 text-xs">
                                AEO Signal
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{query.impressions.toLocaleString()} impressions</span>
                            <span>{query.clicks} clics</span>
                            <span>CTR {query.ctr.toFixed(1)}%</span>
                            <span>Pos. {query.position.toFixed(1)}</span>
                          </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Top Pages */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Pages Performantes</h3>
                  <div className="space-y-3">
                    {gscData.topPages.slice(0, 10).map((page, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {page.page.replace(/^https?:\/\/[^/]+/, "")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {page.impressions.toLocaleString()} impressions • {page.clicks} clics
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {page.ctr.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">CTR</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* How AEO Tracking Works */}
                <Card className="p-6 bg-gradient-to-br from-slate-500/5 to-transparent">
                  <h3 className="font-semibold mb-3">Comment fonctionne le tracking AEO ?</h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div className="p-4 rounded-lg bg-background border">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="font-medium">Impressions ↑ + CTR ↓</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Signal d'exposition IA : votre contenu est lu par les AI sans clic
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-background border">
                      <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center mb-2">
                        <Search className="w-4 h-4 text-violet-500" />
                      </div>
                      <p className="font-medium">Requêtes Questionnelles</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Les questions attirent les citations AI (comment, pourquoi...)
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-background border">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="font-medium">Lift de Marque</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Augmentation des recherches marque = recommandation IA
                      </p>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
