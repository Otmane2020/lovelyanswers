"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { Facebook, RefreshCw, BarChart3, Tag, Sparkles, ArrowLeft, Users, Layers, Image as ImageIcon, Activity, FileBarChart } from "lucide-react";
import { toast } from "sonner";
import OverviewTab from "@/components/admin/meta-ads/OverviewTab";
import CampaignsTab from "@/components/admin/meta-ads/CampaignsTab";
import AdSetsTab from "@/components/admin/meta-ads/AdSetsTab";
import AdsTab from "@/components/admin/meta-ads/AdsTab";
import AudiencesTab from "@/components/admin/meta-ads/AudiencesTab";
import PixelTab from "@/components/admin/meta-ads/PixelTab";
import OptimizerTab from "@/components/admin/meta-ads/OptimizerTab";
import ReportsTab from "@/components/admin/meta-ads/ReportsTab";

const ADMIN_EMAIL = "oben.rockman@gmail.com";

export default function SuperAdminMetaAds() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === ADMIN_EMAIL) {
        setAuthed(true);
        const { data: projects } = await supabase.from("projects").select("id").eq("user_id", session.user.id).limit(1);
        if (projects?.[0]) setProjectId(projects[0].id);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const { data: acc } = await supabase.from("meta_ad_accounts").select("*").eq("project_id", projectId).maybeSingle();
      if (acc) setAccount(acc);
    })();
  }, [projectId, refreshKey]);

  async function handleSync() {
    if (!projectId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-sync", { body: { project_id: projectId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const c = data?.counts || {};
      toast.success(`Synced ${c.campaigns || 0} campaigns • ${c.adsets || 0} ad sets • ${c.ads || 0} ads • ${c.pixels || 0} pixels • ${c.audiences || 0} audiences`);
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast.error(`Sync failed: ${e.message}`);
    } finally { setSyncing(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!authed) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Accès non autorisé</p></div>;
  if (!projectId) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">No project</p></div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push("/superadmin")}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <div className="flex items-center gap-2">
          {account && <Badge variant="outline">{account.name} • {account.currency}</Badge>}
          <Button onClick={handleSync} disabled={syncing} size="sm">
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />Sync all
          </Button>
        </div>
      </div>

      <PageHeader
        icon={Facebook}
        title="Meta Ads Manager"
        description="Campaigns, ad sets, ads, audiences, Conversions API, AI optimizer"
        gradientFrom="from-blue-500/10"
        gradientVia="via-indigo-500/10"
        gradientTo="to-pink-500/10"
        iconFrom="from-blue-600"
        iconTo="to-pink-600"
      />

      {!account && (
        <Card><CardContent className="p-6 text-center text-muted-foreground">
          No Meta account synced yet. Click <strong>Sync all</strong> to pull your Meta Ad Account.
        </CardContent></Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="campaigns"><Facebook className="h-4 w-4 mr-1" />Campaigns</TabsTrigger>
          <TabsTrigger value="adsets"><Layers className="h-4 w-4 mr-1" />Ad Sets</TabsTrigger>
          <TabsTrigger value="ads"><ImageIcon className="h-4 w-4 mr-1" />Ads</TabsTrigger>
          <TabsTrigger value="audiences"><Users className="h-4 w-4 mr-1" />Audiences</TabsTrigger>
          <TabsTrigger value="pixel"><Tag className="h-4 w-4 mr-1" />Pixel & API</TabsTrigger>
          <TabsTrigger value="optimizer"><Sparkles className="h-4 w-4 mr-1" />AI Optimizer</TabsTrigger>
          <TabsTrigger value="reports"><FileBarChart className="h-4 w-4 mr-1" />Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewTab projectId={projectId} account={account} refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="campaigns" className="mt-6"><CampaignsTab projectId={projectId} account={account} onSync={handleSync} refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="adsets" className="mt-6"><AdSetsTab projectId={projectId} refreshKey={refreshKey} onChange={() => setRefreshKey(k => k+1)} /></TabsContent>
        <TabsContent value="ads" className="mt-6"><AdsTab projectId={projectId} account={account} refreshKey={refreshKey} onChange={() => setRefreshKey(k => k+1)} /></TabsContent>
        <TabsContent value="audiences" className="mt-6"><AudiencesTab projectId={projectId} refreshKey={refreshKey} onChange={() => setRefreshKey(k => k+1)} /></TabsContent>
        <TabsContent value="pixel" className="mt-6"><PixelTab projectId={projectId} refreshKey={refreshKey} onChange={() => setRefreshKey(k => k+1)} /></TabsContent>
        <TabsContent value="optimizer" className="mt-6"><OptimizerTab projectId={projectId} refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="reports" className="mt-6"><ReportsTab projectId={projectId} account={account} refreshKey={refreshKey} /></TabsContent>
      </Tabs>
    </div>
  );
}
