"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, CheckCircle2, Settings2, Trash2, Loader2, Search, Globe, AlertCircle, Send, ChevronDown, Stethoscope, ChevronRight, Copy, Check, LogOut, Clock, Calendar, Lock, Crown, Link2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIntegrations, useDeleteIntegration } from "@/hooks/useIntegrations";
import { useActiveProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useGoogleSearchConsole } from "@/hooks/useGoogleSearchConsole";
import { useGoogleBusiness } from "@/hooks/useGoogleBusiness";
import { IntegrationConfigModal } from "@/components/integrations/IntegrationConfigModal";
import { SubscriptionGate } from "@/components/aeo/SubscriptionGate";
import { TestPublishButton } from "@/components/integrations/TestPublishButton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Logos
import shopifyLogo from "@/assets/shopify-logo-new.png";
import wordpressLogo from "@/assets/wordpress-logo-new.png";
import bigcommerceLogo from "@/assets/bigcommerce-logo.png";
import framerLogo from "@/assets/framer-logo.png";
import wixLogo from "@/assets/wix-logo.png";
import boltLogo from "@/assets/bolt-logo.png";
import lovableLogo from "@/assets/lovable-logo.svg";

const CMS_INTEGRATIONS = [
  { id: "wordpress", name: "WordPress", icon: wordpressLogo as unknown as string, isImage: true },
  { id: "shopify", name: "Shopify", icon: shopifyLogo as unknown as string, isImage: true },
  { id: "wix", name: "Wix", icon: wixLogo as unknown as string, isImage: true },
  { id: "framer", name: "Framer", icon: framerLogo as unknown as string, isImage: true },
  { id: "bigcommerce", name: "BigCommerce", icon: bigcommerceLogo as unknown as string, isImage: true },
  { id: "webflow", name: "Webflow", icon: "🔷", isImage: false },
  { id: "bolt", name: "Bolt", icon: boltLogo, isImage: true },
  { id: "lovable", name: "Lovable", icon: lovableLogo, isImage: true },
  { id: "api", name: "API", icon: "⚙️", isImage: false },
  { id: "webhook", name: "Webhook", icon: "🔗", isImage: false },
];

