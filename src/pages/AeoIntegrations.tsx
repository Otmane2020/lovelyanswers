import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Plug, ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/language";

export default function AeoIntegrations() {
  const { language } = useTranslation();

  const integrations = [
    { name: "WordPress", description: language === 'fr' ? "Publiez directement sur votre blog" : "Publish directly to your blog", connected: false },
    { name: "Shopify", description: language === 'fr' ? "Synchronisez avec votre boutique" : "Sync with your store", connected: false },
    { name: "Webflow", description: language === 'fr' ? "Intégrez avec votre CMS" : "Integrate with your CMS", connected: false },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'fr' ? "Intégrations" : "Integrations"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'fr' ? "Connectez vos plateformes" : "Connect your platforms"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <Card key={integration.name} className="p-6 hover:border-primary/40 transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <Plug className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{integration.name}</h3>
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
