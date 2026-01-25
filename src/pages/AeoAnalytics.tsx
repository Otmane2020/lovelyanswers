import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, TrendingDown, Eye, ExternalLink,
  Search, ArrowUpRight, MousePointerClick, Target,
  Zap, AlertCircle, CheckCircle2, Loader2, RefreshCw, LogOut,
  Calendar, FileText, BarChart3
} from "lucide-react";
import { useActiveProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, ComposedChart, Line
} from "recharts";
import { format, subDays, parseISO } from "date-fns";

interface DailyData {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

interface PublishedAnswer {
  date: string;
  count: number;
  questions: string[];
}

interface GSCData {
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  impressionsDelta: number;
  clicksDelta: number;
  dailyData: DailyData[];
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

const TIME_PERIODS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

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
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [publishedAnswers, setPublishedAnswers] = useState<PublishedAnswer[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Check for OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    
    if (code) {
      if (window.opener) {
        window.opener.postMessage({ type: "GOOGLE_OAUTH_CODE", code }, window.location.origin);
        window.close();
        return;
      }
      handleOAuthCallback(code);
      window.history.replaceState({}, document.title, "/analytics");
    }
  }, []);

  // Load saved GSC settings
  useEffect(() => {
    if (currentProject?.id) {
      loadGSCSettings();
    }
  }, [currentProject?.id]);

  // Load project stats and check GSC connection
  useEffect(() => {
    if (currentProject?.id && user?.id) {
      loadProjectStats();
      checkGSCConnection();
      loadPublishedAnswers();
    }
  }, [currentProject?.id, user?.id]);

  // Load GSC data when domain or period changes
  useEffect(() => {
    if (isConnected && selectedDomain && settingsLoaded) {
      loadGSCData();
      saveGSCSettings();
    }
  }, [isConnected, selectedDomain, selectedPeriod, settingsLoaded]);

  const loadGSCSettings = async () => {
    if (!currentProject?.id) return;
    
    try {
      const { data: settings } = await supabase
        .from("project_settings")
        .select("gsc_selected_domain, gsc_analysis_period")
        .eq("project_id", currentProject.id)
        .single();
      
      if (settings) {
        if (settings.gsc_selected_domain) {
          setSelectedDomain(settings.gsc_selected_domain);
        }
        if (settings.gsc_analysis_period) {
          setSelectedPeriod(settings.gsc_analysis_period);
        }
      }
    } catch (error) {
      console.error("Error loading GSC settings:", error);
    } finally {
      setSettingsLoaded(true);
    }
  };

  const saveGSCSettings = async () => {
    if (!currentProject?.id || !selectedDomain) return;
    
    try {
      await supabase
        .from("project_settings")
        .upsert({
          project_id: currentProject.id,
          gsc_selected_domain: selectedDomain,
          gsc_analysis_period: selectedPeriod,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "project_id",
        });
    } catch (error) {
      console.error("Error saving GSC settings:", error);
    }
  };

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

