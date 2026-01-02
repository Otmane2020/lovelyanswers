import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Trash2, Settings2, CheckCircle2 } from "lucide-react";
import { IntegrationConfigModal } from "@/components/integrations/IntegrationConfigModal";
import { useIntegrations, useDeleteIntegration } from "@/hooks/useIntegrations";
import { useActiveProject } from "@/hooks/useProjects";
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

const CMS_INTEGRATIONS = [
  { id: "wordpress", name: "WordPress", icon: "🔵" },
  { id: "duda", name: "Duda", icon: "🟠" },
  { id: "api", name: "API", icon: "⚙️" },
  { id: "webhook", name: "Webhook", icon: "🔗" },
  { id: "webflow", name: "Webflow", icon: "🔷" },
  { id: "shopify", name: "Shopify", icon: "🟢" },
  { id: "wix", name: "Wix", icon: "🟡" },
  { id: "bigcommerce", name: "BigCommerce", icon: "📦" },
  { id: "snapps", name: "snapps", icon: "📱" },
  { id: "framer", name: "Framer", icon: "⬛" },
];

const ANALYTICS_INTEGRATIONS = [
  { id: "gsc", name: "Google Search Console", icon: "🔍", description: "Track search performance" },
  { id: "ga4", name: "Google Analytics 4", icon: "📊", description: "Website analytics" },
  { id: "merchant", name: "Google Merchant", icon: "🛒", description: "Product listings" },
];

export function IntegrationsSettings() {
  const { project } = useActiveProject();
  const { data: integrations = [], refetch } = useIntegrations();
  const deleteIntegration = useDeleteIntegration();
  
  const [autoPublish, setAutoPublish] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<typeof integrations[0] | null>(null);
  const [deletingIntegration, setDeletingIntegration] = useState<string | null>(null);

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
                  className="flex items-center justify-between p-4 rounded-lg border border-green-500/30 bg-green-500/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cms?.icon || "🔗"}</span>
                    <div>
                      <p className="font-medium">
                        {integration.config?.name || cms?.name || integration.platform}
                      </p>
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {integration.config?.endpoint || "Connected"}
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

      {/* CMS Integrations Grid */}
      <Card className="p-6">
        <h3 className="font-semibold mb-2">CMS Integrations</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Integrate with your favorite CMS platform and publish automatically
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {CMS_INTEGRATIONS.map((integration) => {
            const isConnected = !!getConnectedIntegration(integration.id);
            return (
              <button
                key={integration.id}
                onClick={() => handleCMSClick(integration.id)}
                className={`p-4 rounded-xl border transition-all text-center group relative ${
                  isConnected
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {isConnected && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                )}
                <div className="text-2xl mb-2">{integration.icon}</div>
                <p className="font-medium text-sm">{integration.name}</p>
                <p className={`text-xs mt-1 transition-opacity ${
                  isConnected ? "text-green-600 opacity-100" : "text-primary opacity-0 group-hover:opacity-100"
                }`}>
                  {isConnected ? "Connected" : "Configure now"}
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
          <div className="flex items-center justify-between">
            <div>
              <Label>Automatically Publish</Label>
              <p className="text-xs text-muted-foreground">
                Automatically publish articles when ready
              </p>
            </div>
            <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Publish AEO Answers</Label>
              <p className="text-xs text-muted-foreground">
                Also publish public AEO answers to connected CMS
              </p>
            </div>
            <Switch />
          </div>
        </div>
      </Card>

      {/* Analytics & Search */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Analytics & Search</h3>
        <div className="space-y-4">
          {ANALYTICS_INTEGRATIONS.map((integration) => (
            <div 
              key={integration.id} 
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <span className="text-xl">{integration.icon}</span>
                </div>
                <div>
                  <p className="font-medium">{integration.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                </div>
              </div>
              <Button variant="outline" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Connect
              </Button>
            </div>
          ))}
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
