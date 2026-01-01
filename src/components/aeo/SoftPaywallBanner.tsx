import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface SoftPaywallBannerProps {
  answersCount: number;
  onUpgrade: () => void;
}

export function SoftPaywallBanner({ answersCount, onUpgrade }: SoftPaywallBannerProps) {
  const { language } = useTranslation();

  return (
    <Card className="p-6 bg-gradient-to-r from-violet-500/20 to-blue-500/20 border-violet-500/30">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {language === "fr"
                ? `Vous avez ${answersCount} réponses AEO !`
                : `You have ${answersCount} AEO answers!`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === "fr"
                ? "Passez à un plan payant pour débloquer toutes les fonctionnalités"
                : "Upgrade to a paid plan to unlock all features"}
            </p>
          </div>
        </div>
        <Button
          onClick={onUpgrade}
          className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white"
        >
          {language === "fr" ? "Mettre à niveau" : "Upgrade"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  );
}
