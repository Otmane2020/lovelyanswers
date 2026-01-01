import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, ArrowRight, Sparkles } from "lucide-react";

export default function AeoWizard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AEO Wizard</h1>
          <p className="text-muted-foreground mt-1">Generate citation opportunities</p>
        </div>

        <Card className="p-12 text-center bg-gradient-to-br from-primary/10 to-blue-500/10 border-primary/20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center mx-auto mb-6">
            <Lightbulb className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">AEO Wizard</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Generate citation opportunities to be cited by AI answer engines like ChatGPT, Perplexity, and Claude.
          </p>
          <Button size="lg" className="bg-gradient-to-r from-primary to-blue-500 text-primary-foreground">
            <Sparkles className="w-5 h-5 mr-2" />
            Get Started
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}