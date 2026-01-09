import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, TrendingDown, Eye, ExternalLink,
  Search, ArrowUpRight, MousePointerClick, Target,
  Zap, AlertCircle, CheckCircle2, Loader2
} from "lucide-react";
import { useActiveProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// GSC OAuth configuration
const GSC_CLIENT_ID = import.meta.env.VITE_GSC_CLIENT_ID || "";
const GSC_REDIRECT_URI = `${window.location.origin}/analytics`;
const GSC_SCOPES = "https://www.googleapis.com/auth/webmasters.readonly";

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
  }>;
}

export default function AeoAnalytics() {
  const { project: currentProject } = useActiveProject();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gscData, setGscData] = useState<GSCData | null>(null);
  const [answersCount, setAnswersCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);

  // Check for OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    
    if (code) {
      handleOAuthCallback(code);
      // Clean URL
      window.history.replaceState({}, document.title, "/analytics");
    }
  }, []);

  // Load project stats
  useEffect(() => {
    if (currentProject?.id) {
      loadProjectStats();
      checkGSCConnection();
    }
  }, [currentProject?.id]);

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
    // Check if we have GSC tokens stored
    const gscToken = localStorage.getItem(`gsc_token_${currentProject?.id}`);
    if (gscToken) {
      setIsConnected(true);
      loadGSCData();
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setIsLoading(true);
    try {
      // Exchange code for token (in production, this should go through an edge function)
      toast.success("Google Search Console connecté !");
      setIsConnected(true);
      if (currentProject?.id) {
        localStorage.setItem(`gsc_token_${currentProject.id}`, "connected");
      }
      // Load mock data for now
      loadGSCData();
    } catch (error) {
      toast.error("Erreur de connexion à GSC");
    } finally {
      setIsLoading(false);
    }
  };

  const loadGSCData = async () => {
    // Mock GSC data - in production, this would call GSC API
    setGscData({
      impressions: 45230,
      clicks: 1823,
      ctr: 4.03,
      position: 12.4,
      impressionsDelta: 23,
      clicksDelta: -5,
      topQueries: [
        { query: "comment choisir un canapé design", impressions: 2340, clicks: 89, ctr: 3.8, position: 8.2, isAeoSignal: true },
        { query: "meuble salon moderne 2026", impressions: 1890, clicks: 56, ctr: 2.96, position: 11.3, isAeoSignal: true },
        { query: "prix table marbre", impressions: 1560, clicks: 78, ctr: 5.0, position: 6.1, isAeoSignal: true },
        { query: "movala avis", impressions: 890, clicks: 234, ctr: 26.3, position: 1.2, isAeoSignal: false },
        { query: "livraison meubles rapide", impressions: 780, clicks: 45, ctr: 5.77, position: 9.4, isAeoSignal: true },
        { query: "canapé d'angle confortable", impressions: 670, clicks: 32, ctr: 4.78, position: 14.2, isAeoSignal: true },
      ],
      topPages: [
        { page: "/answers/comment-choisir-canape", impressions: 3200, clicks: 145 },
        { page: "/answers/prix-meubles-design", impressions: 2100, clicks: 98 },
        { page: "/answers/livraison-meubles", impressions: 1800, clicks: 67 },
      ]
    });
  };

  const connectGSC = () => {
    if (!GSC_CLIENT_ID) {
      // Demo mode - just set as connected
      toast.info("Mode démo : GSC connecté avec données simulées");
      setIsConnected(true);
      if (currentProject?.id) {
        localStorage.setItem(`gsc_token_${currentProject.id}`, "demo");
      }
      loadGSCData();
      return;
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GSC_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(GSC_REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(GSC_SCOPES)}&` +
      `access_type=offline&` +
      `prompt=consent`;
    
    window.location.href = authUrl;
  };

  const disconnectGSC = () => {
    if (currentProject?.id) {
      localStorage.removeItem(`gsc_token_${currentProject.id}`);
    }
    setIsConnected(false);
    setGscData(null);
    toast.success("Google Search Console déconnecté");
  };

  // Calculate AEO signals from GSC data
  const aeoSignals = gscData ? {
    // High impressions + low CTR = AI exposure signal
    exposureScore: Math.min(100, Math.round((gscData.impressions / 500) * (1 - gscData.ctr / 100) * 10)),
    // Question queries percentage
    questionQueries: gscData.topQueries.filter(q => q.isAeoSignal).length,
    totalQueries: gscData.topQueries.length,
    // Brand query lift
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
          {isConnected && (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              GSC Connecté
            </Badge>
          )}
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
            {/* AEO Signal Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Impressions - Key AEO signal */}
              <Card className="p-5 bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Impressions GSC</p>
                    <p className="text-3xl font-bold mt-1">
                      {gscData?.impressions.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      {(gscData?.impressionsDelta || 0) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-sm ${(gscData?.impressionsDelta || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {(gscData?.impressionsDelta || 0) >= 0 ? '+' : ''}{gscData?.impressionsDelta}%
                      </span>
                      <span className="text-xs text-muted-foreground">vs mois dernier</span>
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
                    <p className="text-3xl font-bold mt-1">{gscData?.ctr.toFixed(1)}%</p>
                    <div className="flex items-center gap-1 mt-2">
                      {(gscData?.clicksDelta || 0) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {(gscData?.clicksDelta || 0) < 0 ? "Signal AEO positif" : "CTR normal"}
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
                {gscData?.topQueries.map((query, index) => (
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
              <h3 className="font-semibold mb-4">Pages AEO Performantes</h3>
              <div className="space-y-3">
                {gscData?.topPages.map((page, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{page.page}</p>
                      <p className="text-xs text-muted-foreground">
                        {page.impressions.toLocaleString()} impressions • {page.clicks} clics
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {((page.clicks / page.impressions) * 100).toFixed(1)}%
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
                    "Comment...", "Quel..." = requêtes que les IA utilisent
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background border">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="font-medium">Lift de Marque</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Augmentation des recherches "[marque] + mot-clé" après exposition
                  </p>
                </div>
              </div>
            </Card>

            {/* Disconnect */}
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={disconnectGSC} className="text-muted-foreground">
                Déconnecter GSC
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
