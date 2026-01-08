import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ExternalLink, Check, Settings, Trash2, Loader2 } from "lucide-react";
import { useIntegrations, useDeleteIntegration } from "@/hooks/useIntegrations";
import { useActiveProject } from "@/hooks/useProjects";
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
import shopifyLogo from "@/assets/shopify-logo.png";
import wixLogo from "@/assets/wix-logo.png";
import wordpressLogo from "@/assets/wordpress-logo.png";

const CMS_INTEGRATIONS = [
  { id: "wordpress", name: "WordPress", icon: wordpressLogo, isImage: true },
  { id: "duda", name: "Duda", icon: "🟠", isImage: false },
  { id: "api", name: "Custom API", icon: "⚙️", isImage: false },
  { id: "webhook", name: "Webhook", icon: "🔗", isImage: false },
  { id: "webflow", name: "Webflow", icon: "🔷", isImage: false },
  { id: "shopify", name: "Shopify", icon: shopifyLogo, isImage: true },
  { id: "wix", name: "Wix", icon: wixLogo, isImage: true },
  { id: "bigcommerce", name: "BigCommerce", icon: "📦", isImage: false },
  { id: "snapps", name: "Snapps", icon: "📱", isImage: false },
  { id: "framer", name: "Framer", icon: "⬛", isImage: false },
];

const ANALYTICS_INTEGRATIONS = [
  { 
    id: "gsc", 
    name: "Google Search Console", 
    icon: "🔍", 
    description: "Track search performance & impressions",
    color: "bg-blue-500/10"
  },
  { 
    id: "ga4", 
    name: "Google Analytics 4", 
    icon: "📊", 
    description: "Website traffic & user behavior",
    color: "bg-orange-500/10"
  },
  { 
    id: "merchant", 
    name: "Google Merchant Center", 
    icon: "🛒", 
    description: "Product listings & shopping data",
    color: "bg-green-500/10"
  },
];

export default function AeoIntegrations() {
  const { project } = useActiveProject();
  const { data: integrations, isLoading, refetch } = useIntegrations();
  const deleteIntegration = useDeleteIntegration();
  
  const [autoPublish, setAutoPublish] = useState(true);
  const [connectedAnalytics, setConnectedAnalytics] = useState<string[]>([]);
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

  const handleConnectAnalytics = (id: string) => {
    if (connectedAnalytics.includes(id)) {
      setConnectedAnalytics(connectedAnalytics.filter(c => c !== id));
    } else {
      setConnectedAnalytics([...connectedAnalytics, id]);
    }
  };

  const getIntegrationByPlatform = (platformId: string) => {
    return integrations?.find(i => i.platform === platformId);
  };

  const getCmsName = (platformId: string) => {
    return CMS_INTEGRATIONS.find(c => c.id === platformId)?.name || platformId;
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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect your CMS and analytics platforms
          </p>
        </div>

        {/* Connected Integrations */}
        {integrations && integrations.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Connected Integrations</h3>
            <div className="space-y-3">
              {integrations.map((integration) => {
                const cmsConfig = CMS_INTEGRATIONS.find(c => c.id === integration.platform);
                const configName = integration.config?.name || getCmsName(integration.platform);
                
                return (
                  <div 
                    key={integration.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-primary/30 bg-primary/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                        {cmsConfig?.isImage ? (
                          <img 
                            src={cmsConfig.icon as string} 
                            alt={cmsConfig.name} 
                            className="h-6 w-6 object-contain dark:invert" 
                          />
                        ) : (
                          <span className="text-xl">{cmsConfig?.icon || "🔗"}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{configName}</p>
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
                        variant="outline"
                        size="sm"
                        onClick={() => handleCmsClick(integration.platform)}
                        className="gap-1.5"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(integration.id, getCmsName(integration.platform))}
                        className="gap-1.5 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* CMS Integrations */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">CMS Integrations</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your content management system to publish articles directly
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {CMS_INTEGRATIONS.map((integration) => {
              const isConnected = connectedCmsIds.includes(integration.id);
              
              return (
                <button
                  key={integration.id}
                  onClick={() => handleCmsClick(integration.id)}
                  className={`
                    p-4 rounded-xl border transition-all text-center group relative
                    ${isConnected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  {isConnected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className="mb-2 flex justify-center">
                    {integration.isImage ? (
                      <img 
                        src={integration.icon as string} 
                        alt={integration.name} 
                        className="h-8 w-8 object-contain dark:invert" 
                      />
                    ) : (
                      <span className="text-2xl">{integration.icon}</span>
                    )}
                  </div>
                  <p className="font-medium text-sm">{integration.name}</p>
                  <p className="text-xs text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isConnected ? 'Edit' : 'Configure'}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Publishing Settings */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Publishing Settings</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label>Automatically Publish</Label>
              <p className="text-sm text-muted-foreground">
                Automatically publish articles when they're ready
              </p>
            </div>
            <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
          </div>
        </Card>

        {/* Analytics Integrations */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Analytics & Search</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect Google services to track performance and optimize for search
          </p>
          <div className="space-y-4">
            {ANALYTICS_INTEGRATIONS.map((integration) => {
              const isConnected = connectedAnalytics.includes(integration.id);
              
              return (
                <div 
                  key={integration.id} 
                  className={`
                    flex items-center justify-between p-4 rounded-xl border transition-colors
                    ${isConnected 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-border hover:border-primary/30'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${integration.color} flex items-center justify-center`}>
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
                  <Button 
                    variant={isConnected ? "outline" : "default"}
                    className="gap-2"
                    onClick={() => handleConnectAnalytics(integration.id)}
                  >
                    <ExternalLink className="w-4 h-4" />
                    {isConnected ? "Manage" : "Connect"}
                  </Button>
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
    </DashboardLayout>
  );
}
