import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";

interface SoftPaywallBannerProps {
  answersCount: number;
  onUpgrade: () => void;
}

export function SoftPaywallBanner({ answersCount, onUpgrade }: SoftPaywallBannerProps) {
  return (
    <Card className="p-6 bg-violet-500/10 border-violet-500/30">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              You have {answersCount} AEO answers!
            </h3>
            <p className="text-sm text-muted-foreground">
              Upgrade to a paid plan to unlock all features
            </p>
          </div>
        </div>
        <Button
          onClick={onUpgrade}
          className="bg-violet-500 hover:bg-violet-600 text-white"
        >
          Upgrade
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  );
}