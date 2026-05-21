"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Copy as CopyIcon } from "lucide-react";
import { toast } from "sonner";

export default function AudiencesTab({ projectId, refreshKey, onChange }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [openCustom, setOpenCustom] = useState(false);
  const [openLAL, setOpenLAL] = useState(false);
  const [cName, setCName] = useState("");
  const [cDays, setCDays] = useState(30);
  const [lName, setLName] = useState("");
  const [lSource, setLSource] = useState("");
  const [lCountry, setLCountry] = useState("US");
  const [lRatio, setLRatio] = useState(0.01);

  useEffect(() => {
    if (!projectId) return;
    supabase.from("meta_audiences").select("*").eq("project_id", projectId)
      .then(({ data }) => setItems(data || []));
  }, [projectId, refreshKey]);

  async function createCustom() {
    try {
      const { data, error } = await supabase.functions.invoke("meta-audience-create", {
        body: { project_id: projectId, name: cName, retention_days: cDays },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Custom audience created"); setOpenCustom(false); setCName(""); onChange?.();
    } catch (e: any) { toast.error(e.message); }
  }

  async function createLAL() {
    try {
      const { data, error } = await supabase.functions.invoke("meta-audience-lookalike", {
        body: { project_id: projectId, name: lName, source_audience_id: lSource, country: lCountry, ratio: lRatio },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Lookalike created"); setOpenLAL(false); setLName(""); onChange?.();
    } catch (e: any) { toast.error(e.message); }
  }

  const customs = items.filter(a => a.type === "CUSTOM");

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Dialog open={openCustom} onOpenChange={setOpenCustom}>
          <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-1" />Custom Audience</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Custom Audience (Website visitors)</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={cName} onChange={e => setCName(e.target.value)} /></div>
              <div><Label>Retention (days)</Label><Input type="number" min={1} max={180} value={cDays} onChange={e => setCDays(Number(e.target.value))} /></div>
            </div>
            <DialogFooter><Button onClick={createCustom} disabled={!cName}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={openLAL} onOpenChange={setOpenLAL}>
          <DialogTrigger asChild><Button><CopyIcon className="h-4 w-4 mr-1" />Lookalike</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Lookalike Audience</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={lName} onChange={e => setLName(e.target.value)} /></div>
              <div><Label>Source audience</Label>
                <Select value={lSource} onValueChange={setLSource}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>{customs.map(c => <SelectItem key={c.audience_id} value={c.audience_id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Country (ISO)</Label><Input value={lCountry} onChange={e => setLCountry(e.target.value)} /></div>
              <div><Label>Similarity ratio: {(lRatio*100).toFixed(0)}% ({lRatio<=0.03?"closest match":"broader reach"})</Label>
                <input type="range" min={0.01} max={0.10} step={0.01} value={lRatio} onChange={e => setLRatio(Number(e.target.value))} className="w-full" />
              </div>
            </div>
            <DialogFooter><Button onClick={createLAL} disabled={!lName || !lSource}>Create Lookalike</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.length === 0 && <Card className="sm:col-span-2 lg:col-span-3"><CardContent className="p-8 text-center text-muted-foreground">No audiences yet</CardContent></Card>}
        {items.map(a => (
          <Card key={a.id}><CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="font-medium text-sm flex items-center gap-1"><Users className="h-3.5 w-3.5" />{a.name}</p>
              <Badge variant={a.type === "LOOKALIKE" ? "default" : "secondary"}>{a.type}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{a.subtype || "—"}</p>
            <p className="text-xs font-mono mt-1">~{Number(a.approximate_count || 0).toLocaleString()} people</p>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
