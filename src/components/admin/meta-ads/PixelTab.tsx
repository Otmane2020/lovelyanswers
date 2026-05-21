"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Tag, Copy, Check, Link2, Send, Code2 } from "lucide-react";
import { toast } from "sonner";

export default function PixelTab({ projectId, refreshKey, onChange }: any) {
  const [pixels, setPixels] = useState<any[]>([]);
  const [lovableInjected, setLovableInjected] = useState<Record<string, boolean>>({});
  const [openCreate, setOpenCreate] = useState(false);
  const [openTest, setOpenTest] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  // Test event
  const [tEvent, setTEvent] = useState("Purchase");
  const [tValue, setTValue] = useState(99);
  const [tEmail, setTEmail] = useState("");

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const [{ data: px }, { data: lp }] = await Promise.all([
        supabase.from("meta_pixels").select("*").eq("project_id", projectId),
        supabase.from("lovable_managed_pixels").select("pixel_id,enabled").eq("project_id", projectId),
      ]);
      setPixels(px || []);
      const m: Record<string, boolean> = {};
      (lp || []).forEach((r: any) => m[r.pixel_id] = r.enabled);
      setLovableInjected(m);
    })();
  }, [projectId, refreshKey]);

  async function create() {
    const { data, error } = await supabase.functions.invoke("meta-pixel-create", { body: { project_id: projectId, name } });
    if (error || data?.error) { toast.error(data?.error || error?.message); return; }
    toast.success("Pixel created"); setOpenCreate(false); setName(""); onChange?.();
  }

  async function linkGA4(p: any) {
    const ga = prompt("GA4 Measurement ID (G-XXXXXXX)");
    if (!ga) return;
    const { data, error } = await supabase.functions.invoke("meta-pixel-link-ga4", {
      body: { project_id: projectId, pixel_id: p.pixel_id, ga4_measurement_id: ga },
    });
    if (error || data?.error) { toast.error(data?.error || error?.message); return; }
    toast.success("GA4 linked"); onChange?.();
  }

  async function toggleLovable(p: any, on: boolean) {
    if (on) {
      await supabase.from("lovable_managed_pixels").upsert({ project_id: projectId, pixel_id: p.pixel_id, enabled: true }, { onConflict: "project_id" });
    } else {
      await supabase.from("lovable_managed_pixels").update({ enabled: false }).eq("project_id", projectId);
    }
    setLovableInjected({ ...lovableInjected, [p.pixel_id]: on });
    toast.success(on ? "Pixel will auto-inject on Lovable site" : "Auto-injection disabled");
  }

  async function pushGTM(p: any) {
    toast.info("GTM push: connect GTM in Integrations first, then this will inject the pixel tag automatically.");
  }

  async function sendTest() {
    const { data, error } = await supabase.functions.invoke("meta-conversions-api", {
      body: {
        project_id: projectId, pixel_id: openTest, event_name: tEvent,
        event_id: `test_${Date.now()}`, value: tValue, currency: "USD",
        email: tEmail, test_event_code: "TEST12345",
      },
    });
    if (error || data?.error) { toast.error(data?.error || error?.message); return; }
    toast.success(`Test ${tEvent} sent`);
    setOpenTest(null);
  }

  function copySnippet(p: any) {
    navigator.clipboard.writeText(p.code_snippet);
    setCopied(p.id); toast.success("Snippet copied");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Create Pixel</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Meta Pixel</DialogTitle></DialogHeader>
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="My Site Pixel" /></div>
            <DialogFooter><Button onClick={create} disabled={!name}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {pixels.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No pixel yet</CardContent></Card>
      ) : pixels.map(p => (
        <Card key={p.id}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2"><Tag className="h-4 w-4" />{p.name}
                <Badge variant="outline" className="font-mono text-xs">{p.pixel_id}</Badge>
              </span>
              <div className="flex gap-2 flex-wrap">
                {p.ga4_linked ? <Badge className="bg-emerald-600"><Link2 className="h-3 w-3 mr-1" />GA4: {p.ga4_measurement_id}</Badge>
                  : <Button size="sm" variant="outline" onClick={() => linkGA4(p)}><Link2 className="h-3.5 w-3.5 mr-1" />Link GA4</Button>}
                <Button size="sm" variant="outline" onClick={() => setOpenTest(p.pixel_id)}><Send className="h-3.5 w-3.5 mr-1" />Test event</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded border p-3">
                <p className="text-xs font-medium mb-1 flex items-center gap-1"><Code2 className="h-3.5 w-3.5" />1. Manual snippet</p>
                <Button size="sm" variant="ghost" onClick={() => copySnippet(p)} className="w-full">
                  {copied === p.id ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied === p.id ? "Copied" : "Copy snippet"}
                </Button>
              </div>
              <div className="rounded border p-3">
                <p className="text-xs font-medium mb-1">2. Push to GTM</p>
                <Button size="sm" variant="outline" onClick={() => pushGTM(p)} className="w-full">Push to GTM</Button>
              </div>
              <div className="rounded border p-3">
                <p className="text-xs font-medium mb-1">3. Auto-inject on Lovable site</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{lovableInjected[p.pixel_id] ? "Active" : "Off"}</span>
                  <Switch checked={!!lovableInjected[p.pixel_id]} onCheckedChange={(v) => toggleLovable(p, v)} />
                </div>
              </div>
            </div>
            <Textarea readOnly value={p.code_snippet} className="font-mono text-xs h-32" />
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!openTest} onOpenChange={(v) => !v && setOpenTest(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Test Conversions API event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Event</Label>
              <select className="w-full border rounded h-9 px-2 bg-background" value={tEvent} onChange={e => setTEvent(e.target.value)}>
                {["Purchase","Lead","AddToCart","ViewContent","CompleteRegistration"].map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div><Label>Value (USD)</Label><Input type="number" value={tValue} onChange={e => setTValue(Number(e.target.value))} /></div>
            <div><Label>Email (will be hashed)</Label><Input type="email" value={tEmail} onChange={e => setTEmail(e.target.value)} placeholder="test@example.com" /></div>
            <p className="text-xs text-muted-foreground">Sends with test_event_code TEST12345 — visible in Meta Events Manager → Test Events.</p>
          </div>
          <DialogFooter><Button onClick={sendTest}>Send test</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