  const loadPublishedAnswers = async () => {
    if (!currentProject?.id) return;
    
    const startDate = subDays(new Date(), selectedPeriod);
    
    const { data: answers } = await supabase
      .from("answers")
      .select("question, published_at, created_at")
      .eq("project_id", currentProject.id)
      .eq("is_public", true)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });
    
    if (answers) {
      // Group by date
      const grouped: Record<string, { count: number; questions: string[] }> = {};
      answers.forEach(a => {
        const date = (a.published_at || a.created_at)?.split("T")[0];
        if (date) {
          if (!grouped[date]) {
            grouped[date] = { count: 0, questions: [] };
          }
          grouped[date].count++;
          grouped[date].questions.push(a.question);
        }
      });
      
      setPublishedAnswers(
        Object.entries(grouped).map(([date, data]) => ({
          date,
          count: data.count,
          questions: data.questions,
        }))
      );
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
      // Use stored redirectUri or fallback
      const redirectUri = sessionStorage.getItem("gsc_oauth_redirect_uri") || 
        `${window.location.origin}/analytics`;
      
      const { data, error } = await supabase.functions.invoke("google-oauth-token", {
        body: { code, redirectUri },
      });

      if (error) throw error;
      if (!data?.success) {
        const msg = [data?.error, data?.details].filter(Boolean).join("\n");
        throw new Error(msg || "Failed to connect");
      }

      toast.success("Google Search Console connected!");
      setIsConnected(true);
      setGoogleEmail(data.email || null);
      sessionStorage.removeItem("gsc_oauth_redirect_uri");
      await loadAvailableSites();
    } catch (error: any) {
      toast.error(error.message || "Error connecting to GSC");
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

      // Only set domain if not already set from saved settings
      if (!selectedDomain && sites.length > 0) {
        if (currentProject?.website_url) {
          const projectDomain = new URL(currentProject.website_url).hostname.replace("www.", "");
          const matchingSite = sites.find((s: string) => s.includes(projectDomain));
          setSelectedDomain(matchingSite || sites[0]);
        } else {
          setSelectedDomain(sites[0]);
        }
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
        body: { domain: selectedDomain, days: selectedPeriod },
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
        dailyData: rawData.map((d: any) => ({
          date: d.date,
          impressions: d.impressions,
          clicks: d.clicks,
          ctr: d.ctr,
          position: d.position,
        })),
        topQueries: topQueries.map((q: any) => ({
          ...q,
          isAeoSignal: questionPatterns.some(p => q.query.toLowerCase().includes(p)),
        })),
        topPages: topPages,
      });

      toast.success("GSC data loaded!");
    } catch (error: any) {
      toast.error(error.message || "Error loading data");
    } finally {
      setIsLoading(false);
    }
  };

  const connectGSC = async () => {
    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/analytics`;
      
      // Persist redirectUri for OAuth callback
      sessionStorage.setItem("gsc_oauth_redirect_uri", redirectUri);
      
      const { data, error } = await supabase.functions.invoke("google-oauth-url", {
        body: { redirectUri },
      });

      if (error || !data?.url) {
        throw new Error("Failed to get OAuth URL");
      }

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
        window.location.href = data.url;
        return;
      }

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
      toast.error(error.message || "Connection error");
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
      toast.success("Google Search Console disconnected");
    } catch (error) {
      toast.error("Disconnection error");
    }
  };

  // Merge GSC data with published answers for chart
  const getChartData = () => {
    if (!gscData?.dailyData) return [];
    
    return gscData.dailyData.map(d => {
      const publishedOnDay = publishedAnswers.find(a => a.date === d.date);
      return {
        ...d,
        dateFormatted: format(parseISO(d.date), "MMM d"),
        answersPublished: publishedOnDay?.count || 0,
        aeoScore: Math.round((d.impressions / 100) * (1 - d.ctr / 100) * 10),
      };
    });
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

  const chartData = getChartData();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              AEO Signals via Google Search Console
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
              <h2 className="text-xl font-semibold mb-2">Connect Google Search Console</h2>
              <p className="text-muted-foreground mb-6">
                Analyze your AEO signals: impressions without clicks, question queries, 
                and brand lift indicating AI exposure.
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
                Connect GSC
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Read-only • Secure data • OAuth 2.0
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Domain & Period Selector */}
            {availableSites.length > 0 && (
              <Card className="p-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Domain:</label>
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
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div className="flex rounded-md border bg-background">
                        {TIME_PERIODS.map((period) => (
                          <button
                            key={period.value}
                            onClick={() => setSelectedPeriod(period.value)}
                            className={`px-3 py-1.5 text-sm transition-colors ${
                              selectedPeriod === period.value
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            }`}
                          >
                            {period.label}
                          </button>
                        ))}
                      </div>
                    </div>
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
                      Refresh
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={disconnectGSC}
                    >
                      <LogOut className="w-4 h-4" />
                      Disconnect
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
                  <p className="text-muted-foreground">Loading GSC data...</p>
                </div>
              </Card>
            )}

            {/* No Data State */}
            {!isLoading && !gscData && selectedDomain && (
              <Card className="p-8">
                <div className="flex flex-col items-center text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No data available</h3>
                  <p className="text-muted-foreground mb-4">
                    Make sure the domain is verified in Google Search Console.
                  </p>
                  <Button onClick={loadGSCData}>Retry</Button>
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
                        <p className="text-sm text-muted-foreground">GSC Impressions</p>
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
                          <span className="text-xs text-muted-foreground">vs previous period</span>
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
                        <p className="text-sm text-muted-foreground">Average CTR</p>
                        <p className="text-3xl font-bold mt-1">{gscData.ctr.toFixed(1)}%</p>
                        <div className="flex items-center gap-1 mt-2">
                          {gscData.clicksDelta < 0 ? (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {gscData.clicksDelta < 0 ? "Positive AEO signal" : "Normal CTR"}
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
                        <p className="text-sm text-muted-foreground">AI Exposure Score</p>
                        <p className="text-3xl font-bold mt-1">{aeoSignals?.exposureScore || 0}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <Zap className="w-4 h-4 text-violet-500" />
                          <span className="text-xs text-muted-foreground">
                            Impressions ↑ CTR ↓ = AI exposure
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
                        <p className="text-sm text-muted-foreground">Published Answers</p>
                        <p className="text-3xl font-bold mt-1">{answersCount}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs text-muted-foreground">
                            Average score: {avgScore}%
                          </span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Impressions & Clicks Over Time Chart */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Performance Over Time
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        GSC metrics with AEO answer publications
                      </p>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="w-3 h-3" />
                      Last {selectedPeriod} days
                    </Badge>
                  </div>
                  
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="dateFormatted" 
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          yAxisId="left"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          yAxisId="right" 
                          orientation="right"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          className="text-muted-foreground"
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Legend />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="impressions"
                          name="Impressions"
                          fill="hsl(221, 83%, 53%)"
                          fillOpacity={0.2}
                          stroke="hsl(221, 83%, 53%)"
                          strokeWidth={2}
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="clicks"
                          name="Clicks"
                          fill="hsl(142, 71%, 45%)"
                          radius={[4, 4, 0, 0]}
                          opacity={0.8}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="answersPublished"
                          name="AEO Answers Published"
                          stroke="hsl(262, 83%, 58%)"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(262, 83%, 58%)', strokeWidth: 2, r: 4 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* AEO Score & CTR Trend */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* AEO Score Over Time */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">AEO Exposure Score</h3>
                        <p className="text-sm text-muted-foreground">
                          AI exposure indicator over time
                        </p>
                      </div>
                      <Badge className="bg-violet-500/10 text-violet-600">
                        <Zap className="w-3 h-3 mr-1" />
                        AEO Metric
                      </Badge>
                    </div>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="dateFormatted" 
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="aeoScore"
                            name="AEO Score"
                            fill="hsl(262, 83%, 58%)"
                            fillOpacity={0.3}
                            stroke="hsl(262, 83%, 58%)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* CTR Trend */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">CTR Trend</h3>
                        <p className="text-sm text-muted-foreground">
                          Lower CTR + high impressions = AI reading
                        </p>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-600">
                        <MousePointerClick className="w-3 h-3 mr-1" />
                        Click Rate
                      </Badge>
                    </div>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="dateFormatted" 
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            domain={[0, 'auto']}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`${value.toFixed(2)}%`, 'CTR']}
                          />
                          <Area
                            type="monotone"
                            dataKey="ctr"
                            name="CTR %"
                            fill="hsl(38, 92%, 50%)"
                            fillOpacity={0.3}
                            stroke="hsl(38, 92%, 50%)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>

                {/* AEO Content Impact */}
                {publishedAnswers.length > 0 && (
                  <Card className="p-6 bg-gradient-to-br from-violet-500/5 to-transparent border-violet-500/20">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-violet-500" />
                      <h3 className="font-semibold">AEO Content Impact</h3>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-background border">
                        <p className="text-2xl font-bold text-violet-600">
                          {publishedAnswers.reduce((sum, a) => sum + a.count, 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Answers published in period
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-background border">
                        <p className="text-2xl font-bold text-blue-600">
                          {aeoSignals?.questionQueries || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Question queries detected
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-background border">
                        <p className="text-2xl font-bold text-emerald-600">
                          {Math.round((gscData.impressions / Math.max(1, answersCount)))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Avg impressions per answer
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Top Queries - AEO Signals */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">Question Queries</h3>
                      <p className="text-sm text-muted-foreground">
                        Question-type queries = AI exposure signal
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
                            <span>{query.clicks} clicks</span>
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
                  <h3 className="font-semibold mb-4">Top Performing Pages</h3>
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
                            {page.impressions.toLocaleString()} impressions • {page.clicks} clicks
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
                  <h3 className="font-semibold mb-3">How does AEO tracking work?</h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div className="p-4 rounded-lg bg-background border">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="font-medium">Impressions ↑ + CTR ↓</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        AI exposure signal: your content is read by AI without clicks
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-background border">
                      <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center mb-2">
                        <Search className="w-4 h-4 text-violet-500" />
                      </div>
                      <p className="font-medium">Question Queries</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Questions attract AI citations (how, why, what...)
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-background border">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="font-medium">Brand Lift</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Increase in brand searches = AI recommendation
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
