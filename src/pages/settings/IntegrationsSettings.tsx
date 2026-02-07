import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Trash2, Settings2, CheckCircle2, Loader2, Search } from "lucide-react";
import { IntegrationConfigModal } from "@/components/integrations/IntegrationConfigModal";
import { useIntegrations, useDeleteIntegration } from "@/hooks/useIntegrations";
import { useActiveProject } from "@/hooks/useProjects";
import { useGoogleSearchConsole } from "@/hooks/useGoogleSearchConsole";
import { supabase } from "@/integrations/supabase/client";
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
import shopifyLogo from "@/assets/shopify-logo-new.png";
import wixLogo from "@/assets/wix-logo.png";
import wordpressLogo from "@/assets/wordpress-logo-new.png";
import bigcommerceLogo from "@/assets/bigcommerce-logo.png";
import framerLogo from "@/assets/framer-logo.png";
import boltLogo from "@/assets/bolt-logo.png";
import lovableLogo from "@/assets/lovable-logo.svg";

const CMS_INTEGRATIONS = [
  { id: "wordpress", name: "WordPress", icon: wordpressLogo, isImage: true },
  { id: "shopify", name: "Shopify", icon: shopifyLogo, isImage: true },
  { id: "wix", name: "Wix", icon: wixLogo, isImage: true },
  { id: "framer", name: "Framer", icon: framerLogo, isImage: true },
  { id: "bigcommerce", name: "BigCommerce", icon: bigcommerceLogo, isImage: true },
  { id: "webflow", name: "Webflow", icon: "🔷", isImage: false },
  { id: "bolt", name: "Bolt", icon: boltLogo, isImage: true },
  { id: "lovable", name: "Lovable", icon: lovableLogo, isImage: true },
  { id: "api", name: "API", icon: "⚙️", isImage: false },
  { id: "webhook", name: "Webhook", icon: "🔗", isImage: false },
];

export function IntegrationsSettings() {
  const { project } = useActiveProject();
  const { data: integrations = [], refetch } = useIntegrations();
  const deleteIntegration = useDeleteIntegration();
  const { isConnected: gscConnected, isLoading: gscLoading, refetch: refetchGsc } = useGoogleSearchConsole();
  
  const [autoPublish, setAutoPublish] = useState(true);
  const [publishAnswers, setPublishAnswers] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<typeof integrations[0] | null>(null);
  const [deletingIntegration, setDeletingIntegration] = useState<string | null>(null);
  const [connectingGsc, setConnectingGsc] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    
    if (code) {
      handleGscOAuthCallback(code);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGscOAuthCallback = async (code: string) => {
    setConnectingGsc(true);
    try {
      // Use stored redirectUri or fallback
      const redirectUri = sessionStorage.getItem("gsc_oauth_redirect_uri") || 
        `${window.location.origin}/settings`;
      
      const { data, error } = await supabase.functions.invoke("google-oauth-token", {
        body: { code, redirectUri },
      });

      if (error) throw error;
      if (!data?.success) {
        const msg = [data?.error, data?.details].filter(Boolean).join("\n");
        throw new Error(msg || "Failed to connect");
      }

      toast.success("Google Search Console connected!");
      sessionStorage.removeItem("gsc_oauth_redirect_uri");
      refetchGsc();
    } catch (error: any) {
      console.error("GSC OAuth error:", error);
      toast.error(error.message || "Error connecting to Google Search Console");
    } finally {
      setConnectingGsc(false);
    }
  };

  const connectGSC = async () => {
    setConnectingGsc(true);
    try {
      const redirectUri = `${window.location.origin}/settings`;
      
      // Persist redirectUri for OAuth callback
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

  const getConnectedIntegration = (platformId: string) => {
    return integrations.find(i => i.platform === platformId && i.is_connected);
  };

  const handleCMSClick = (platformId: string) => {
    const existing = getConnectedIntegration(platformId);
    if (existing) {
      setEditingIntegration(existing);
    }
    setSelectedPlatform(platformId);
  };

  const handleDeleteIntegration = async () => {
    if (!deletingIntegration) return;
    
    try {
      await deleteIntegration.mutateAsync(deletingIntegration);
      toast.success("Integration disconnected");
      setDeletingIntegration(null);
    } catch (error) {
      toast.error("Failed to disconnect integration");
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-purple-500/10 to-blue-500/10 border-primary/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur rounded-xl p-3 shadow-sm border border-border/50">
            <img src={shopifyLogo} alt="Shopify" className="h-8 w-auto object-contain" />
            <img src={wordpressLogo} alt="WordPress" className="h-8 w-auto object-contain dark:invert" />
            <img src={wixLogo} alt="Wix" className="h-6 w-auto object-contain dark:invert" />
            <img src={boltLogo} alt="Bolt" className="h-6 w-auto object-contain" />
            <img src={lovableLogo} alt="Lovable" className="h-6 w-auto object-contain" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Integrations</h2>
            <p className="text-muted-foreground text-sm">
              Connect your platforms to auto-publish AEO content
            </p>
          </div>
        </div>
      </Card>

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
                      <img src={cms.icon} alt={cms.name} className="h-8 w-8 object-contain dark:invert" />
                    ) : (
                      <span className="text-2xl">{cms?.icon || "🔗"}</span>
                    )}
                    <div>
                      <p className="font-medium">
                        {integration.config?.name || cms?.name || integration.platform}
                      </p>
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {(() => {
                          const endpoint = integration.config?.endpoint;
                          if (!endpoint) return "Connected";
                          try {
                            const url = new URL(endpoint);
                            // Hide raw supabase URLs, show clean domain instead
                            if (url.hostname.endsWith(".supabase.co")) {
                              return project?.domain || project?.website_url || "Connected";
                            }
                            return url.hostname;
                          } catch {
                            return endpoint;
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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

      {/* Google Search Console - Standalone Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center shadow-lg">
              <Search className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Google Search Console</h3>
              <p className="text-sm text-muted-foreground">
                Track search performance, keywords, and rankings
              </p>
            </div>
          </div>
          {gscConnected ? (
            <Badge className="bg-green-500/20 text-green-600 border-0 px-4 py-2">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Connected
            </Badge>
          ) : (
            <Button 
              onClick={connectGSC} 
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
                      src={integration.icon} 
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
        <h3 className="font-semibold mb-4">Publishing Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <Label className="font-medium">Auto-Publish Articles</Label>
              <p className="text-xs text-muted-foreground">
                Automatically publish articles when generation is complete
              </p>
            </div>
            <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
          </div>
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
    </div>
  );
}