export default function AeoIntegrations() {
  const { project } = useActiveProject();
  const { data: integrations = [], isLoading, refetch } = useIntegrations();
  const deleteIntegration = useDeleteIntegration();
  const { isConnected: gscConnected, isLoading: gscLoading, refetch: refetchGsc } = useGoogleSearchConsole();
  const { isSubscribed } = useSubscriptionContext();
  const {
    isConnected: gmbConnected,
    locations: gmbLocations,
    selectedLocationIds: gmbSelectedIds,
    isLoading: gmbLoading,
    toggleLocation: toggleGmbLocation,
    connectGMB,
    disconnectGMB,
  } = useGoogleBusiness();
  const router = useRouter();

  const [showPaywall, setShowPaywall] = useState(false);

  const [autoPublish, setAutoPublish] = useState(true);
  const [publishAnswers, setPublishAnswers] = useState(true);
  const [publishHour, setPublishHour] = useState("08");
  const [publishMinute, setPublishMinute] = useState("00");
  const [publishPeriod, setPublishPeriod] = useState<"AM" | "PM">("AM");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [frequency, setFrequency] = useState("daily");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  
  const [connectingGsc, setConnectingGsc] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<any>(null);
  const [deletingIntegration, setDeletingIntegration] = useState<string | null>(null);
  const [testIndexUrl, setTestIndexUrl] = useState("");
  const [isTestingIndex, setIsTestingIndex] = useState(false);
  const [indexTestResult, setIndexTestResult] = useState<{ success: boolean; message: string; errorDetails?: any; hint?: string } | null>(null);
  const [gscSites, setGscSites] = useState<string[]>([]);
  const [selectedGscSite, setSelectedGscSite] = useState<string>("");
  const [loadingGscSites, setLoadingGscSites] = useState(false);
  
  // Diagnostic states
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const timezones = [
    { value: "Europe/Paris", label: "Paris (CET)" },
    { value: "Europe/London", label: "London (GMT)" },
    { value: "America/New_York", label: "New York (EST)" },
    { value: "America/Los_Angeles", label: "Los Angeles (PST)" },
    { value: "America/Chicago", label: "Chicago (CST)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST)" },
    { value: "UTC", label: "UTC" },
  ];

  const frequencies = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly (Mon)" },
    { value: "monthly", label: "Monthly (1st)" },
  ];

  // Load auto-publish settings
  useEffect(() => {
    const loadPublishSettings = async () => {
      if (!project?.id) return;
      
      setLoadingSettings(true);
      try {
        const { data } = await supabase
          .from("project_settings")
          .select("auto_publish_enabled, publish_hour, timezone, publish_frequency")
          .eq("project_id", project.id)
          .single();
        
        if (data) {
          setAutoPublish(data.auto_publish_enabled ?? true);
          // Convert 24h to 12h format
          const hour24 = parseInt(data.publish_hour || "08");
          const period = hour24 >= 12 ? "PM" : "AM";
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
          setPublishHour(hour12.toString().padStart(2, "0"));
          setPublishPeriod(period);
          setTimezone(data.timezone || "Europe/Paris");
          setFrequency(data.publish_frequency || "daily");
        }
      } catch (error) {
        console.error("Error loading publish settings:", error);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadPublishSettings();
  }, [project?.id]);

  // Save auto-publish settings
  const savePublishSettings = async (updates: { auto_publish_enabled?: boolean; publish_hour?: string; timezone?: string; publish_frequency?: string }) => {
    if (!project?.id) return;
    
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("project_settings")
        .upsert({
          project_id: project.id,
          ...updates,
          updated_at: new Date().toISOString()
        }, { onConflict: "project_id" });
      
      if (error) throw error;
      toast.success("Settings saved");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAutoPublishChange = (checked: boolean) => {
    setAutoPublish(checked);
    savePublishSettings({ auto_publish_enabled: checked });
  };

  const handleTimeChange = (hour: string, period: "AM" | "PM") => {
    setPublishHour(hour);
    setPublishPeriod(period);
    // Convert 12h to 24h format for storage
    let hour24 = parseInt(hour);
    if (period === "PM" && hour24 !== 12) hour24 += 12;
    if (period === "AM" && hour24 === 12) hour24 = 0;
    savePublishSettings({ publish_hour: hour24.toString().padStart(2, "0") });
  };

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
    savePublishSettings({ timezone: tz });
  };

  const handleFrequencyChange = (freq: string) => {
    setFrequency(freq);
    savePublishSettings({ publish_frequency: freq });
  };

  // Handle OAuth callback — this page is the redirect_uri for BOTH Google
  // Search Console (google-oauth-url, state = a plain UUID) and Google
  // Business Profile when connected from this page's own card
  // (gmb-oauth-url, state = base64 JSON {type:"gmb", projectId}). This used
  // to always exchange the code via google-oauth-token regardless of which
  // flow it came from — a GMB code exchanged as GSC either fails outright
  // or silently overwrites profiles.google_oauth_token with a
  // business.manage-scoped token, breaking GSC too. Branch on `state` the
  // same way AeoLocal.tsx's (working) GMB callback already does.
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      if (!code || !state) return;

      let gmbState: { type?: string; projectId?: string } = {};
      try {
        gmbState = JSON.parse(atob(state));
      } catch {
        // Not base64 JSON -> this is GSC's plain UUID state, fall through.
      }

      if (gmbState.type === "gmb") {
        try {
          const redirectUri = `${window.location.origin}/integrations`;
          const { data, error } = await supabase.functions.invoke("gmb-oauth-token", {
            body: { code, redirectUri, projectId: gmbState.projectId || project?.id },
          });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || "Failed to connect");
          toast.success("Google Business Profile connecté avec succès!");
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.reload();
        } catch (error: any) {
          console.error("GMB OAuth callback error:", error);
          toast.error("Erreur de connexion Google Business: " + (error.message || "Unknown error"));
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        return;
      }

      setConnectingGsc(true);
      try {
        // We must pass the same redirectUri used to start the OAuth flow.
        // Store it before redirecting to Google, then read it back here.
        const redirectUri = sessionStorage.getItem("gsc_oauth_redirect_uri") ||
          `${window.location.origin}/integrations`;

        const { data, error } = await supabase.functions.invoke("google-oauth-token", {
          body: { code, state, redirectUri },
        });

        if (error) throw error;
        if (!data?.success) {
          const msg = [data?.error, data?.details].filter(Boolean).join("\n");
          throw new Error(msg || "Failed to connect");
        }

        toast.success("Google Search Console connecté avec succès!");
        refetchGsc();
        sessionStorage.removeItem("gsc_oauth_redirect_uri");
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error: any) {
        console.error("OAuth callback error:", error);
        toast.error("Erreur de connexion: " + (error.message || "Unknown error"));
      } finally {
        setConnectingGsc(false);
      }
    };

    handleOAuthCallback();
  }, [refetchGsc, project?.id]);

  // Load available GSC sites when connected
  useEffect(() => {
    const loadGscSites = async () => {
      if (!gscConnected) return;
      
      setLoadingGscSites(true);
      try {
        const { data, error } = await supabase.functions.invoke("list-search-console-sites");
        
        if (error) throw error;
        
        const sites = (data?.sites || []).map((s: any) => s.siteUrl);
        setGscSites(sites);
        
        // Auto-select first site or matching project domain
        if (sites.length > 0 && !selectedGscSite) {
          if (project?.website_url) {
            const projectDomain = new URL(project.website_url).hostname.replace("www.", "");
            const matchingSite = sites.find((s: string) => s.includes(projectDomain));
            setSelectedGscSite(matchingSite || sites[0]);
          } else {
            setSelectedGscSite(sites[0]);
          }
        }
      } catch (error) {
        console.error("Error loading GSC sites:", error);
      } finally {
        setLoadingGscSites(false);
      }
    };
    
    loadGscSites();
  }, [gscConnected, project?.website_url]);

  const connectGSC = async () => {
    setConnectingGsc(true);
    try {
      const redirectUri = `${window.location.origin}/integrations`;

      // Persist redirectUri to correctly complete the OAuth code exchange.
      sessionStorage.setItem("gsc_oauth_redirect_uri", redirectUri);

      const { data, error } = await supabase.functions.invoke("google-oauth-url", {
        body: { redirectUri },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("Failed to get OAuth URL");

      window.location.href = data.url;
    } catch (error: any) {
      console.error("GSC connect error:", error);
      toast.error(error.message || "Failed to connect to Google Search Console");
      setConnectingGsc(false);
    }
  };

  const handleTestIndexation = async () => {
    if (!testIndexUrl.trim()) {
      toast.error("Please enter a URL to test");
      return;
    }

    setIsTestingIndex(true);
    setIndexTestResult(null);

    try {
      // For manual URL testing, we use the test-index-url edge function
      // which doesn't require an articleId
      const { data, error } = await supabase.functions.invoke("gsc-test-indexation", {
        body: { url: testIndexUrl.trim() },
      });

      if (error) throw error;

      if (data?.success) {
        setIndexTestResult({
          success: true,
          message: `✅ URL submitted for indexation: ${data.notifyTime || "Request sent"}`,
        });
        toast.success("URL submitted to Google for indexation!");
        setShowDiagnostic(false);
        setDiagnosticResult(null);
      } else {
        setIndexTestResult({
          success: false,
          message: data?.error || "Indexation request failed",
          errorDetails: data?.errorDetails,
          hint: data?.hint,
        });
        toast.error(data?.error || "Failed to request indexation");
      }
    } catch (error: any) {
      console.error("Indexation test error:", error);
      setIndexTestResult({
        success: false,
        message: error.message || "Connection error",
      });
      toast.error("Failed to test indexation: " + (error.message || "Unknown error"));
    } finally {
      setIsTestingIndex(false);
    }
  };

  // Run advanced diagnostic
  const handleRunDiagnostic = async () => {
    if (!testIndexUrl.trim()) {
      toast.error("Entrez une URL pour lancer le diagnostic");
      return;
    }

    setIsRunningDiagnostic(true);
    setDiagnosticResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("gsc-indexing-diagnostics", {
        body: { testUrl: testIndexUrl.trim() },
      });

      if (error) throw error;

      setDiagnosticResult(data?.diagnostic || null);
      setShowDiagnostic(true);

      if (data?.success) {
        toast.success("Diagnostic terminé - tout fonctionne!");
      } else {
        toast.info("Diagnostic terminé - voir les recommandations");
      }
    } catch (error: any) {
      console.error("Diagnostic error:", error);
      toast.error("Erreur diagnostic: " + (error.message || "Unknown error"));
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`${label} copié!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getConnectedIntegration = (platformId: string) => {
    return integrations.find(i => i.platform === platformId && i.is_connected);
  };

  const handleCMSClick = (platformId: string) => {
    if (!isSubscribed) {
      setShowPaywall(true);
      return;
    }
    const existing = getConnectedIntegration(platformId);
    if (existing) {
      setEditingIntegration(existing);
    } else {
      setEditingIntegration(null);
    }
    setSelectedPlatform(platformId);
  };

  const handleDeleteIntegration = async () => {
    if (!deletingIntegration) return;

    try {
      await deleteIntegration.mutateAsync(deletingIntegration);
      toast.success("Integration disconnected");
      setDeletingIntegration(null);
      refetch();
    } catch (error) {
      toast.error("Failed to disconnect integration");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      
      <div className="space-y-6 max-w-4xl">
        {/* Hero Header */}
        <PageHeader
          icon={Link2}
          title="Integrations"
          description="Connect your platforms to auto-publish AEO content"
          gradientFrom="from-primary/10"
          gradientVia="via-purple-500/10"
          gradientTo="to-blue-500/10"
          iconFrom="from-primary"
          iconTo="to-purple-600"
        />

        {/* Connected Integrations */}
        {integrations.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Connected Integrations
            </h3>
            <div className="space-y-3">
              {integrations.map((integration) => {
                const cms = CMS_INTEGRATIONS.find(c => c.id === integration.platform);
                return (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-green-500/30 bg-green-500/5"
                  >
                    <div className="flex items-center gap-3">
                      {cms?.isImage ? (
                        <img src={cms.icon as string} alt={cms.name} className="h-8 w-8 object-contain dark:invert" />
                      ) : (
                        <span className="text-2xl">{cms?.icon || "🔗"}</span>
                      )}
                      <div>
                        <p className="font-medium">
                          {integration.config?.name || cms?.name || integration.platform}
                        </p>
                        <p className="text-sm text-muted-foreground truncate max-w-md">
                          {(() => {
                            // Try siteUrl first, then endpoint
                            const url = integration.config?.siteUrl || integration.config?.endpoint;
                            if (!url) return "Connected";
                            try {
                              const parsed = new URL(url);
                              // Hide raw supabase URLs, show clean domain instead
                              if (parsed.hostname.endsWith(".supabase.co")) {
                                return project?.domain || project?.website_url || "Connected";
                              }
                              return parsed.hostname;
                            } catch {
                              return url;
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`share-${integration.id}`}
                          checked={integration.config?.active_share !== "false"}
                          onCheckedChange={async (checked) => {
                            try {
                              const newConfig = { ...integration.config, active_share: checked ? "true" : "false" };
                              const { error } = await supabase
                                .from("integrations")
                                .update({ config: newConfig })
                                .eq("id", integration.id);
                              if (error) throw error;
                              toast.success(checked ? "Sharing enabled" : "Sharing disabled");
                              refetch();
                            } catch (err) {
                              toast.error("Failed to update setting");
                            }
                          }}
                        />
                        <Label htmlFor={`share-${integration.id}`} className="text-xs text-muted-foreground cursor-pointer">
                          Share
                        </Label>
                      </div>
                      <TestPublishButton
                        integrationId={integration.id}
                        platformName={cms?.name || integration.platform}
                        projectId={project?.id}
                      />
                      <Badge className="bg-green-500/20 text-green-600 border-0">
                        Connected
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCMSClick(integration.platform)}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingIntegration(integration.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Google Search Console */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center shadow-lg">
                <Search className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Google Search Console</h3>
                <p className="text-sm text-muted-foreground">
                  Track search performance, keywords, and request indexation
                </p>
              </div>
            </div>
            {gscConnected ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-600 border-0 px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Connected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Use hook's reset function
                    refetchGsc();
                    supabase.auth.getUser().then(({ data: { user } }) => {
                      if (user) {
                        supabase
                          .from("profiles")
                          .update({
                            google_oauth_token: null,
                            google_refresh_token: null,
                            google_token_expires_at: null,
                            google_console_email: null,
                          })
                          .eq("id", user.id)
                          .then(() => {
                            sessionStorage.removeItem("gsc_oauth_redirect_uri");
                            toast.success("Google connection reset");
                            refetchGsc();
                          });
                      }
                    });
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => {
                  if (!isSubscribed) {
                    setShowPaywall(true);
                    return;
                  }
                  connectGSC();
                }}
                disabled={connectingGsc || gscLoading}
                className="gap-2"
              >
                {connectingGsc ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Connect
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Indexation Test Section */}
          {gscConnected && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Test Indexation
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Submit a URL to Google for indexation. Use this to quickly index new published articles.
              </p>
              
              {/* GSC Property Selector */}
              <div className="mb-3">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Search Console Property</Label>
                {loadingGscSites ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading properties...
                  </div>
                ) : gscSites.length > 0 ? (
                  <Select value={selectedGscSite} onValueChange={setSelectedGscSite}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a property" />
                    </SelectTrigger>
                    <SelectContent>
                      {gscSites.map((site) => (
                        <SelectItem key={site} value={site}>
                          {site.replace("sc-domain:", "🌐 ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-amber-600">No properties found. Make sure you have access to Search Console.</p>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="https://yoursite.com/blog/article-slug"
                    value={testIndexUrl}
                    onChange={(e) => setTestIndexUrl(e.target.value)}
                    className="pl-10"
                    disabled={isTestingIndex}
                  />
                </div>
                <Button
                  onClick={handleTestIndexation}
                  disabled={isTestingIndex || !testIndexUrl.trim() || !selectedGscSite}
                  className="gap-2 min-w-[140px]"
                >
                  {isTestingIndex ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Request Index
                    </>
                  )}
                </Button>
              </div>

              {/* Test Result */}
              {indexTestResult && (
                <div
                  className={`mt-3 p-3 rounded-lg text-sm ${
                    indexTestResult.success
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {indexTestResult.success ? (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 space-y-2">
                      <span>{indexTestResult.message}</span>
                      
                      {/* Show hint to use diagnostic */}
                      {indexTestResult.hint && (
                        <p className="text-xs opacity-80 italic">{indexTestResult.hint}</p>
                      )}
                      
                      {/* Show error details if available */}
                      {indexTestResult.errorDetails && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1 text-xs underline opacity-70 hover:opacity-100">
                            <ChevronRight className="h-3 w-3" />
                            Détails techniques
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 p-2 bg-background/50 rounded text-xs font-mono space-y-1">
                            {indexTestResult.errorDetails.consumerProject && (
                              <div className="flex items-center justify-between">
                                <span>Projet: {indexTestResult.errorDetails.consumerProject}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleCopy(indexTestResult.errorDetails.consumerProject, "Projet ID")}
                                >
                                  {copiedText === "Projet ID" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </div>
                            )}
                            {indexTestResult.errorDetails.reason && (
                              <div>Raison: {indexTestResult.errorDetails.reason}</div>
                            )}
                            {indexTestResult.errorDetails.code && (
                              <div>Code: {indexTestResult.errorDetails.code}</div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  </div>
                </div>
              )}


              {/* Diagnostic Results Panel */}
              {showDiagnostic && diagnosticResult && (
                <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-primary" />
                      Rapport de diagnostic
                    </h5>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDiagnostic(false)}
                      className="h-6 px-2 text-xs"
                    >
                      Fermer
                    </Button>
                  </div>

                  {/* Token Info */}
                  <div className="space-y-2">
                    <h6 className="text-xs font-medium text-muted-foreground uppercase">Token OAuth</h6>
                    <div className="p-2 rounded bg-background border text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        {diagnosticResult.tokenInfo?.valid ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-destructive" />
                        )}
                        <span>{diagnosticResult.tokenInfo?.valid ? "Valide" : "Invalide"}</span>
                      </div>
                      {diagnosticResult.tokenInfo?.clientId && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Client ID: {diagnosticResult.tokenInfo.clientId.substring(0, 30)}...</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleCopy(diagnosticResult.tokenInfo.clientId, "Client ID")}
                          >
                            {copiedText === "Client ID" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      )}
                      {diagnosticResult.tokenInfo?.scopes && (
                        <div className="text-muted-foreground">
                          Scopes: {diagnosticResult.tokenInfo.scopes.length} 
                          {diagnosticResult.tokenInfo.scopes.some((s: string) => s.includes("indexing")) && (
                            <Badge variant="outline" className="ml-2 text-green-600 border-green-600/30">indexing ✓</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* API Test Result */}
                  <div className="space-y-2">
                    <h6 className="text-xs font-medium text-muted-foreground uppercase">Test API Indexing</h6>
                    <div className={`p-2 rounded border text-xs space-y-1 ${
                      diagnosticResult.indexingApiTest?.success 
                        ? "bg-green-500/10 border-green-500/30" 
                        : "bg-destructive/10 border-destructive/30"
                    }`}>
                      <div className="flex items-center gap-2">
                        {diagnosticResult.indexingApiTest?.success ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-destructive" />
                        )}
                        <span>
                          {diagnosticResult.indexingApiTest?.success 
                            ? `Succès (${diagnosticResult.indexingApiTest.notifyTime || "OK"})` 
                            : `Échec: ${diagnosticResult.indexingApiTest?.error || "Unknown"}`}
                        </span>
                      </div>
                      {diagnosticResult.indexingApiTest?.errorDetails && (
                        <div className="mt-2 p-2 bg-background/50 rounded font-mono text-xs">
                          {diagnosticResult.indexingApiTest.errorDetails.consumerProject && (
                            <div className="flex items-center justify-between">
                              <span>Consumer: {diagnosticResult.indexingApiTest.errorDetails.consumerProject}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => handleCopy(
                                  diagnosticResult.indexingApiTest.errorDetails.consumerProject.replace("projects/", ""), 
                                  "Project Number"
                                )}
                              >
                                {copiedText === "Project Number" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                          )}
                          {diagnosticResult.indexingApiTest.errorDetails.reason && (
                            <div>Reason: {diagnosticResult.indexingApiTest.errorDetails.reason}</div>
                          )}
                          {diagnosticResult.indexingApiTest.errorDetails.service && (
                            <div>Service: {diagnosticResult.indexingApiTest.errorDetails.service}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {diagnosticResult.recommendations && diagnosticResult.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h6 className="text-xs font-medium text-muted-foreground uppercase">Recommandations</h6>
                      <div className="space-y-2">
                        {diagnosticResult.recommendations.map((rec: string, idx: number) => (
                          <div key={idx} className="p-2 rounded bg-background border text-sm">
                            {rec.startsWith("➡️") && rec.includes("http") ? (
                              <a 
                                href={rec.replace("➡️ Activez l'API ici: ", "")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                {rec}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              rec
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Not Connected Message */}
          {!gscConnected && !gscLoading && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Connect Google Search Console to enable automatic indexation of your published articles.
              </div>
            </div>
          )}
        </Card>

        {/* Google My Business */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-red-500 flex items-center justify-center shadow-lg">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Google My Business</h3>
                <p className="text-sm text-muted-foreground">
                  Auto-publish Q&A to your business profile
                </p>
              </div>
            </div>
            {gmbConnected ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-600 border-0 px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Connected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await disconnectGMB();
                      toast.success("Google Business disconnected");
                    } catch {
                      toast.error("Could not disconnect Google Business");
                    }
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={connectGMB} disabled={gmbLoading} className="gap-2">
                {gmbLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Connect
              </Button>
            )}
          </div>

          {gmbConnected && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="font-medium text-sm mb-3">Select stores for auto-posting</h4>
              {gmbLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading locations...
                </div>
              ) : gmbLocations.length > 0 ? (
                <div className="space-y-2">
                  {gmbLocations.map((loc) => {
                    const isSelected = gmbSelectedIds.includes(loc.id);
                    return (
                      <button
                        key={loc.id}
                        onClick={() => toggleGmbLocation(loc.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "border-green-500/50 bg-green-500/5"
                            : "border-border hover:border-primary/30 hover:bg-muted/30"
                        }`}
                      >
                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "border-green-500 bg-green-500" : "border-muted-foreground/30"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{loc.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
                        </div>
                        {loc.rating > 0 && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            ⭐ {loc.rating} ({loc.reviewCount})
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <p className="text-xs text-muted-foreground mt-2">
                    {gmbSelectedIds.length} store{gmbSelectedIds.length !== 1 ? "s" : ""} selected — scheduled content will auto-post to these locations
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No locations found on your Google Business account.</p>
              )}
            </div>
          )}
        </Card>

        {/* CMS Integrations Grid */}
        <Card className="p-6">
          <h3 className="font-semibold mb-2">CMS & Website Builders</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your CMS platform to publish content automatically
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {CMS_INTEGRATIONS.map((integration) => {
              const isConnected = !!getConnectedIntegration(integration.id);
              return (
                <button
                  key={integration.id}
                  onClick={() => handleCMSClick(integration.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-center group relative hover:shadow-md ${
                    isConnected
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  {isConnected && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                  <div className="h-10 w-10 mx-auto mb-2 flex items-center justify-center">
                    {integration.isImage ? (
                      <img
                        src={integration.icon as string}
                        alt={integration.name}
                        className="h-10 w-10 object-contain dark:invert"
                      />
                    ) : (
                      <span className="text-3xl">{integration.icon}</span>
                    )}
                  </div>
                  <p className="font-medium text-sm">{integration.name}</p>
                  <p className={`text-xs mt-1 transition-opacity ${
                    isConnected ? "text-green-600 opacity-100" : "text-primary opacity-0 group-hover:opacity-100"
                  }`}>
                    {isConnected ? "Connected" : "Configure"}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Publishing Settings */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Publishing Settings
          </h3>
          <div className="space-y-4">
            {/* Auto-Publish Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <Label className="font-medium">Auto-Publish</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically publish scheduled content
                </p>
              </div>
              <Switch 
                checked={autoPublish} 
                onCheckedChange={handleAutoPublishChange}
                disabled={loadingSettings || savingSettings}
              />
            </div>

            {/* Frequency Selection */}
            {autoPublish && (
              <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                <Label className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Frequency
                </Label>
                <Select 
                  value={frequency} 
                  onValueChange={handleFrequencyChange}
                  disabled={savingSettings}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencies.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Time Selection */}
            {autoPublish && (
              <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                <Label className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Publish Time
                </Label>
                <div className="flex gap-2 items-center">
                  <Select 
                    value={publishHour} 
                    onValueChange={(h) => handleTimeChange(h, publishPeriod)}
                    disabled={savingSettings}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="HH" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0")).map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={publishPeriod} 
                    onValueChange={(p) => handleTimeChange(publishHour, p as "AM" | "PM")}
                    disabled={savingSettings}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({timezone.split("/")[1] || timezone})
                  </span>
                </div>
              </div>
            )}

            {/* Timezone Selection */}
            {autoPublish && (
              <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                <Label className="font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Timezone
                </Label>
                <Select 
                  value={timezone} 
                  onValueChange={handleTimezoneChange}
                  disabled={savingSettings}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Publish AEO Answers Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <Label className="font-medium">Publish AEO Answers</Label>
                <p className="text-xs text-muted-foreground">
                  Also publish public AEO answer pages to your CMS
                </p>
              </div>
              <Switch checked={publishAnswers} onCheckedChange={setPublishAnswers} />
            </div>
          </div>
        </Card>

        {/* Integration Config Modal */}
        {project && (
          <IntegrationConfigModal
            open={!!selectedPlatform}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedPlatform(null);
                setEditingIntegration(null);
              }
            }}
            platform={selectedPlatform}
            projectId={project.id}
            existingConfig={editingIntegration?.config}
            integrationId={editingIntegration?.id}
            onSuccess={refetch}
          />
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingIntegration} onOpenChange={() => setDeletingIntegration(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Integration?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the integration and stop automatic publishing to this platform.
                You can reconnect at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteIntegration}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Subscription Paywall Dialog */}
        <AlertDialog open={showPaywall} onOpenChange={setShowPaywall}>
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <div className="flex justify-center mb-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
              </div>
              <AlertDialogTitle className="text-center">Upgrade to Connect</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Integrations are available on paid plans. Subscribe to connect your CMS and auto-publish content.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <Button onClick={() => { setShowPaywall(false); router.push("/subscription"); }} className="w-full gap-2">
                <Lock className="h-4 w-4" />
                Upgrade Now
              </Button>
              <AlertDialogCancel className="w-full mt-0">Maybe Later</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
    </DashboardLayout>
  );
}
