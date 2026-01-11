import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Check, Settings, Trash2, Loader2, Plug, Zap, Plus, Send } from "lucide-react";
import { useIntegrations, useDeleteIntegration } from "@/hooks/useIntegrations";
import { useActiveProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleSearchConsole } from "@/hooks/useGoogleSearchConsole";
import { IntegrationConfigModal } from "@/components/integrations/IntegrationConfigModal";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Logos
import shopifyLogo from "@/assets/shopify-logo-new.png";
import wordpressLogo from "@/assets/wordpress-logo-new.png";
import bigcommerceLogo from "@/assets/bigcommerce-logo.png";
import framerLogo from "@/assets/framer-logo.png";
import wixLogo from "@/assets/wix-logo.png";
import boltLogo from "@/assets/bolt-logo.png";
import lovableLogo from "@/assets/lovable-logo.svg";

const CMS_INTEGRATIONS = [
  { id: "wordpress", name: "WordPress", icon: wordpressLogo, isImage: true, color: "from-slate-500 to-slate-700" },
  { id: "shopify", name: "Shopify", icon: shopifyLogo, isImage: true, color: "from-green-500 to-green-600" },
  { id: "wix", name: "Wix", icon: wixLogo, isImage: true, color: "from-yellow-500 to-yellow-600" },
  { id: "bolt", name: "Bolt.new", icon: boltLogo, isImage: true, color: "from-yellow-400 to-amber-500" },
  { id: "lovable", name: "Lovable.dev", icon: lovableLogo, isImage: true, color: "from-rose-500 to-pink-600" },
  { id: "webflow", name: "Webflow", icon: "🔷", isImage: false, color: "from-blue-500 to-indigo-600" },
  { id: "framer", name: "Framer", icon: framerLogo, isImage: true, color: "from-sky-400 to-blue-500" },
  { id: "bigcommerce", name: "BigCommerce", icon: bigcommerceLogo, isImage: true, color: "from-gray-700 to-black" },
  { id: "duda", name: "Duda", icon: "🟠", isImage: false, color: "from-orange-500 to-orange-600" },
  { id: "api", name: "Custom API", icon: "⚙️", isImage: false, color: "from-gray-500 to-gray-600" },
  { id: "webhook", name: "Webhook", icon: "🔗", isImage: false, color: "from-purple-500 to-purple-600" },
  { id: "snapps", name: "Snapps", icon: "📱", isImage: false, color: "from-pink-500 to-pink-600" },
];

const ANALYTICS_INTEGRATIONS = [
  { 
    id: "gsc", 
    name: "Google Search Console", 
    icon: "🔍", 
    description: "Track search performance & impressions",
    color: "from-blue-500/20 to-blue-600/20",
    comingSoon: false
  },
  { 
    id: "ga4", 
    name: "Google Analytics 4", 
    icon: "📊", 
    description: "Website traffic & user behavior",
    color: "from-orange-500/20 to-orange-600/20",
    comingSoon: true
  },
];

