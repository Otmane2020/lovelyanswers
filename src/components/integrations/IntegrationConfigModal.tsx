import { useState, useEffect } from "react";
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
import { Loader2, ExternalLink, Youtube, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import shopifyLogo from "@/assets/shopify-logo.png";
import wixLogo from "@/assets/wix-logo.png";
import wordpressLogo from "@/assets/wordpress-logo.png";

// CMS Platform configurations with detailed help
const CMS_CONFIG: Record<string, {
  name: string;
  icon: string;
  isImage?: boolean;
  description: string;
  tutorialUrl?: string;
  helpText?: string;
  fields: { key: string; label: string; placeholder: string; type?: string; helpText?: string }[];
}> = {
  wordpress: {
    name: "WordPress",
    icon: wordpressLogo,
    isImage: true,
    description: "Publish articles directly to your WordPress blog.",
    tutorialUrl: "https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/",
    helpText: "Use Application Passwords (Settings → Users → Application Passwords) or a JWT plugin.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My WordPress Blog" },
      { key: "endpoint", label: "Site URL", placeholder: "https://your-domain.com", helpText: "Your WordPress site URL (without /wp-json)" },
      { key: "token", label: "Application Password", placeholder: "xxxx xxxx xxxx xxxx", type: "password", helpText: "Create one in Users → Your Profile → Application Passwords" },
    ],
  },
  shopify: {
    name: "Shopify",
    icon: shopifyLogo,
    isImage: true,
    description: "Publish blog articles to your Shopify store.",
    tutorialUrl: "https://help.shopify.com/en/manual/apps/app-types/custom-apps",
    helpText: "Create a Custom App in Shopify Admin → Settings → Apps and sales channels → Develop apps.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Shopify Store" },
      { key: "endpoint", label: "Store URL", placeholder: "https://your-store.myshopify.com", helpText: "Your .myshopify.com URL" },
      { key: "token", label: "Admin API Access Token", placeholder: "shpat_xxxxx", type: "password", helpText: "From your Custom App → API credentials" },
    ],
  },
  wix: {
    name: "Wix",
    icon: wixLogo,
    isImage: true,
    description: "Publish blog posts to your Wix site.",
    tutorialUrl: "https://dev.wix.com/docs/rest/articles/getting-started/authentication",
    helpText: "Get your API key from Wix Developers → API Keys.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Wix Site" },
      { key: "endpoint", label: "API Endpoint", placeholder: "https://www.wixapis.com/blog/v3" },
      { key: "token", label: "API Key", placeholder: "Enter your Wix API key", type: "password" },
      { key: "siteId", label: "Site ID", placeholder: "Enter your Wix Site ID", helpText: "Found in your Wix dashboard URL" },
    ],
  },
  webflow: {
    name: "Webflow",
    icon: "🔷",
    description: "Publish CMS items to your Webflow collections.",
    tutorialUrl: "https://developers.webflow.com/docs/getting-started",
    helpText: "Create an API token in Webflow → Site Settings → Integrations.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Webflow Site" },
      { key: "endpoint", label: "Collection ID", placeholder: "Enter your collection ID", helpText: "Found in CMS collection settings" },
      { key: "token", label: "API Token", placeholder: "Enter your Webflow API token", type: "password" },
      { key: "siteId", label: "Site ID", placeholder: "Enter your Webflow Site ID" },
    ],
  },
  duda: {
    name: "Duda",
    icon: "🟠",
    description: "Publish blog posts to your Duda website.",
    tutorialUrl: "https://developer.duda.co/docs/authentication",
    helpText: "Get API credentials from Duda → Dashboard → API Access.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Duda Site" },
      { key: "endpoint", label: "Site Name", placeholder: "Enter your Duda site name", helpText: "The site name from your dashboard" },
      { key: "token", label: "API Key", placeholder: "Enter your Duda API key", type: "password" },
    ],
  },
  api: {
    name: "Custom API",
    icon: "⚙️",
    description: "Connect to any REST API endpoint.",
    helpText: "Send content to your own API endpoint.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Custom API" },
      { key: "endpoint", label: "API Endpoint", placeholder: "https://api.example.com/posts" },
      { key: "token", label: "Authorization Header", placeholder: "Bearer your-token", type: "password", helpText: "Full Authorization header value" },
      { key: "method", label: "HTTP Method", placeholder: "POST" },
    ],
  },
  webhook: {
    name: "Webhook",
    icon: "🔗",
    description: "Send content to any webhook (Zapier, Make, n8n, etc.).",
    helpText: "Perfect for automation workflows.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Zapier Webhook" },
      { key: "endpoint", label: "Webhook URL", placeholder: "https://hooks.zapier.com/..." },
    ],
  },
  bigcommerce: {
    name: "BigCommerce",
    icon: "📦",
    description: "Publish blog content to your BigCommerce store.",
    tutorialUrl: "https://developer.bigcommerce.com/docs/start/authentication",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My BigCommerce Store" },
      { key: "endpoint", label: "Store Hash", placeholder: "Enter your store hash", helpText: "Found in your API account settings" },
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
    description: "Connect your Framer site via webhook.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Framer Site" },
      { key: "endpoint", label: "Webhook URL", placeholder: "https://your-webhook-url" },
      { key: "token", label: "API Token", placeholder: "Enter your API token (optional)", type: "password" },
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
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testMessage, setTestMessage] = useState<string>("");

  // Reset form when modal opens with new data
  useEffect(() => {
    if (open) {
      setFormData(existingConfig || {});
      setTestResult(null);
      setTestMessage("");
    }
  }, [open, existingConfig]);

  if (!platform || !CMS_CONFIG[platform]) return null;

  const config = CMS_CONFIG[platform];

  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!formData.endpoint) {
      toast.error("Please enter an endpoint URL");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setTestMessage("");

    try {
      // Use edge function to test connection (avoids CORS issues)
      const { data, error } = await supabase.functions.invoke("test-integration", {
        body: {
          platform,
          config: formData,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setTestResult("success");
        setTestMessage(data.message || "Connection successful!");
        toast.success(`${config.name} connection successful!`);
      } else {
        setTestResult("error");
        setTestMessage(data?.message || "Connection failed");
        toast.error(data?.message || "Connection failed");
      }
    } catch (error) {
      console.error("Test failed:", error);
      setTestResult("error");
      setTestMessage(error instanceof Error ? error.message : "Connection failed");
      toast.error("Failed to connect");
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
          {config.helpText && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              💡 {config.helpText}
            </p>
          )}
          <div className="rounded-lg border p-4 space-y-4">
            <h4 className="font-medium">Configuration</h4>

            {config.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  value={formData[field.key] || ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                />
                {field.helpText && (
                  <p className="text-xs text-muted-foreground">{field.helpText}</p>
                )}
              </div>
            ))}

            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !formData.endpoint}
              className="gap-2"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResult === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : testResult === "error" ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : null}
              {testResult === "success" ? "Connected" : testResult === "error" ? "Failed" : "Test Connection"}
            </Button>
            {testMessage && (
              <p className={`text-sm ${testResult === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                {testMessage}
              </p>
            )}
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
