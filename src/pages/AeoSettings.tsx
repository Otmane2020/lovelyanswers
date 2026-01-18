import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserSettings } from "./settings/UserSettings";
import { BusinessSettings } from "./settings/BusinessSettings";
import { TeamMembers } from "./settings/TeamMembers";
import { ArticleSettings } from "./settings/ArticleSettings";
import { ArticleVisuals } from "./settings/ArticleVisuals";
import { IntegrationsSettings } from "./settings/IntegrationsSettings";
import { CompetitorSettings } from "./settings/CompetitorSettings";
import { KeywordsSettings } from "./settings/KeywordsSettings";

export default function AeoSettings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your AEO project</p>
        </div>

        <Tabs defaultValue="user" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent flex-wrap gap-0">
            <TabsTrigger 
              value="user"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              User Settings
            </TabsTrigger>
            <TabsTrigger 
              value="business"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Business Settings
            </TabsTrigger>
            <TabsTrigger 
              value="keywords"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Keywords
            </TabsTrigger>
            <TabsTrigger 
              value="team"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Team Members
            </TabsTrigger>
            <TabsTrigger 
              value="article"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Article Settings
            </TabsTrigger>
            <TabsTrigger 
              value="visuals"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Article Visuals
            </TabsTrigger>
            <TabsTrigger 
              value="integrations"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Integrations
            </TabsTrigger>
            <TabsTrigger 
              value="competitors"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Competitors
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 max-w-2xl">
            <TabsContent value="user" className="mt-0">
              <UserSettings />
            </TabsContent>
            <TabsContent value="business" className="mt-0">
              <BusinessSettings />
            </TabsContent>
            <TabsContent value="keywords" className="mt-0">
              <KeywordsSettings />
            </TabsContent>
            <TabsContent value="team" className="mt-0">
              <TeamMembers />
            </TabsContent>
            <TabsContent value="article" className="mt-0">
              <ArticleSettings />
            </TabsContent>
            <TabsContent value="visuals" className="mt-0">
              <ArticleVisuals />
            </TabsContent>
            <TabsContent value="integrations" className="mt-0">
              <IntegrationsSettings />
            </TabsContent>
            <TabsContent value="competitors" className="mt-0">
              <CompetitorSettings />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
