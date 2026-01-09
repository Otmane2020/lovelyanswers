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
import { Loader2, ExternalLink, BookOpen, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import shopifyLogo from "@/assets/shopify-logo-new.png";
import wixLogo from "@/assets/wix-logo.png";
import wordpressLogo from "@/assets/wordpress-logo-new.png";
import bigcommerceLogo from "@/assets/bigcommerce-logo.png";
import framerLogo from "@/assets/framer-logo.png";

// Guide steps for each platform
const PLATFORM_GUIDES: Record<string, { title: string; steps: string[] }> = {
  wordpress: {
    title: "How to Get Your WordPress Credentials",
    steps: [
      "Log in to your WordPress admin dashboard",
      "Go to Users → Your Profile",
      "Scroll down to the 'Application Passwords' section",
      "Enter a name (e.g., 'AeoRocket') and click 'Add New Application Password'",
      "Copy the generated password (format: xxxx xxxx xxxx xxxx)",
      "Enter your WordPress username in the 'Username' field",
      "Paste the application password in the 'Application Password' field",
    ],
  },
  shopify: {
    title: "How to Create a Shopify Custom App",
    steps: [
      "Log in to your Shopify Admin",
      "Go to Settings → Apps and sales channels",
      "Click 'Develop apps' in the top right",
      "Click 'Create an app' and give it a name",
      "In the Configuration tab, click 'Configure Admin API scopes'",
      "Enable permissions: 'write_content', 'read_content' (for the blog)",
      "Click 'Save' then 'Install app'",
      "Copy the Admin API access token (starts with shpat_)",
    ],
  },
  wix: {
    title: "How to Get Your Wix API Key",
    steps: [
      "Log in to your Wix account",
      "Go to dev.wix.com and sign in",
      "Click 'API Keys' in the menu",
      "Click 'Generate API Key'",
      "Select the required permissions for Blog",
      "Copy the generated API key",
      "For the Site ID, go to your Wix dashboard → the ID is in the URL",
    ],
  },
  webflow: {
    title: "How to Get Your Webflow API Token",
    steps: [
      "Log in to your Webflow account",
      "Go to Site Settings → Integrations → API Access",
      "Click 'Generate API Token'",
      "Copy the generated token",
      "For Collection ID: go to CMS → click on your collection",
      "The Collection ID is visible in the URL or collection settings",
      "Site ID is in Site Settings → General",
    ],
  },
  duda: {
    title: "How to Get Your Duda API Credentials",
    steps: [
      "Log in to your Duda dashboard",
      "Go to Account → API Access",
      "Generate a new API Key / API Secret pair",
      "Copy the API key",
      "The site name is visible in your dashboard (under the site)",
    ],
  },
  bigcommerce: {
    title: "How to Get Your BigCommerce API Token",
    steps: [
      "Log in to your BigCommerce Admin",
      "Go to Advanced Settings → API Accounts",
      "Click 'Create API Account' → 'Create V2/V3 API Token'",
      "Give the account a name and select permissions (Content: modify)",
      "Click 'Save' and copy the Access Token",
      "The Store Hash is visible in your admin URL (after /manage/)",
    ],
  },
  api: {
    title: "Custom API Configuration",
    steps: [
      "Enter the full URL of your API endpoint",
      "Expected format: https://api.example.com/posts",
      "For Authorization, enter the full header value",
      "Examples: 'Bearer your-token' or 'Basic base64-credentials'",
      "HTTP method is usually POST for creating content",
    ],
  },
  webhook: {
    title: "Webhook Configuration",
    steps: [
      "In Zapier: Create a Zap → Trigger 'Webhooks by Zapier' → 'Catch Hook'",
      "Copy the provided webhook URL",
      "In Make: Create a scenario → Webhook → 'Custom webhook'",
      "In n8n: Add a Webhook node and copy the test/production URL",
      "Paste the URL in the 'Webhook URL' field above",
    ],
  },
  snapps: {
    title: "How to Connect Snapps",
    steps: [
      "Log in to your Snapps dashboard",
      "Go to Settings → API",
      "Generate a new API key",
      "Copy the key and your site URL",
    ],
  },
  framer: {
    title: "How to Connect Framer",
    steps: [
      "Framer does not natively support publishing APIs",
      "Use a third-party service like Zapier or Make",
      "Create a webhook that triggers a Framer action",
      "Or use Framer CMS with a custom integration",
    ],
  },
};

// CMS Platform configurations with detailed help
const CMS_CONFIG: Record<string, {
  name: string;
  icon: string;
  isImage?: boolean;
  color?: string;
  description: string;
  tutorialUrl?: string;
  helpText?: string;
  fields: { key: string; label: string; placeholder: string; type?: string; helpText?: string }[];
}> = {
  wordpress: {
    name: "WordPress",
    icon: wordpressLogo,
    isImage: true,
    color: "from-slate-600 to-slate-800",
    description: "Publish articles directly to your WordPress blog.",
    helpText: "Use Application Passwords (Users → Profile → Application Passwords).",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My WordPress Blog" },
      { key: "endpoint", label: "Site URL", placeholder: "https://your-domain.com", helpText: "Your WordPress site URL (without /wp-json)" },
      { key: "username", label: "WordPress Username", placeholder: "admin", helpText: "Your WordPress login username" },
      { key: "token", label: "Application Password", placeholder: "xxxx xxxx xxxx xxxx", type: "password", helpText: "Generated from Users → Application Passwords (spaces are OK)" },
    ],
  },
  shopify: {
    name: "Shopify",
    icon: shopifyLogo,
    isImage: true,
    color: "from-green-500 to-green-600",
    description: "Publish blog articles to your Shopify store.",
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
    color: "from-yellow-500 to-yellow-600",
    description: "Publish blog posts to your Wix site.",
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
    color: "from-blue-500 to-indigo-600",
    description: "Publish CMS items to your Webflow collections.",
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
    color: "from-orange-500 to-orange-600",
    description: "Publish blog posts to your Duda website.",
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
    color: "from-gray-500 to-gray-600",
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
    color: "from-purple-500 to-purple-600",
    description: "Send content to any webhook (Zapier, Make, n8n, etc.).",
    helpText: "Perfect for automation workflows.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Zapier Webhook" },
      { key: "endpoint", label: "Webhook URL", placeholder: "https://hooks.zapier.com/..." },
    ],
  },
  bigcommerce: {
    name: "BigCommerce",
    icon: bigcommerceLogo,
    isImage: true,
    color: "from-gray-700 to-black",
    description: "Publish blog content to your BigCommerce store.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My BigCommerce Store" },
      { key: "endpoint", label: "Store Hash", placeholder: "Enter your store hash", helpText: "Found in your API account settings" },
      { key: "token", label: "API Token", placeholder: "Enter your API token", type: "password" },
    ],
  },
  snapps: {
    name: "Snapps",
    icon: "📱",
    color: "from-pink-500 to-pink-600",
    description: "Connect your Snapps site for content publishing.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My Snapps Site" },
      { key: "endpoint", label: "Site URL", placeholder: "https://your-site.snapps.ai" },
      { key: "token", label: "API Key", placeholder: "Enter your API key", type: "password" },
    ],
  },
  framer: {
    name: "Framer",
    icon: framerLogo,
    isImage: true,
    color: "from-sky-400 to-blue-500",
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
  const [showGuide, setShowGuide] = useState(false);

  // Reset form when modal opens with new data
  useEffect(() => {
    if (open) {
      setFormData(existingConfig || {});
      setTestResult(null);
      setTestMessage("");
      setShowGuide(false);
    }
  }, [open, existingConfig]);

  if (!platform || !CMS_CONFIG[platform]) return null;

  const config = CMS_CONFIG[platform];
  const guide = PLATFORM_GUIDES[platform];

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
      <DialogContent className="w-[calc(100vw-32px)] max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0 mx-4 rounded-xl">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
            {config.isImage ? (
              <img src={config.icon} alt={config.name} className="h-6 w-6 sm:h-8 sm:w-8 object-contain dark:invert shrink-0" />
            ) : (
              <span className="text-xl sm:text-2xl shrink-0">{config.icon}</span>
            )}
            <span className="truncate">{config.name} Integration</span>
          </DialogTitle>
          <DialogDescription className="pt-1 sm:pt-2 text-xs sm:text-sm">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6">
          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4 pb-4">
            {/* Guide Button */}
            {guide && (
              <Button
                variant="outline"
                onClick={() => setShowGuide(!showGuide)}
                className="w-full justify-between gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10 h-auto py-2.5 px-3"
              >
                <span className="flex items-center gap-2 text-left">
                  <BookOpen className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-xs sm:text-sm">📖 Guide: How to Get API Keys</span>
                </span>
                <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${showGuide ? "rotate-90" : ""}`} />
              </Button>
            )}

            {/* Guide Content */}
            {showGuide && guide && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4 space-y-2 sm:space-y-3">
                <h4 className="font-semibold text-primary text-xs sm:text-sm">{guide.title}</h4>
                <div className="max-h-[120px] sm:max-h-[180px] overflow-y-auto">
                  <ol className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-sm">
                    {guide.steps.map((step, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary text-primary-foreground text-[9px] sm:text-[10px] flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <span className="text-muted-foreground leading-relaxed flex-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {config.helpText && !showGuide && (
              <p className="text-xs sm:text-sm text-muted-foreground bg-muted/50 p-2.5 sm:p-3 rounded-lg">
                💡 {config.helpText}
              </p>
            )}
            
            <div className="rounded-lg border p-3 sm:p-4 space-y-3 sm:space-y-4">
              <h4 className="font-medium text-sm sm:text-base">Configuration</h4>

              {config.fields.map((field) => (
                <div key={field.key} className="space-y-1 sm:space-y-1.5">
                  <Label htmlFor={field.key} className="text-xs sm:text-sm">{field.label}</Label>
                  <Input
                    id={field.key}
                    type={field.type || "text"}
                    placeholder={field.placeholder}
                    value={formData[field.key] || ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="text-sm h-9 sm:h-10"
                  />
                  {field.helpText && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{field.helpText}</p>
                  )}
                </div>
              ))}

              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || !formData.endpoint}
                className="gap-2 w-full sm:w-auto h-9 text-sm"
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
                <p className={`text-xs sm:text-sm ${testResult === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                  {testMessage}
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 px-4 pb-4 sm:px-6 sm:pb-6 pt-3 border-t bg-background shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto h-10">
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isSaving}
            className="bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto h-10"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
