import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, Youtube, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import shopifyLogo from "@/assets/shopify-logo.png";
import wixLogo from "@/assets/wix-logo.png";
import wordpressLogo from "@/assets/wordpress-logo.png";

// CMS Platform configurations
const CMS_CONFIG: Record<string, {
  name: string;
  icon: string;
  isImage?: boolean;
  description: string;
  tutorialUrl?: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
}> = {
  wordpress: {
    name: "WordPress",
    icon: wordpressLogo,
    isImage: true,
    description: "Enter your webhook endpoint and access token to enable automatic content publishing to your WordPress site via the plugin.",
    tutorialUrl: "https://example.com/wordpress-tutorial",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "Enter a name for this integration" },
      { key: "endpoint", label: "Webhook Endpoint", placeholder: "https://your-domain.com/api/webhook" },
      { key: "token", label: "Access Token (Bearer token)", placeholder: "Enter your access token", type: "password" },
    ],
  },
  shopify: {
    name: "Shopify",
    icon: shopifyLogo,
    isImage: true,
    description: "Connect your Shopify store to publish blog articles directly.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Shopify Store" },
      { key: "endpoint", label: "Store URL", placeholder: "https://your-store.myshopify.com" },
      { key: "token", label: "Admin API Access Token", placeholder: "shpat_xxxxx", type: "password" },
    ],
  },
  wix: {
    name: "Wix",
    icon: wixLogo,
    isImage: true,
    description: "Connect your Wix site to publish blog posts automatically.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Wix Site" },
      { key: "endpoint", label: "API Endpoint", placeholder: "https://www.wixapis.com/blog/v3" },
      { key: "token", label: "API Key", placeholder: "Enter your Wix API key", type: "password" },
      { key: "siteId", label: "Site ID", placeholder: "Enter your Wix Site ID" },
    ],
  },
  webflow: {
    name: "Webflow",
    icon: "🔷",
    description: "Publish CMS items directly to your Webflow collections.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Webflow Site" },
      { key: "endpoint", label: "Collection ID", placeholder: "Enter your collection ID" },
      { key: "token", label: "API Token", placeholder: "Enter your Webflow API token", type: "password" },
      { key: "siteId", label: "Site ID", placeholder: "Enter your Webflow Site ID" },
    ],
  },
  duda: {
    name: "Duda",
    icon: "🟠",
    description: "Connect your Duda website for automatic blog publishing.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Duda Site" },
      { key: "endpoint", label: "Site Name", placeholder: "Enter your Duda site name" },
      { key: "token", label: "API Key", placeholder: "Enter your Duda API key", type: "password" },
    ],
  },
  api: {
    name: "Custom API",
    icon: "⚙️",
    description: "Connect to any REST API endpoint for custom publishing.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Custom API" },
      { key: "endpoint", label: "API Endpoint", placeholder: "https://api.example.com/posts" },
      { key: "token", label: "Authorization Header", placeholder: "Bearer your-token", type: "password" },
      { key: "method", label: "HTTP Method", placeholder: "POST" },
    ],
  },
  webhook: {
    name: "Webhook",
    icon: "🔗",
    description: "Send content to any webhook endpoint (Zapier, Make, n8n, etc.).",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Zapier Webhook" },
      { key: "endpoint", label: "Webhook URL", placeholder: "https://hooks.zapier.com/..." },
    ],
  },
  bigcommerce: {
    name: "BigCommerce",
    icon: "📦",
    description: "Publish blog content to your BigCommerce store.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My BigCommerce Store" },
      { key: "endpoint", label: "Store Hash", placeholder: "Enter your store hash" },
      { key: "token", label: "API Token", placeholder: "Enter your API token", type: "password" },
    ],
  },
  snapps: {
    name: "Snapps",
    icon: "📱",
    description: "Connect your Snapps site for content publishing.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Snapps Site" },
      { key: "endpoint", label: "Site URL", placeholder: "https://your-site.snapps.ai" },
      { key: "token", label: "API Key", placeholder: "Enter your API key", type: "password" },
    ],
  },
  framer: {
    name: "Framer",
    icon: "⬛",
    description: "Connect your Framer site via API.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Framer Site" },
      { key: "endpoint", label: "Site URL", placeholder: "https://your-site.framer.website" },
      { key: "token", label: "API Token", placeholder: "Enter your API token", type: "password" },
    ],
  },
};

interface IntegrationConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: string | null;
  projectId: string;
  existingConfig?: Record<string, string>;
  integrationId?: string;
  onSuccess: () => void;
}

export function IntegrationConfigModal({
  open,
  onOpenChange,
  platform,
  projectId,
  existingConfig,
  integrationId,
  onSuccess,
}: IntegrationConfigModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>(existingConfig || {});
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  if (!platform || !CMS_CONFIG[platform]) return null;

  const config = CMS_CONFIG[platform];

  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setTestSuccess(false);
  };

  const handleTestWebhook = async () => {
    if (!formData.endpoint) {
      toast.error("Please enter an endpoint URL");
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(formData.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(formData.token ? { Authorization: `Bearer ${formData.token}` } : {}),
        },
        mode: "no-cors",
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          source: "AEO Planning",
        }),
      });

      setTestSuccess(true);
      toast.success("Test request sent! Check your endpoint logs.");
    } catch (error) {
      console.error("Test failed:", error);
      toast.error("Failed to send test request");
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    // Validate required fields
    const missingFields = config.fields
      .filter(f => f.key !== "method" && !formData[f.key])
      .map(f => f.label);

    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.join(", ")}`);
      return;
    }

    setIsSaving(true);
    try {
      if (integrationId) {
        // Update existing
        const { error } = await supabase
          .from("integrations")
          .update({
            config: formData,
            is_connected: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", integrationId);

        if (error) throw error;
        toast.success(`${config.name} integration updated!`);
      } else {
        // Create new
        const { error } = await supabase
          .from("integrations")
          .insert({
            project_id: projectId,
            platform,
            config: formData,
            is_connected: true,
          });

        if (error) throw error;
        toast.success(`${config.name} connected successfully!`);
      }

      onSuccess();
      onOpenChange(false);
      setFormData({});
    } catch (error) {
      console.error("Error saving integration:", error);
      toast.error("Failed to save integration");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {config.isImage ? (
              <img src={config.icon} alt={config.name} className="h-8 w-8 object-contain dark:invert" />
            ) : (
              <span className="text-2xl">{config.icon}</span>
            )}
            {config.name} Integration
          </DialogTitle>
          {config.tutorialUrl && (
            <a
              href={config.tutorialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-red-500 hover:underline"
            >
              <Youtube className="h-4 w-4" />
              Watch tutorial on how to connect
            </a>
          )}
          <DialogDescription className="pt-2">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4 space-y-4">
            <h4 className="font-medium">Webhook Configuration</h4>
            <p className="text-sm text-muted-foreground">
              Enter your webhook endpoint and access token to enable automatic content publishing.
            </p>

            {config.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  value={formData[field.key] || ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                />
              </div>
            ))}

            <Button
              variant="outline"
              onClick={handleTestWebhook}
              disabled={isTesting || !formData.endpoint}
              className="gap-2"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testSuccess ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : null}
              {testSuccess ? "Test Successful" : "Test Webhook"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isSaving}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
