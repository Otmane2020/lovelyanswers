import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Check, ExternalLink } from "lucide-react";

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

interface Integration {
  id: string;
  name: string;
  icon: string;
  connected?: boolean;
}

export function IntegrationsSettings() {
  const [autoPublish, setAutoPublish] = useState(true);
  const [gscConnected, setGscConnected] = useState(false);
  const [integrations] = useState<Integration[]>(
    CMS_INTEGRATIONS.map(cms => ({ ...cms, connected: false }))
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">CMS Integrations</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {integrations.map((integration) => (
            <button
              key={integration.id}
              className="p-4 rounded-xl border border-border hover:border-primary/50 transition-all text-center group"
            >
              <div className="text-2xl mb-2">{integration.icon}</div>
              <p className="font-medium text-sm">{integration.name}</p>
              <p className="text-xs text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Configure now
              </p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Publishing Settings</h3>
        <div className="flex items-center justify-between">
          <div>
            <Label>Automatically Publish</Label>
            <p className="text-xs text-muted-foreground">
              Automatically publish articles when ready
            </p>
          </div>
          <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Google Search Console</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <span className="text-xl">🔍</span>
            </div>
            <div>
              <p className="font-medium">Google Search Console</p>
              <p className="text-sm text-muted-foreground">
                {gscConnected ? "Connected" : "Not connected"}
              </p>
            </div>
          </div>
          {gscConnected ? (
            <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
              <Check className="w-3 h-3" />
              Connected
            </Badge>
          ) : (
            <Button variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Connect
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
