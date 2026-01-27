import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Calendar, MapPin, TrendingUp } from "lucide-react";
import { useLocalBusiness } from "@/hooks/useLocalBusiness";
import { BusinessSearch } from "@/components/local/BusinessSearch";
import { LocalBusinessCard } from "@/components/local/LocalBusinessCard";
import { LocalAnswersTab } from "@/components/local/LocalAnswersTab";
import { LocalPlanningTab } from "@/components/local/LocalPlanningTab";
import { LocalHeatmap } from "@/components/local/LocalHeatmap";

export default function AeoLocal() {
  const { business, isLoading, selectBusiness, clearBusiness } = useLocalBusiness();
  const [localAnswers, setLocalAnswers] = useState<any[]>([]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Local AEO</h1>
            <p className="text-muted-foreground">
              Optimize your local AI visibility
            </p>
          </div>
        </div>

        {/* Business Selection or Dashboard */}
        {!business ? (
          <BusinessSearch onSelectBusiness={selectBusiness} isLoading={isLoading} />
        ) : (
          <>
            {/* Business Card */}
            <LocalBusinessCard business={business} onClear={clearBusiness} />

            {/* Main Tabs */}
            <Tabs defaultValue="answers" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
                <TabsTrigger value="answers" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Local Q&A</span>
                  <span className="sm:hidden">Q&A</span>
                </TabsTrigger>
                <TabsTrigger value="planning" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Planning</span>
                  <span className="sm:hidden">Plan</span>
                </TabsTrigger>
                <TabsTrigger value="heatmap" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Visibility</span>
                  <span className="sm:hidden">Map</span>
                </TabsTrigger>
              </TabsList>

              {/* Local Answers Tab */}
              <TabsContent value="answers">
                <LocalAnswersTab business={business} />
              </TabsContent>

              {/* Planning Tab */}
              <TabsContent value="planning">
                <LocalPlanningTab businessName={business.name} answers={localAnswers} />
              </TabsContent>

              {/* Heatmap Tab */}
              <TabsContent value="heatmap">
                <LocalHeatmap businessName={business.name} location={business.address} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
