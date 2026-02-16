import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdsAnalysisReport } from "@/components/admin/AdsAnalysisReport";
import { KeywordsTab } from "@/components/admin/ads/KeywordsTab";
import { AdGroupsTab } from "@/components/admin/ads/AdGroupsTab";
import { RoasTab } from "@/components/admin/ads/RoasTab";
import { StrategyTab } from "@/components/admin/ads/StrategyTab";
import { ConversionsTab } from "@/components/admin/ads/ConversionsTab";
import { useAdsStreaming } from "@/hooks/useAdsStreaming";
import { CampaignSelectDialog } from "@/components/admin/ads/CampaignSelectDialog";
import { ReportHistory } from "@/components/admin/ads/ReportHistory";
import { CreateSearchCampaignDialog } from "@/components/admin/ads/CreateSearchCampaignDialog";
import { CreatePmaxCampaignDialog } from "@/components/admin/ads/CreatePmaxCampaignDialog";
import { 
  Plus, RefreshCw, Target, FileText, 
  Key, ChevronDown, ChevronRight, Loader2, Megaphone, DollarSign,
  Download, CheckCircle, AlertCircle, Building2, Brain, Zap, TrendingUp, BarChart3, Lightbulb,
  Code, Copy, Tag, Calendar
} from "lucide-react";

interface GoogleAdsAccount {
  customerId: string;
  name: string;
  isManager: boolean;
  currencyCode: string;
  timeZone: string;
}

interface SyncedCampaign {
  id: string;
  google_campaign_id: string;
  name: string;
  status: string | null;
  primary_status: string | null;
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
  last_synced_at: string | null;
}

interface SyncedKeyword {
  id: string;
  keyword_text: string;
  match_type: string | null;
  status: string | null;
  quality_score: number | null;
  clicks: number | null;
  impressions: number | null;
  cost_micros: number | null;
  ad_group_name: string | null;
}

interface SyncedAd {
  id: string;
  ad_group_name: string | null;
  status: string | null;
  ad_strength: string | null;
  headlines: any;
  descriptions: any;
  final_urls: string[] | null;
  clicks: number | null;
  impressions: number | null;
  cost_micros: number | null;
}

interface ConnectionInfo {
  status: string;
  account_id: string | null;
  metadata: any;
}
type StatsPeriod = "today" | "yesterday" | "7d" | "30d" | "90d";

const PERIOD_LABELS: Record<StatsPeriod, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "7 jours",
  "30d": "30 jours",
  "90d": "90 jours",
};

function getPeriodDateRange(period: StatsPeriod): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  
  let start: Date;
  switch (period) {
    case "today":
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "7d":
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start = new Date(now);
      start.setDate(start.getDate() - 90);
      break;
  }
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}


interface GoogleAdsManagerProps {
  activeTab?: string;
}

