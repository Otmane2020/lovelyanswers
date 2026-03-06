import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Settings } from "lucide-react";
import { SubscriptionGate } from "@/components/aeo/SubscriptionGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserSettings } from "./settings/UserSettings";
import { BusinessSettings } from "./settings/BusinessSettings";
import { TeamMembers } from "./settings/TeamMembers";
import { ArticleSettings } from "./settings/ArticleSettings";
import { ArticleVisuals } from "./settings/ArticleVisuals";
import { IntegrationsSettings } from "./settings/IntegrationsSettings";
import { CompetitorSettings } from "./settings/CompetitorSettings";
import { KeywordsSettings } from "./settings/KeywordsSettings";
import { AudiencesSettings } from "./settings/AudiencesSettings";
import { AnalyticsSettings } from "./settings/AnalyticsSettings";
import { BulkArticleGenerator } from "./settings/BulkArticleGenerator";
import { BacklinksSettings } from "./settings/BacklinksSettings";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAILS = ["otmane.benyahya@sweetdeco.com", "oben.rockman@gmail.com"];

export default function AeoSettings() {
  const { user } = useAuth();
  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email) : false;

  return (
    <DashboardLayout>
      <SubscriptionGate title="Unlock Advanced Settings" description="Fine-tune your AI content strategy, manage team members, and configure publishing preferences.">
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
            <TabsTrigger 
              value="audiences"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Audiences
            </TabsTrigger>
            <TabsTrigger 
              value="analytics"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Google Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="backlinks"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Backlinks IA
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger 
                value="bulk-generator"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                Bulk Generator
              </TabsTrigger>
            )}
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
            <TabsContent value="audiences" className="mt-0">
              <AudiencesSettings />
            </TabsContent>
            <TabsContent value="analytics" className="mt-0">
              <AnalyticsSettings />
            </TabsContent>
            <TabsContent value="backlinks" className="mt-0 max-w-2xl">
              <BacklinksSettings />
            </TabsContent>
            {isAdmin && (
              <TabsContent value="bulk-generator" className="mt-0 max-w-4xl">
                <BulkArticleGenerator />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
      </SubscriptionGate>
    </DashboardLayout>
  );
}
