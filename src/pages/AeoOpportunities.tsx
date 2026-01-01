import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Sparkles, TrendingUp, Target } from "lucide-react";
import { useTranslation } from "@/lib/language";
import { aeoTranslations } from "@/lib/translations/aeo";

export default function AeoOpportunities() {
  const { language } = useTranslation();
  const t = aeoTranslations[language] || aeoTranslations.fr;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t.opportunities.title}</h1>
          <p className="text-muted-foreground mt-1">{t.opportunities.subtitle}</p>
        </div>

        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {language === 'fr' ? "Aucune opportunité trouvée" : "No opportunities found"}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {language === 'fr'
              ? "Utilisez l'assistant pour découvrir des opportunités de citation IA pour votre marque."
              : "Use the wizard to discover AI citation opportunities for your brand."}
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