export default function AeoIntegrations() {
  const { project } = useActiveProject();
  const { data: integrations, isLoading, refetch } = useIntegrations();
  const deleteIntegration = useDeleteIntegration();
  const { isConnected: isGscConnected, isLoading: gscLoading, refetch: refetchGsc } = useGoogleSearchConsole();
  
  const [autoPublish, setAutoPublish] = useState(true);
  const [connectingGsc, setConnectingGsc] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<{
    id: string;
    config: Record<string, string>;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ platform: "", description: "" });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const handleRequestIntegration = async () => {
    if (!requestForm.platform.trim()) {
      toast.error("Please enter a platform name");
      return;
    }
    
    setIsSubmittingRequest(true);
    // Simulate API call - in production this would send to your backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success(`Request for ${requestForm.platform} integration submitted!`);
    setRequestModalOpen(false);
    setRequestForm({ platform: "", description: "" });
    setIsSubmittingRequest(false);
  };

  // Handle OAuth callback for Google Search Console
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      
      if (code && state) {
        setConnectingGsc(true);
        try {
          const { data, error } = await supabase.functions.invoke("google-oauth-token", {
            body: { code, state },
          });

          if (error) throw error;
          if (!data?.success) {
            const msg = [data?.error, data?.details].filter(Boolean).join("\n");
            throw new Error(msg || "Failed to connect");
          }

          toast.success("Google Search Console connecté avec succès!");
          refetchGsc();

          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error: any) {
          console.error("OAuth callback error:", error);
          toast.error("Erreur de connexion: " + (error.message || "Unknown error"));
        } finally {
          setConnectingGsc(false);
        }
      }
    };
    
    handleOAuthCallback();
  }, [refetchGsc]);

  const connectedCmsIds = integrations?.map(i => i.platform) || [];

  const handleCmsClick = (platformId: string) => {
    const existingIntegration = integrations?.find(i => i.platform === platformId);
    
    if (existingIntegration) {
      setEditingIntegration({
        id: existingIntegration.id,
        config: existingIntegration.config,
      });
    } else {
      setEditingIntegration(null);
    }
    
    setSelectedPlatform(platformId);
    setConfigModalOpen(true);
  };

  const handleDeleteClick = (integrationId: string, platformName: string) => {
    setIntegrationToDelete({ id: integrationId, name: platformName });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!integrationToDelete) return;
    
    try {
      await deleteIntegration.mutateAsync(integrationToDelete.id);
      toast.success(`${integrationToDelete.name} disconnected`);
      refetch();
    } catch (error) {
      toast.error("Failed to disconnect integration");
    }
    
    setDeleteDialogOpen(false);
    setIntegrationToDelete(null);
  };

  const handleConnectAnalytics = async (id: string) => {
    if (id === "gsc") {
      if (isGscConnected) {
        // Already connected - could open management panel
        toast.info("Google Search Console est déjà connecté");
        return;
      }
      
      setConnectingGsc(true);
      try {
        const redirectUri = `${window.location.origin}/integrations`;
        
        const { data, error } = await supabase.functions.invoke("google-oauth-url", {
          body: { redirectUri },
        });
        
        if (error) throw error;
        if (!data?.url) throw new Error("Failed to get OAuth URL");
        
        // Redirect to Google OAuth
        window.location.href = data.url;
      } catch (error: any) {
        console.error("OAuth error:", error);
        toast.error("Erreur: " + (error.message || "Impossible d'initier la connexion"));
        setConnectingGsc(false);
      }
    }
  };

  const getCmsName = (platformId: string) => {
    return CMS_INTEGRATIONS.find(c => c.id === platformId)?.name || platformId;
  };

  const getCmsConfig = (platformId: string) => {
    return CMS_INTEGRATIONS.find(c => c.id === platformId);
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
      <div className="space-y-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Plug className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
            <p className="text-muted-foreground">
              Connect your CMS and analytics platforms
            </p>
          </div>
        </div>

        {/* Connected Integrations */}
        {integrations && integrations.length > 0 && (
          <Card className="overflow-hidden border-primary/20">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-primary/10">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Active Connections
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {integrations.map((integration) => {
                const cmsConfig = getCmsConfig(integration.platform);
                const configName = integration.config?.name || getCmsName(integration.platform);
                
                return (
                  <div 
                    key={integration.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-background to-muted/30 border border-border/50 hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cmsConfig?.color || 'from-gray-500 to-gray-600'} flex items-center justify-center shadow-lg`}>
                        {cmsConfig?.isImage ? (
                          <img 
                            src={cmsConfig.icon as string} 
                            alt={cmsConfig.name} 
                            className="h-7 w-7 object-contain brightness-0 invert" 
                          />
                        ) : (
                          <span className="text-xl">{cmsConfig?.icon || "🔗"}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{configName}</p>
                        <p className="text-sm text-muted-foreground">
                          {integration.config?.endpoint || integration.platform}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TestPublishButton 
                        integrationId={integration.id}
                        platformName={getCmsName(integration.platform)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCmsClick(integration.platform)}
                        className="h-9 w-9"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(integration.id, getCmsName(integration.platform))}
                        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
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

        {/* CMS Integrations */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold">CMS Integrations</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your content management system to publish articles directly
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {CMS_INTEGRATIONS.map((integration) => {
                const isConnected = connectedCmsIds.includes(integration.id);
                
                return (
                  <button
                    key={integration.id}
                    onClick={() => handleCmsClick(integration.id)}
                    className={`
                      group relative p-5 rounded-2xl border-2 transition-all duration-200 text-center
                      ${isConnected 
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' 
                        : 'border-border hover:border-primary/50 hover:shadow-md'
                      }
                    `}
                  >
                    {isConnected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                    <div className={`mx-auto mb-3 w-14 h-14 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                      {integration.isImage ? (
                        <img 
                          src={integration.icon as string} 
                          alt={integration.name} 
                          className="h-8 w-8 object-contain brightness-0 invert" 
                        />
                      ) : (
                        <span className="text-2xl">{integration.icon}</span>
                      )}
                    </div>
                    <p className="font-medium text-sm">{integration.name}</p>
                    <p className="text-xs text-primary mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isConnected ? 'Edit →' : 'Connect →'}
                    </p>
                  </button>
                );
              })}
              
              {/* More Integrations Card */}
              <button
                onClick={() => setRequestModalOpen(true)}
                className="group p-5 rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-all duration-200 text-center hover:shadow-md"
              >
                <div className="mx-auto mb-3 w-14 h-14 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                  <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="font-medium text-sm text-muted-foreground group-hover:text-foreground transition-colors">More</p>
                <p className="text-xs text-primary mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  Request →
                </p>
              </button>
            </div>
          </div>
        </Card>

        {/* Publishing Settings */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Publishing Settings</h3>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
            <div>
              <Label className="text-base">Automatically Publish</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Automatically publish articles when they're ready
              </p>
            </div>
            <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
          </div>
        </Card>

        {/* Analytics Integrations */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold">Analytics & Search</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connect Google services to track performance and optimize for search
            </p>
          </div>
          <div className="p-4 space-y-3">
            {ANALYTICS_INTEGRATIONS.map((integration) => {
              const isConnected = integration.id === "gsc" ? isGscConnected : false;
              const isLoading = integration.id === "gsc" ? (gscLoading || connectingGsc) : false;
              
              return (
                <div 
                  key={integration.id} 
                  className={`
                    flex items-center justify-between p-4 rounded-xl border transition-all
                    ${isConnected 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-border hover:border-primary/30'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center`}>
                      <span className="text-2xl">{integration.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{integration.name}</p>
                        {isConnected && (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                            Connected
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                  {integration.comingSoon ? (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      Coming Soon
                    </Badge>
                  ) : (
                    <Button 
                      variant={isConnected ? "outline" : "default"}
                      className="gap-2"
                      onClick={() => handleConnectAnalytics(integration.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      {isConnected ? "Manage" : "Connect"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Config Modal */}
      {project && (
        <IntegrationConfigModal
          open={configModalOpen}
          onOpenChange={setConfigModalOpen}
          platform={selectedPlatform}
          projectId={project.id}
          existingConfig={editingIntegration?.config}
          integrationId={editingIntegration?.id}
          onSuccess={() => {
            refetch();
            setEditingIntegration(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {integrationToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the integration and stop automatic publishing to this platform. 
              You can reconnect it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Request Integration Modal */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Request New Integration
            </DialogTitle>
            <DialogDescription>
              Tell us which platform you'd like us to integrate next
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform Name *</Label>
              <Input
                id="platform"
                placeholder="e.g., Squarespace, Ghost, etc."
                value={requestForm.platform}
                onChange={(e) => setRequestForm(prev => ({ ...prev, platform: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Additional Details (optional)</Label>
              <Textarea
                id="description"
                placeholder="Tell us more about your use case or any specific features you need..."
                value={requestForm.description}
                onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRequestIntegration}
              disabled={isSubmittingRequest}
              className="gap-2"
            >
              {isSubmittingRequest ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
