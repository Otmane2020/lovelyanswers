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
import shopifyLogo from "@/assets/shopify-logo.png";
import wixLogo from "@/assets/wix-logo.png";
import wordpressLogo from "@/assets/wordpress-logo.png";

// Guide steps for each platform
const PLATFORM_GUIDES: Record<string, { title: string; steps: string[] }> = {
  wordpress: {
    title: "Comment obtenir vos identifiants WordPress",
    steps: [
      "Connectez-vous à votre tableau de bord WordPress admin",
      "Allez dans Utilisateurs → Votre profil",
      "Faites défiler jusqu'à la section 'Mots de passe d'application'",
      "Entrez un nom (ex: 'AeoRocket') et cliquez sur 'Ajouter un nouveau mot de passe'",
      "Copiez le mot de passe généré (format: xxxx xxxx xxxx xxxx)",
      "Dans AeoRocket, entrez votre nom d'utilisateur WordPress suivi de ':' puis le mot de passe",
      "Exemple: monuser:xxxx xxxx xxxx xxxx",
    ],
  },
  shopify: {
    title: "Comment créer une Custom App Shopify",
    steps: [
      "Connectez-vous à votre Shopify Admin",
      "Allez dans Paramètres → Apps et canaux de vente",
      "Cliquez sur 'Développer des apps' en haut à droite",
      "Cliquez sur 'Créer une app' et donnez-lui un nom",
      "Dans l'onglet Configuration, cliquez sur 'Configurer les scopes API Admin'",
      "Activez les permissions: 'write_content', 'read_content' (pour le blog)",
      "Cliquez sur 'Sauvegarder' puis 'Installer l'app'",
      "Copiez l'Admin API access token (commence par shpat_)",
    ],
  },
  wix: {
    title: "Comment obtenir votre clé API Wix",
    steps: [
      "Connectez-vous à votre compte Wix",
      "Allez sur dev.wix.com et connectez-vous",
      "Cliquez sur 'API Keys' dans le menu",
      "Cliquez sur 'Generate API Key'",
      "Sélectionnez les permissions nécessaires pour le Blog",
      "Copiez la clé API générée",
      "Pour le Site ID, allez dans votre tableau de bord Wix → l'ID est dans l'URL",
    ],
  },
  webflow: {
    title: "Comment obtenir votre token API Webflow",
    steps: [
      "Connectez-vous à votre compte Webflow",
      "Allez dans Paramètres du site → Integrations → API Access",
      "Cliquez sur 'Generate API Token'",
      "Copiez le token généré",
      "Pour le Collection ID: allez dans le CMS → cliquez sur votre collection",
      "Le Collection ID est visible dans l'URL ou les paramètres de la collection",
      "Le Site ID est dans Paramètres du site → Général",
    ],
  },
  duda: {
    title: "Comment obtenir vos identifiants API Duda",
    steps: [
      "Connectez-vous à votre tableau de bord Duda",
      "Allez dans Compte → API Access",
      "Générez une nouvelle paire API Key / API Secret",
      "Copiez la clé API",
      "Le nom du site est visible dans votre tableau de bord (sous le site)",
    ],
  },
  bigcommerce: {
    title: "Comment obtenir votre token API BigCommerce",
    steps: [
      "Connectez-vous à votre BigCommerce Admin",
      "Allez dans Paramètres avancés → API Accounts",
      "Cliquez sur 'Create API Account' → 'Create V2/V3 API Token'",
      "Donnez un nom à l'account et sélectionnez les permissions (Content: modify)",
      "Cliquez sur 'Save' et copiez l'Access Token",
      "Le Store Hash est visible dans l'URL de votre admin (après /manage/)",
    ],
  },
  api: {
    title: "Configuration d'une API personnalisée",
    steps: [
      "Entrez l'URL complète de votre endpoint API",
      "Format attendu: https://api.example.com/posts",
      "Pour l'Authorization, entrez la valeur complète du header",
      "Exemples: 'Bearer votre-token' ou 'Basic base64-credentials'",
      "La méthode HTTP est généralement POST pour créer du contenu",
    ],
  },
  webhook: {
    title: "Configuration d'un Webhook",
    steps: [
      "Dans Zapier: Créez un Zap → Trigger 'Webhooks by Zapier' → 'Catch Hook'",
      "Copiez l'URL du webhook fournie",
      "Dans Make: Créez un scénario → Webhook → 'Custom webhook'",
      "Dans n8n: Ajoutez un nœud Webhook et copiez l'URL de test/production",
      "Collez l'URL dans le champ 'Webhook URL' ci-dessus",
    ],
  },
  snapps: {
    title: "Comment connecter Snapps",
    steps: [
      "Connectez-vous à votre tableau de bord Snapps",
      "Allez dans Paramètres → API",
      "Générez une nouvelle clé API",
      "Copiez la clé et l'URL de votre site",
    ],
  },
  framer: {
    title: "Comment connecter Framer",
    steps: [
      "Framer ne supporte pas nativement les API de publication",
      "Utilisez un service tiers comme Zapier ou Make",
      "Créez un webhook qui déclenche une action Framer",
      "Ou utilisez Framer CMS avec une intégration personnalisée",
    ],
  },
};

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
    helpText: "Use Application Passwords (Settings → Users → Application Passwords) or a JWT plugin.",
    fields: [
      { key: "name", label: "Integration Name", placeholder: "My WordPress Blog" },
      { key: "endpoint", label: "Site URL", placeholder: "https://your-domain.com", helpText: "Your WordPress site URL (without /wp-json)" },
      { key: "token", label: "Application Password", placeholder: "username:xxxx xxxx xxxx xxxx", type: "password", helpText: "Format: username:application_password" },
    ],
  },
  shopify: {
    name: "Shopify",
    icon: shopifyLogo,
    isImage: true,
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
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
            {config.isImage ? (
              <img src={config.icon} alt={config.name} className="h-6 w-6 sm:h-8 sm:w-8 object-contain dark:invert" />
            ) : (
              <span className="text-xl sm:text-2xl">{config.icon}</span>
            )}
            <span className="truncate">{config.name} Integration</span>
          </DialogTitle>
          <DialogDescription className="pt-1 sm:pt-2 text-sm">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6">
          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            {/* Guide Button */}
            {guide && (
              <Button
                variant="outline"
                onClick={() => setShowGuide(!showGuide)}
                className="w-full justify-between gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10 h-auto py-2.5 px-3"
              >
                <span className="flex items-center gap-2 text-left">
                  <BookOpen className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-xs sm:text-sm">📖 Guide: Comment obtenir les clés API</span>
                </span>
                <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${showGuide ? "rotate-90" : ""}`} />
              </Button>
            )}

            {/* Guide Content */}
            {showGuide && guide && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4 space-y-2 sm:space-y-3">
                <h4 className="font-semibold text-primary text-sm sm:text-base">{guide.title}</h4>
                <div className="max-h-[150px] sm:max-h-[200px] overflow-y-auto">
                  <ol className="space-y-2 text-xs sm:text-sm">
                    {guide.steps.map((step, index) => (
                      <li key={index} className="flex gap-2 sm:gap-3">
                        <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <span className="text-muted-foreground pt-0.5 leading-relaxed">{step}</span>
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

        <DialogFooter className="flex-col sm:flex-row gap-2 px-4 pb-4 sm:px-6 sm:pb-6 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto order-2 sm:order-1">
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isSaving}
            className="bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto order-1 sm:order-2"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
