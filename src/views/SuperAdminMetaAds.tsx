"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { Facebook, Instagram, RefreshCw, Plus, Play, Pause, Trash2, Tag, BarChart3, Sparkles, Copy, Check, Link2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAIL = "oben.rockman@gmail.com";

interface Campaign {
  id: string; campaign_id: string; name: string; objective: string; status: string;
  daily_budget: number | null; spend: number; impressions: number; clicks: number;
  ctr: number; cpc: number; conversions: number; roas: number;
}
interface Pixel { id: string; pixel_id: string; name: string; code_snippet: string; ga4_linked: boolean; ga4_measurement_id: string | null; }
interface Account { id: string; name: string; currency: string; status: string; }

export default function SuperAdminMetaAds() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create campaign dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newObjective, setNewObjective] = useState("OUTCOME_TRAFFIC");
  const [newBudget, setNewBudget] = useState(10);

  // Pixel dialog
  const [openPixel, setOpenPixel] = useState(false);
  const [pixelName, setPixelName] = useState("");

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

  useEffect(() => { if (projectId) loadData(); }, [projectId]);

  async function loadData() {
    if (!projectId) return;
    const [{ data: cps }, { data: pxs }, { data: acc }] = await Promise.all([
      supabase.from("meta_campaigns").select("*").eq("project_id", projectId).order("spend", { ascending: false }),
      supabase.from("meta_pixels").select("*").eq("project_id", projectId),
      supabase.from("meta_ad_accounts").select("*").eq("project_id", projectId).maybeSingle(),
    ]);
    setCampaigns((cps as any) || []);
    setPixels((pxs as any) || []);
    if (acc) setAccount({ id: (acc as any).account_id, name: (acc as any).name, currency: (acc as any).currency, status: (acc as any).status });
  }

  async function handleSync() {
    if (!projectId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-sync", { body: { project_id: projectId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Synced ${data?.campaigns?.length || 0} campaigns`);
      await loadData();
    } catch (e: any) {
      toast.error(`Sync failed: ${e.message}`);
    } finally { setSyncing(false); }
  }

  async function handleCreateCampaign() {
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-create-campaign", {
        body: { name: newName, objective: newObjective, daily_budget: Math.round(newBudget * 100) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Campaign created (paused)");
      setOpenCreate(false); setNewName("");
      await handleSync();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleToggleStatus(c: Campaign) {
    const newStatus = c.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-update-status", {
        body: { id: c.campaign_id, status: newStatus },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success(`Campaign ${newStatus.toLowerCase()}`);
      await handleSync();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleCreatePixel() {
    if (!projectId || !pixelName) return;
    try {
      const { data, error } = await supabase.functions.invoke("meta-pixel-create", {
        body: { project_id: projectId, name: pixelName },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Pixel created");
      setOpenPixel(false); setPixelName("");
      await loadData();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleLinkGA4(p: Pixel) {
    const ga = prompt("Enter GA4 Measurement ID (G-XXXXXXX)");
    if (!ga) return;
    try {
      const { data, error } = await supabase.functions.invoke("meta-pixel-link-ga4", {
        body: { project_id: projectId, pixel_id: p.pixel_id, ga4_measurement_id: ga },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("GA4 linked");
      await loadData();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleAI() {
    if (!projectId) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-ai-recommendations", { body: { project_id: projectId } });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setAiResult(data);
    } catch (e: any) { toast.error(e.message); }
    finally { setAiLoading(false); }
  }

  function copySnippet(p: Pixel) {
    navigator.clipboard.writeText(p.code_snippet);
    setCopiedId(p.id);
    toast.success("Pixel snippet copied");
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!authed) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Accès non autorisé</p></div>;

  const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend || 0), 0);
  const totalImpr = campaigns.reduce((s, c) => s + Number(c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + Number(c.clicks || 0), 0);
  const totalConv = campaigns.reduce((s, c) => s + Number(c.conversions || 0), 0);
  const avgCtr = totalImpr ? (totalClicks / totalImpr * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push("/superadmin")}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <div className="flex items-center gap-2">
          {account && <Badge variant="outline">{account.name} • {account.currency}</Badge>}
          <Button onClick={handleSync} disabled={syncing} size="sm">
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />Sync
          </Button>
        </div>
      </div>

      <PageHeader
        icon={Facebook}
        title="Meta Ads — Facebook & Instagram"
        description="Manage campaigns, pixel and Google Analytics linkage"
        gradientFrom="from-blue-500/10"
        gradientVia="via-indigo-500/10"
        gradientTo="to-pink-500/10"
        iconFrom="from-blue-600"
        iconTo="to-pink-600"
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="campaigns"><Facebook className="h-4 w-4 mr-1" />Campaigns</TabsTrigger>
          <TabsTrigger value="pixel"><Tag className="h-4 w-4 mr-1" />Pixel & Tracking</TabsTrigger>
          <TabsTrigger value="ai"><Sparkles className="h-4 w-4 mr-1" />AI Strategy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Spend", value: `${totalSpend.toFixed(2)} ${account?.currency || ""}` },
              { label: "Impressions", value: totalImpr.toLocaleString() },
              { label: "Clicks", value: totalClicks.toLocaleString() },
              { label: "CTR", value: `${avgCtr.toFixed(2)}%` },
              { label: "Conversions", value: totalConv.toLocaleString() },
              { label: "Active campaigns", value: campaigns.filter(c => c.status === "ACTIVE").length },
              { label: "Pixels", value: pixels.length },
              { label: "GA4 linked", value: pixels.filter(p => p.ga4_linked).length },
            ].map(k => (
              <Card key={k.label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-2xl font-bold mt-1">{k.value}</p></CardContent></Card>
            ))}
          </div>
          {!account && (
            <Card><CardContent className="p-6 text-center text-muted-foreground">
              No Meta account synced yet. Click <strong>Sync</strong> above to pull data from your Meta Ad Account.
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New Campaign</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Meta Campaign</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} /></div>
                  <div><Label>Objective</Label>
                    <Select value={newObjective} onValueChange={setNewObjective}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OUTCOME_TRAFFIC">Traffic</SelectItem>
                        <SelectItem value="OUTCOME_AWARENESS">Awareness</SelectItem>
                        <SelectItem value="OUTCOME_ENGAGEMENT">Engagement</SelectItem>
                        <SelectItem value="OUTCOME_LEADS">Leads</SelectItem>
                        <SelectItem value="OUTCOME_SALES">Sales</SelectItem>
                        <SelectItem value="OUTCOME_APP_PROMOTION">App Promotion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Daily budget ({account?.currency || "USD"})</Label>
                    <Input type="number" min={1} step={0.5} value={newBudget} onChange={e => setNewBudget(Number(e.target.value))} />
                  </div>
                </div>
                <DialogFooter><Button onClick={handleCreateCampaign} disabled={!newName}>Create (paused)</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Objective</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Impr.</TableHead><TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead><TableHead className="text-right">Conv.</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {campaigns.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No campaigns. Click Sync or create one.</TableCell></TableRow>
                ) : campaigns.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs">{c.objective?.replace("OUTCOME_", "")}</TableCell>
                    <TableCell><Badge variant={c.status === "ACTIVE" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell className="text-right">{c.daily_budget ? `${Number(c.daily_budget).toFixed(0)}/d` : "—"}</TableCell>
                    <TableCell className="text-right">{Number(c.spend).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(c.impressions).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Number(c.clicks).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Number(c.ctr).toFixed(2)}%</TableCell>
                    <TableCell className="text-right">{c.conversions}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(c)}>
                        {c.status === "ACTIVE" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="pixel" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Dialog open={openPixel} onOpenChange={setOpenPixel}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Create Pixel</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Meta Pixel</DialogTitle></DialogHeader>
                <div><Label>Pixel name</Label><Input value={pixelName} onChange={e => setPixelName(e.target.value)} placeholder="My Site Pixel" /></div>
                <DialogFooter><Button onClick={handleCreatePixel} disabled={!pixelName}>Create</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {pixels.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No pixel created yet.</CardContent></Card>
          ) : pixels.map(p => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" /> {p.name}
                  <Badge variant="outline" className="font-mono text-xs">{p.pixel_id}</Badge>
                </CardTitle>
                <div className="flex gap-2">
                  {p.ga4_linked ? (
                    <Badge className="bg-emerald-600"><Link2 className="h-3 w-3 mr-1" />GA4: {p.ga4_measurement_id}</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleLinkGA4(p)}><Link2 className="h-3.5 w-3.5 mr-1" />Link GA4</Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Snippet — paste into your site's &lt;head&gt;</Label>
                  <Button size="sm" variant="ghost" onClick={() => copySnippet(p)}>
                    {copiedId === p.id ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    {copiedId === p.id ? "Copied" : "Copy"}
                  </Button>
                </div>
                <Textarea readOnly value={p.code_snippet} className="font-mono text-xs h-40" />
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Instagram className="h-3 w-3" /> Same pixel tracks Facebook & Instagram conversions automatically.
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ai" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" />AI Optimization Recommendations</CardTitle>
              <Button onClick={handleAI} disabled={aiLoading || campaigns.length === 0}>
                {aiLoading ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Generate
              </Button>
            </CardHeader>
            <CardContent>
              {!aiResult ? (
                <p className="text-muted-foreground text-sm">Click <strong>Generate</strong> to get AI-driven recommendations based on your current campaigns.</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm">{aiResult.summary}</p>
                  <div className="space-y-2">
                    {(aiResult.recommendations || []).map((r: any, i: number) => (
                      <Card key={i} className="border-l-4" style={{ borderLeftColor: r.priority === "high" ? "#ef4444" : r.priority === "medium" ? "#f59e0b" : "#10b981" }}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">{r.priority}</Badge>
                            <p className="font-semibold text-sm">{r.title}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{r.action}</p>
                          <p className="text-xs text-muted-foreground mt-1 italic">{r.rationale}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