export function GoogleAdsManager({ activeTab = "campaigns" }: GoogleAdsManagerProps) {
  const [connectingOAuth, setConnectingOAuth] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Accounts listing
  const [availableAccounts, setAvailableAccounts] = useState<GoogleAdsAccount[]>([]);
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(false);

  // Synced data
  const [syncedCampaigns, setSyncedCampaigns] = useState<SyncedCampaign[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  // Campaign details
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [campaignKeywords, setCampaignKeywords] = useState<SyncedKeyword[]>([]);
  const [campaignAds, setCampaignAds] = useState<SyncedAd[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Period selector
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>("7d");
  const [periodStats, setPeriodStats] = useState<{ spend: number; clicks: number; conversions: number } | null>(null);
  const [isLoadingPeriodStats, setIsLoadingPeriodStats] = useState(false);

  // AI Analysis (for audit tab only)
  const { text: analysisText, isStreaming: isAnalyzing, startAnalysis: handleAnalyze, ref: analysisRef, previousReports: auditReports, isLoadingHistory: auditHistoryLoading, loadPreviousReports: loadAuditReports, loadReport: loadAuditReport } = useAdsStreaming();
  const [showAuditCampaignPicker, setShowAuditCampaignPicker] = useState(false);
  const [selectedAuditCampaignName, setSelectedAuditCampaignName] = useState<string | null>(null);

  useEffect(() => {
    loadAuditReports("all");
  }, []);

  // Load period stats from performance_history
  const loadPeriodStats = async (period: StatsPeriod) => {
    if (period === "7d") {
      // Use synced campaign data directly
      setPeriodStats(null);
      return;
    }
    setIsLoadingPeriodStats(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { start, end } = getPeriodDateRange(period);
      const { data, error } = await supabase
        .from("performance_history")
        .select("spend, clicks, conversions")
        .eq("user_id", session.user.id)
        .gte("date", start)
        .lte("date", end);
      
      if (!error && data) {
        const totals = data.reduce(
          (acc, row) => ({
            spend: acc.spend + (Number(row.spend) || 0),
            clicks: acc.clicks + (Number(row.clicks) || 0),
            conversions: acc.conversions + (Number(row.conversions) || 0),
          }),
          { spend: 0, clicks: 0, conversions: 0 }
        );
        setPeriodStats(totals);
      }
    } catch (err) {
      console.error("Error loading period stats:", err);
    } finally {
      setIsLoadingPeriodStats(false);
    }
  };

  useEffect(() => {
    if (connectionInfo?.account_id && connectionInfo.account_id !== "pending") {
      loadPeriodStats(statsPeriod);
    }
  }, [statsPeriod, connectionInfo]);

  useEffect(() => {
    loadConnectionAndData();
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const stateParam = urlParams.get("state");
    if (code && stateParam) {
      try {
        const state = JSON.parse(atob(stateParam));
        if (state.type === "google-ads") {
          handleOAuthCallback(code);
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch { /* not a Google Ads callback */ }
    }
  }, []);

  const loadConnectionAndData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: conn } = await supabase
        .from("user_connections")
        .select("status, account_id, metadata")
        .eq("user_id", session.user.id)
        .eq("connection_type", "google_ads")
        .maybeSingle();

      setConnectionInfo(conn as ConnectionInfo | null);

      const hasValidAccount = conn?.account_id && conn.account_id !== "pending";
      if (hasValidAccount) {
        const { data, error } = await supabase.functions.invoke("sync-google-ads", {
          body: { action: "get_synced_data" },
        });
        if (!error && data) {
          // Filter campaigns to only show those from the selected account
          const selectedCustomerId = (conn.account_id as string).replace(/-/g, "");
          const allCampaigns = data.campaigns || [];
          const filtered = allCampaigns.filter(
            (c: any) => !c.google_customer_id || c.google_customer_id === selectedCustomerId
          );
          setSyncedCampaigns(filtered);
          setSyncStatus(data.syncStatus || null);
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogleAds = async () => {
    setConnectingOAuth(true);
    try {
      const redirectUri = window.location.origin + window.location.pathname;
      const { data, error } = await supabase.functions.invoke("google-ads-oauth-url", {
        body: { redirectUri },
      });
      if (error || !data?.url) throw new Error(data?.error || "Failed to get OAuth URL");
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Erreur OAuth", description: err.message, variant: "destructive" });
      setConnectingOAuth(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    try {
      const redirectUri = window.location.origin + window.location.pathname;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-ads-oauth-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ code, redirectUri }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Token exchange failed");

      toast({ title: "✅ Compte Google Ads connecté", description: result.email || "Succès" });
      loadConnectionAndData();
    } catch (err: any) {
      toast({ title: "Erreur connexion", description: err.message, variant: "destructive" });
    }
  };

  const handleFetchAccounts = async () => {
    setIsFetchingAccounts(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-ads", {
        body: { action: "list_accounts" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to list accounts");
      
      setAvailableAccounts(data.accounts || []);
      if (data.accounts?.length === 0) {
        toast({ title: "Aucun compte trouvé", description: "Aucun compte Google Ads accessible", variant: "destructive" });
      } else {
        toast({ title: `${data.accounts.length} compte(s) trouvé(s)` });
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsFetchingAccounts(false);
    }
  };

  const handleSelectAccount = async (account: GoogleAdsAccount) => {
    try {
      const managerAccount = availableAccounts.find(a => a.isManager);
      
      const { data, error } = await supabase.functions.invoke("sync-google-ads", {
        body: { 
          action: "select_account",
          customer_id: account.customerId,
          manager_customer_id: managerAccount?.customerId,
          account_name: account.name,
        },
      });
      if (error) throw error;
      
      toast({ title: "✅ Compte sélectionné", description: `${account.name} (${account.customerId})` });
      setAvailableAccounts([]);
      loadConnectionAndData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleFullSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-ads", {
        body: { action: "full_sync" },
      });
      if (error) throw error;
      
      toast({ 
        title: "✅ Synchronisation terminée", 
        description: data?.message || `${data?.campaigns} campagnes, ${data?.keywords} mots-clés, ${data?.ads} annonces`,
      });
      loadConnectionAndData();
    } catch (err: any) {
      toast({ title: "Erreur sync", description: err.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadCampaignDetails = async (googleCampaignId: string) => {
    if (expandedCampaign === googleCampaignId) {
      setExpandedCampaign(null);
      return;
    }
    setExpandedCampaign(googleCampaignId);
    setIsLoadingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-ads", {
        body: { action: "get_campaign_details", campaign_id: googleCampaignId },
      });
      if (error) throw error;
      setCampaignKeywords(data?.keywords || []);
      setCampaignAds(data?.ads || []);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const formatMicros = (micros: number | null) => {
    if (!micros) return "0.00";
    return (micros / 1000000).toFixed(2);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const isConnected = connectionInfo?.status === "connected";
  const hasAccount = connectionInfo?.account_id && connectionInfo.account_id !== "pending";
  const selectedCustomerId = hasAccount ? (connectionInfo.account_id as string).replace(/-/g, "") : undefined;
  const conversionId = connectionInfo?.account_id ? `AW-${connectionInfo.account_id}` : "AW-XXXXXXXXXX";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Google Ads Manager
          </h2>
          <p className="text-muted-foreground">Import et gestion des campagnes Google Ads</p>
        </div>
        <div className="flex items-center gap-2">
          <CreateSearchCampaignDialog />
          <CreatePmaxCampaignDialog />
          {isConnected && hasAccount && (
            <>
              <Button variant="outline" size="sm" onClick={handleFullSync} disabled={isSyncing}>
                {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {isSyncing ? "Sync en cours..." : "Sync complet"}
              </Button>
              <Button variant="outline" size="sm" onClick={loadConnectionAndData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Rafraîchir
              </Button>
            </>
          )}
          {!isConnected && (
            <Button size="sm" onClick={handleConnectGoogleAds} disabled={connectingOAuth}>
              {connectingOAuth ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Connecter Google Ads
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {isConnected ? (
              <>
                <div className="p-3 rounded-full bg-green-500/10">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Google Ads connecté</p>
                  {hasAccount ? (
                    <p className="text-sm text-muted-foreground">
                      Compte: {connectionInfo?.metadata?.account_name || `Account ${connectionInfo?.account_id}`}
                    </p>
                  ) : (
                    <p className="text-sm text-orange-600">⚠️ Aucun compte sélectionné — Chargez la liste des comptes</p>
                  )}
                </div>
                {!hasAccount && (
                  <Button onClick={handleFetchAccounts} disabled={isFetchingAccounts}>
                    {isFetchingAccounts ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Building2 className="h-4 w-4 mr-2" />}
                    Charger les comptes
                  </Button>
                )}
                {hasAccount && (
                  <Button variant="outline" size="sm" onClick={handleFetchAccounts} disabled={isFetchingAccounts}>
                    {isFetchingAccounts ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Building2 className="h-4 w-4 mr-2" />}
                    Changer de compte
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="p-3 rounded-full bg-muted">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Google Ads non connecté</p>
                  <p className="text-sm text-muted-foreground">Connectez votre compte pour commencer</p>
                </div>
                <Button onClick={handleConnectGoogleAds} disabled={connectingOAuth}>
                  {connectingOAuth ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Connecter
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Selection */}
      {availableAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Sélectionner un compte ({availableAccounts.length})
            </CardTitle>
            <CardDescription>Choisissez le compte Google Ads à synchroniser</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableAccounts.map((acct) => (
                <div
                  key={acct.customerId}
                  className="border rounded-lg p-4 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors"
                  onClick={() => handleSelectAccount(acct)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{acct.name}</p>
                      <p className="text-sm text-muted-foreground">ID: {acct.customerId}</p>
                      {acct.currencyCode && (
                        <p className="text-xs text-muted-foreground">{acct.currencyCode} · {acct.timeZone}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {acct.isManager && (
                        <Badge variant="outline" className="text-xs">Manager</Badge>
                      )}
                      <Button size="sm" variant="outline">Sélectionner</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {hasAccount && (
        <div className="space-y-3">
          {/* Period selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground mr-1">Période :</span>
            {(Object.keys(PERIOD_LABELS) as StatsPeriod[]).map((p) => (
              <Button
                key={p}
                variant={statsPeriod === p ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStatsPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </Button>
            ))}
            {isLoadingPeriodStats && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Megaphone className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{syncedCampaigns.length}</p>
                    <p className="text-sm text-muted-foreground">Campagnes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <DollarSign className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statsPeriod === "7d"
                        ? syncedCampaigns.reduce((s, c) => s + (c.spend_7d || 0), 0).toFixed(0)
                        : (periodStats?.spend || 0).toFixed(0)}€
                    </p>
                    <p className="text-sm text-muted-foreground">Dépenses {PERIOD_LABELS[statsPeriod]}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-500/10">
                    <Target className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statsPeriod === "7d"
                        ? syncedCampaigns.reduce((s, c) => s + (c.clicks_7d || 0), 0)
                        : (periodStats?.clicks || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Clics {PERIOD_LABELS[statsPeriod]}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-orange-500/10">
                    <CheckCircle className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statsPeriod === "7d"
                        ? syncedCampaigns.reduce((s, c) => s + (c.conversions_7d || 0), 0).toFixed(0)
                        : (periodStats?.conversions || 0).toFixed(0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Conversions {PERIOD_LABELS[statsPeriod]}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Sub-tabs for Google Ads sections */}
      {hasAccount && (
        <Tabs value={activeTab} className="space-y-4">

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            {/* Sync Status */}
            {syncStatus && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Dernière sync: {syncStatus.last_full_sync_at ? new Date(syncStatus.last_full_sync_at).toLocaleString("fr-FR") : "Jamais"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant={syncStatus.last_full_sync_status === "success" ? "default" : "outline"}>
                        {syncStatus.last_full_sync_status || "N/A"}
                      </Badge>
                      <span className="text-muted-foreground">
                        {syncStatus.total_campaigns || 0} camp. · {syncStatus.total_keywords || 0} kw · {syncStatus.total_ads || 0} ads
                      </span>
                    </div>
                  </div>
                  {syncStatus.last_full_sync_error && (
                    <p className="text-xs text-destructive mt-2">{syncStatus.last_full_sync_error}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {syncedCampaigns.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Campagnes Google Ads</CardTitle>
                  <CardDescription>Cliquez sur une campagne pour voir les mots-clés et annonces</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {syncedCampaigns.map((campaign) => (
                      <div key={campaign.id} className="border rounded-lg">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                          onClick={() => handleLoadCampaignDetails(campaign.google_campaign_id)}
                        >
                          <div className="flex items-center gap-3">
                            {expandedCampaign === campaign.google_campaign_id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <Megaphone className="h-4 w-4 text-primary" />
                            <div>
                              <p className="font-medium">{campaign.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {campaign.advertising_channel_type} · {campaign.bidding_strategy_type}
                                {campaign.budget_amount_micros && ` · ${formatMicros(campaign.budget_amount_micros)}€/jour`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="text-right">
                              <p className="font-medium">{(campaign.spend_7d || 0).toFixed(2)}€</p>
                              <p className="text-xs text-muted-foreground">dépenses</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{campaign.clicks_7d || 0}</p>
                              <p className="text-xs text-muted-foreground">clics</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{((campaign.ctr_7d || 0) * 100).toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">CTR</p>
                            </div>
                            <Badge variant={campaign.status === "ENABLED" ? "default" : "outline"}>
                              {campaign.status}
                            </Badge>
                          </div>
                        </div>

                        {expandedCampaign === campaign.google_campaign_id && (
                          <div className="border-t p-4 space-y-4">
                            {isLoadingDetails ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                <span className="text-sm text-muted-foreground">Chargement...</span>
                              </div>
                            ) : (
                              <>
                                {/* Keywords */}
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                      <Key className="h-4 w-4" />
                                      Mots-clés ({campaignKeywords.length})
                                    </h4>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs gap-1"
                                      onClick={() => {
                                        const tabTrigger = document.querySelector('button[value="gads-keywords"]') as HTMLElement;
                                        if (tabTrigger) tabTrigger.click();
                                      }}
                                    >
                                      <Plus className="h-3 w-3" />
                                      Ajouter des mots-clés
                                    </Button>
                                  </div>
                                  {campaignKeywords.length > 0 ? (
                                    <ScrollArea className="max-h-[300px]">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Mot-clé</TableHead>
                                            <TableHead>Match</TableHead>
                                            <TableHead>QS</TableHead>
                                            <TableHead>Clics</TableHead>
                                            <TableHead>Impr.</TableHead>
                                            <TableHead>Coût</TableHead>
                                            <TableHead>Ad Group</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {campaignKeywords.map((kw) => (
                                            <TableRow key={kw.id}>
                                              <TableCell className="font-medium">{kw.keyword_text}</TableCell>
                                              <TableCell>
                                                <Badge variant="outline" className="text-xs">{kw.match_type}</Badge>
                                              </TableCell>
                                              <TableCell>
                                                {kw.quality_score ? (
                                                  <Badge variant={kw.quality_score >= 7 ? "default" : kw.quality_score >= 4 ? "outline" : "destructive"} className="text-xs">
                                                    {kw.quality_score}/10
                                                  </Badge>
                                                ) : "-"}
                                              </TableCell>
                                              <TableCell>{kw.clicks || 0}</TableCell>
                                              <TableCell>{kw.impressions || 0}</TableCell>
                                              <TableCell>{formatMicros(kw.cost_micros)}€</TableCell>
                                              <TableCell className="text-xs text-muted-foreground">{kw.ad_group_name}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </ScrollArea>
                                  ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">Aucun mot-clé</p>
                                  )}
                                </div>

                                <Separator />

                                {/* Ads */}
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      Annonces ({campaignAds.length})
                                    </h4>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs gap-1"
                                      onClick={() => {
                                        const tabTrigger = document.querySelector('button[value="gads-adgroups"]') as HTMLElement;
                                        if (tabTrigger) tabTrigger.click();
                                      }}
                                    >
                                      <Plus className="h-3 w-3" />
                                      Ajouter des annonces
                                    </Button>
                                  </div>
                                  {campaignAds.length > 0 ? (
                                    <div className="space-y-3">
                                      {campaignAds.map((ad) => {
                                        const headlines = Array.isArray(ad.headlines) 
                                          ? ad.headlines.map((h: any) => typeof h === 'string' ? h : h.text || '')
                                          : [];
                                        const descriptions = Array.isArray(ad.descriptions)
                                          ? ad.descriptions.map((d: any) => typeof d === 'string' ? d : d.text || '')
                                          : [];
                                        
                                        return (
                                          <div key={ad.id} className="border rounded-md p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs text-muted-foreground">{ad.ad_group_name}</span>
                                              <div className="flex items-center gap-2">
                                                {ad.ad_strength && (
                                                  <Badge variant="outline" className="text-xs">{ad.ad_strength}</Badge>
                                                )}
                                                <Badge variant={ad.status === "ENABLED" ? "default" : "outline"} className="text-xs">
                                                  {ad.status}
                                                </Badge>
                                              </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {headlines.map((h: string, i: number) => (
                                                <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>
                                              ))}
                                            </div>
                                            {descriptions.map((d: string, i: number) => (
                                              <p key={i} className="text-xs text-muted-foreground">{d}</p>
                                            ))}
                                            {ad.final_urls && ad.final_urls.length > 0 && (
                                              <p className="text-xs text-blue-500">{ad.final_urls.join(", ")}</p>
                                            )}
                                            <div className="flex gap-4 text-xs text-muted-foreground">
                                              <span>{ad.clicks || 0} clics</span>
                                              <span>{ad.impressions || 0} impr.</span>
                                              <span>{formatMicros(ad.cost_micros)}€</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">Aucune annonce</p>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucune campagne synchronisée</h3>
                  <p className="text-muted-foreground mb-4">Cliquez sur "Sync complet" pour importer vos campagnes</p>
                  <Button onClick={handleFullSync} disabled={isSyncing}>
                    <Download className="h-4 w-4 mr-2" />
                    Lancer la synchronisation
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-4">
            <CampaignSelectDialog
              open={showAuditCampaignPicker}
              onOpenChange={setShowAuditCampaignPicker}
              onSelect={(campaignId, campaignName) => {
                setSelectedAuditCampaignName(campaignName);
                handleAnalyze("all", campaignId || undefined);
              }}
              title="Lancer l'audit"
              googleCustomerId={selectedCustomerId}
            />

            <ReportHistory
              reports={auditReports}
              isLoading={auditHistoryLoading}
              onLoad={loadAuditReport}
              focusType="all"
              onRefresh={loadAuditReports}
            />

            <Card ref={analysisRef}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Audit complet
                    </CardTitle>
                    <CardDescription>
                      Synthèse globale du compte Google Ads
                      {selectedAuditCampaignName && <Badge variant="outline" className="ml-2 text-[10px]">{selectedAuditCampaignName}</Badge>}
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAuditCampaignPicker(true)} disabled={isAnalyzing}>
                    {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                    Lancer l'audit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(analysisText || isAnalyzing) ? (
                  <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                    <AdsAnalysisReport text={analysisText} isStreaming={isAnalyzing} />
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Cliquez sur "Lancer l'audit" pour une analyse complète</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keywords Tab */}
          <TabsContent value="keywords-analysis">
            <KeywordsTab googleCustomerId={selectedCustomerId} />
          </TabsContent>

          {/* Ad Groups Tab */}
          <TabsContent value="adgroups-analysis">
            <AdGroupsTab googleCustomerId={selectedCustomerId} />
          </TabsContent>

          {/* ROAS Tab */}
          <TabsContent value="roas-analysis">
            <RoasTab campaigns={syncedCampaigns} googleCustomerId={selectedCustomerId} />
          </TabsContent>

          {/* Strategy Tab */}
          <TabsContent value="strategy-analysis">
            <StrategyTab campaigns={syncedCampaigns} googleCustomerId={selectedCustomerId} />
          </TabsContent>

          {/* Conversions Tab */}
          <TabsContent value="conversions">
            <ConversionsTab conversionId={conversionId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
