import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ExternalLink, Check } from "lucide-react";

const CMS_INTEGRATIONS = [
  { id: "wordpress", name: "WordPress", icon: "🔵" },
  { id: "duda", name: "Duda", icon: "🟠" },
  { id: "api", name: "API", icon: "⚙️" },
  { id: "webhook", name: "Webhook", icon: "🔗" },
  { id: "webflow", name: "Webflow", icon: "🔷" },
  { id: "shopify", name: "Shopify", icon: "🟢" },
  { id: "wix", name: "Wix", icon: "🟡" },
  { id: "bigcommerce", name: "BigCommerce", icon: "📦" },
  { id: "snapps", name: "Snapps", icon: "📱" },
  { id: "framer", name: "Framer", icon: "⬛" },
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
  const [autoPublish, setAutoPublish] = useState(true);
  const [connectedCms, setConnectedCms] = useState<string[]>([]);
  const [connectedAnalytics, setConnectedAnalytics] = useState<string[]>([]);

  const handleConnectCms = (id: string) => {
    if (connectedCms.includes(id)) {
      setConnectedCms(connectedCms.filter(c => c !== id));
    } else {
      setConnectedCms([...connectedCms, id]);
    }
  };

  const handleConnectAnalytics = (id: string) => {
    if (connectedAnalytics.includes(id)) {
      setConnectedAnalytics(connectedAnalytics.filter(c => c !== id));
    } else {
      setConnectedAnalytics([...connectedAnalytics, id]);
    }
  };

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

        {/* CMS Integrations */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">CMS Integrations</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your content management system to publish articles directly
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {CMS_INTEGRATIONS.map((integration) => {
              const isConnected = connectedCms.includes(integration.id);
              
              return (
                <button
                  key={integration.id}
                  onClick={() => handleConnectCms(integration.id)}
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
                  <div className="text-2xl mb-2">{integration.icon}</div>
                  <p className="font-medium text-sm">{integration.name}</p>
                  <p className="text-xs text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isConnected ? 'Disconnect' : 'Configure'}
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
    </DashboardLayout>
  );
}
