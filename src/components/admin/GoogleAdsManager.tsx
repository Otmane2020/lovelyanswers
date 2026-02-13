import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, RefreshCw, Target, FileText, 
  Key, ChevronDown, ChevronRight, Loader2, Megaphone, DollarSign,
  Download, CheckCircle, AlertCircle, Building2, Brain, Zap, TrendingUp, BarChart3, Lightbulb,
  Code, Copy, Tag
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

interface ConversionGoal {
  name: string;
  type: string;
  value: number | null;
  tag: string;
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

  // AI Analysis
  const [analysisText, setAnalysisText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisFocus, setAnalysisFocus] = useState<string | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  // Conversion goals
  const [conversionGoals, setConversionGoals] = useState<ConversionGoal[]>([]);
  const [isGeneratingGoals, setIsGeneratingGoals] = useState(false);

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
          setSyncedCampaigns(data.campaigns || []);
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

  const handleAnalyze = async (focus: string, campaignId?: string) => {
    setIsAnalyzing(true);
    setAnalysisFocus(focus);
    setAnalysisText("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-google-ads`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ focus, campaign_id: campaignId }),
        }
      );

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAnalysisText(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAnalysisText(fullText);
            }
          } catch { /* ignore */ }
        }
      }

      setTimeout(() => {
        analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: any) {
      toast({ title: "Erreur analyse", description: err.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateConversionGoals = async () => {
    setIsGeneratingGoals(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("analyze-google-ads", {
        body: { focus: "conversions" },
      });

      if (error) throw error;

      // Parse the response to extract conversion goals
      const goals: ConversionGoal[] = data?.goals || [];
      setConversionGoals(goals);
      
      if (goals.length === 0) {
        toast({ title: "Aucun objectif généré", description: "Lancez d'abord un audit complet", variant: "destructive" });
      } else {
        toast({ title: `${goals.length} objectif(s) de conversion générés` });
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsGeneratingGoals(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié !", description: "Tag copié dans le presse-papier" });
  };

  const generateGtagSnippet = (conversionId: string, conversionLabel: string, value?: number) => {
    return `<!-- Google Ads Conversion Tracking -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${conversionId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${conversionId}');
</script>

<!-- Event snippet for conversion -->
<script>
  gtag('event', 'conversion', {
    'send_to': '${conversionId}/${conversionLabel}'${value ? `,\n    'value': ${value},\n    'currency': 'EUR'` : ''}
  });
</script>`;
  };

  const focusOptions = [
    { key: "all", label: "Audit complet", icon: Brain, desc: "Analyse globale" },
    { key: "keywords", label: "Mots-clés", icon: Key, desc: "QS, bids, négatifs" },
    { key: "ad_groups", label: "Ad Groups", icon: Target, desc: "Structure & pertinence" },
    { key: "roas", label: "ROAS", icon: TrendingUp, desc: "Revenue & rentabilité" },
    { key: "strategy", label: "Stratégie", icon: Lightbulb, desc: "Vision macro" },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const isConnected = connectionInfo?.status === "connected";
  const hasAccount = connectionInfo?.account_id && connectionInfo.account_id !== "pending";
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
                      Compte: {connectionInfo?.metadata?.account_name || connectionInfo?.account_id}
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
                    {syncedCampaigns.reduce((s, c) => s + (c.spend_7d || 0), 0).toFixed(0)}€
                  </p>
                  <p className="text-sm text-muted-foreground">Dépenses 7j</p>
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
                    {syncedCampaigns.reduce((s, c) => s + (c.clicks_7d || 0), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Clics 7j</p>
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
                    {syncedCampaigns.reduce((s, c) => s + (c.conversions_7d || 0), 0).toFixed(0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Conversions 7j</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                    <Key className="h-4 w-4" />
                                    Mots-clés ({campaignKeywords.length})
                                  </h4>
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
                                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                    <FileText className="h-4 w-4" />
                                    Annonces ({campaignAds.length})
                                  </h4>
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

          {/* Analysis Sub-tabs */}
          {focusOptions.map((opt) => {
            const tabValue = opt.key === "all" ? "audit" : 
                           opt.key === "keywords" ? "keywords-analysis" :
                           opt.key === "ad_groups" ? "adgroups-analysis" :
                           opt.key === "roas" ? "roas-analysis" : "strategy-analysis";
            const Icon = opt.icon;
            return (
              <TabsContent key={opt.key} value={tabValue}>
                <Card ref={opt.key === analysisFocus ? analysisRef : undefined}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          {opt.label}
                        </CardTitle>
                        <CardDescription>{opt.desc}</CardDescription>
                      </div>
                      <Button 
                        onClick={() => handleAnalyze(opt.key)} 
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing && analysisFocus === opt.key ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4 mr-2" />
                        )}
                        Lancer l'analyse
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {analysisFocus === opt.key && (analysisText || isAnalyzing) ? (
                      <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                          {analysisText || "Analyse en cours..."}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Icon className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>Cliquez sur "Lancer l'analyse" pour obtenir des recommandations IA</p>
                        <p className="text-xs mt-1">Basé sur vos données Google Ads synchronisées</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}

          {/* Conversions Tab */}
          <TabsContent value="conversions">
            <div className="space-y-6">
              {/* Generate Goals from Audit */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        Objectifs de conversion IA
                      </CardTitle>
                      <CardDescription>Générez des objectifs de conversion basés sur l'audit de vos campagnes</CardDescription>
                    </div>
                    <Button onClick={handleGenerateConversionGoals} disabled={isGeneratingGoals}>
                      {isGeneratingGoals ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Générer les objectifs
                    </Button>
                  </div>
                </CardHeader>
                {conversionGoals.length > 0 && (
                  <CardContent>
                    <div className="space-y-3">
                      {conversionGoals.map((goal, idx) => (
                        <div key={idx} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-primary" />
                              <span className="font-medium">{goal.name}</span>
                            </div>
                            <Badge variant="outline">{goal.type}</Badge>
                          </div>
                          {goal.value && (
                            <p className="text-sm text-muted-foreground">Valeur: {goal.value}€</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Implemented Conversion Tracking */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    Conversions implémentées sur LovelyAnswers
                  </CardTitle>
                  <CardDescription>
                    Ces conversions sont déjà intégrées dans le site et remontent automatiquement dans Google Ads (AW-{conversionId})
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: "Inscription (Sign Up)", event: "sign_up", page: "/signup", value: "$5", status: "active", description: "Se déclenche quand un utilisateur crée un compte" },
                    { name: "Onboarding terminé", event: "onboarding_complete", page: "/wizard", value: "$10", status: "active", description: "Se déclenche quand l'utilisateur termine le wizard de configuration" },
                    { name: "Début de checkout", event: "begin_checkout", page: "/checkout", value: "$29-279", status: "active", description: "Se déclenche quand l'utilisateur clique sur 'S'abonner'" },
                    { name: "Vue page Pricing", event: "pricing_view", page: "/pricing", value: "$1", status: "active", description: "Se déclenche quand un visiteur consulte la page pricing" },
                    { name: "Achat (Purchase)", event: "purchase", page: "Stripe webhook", value: "Dynamic", status: "active", description: "Se déclenche après paiement réussi via Stripe" },
                  ].map((conv, idx) => (
                    <div key={idx} className="border rounded-lg p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-sm">{conv.name}</span>
                          <Badge variant="outline" className="text-[10px]">{conv.event}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{conv.description}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span>Page: <code className="bg-muted px-1 rounded">{conv.page}</code></span>
                          <span>Valeur: <strong>{conv.value}</strong></span>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-green-200 shrink-0">Actif</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Tag global info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    Configuration gtag.js
                  </CardTitle>
                  <CardDescription>Le tag global Google Ads est déjà installé dans index.html</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto">
{`<!-- Déjà dans index.html -->
gtag('config', 'AW-${conversionId}');

<!-- Événements envoyés automatiquement via src/lib/gtag-conversions.ts -->
gtag('event', 'conversion', { send_to: 'AW-${conversionId}/signup', value: 5.0 });
gtag('event', 'conversion', { send_to: 'AW-${conversionId}/onboarding', value: 10.0 });
gtag('event', 'conversion', { send_to: 'AW-${conversionId}/checkout', value: 29-279 });
gtag('event', 'conversion', { send_to: 'AW-${conversionId}/purchase', value: dynamic });
gtag('event', 'conversion', { send_to: 'AW-${conversionId}/pricing_view', value: 1.0 });`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
