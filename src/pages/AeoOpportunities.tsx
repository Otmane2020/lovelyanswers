import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function AeoOpportunities() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Opportunities</h1>
          <p className="text-muted-foreground mt-1">Discover AI citation opportunities</p>
        </div>

        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No opportunities found</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Use the wizard to discover AI citation opportunities for your brand.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}