import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, Trash2, RefreshCw, Wand2, Target, Layers, FileText, 
  Key, ChevronDown, ChevronRight, Loader2, Megaphone, DollarSign
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AdsAccount {
  id: string;
  customer_id: string;
  account_name: string | null;
  is_active: boolean | null;
  created_at: string;
}

interface Campaign {
  id: string;
  account_id: string;
  name: string;
  campaign_type: string | null;
  bidding_strategy: string | null;
  budget_amount: number | null;
  budget_currency: string | null;
  status: string | null;
  ai_generated: boolean | null;
  ai_prompt: string | null;
  created_at: string;
}

interface AdGroup {
  id: string;
  campaign_id: string;
  name: string;
  cpc_bid: number | null;
  status: string | null;
  ai_generated: boolean | null;
}

interface Ad {
  id: string;
  ad_group_id: string;
  headlines: string[];
  descriptions: string[];
  final_urls: string[];
  path1: string | null;
  path2: string | null;
  status: string | null;
}

interface Keyword {
  id: string;
  ad_group_id: string;
  keyword: string;
  match_type: string | null;
  is_negative: boolean | null;
  status: string | null;
}

export function GoogleAdsManager() {
  const [accounts, setAccounts] = useState<AdsAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdGroups, setExpandedAdGroups] = useState<Set<string>>(new Set());

  const [connectingOAuth, setConnectingOAuth] = useState(false);

  // AI generation form
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    accountId: "",
    prompt: "",
    websiteUrl: "",
    businessDescription: "",
    language: "fr",
    budget: "10",
  });

  // Handle OAuth callback on mount
  useEffect(() => {
    loadAll();

    // Check for OAuth callback code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const stateParam = urlParams.get("state");

    if (code && stateParam) {
      try {
        const state = JSON.parse(atob(stateParam));
        if (state.type === "google-ads") {
          handleOAuthCallback(code);
          // Clean URL
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch (e) {
        // Not a Google Ads callback
      }
    }
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [accts, camps, ags, adsRes, kwRes] = await Promise.all([
        supabase.from("google_ads_accounts").select("*").order("created_at", { ascending: false }),
        supabase.from("google_ads_campaigns").select("*").order("created_at", { ascending: false }),
        supabase.from("google_ads_ad_groups").select("*").order("created_at", { ascending: false }),
        supabase.from("google_ads_ads").select("*").order("created_at", { ascending: false }),
        supabase.from("google_ads_keywords").select("*").order("created_at", { ascending: false }),
      ]);

      setAccounts((accts.data || []) as AdsAccount[]);
      setCampaigns((camps.data || []) as Campaign[]);
      setAdGroups((ags.data || []) as AdGroup[]);
      setAds((adsRes.data || []) as Ad[]);
      setKeywords((kwRes.data || []) as Keyword[]);
    } catch (err) {
      console.error("Error loading Google Ads data:", err);
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

      toast({ title: "Compte Google Ads connecté", description: result.email || "Succès" });
      loadAll();
    } catch (err: any) {
      toast({ title: "Erreur connexion", description: err.message, variant: "destructive" });
    }
  };

  const handleGenerate = async () => {
    if (!generateForm.accountId || !generateForm.prompt.trim()) {
      toast({ title: "Sélectionnez un compte et entrez un prompt", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-google-ads", {
        body: {
          accountId: generateForm.accountId,
          prompt: generateForm.prompt,
          websiteUrl: generateForm.websiteUrl,
          businessDescription: generateForm.businessDescription,
          language: generateForm.language,
          budget: parseFloat(generateForm.budget) || 10,
        },
      });

      if (error) throw error;

      toast({
        title: "Campagne générée !",
        description: `${data.results?.ad_groups?.length || 0} ad groups créés`,
      });

      setShowGenerate(false);
      setGenerateForm({ accountId: "", prompt: "", websiteUrl: "", businessDescription: "", language: "fr", budget: "10" });
      loadAll();
    } catch (err: any) {
      console.error("Generation error:", err);
      toast({ title: "Erreur de génération", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    // Cascade: delete keywords, ads, ad groups, then campaign
    const relatedAgs = adGroups.filter(ag => ag.campaign_id === id);
    for (const ag of relatedAgs) {
      await supabase.from("google_ads_keywords").delete().eq("ad_group_id", ag.id);
      await supabase.from("google_ads_ads").delete().eq("ad_group_id", ag.id);
    }
    await supabase.from("google_ads_ad_groups").delete().eq("campaign_id", id);
    await supabase.from("google_ads_campaigns").delete().eq("id", id);
    toast({ title: "Campagne supprimée" });
    loadAll();
  };

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAdGroup = (id: string) => {
    setExpandedAdGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Google Ads Manager
          </h2>
          <p className="text-muted-foreground">Gestion AI des campagnes Google Ads</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Rafraîchir
          </Button>
          <Button variant="outline" size="sm" onClick={handleConnectGoogleAds} disabled={connectingOAuth}>
            {connectingOAuth ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Connecter Google Ads
          </Button>
          <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Wand2 className="h-4 w-4 mr-2" />
                Générer par AI
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Génération AI de campagne
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Compte Google Ads *</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={generateForm.accountId}
                    onChange={e => setGenerateForm({ ...generateForm, accountId: e.target.value })}
                  >
                    <option value="">Sélectionner un compte</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.account_name || a.customer_id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Prompt AI *</Label>
                  <Textarea
                    placeholder="Créer une campagne pour promouvoir notre service de SEO local en France, ciblant les PME..."
                    value={generateForm.prompt}
                    onChange={e => setGenerateForm({ ...generateForm, prompt: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>URL du site</Label>
                    <Input
                      placeholder="https://example.com"
                      value={generateForm.websiteUrl}
                      onChange={e => setGenerateForm({ ...generateForm, websiteUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget journalier (€)</Label>
                    <Input
                      type="number"
                      value={generateForm.budget}
                      onChange={e => setGenerateForm({ ...generateForm, budget: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description business</Label>
                  <Textarea
                    placeholder="Décrivez votre activité..."
                    value={generateForm.businessDescription}
                    onChange={e => setGenerateForm({ ...generateForm, businessDescription: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Langue</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={generateForm.language}
                    onChange={e => setGenerateForm({ ...generateForm, language: e.target.value })}
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
                <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Générer la campagne
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Accounts Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Target className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{accounts.length}</p>
                <p className="text-sm text-muted-foreground">Comptes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Megaphone className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaigns.length}</p>
                <p className="text-sm text-muted-foreground">Campagnes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <Key className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{keywords.length}</p>
                <p className="text-sm text-muted-foreground">Keywords</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Tree */}
      <Card>
        <CardHeader>
          <CardTitle>Campagnes</CardTitle>
          <CardDescription>Structure complète: Campagnes → Ad Groups → Ads & Keywords</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune campagne. Cliquez sur "Générer par AI" pour commencer.
            </p>
          ) : (
            <div className="space-y-3">
              {campaigns.map(campaign => {
                const campAdGroups = adGroups.filter(ag => ag.campaign_id === campaign.id);
                const isExpanded = expandedCampaigns.has(campaign.id);

                return (
                  <div key={campaign.id} className="border rounded-lg">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleCampaign(campaign.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <Megaphone className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {campaign.campaign_type} · {campaign.bidding_strategy} · {campaign.budget_amount} {campaign.budget_currency}/jour
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {campaign.ai_generated && (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                            <Wand2 className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {campAdGroups.length} ad groups
                        </Badge>
                        <Badge variant={campaign.status === "active" ? "default" : "outline"}>
                          {campaign.status || "draft"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => { e.stopPropagation(); handleDeleteCampaign(campaign.id); }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t px-4 pb-4">
                        {campaign.ai_prompt && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Prompt AI:</p>
                            <p className="text-sm">{campaign.ai_prompt}</p>
                          </div>
                        )}

                        {campAdGroups.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">Aucun ad group</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {campAdGroups.map(ag => {
                              const agAds = ads.filter(a => a.ad_group_id === ag.id);
                              const agKeywords = keywords.filter(k => k.ad_group_id === ag.id);
                              const positiveKw = agKeywords.filter(k => !k.is_negative);
                              const negativeKw = agKeywords.filter(k => k.is_negative);
                              const isAgExpanded = expandedAdGroups.has(ag.id);

                              return (
                                <div key={ag.id} className="border rounded-md ml-4">
                                  <div
                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                                    onClick={() => toggleAdGroup(ag.id)}
                                  >
                                    <div className="flex items-center gap-2">
                                      {isAgExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                      <Layers className="h-4 w-4 text-blue-500" />
                                      <span className="font-medium text-sm">{ag.name}</span>
                                      {ag.cpc_bid && (
                                        <span className="text-xs text-muted-foreground">CPC: {ag.cpc_bid}€</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">{agAds.length} ads</Badge>
                                      <Badge variant="outline" className="text-xs">{agKeywords.length} kw</Badge>
                                    </div>
                                  </div>

                                  {isAgExpanded && (
                                    <div className="border-t p-3 space-y-4">
                                      {/* Ads */}
                                      <div>
                                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                          <FileText className="h-3 w-3" /> Annonces ({agAds.length})
                                        </p>
                                        <div className="space-y-2">
                                          {agAds.map(ad => (
                                            <div key={ad.id} className="p-3 bg-muted/30 rounded-md space-y-1">
                                              <div className="flex flex-wrap gap-1">
                                                {ad.headlines.map((h, i) => (
                                                  <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>
                                                ))}
                                              </div>
                                              {ad.descriptions.map((d, i) => (
                                                <p key={i} className="text-xs text-muted-foreground">{d}</p>
                                              ))}
                                              <p className="text-xs text-blue-500">{ad.final_urls.join(", ")}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <Separator />

                                      {/* Keywords */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-xs font-semibold text-green-600 mb-2 flex items-center gap-1">
                                            <Key className="h-3 w-3" /> Keywords positifs ({positiveKw.length})
                                          </p>
                                          <div className="flex flex-wrap gap-1">
                                            {positiveKw.map(kw => (
                                              <Badge key={kw.id} variant="outline" className="text-xs bg-green-500/5">
                                                {kw.match_type === "EXACT" ? `[${kw.keyword}]` :
                                                 kw.match_type === "PHRASE" ? `"${kw.keyword}"` :
                                                 kw.keyword}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                                            <Key className="h-3 w-3" /> Keywords négatifs ({negativeKw.length})
                                          </p>
                                          <div className="flex flex-wrap gap-1">
                                            {negativeKw.map(kw => (
                                              <Badge key={kw.id} variant="outline" className="text-xs bg-red-500/5 text-red-600">
                                                -{kw.keyword}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
