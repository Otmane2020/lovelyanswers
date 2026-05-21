"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Play, Pause } from "lucide-react";
import { toast } from "sonner";

export default function CampaignsTab({ projectId, account, onSync, refreshKey }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [obj, setObj] = useState("OUTCOME_TRAFFIC");
  const [budget, setBudget] = useState(10);

  useEffect(() => {
    if (!projectId) return;
    supabase.from("meta_campaigns").select("*").eq("project_id", projectId).order("spend", { ascending: false })
      .then(({ data }) => setItems(data || []));
  }, [projectId, refreshKey]);

  async function create() {
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-create-campaign", {
        body: { name, objective: obj, daily_budget: Math.round(budget * 100) },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Campaign created (paused)");
      setOpen(false); setName(""); await onSync?.();
    } catch (e: any) { toast.error(e.message); }
  }

  async function toggle(c: any) {
    const s = c.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const { data, error } = await supabase.functions.invoke("meta-ads-update-status", { body: { id: c.campaign_id, status: s } });
    if (error || data?.error) { toast.error(data?.error || error?.message); return; }
    toast.success(s); await onSync?.();
  }

  const cur = account?.currency || "";
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New Campaign</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Meta Campaign</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
              <div><Label>Objective</Label>
                <Select value={obj} onValueChange={setObj}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OUTCOME_TRAFFIC">Traffic</SelectItem>
                    <SelectItem value="OUTCOME_AWARENESS">Awareness</SelectItem>
                    <SelectItem value="OUTCOME_ENGAGEMENT">Engagement</SelectItem>
                    <SelectItem value="OUTCOME_LEADS">Leads</SelectItem>
                    <SelectItem value="OUTCOME_SALES">Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Daily budget ({cur || "USD"})</Label>
                <Input type="number" min={1} step={0.5} value={budget} onChange={e => setBudget(Number(e.target.value))} />
              </div>
            </div>
            <DialogFooter><Button onClick={create} disabled={!name}>Create (paused)</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Objective</TableHead><TableHead>Status</TableHead>
            <TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">ROAS</TableHead>
            <TableHead className="text-right">Conv.</TableHead><TableHead className="text-right">CTR</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No campaigns yet</TableCell></TableRow>
              : items.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-xs">{c.objective?.replace("OUTCOME_", "")}</TableCell>
                  <TableCell><Badge variant={c.status === "ACTIVE" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                  <TableCell className="text-right">{c.daily_budget ? `${Number(c.daily_budget).toFixed(0)}/d` : "—"}</TableCell>
                  <TableCell className="text-right">{Number(c.spend).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(c.revenue || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(c.roas || 0).toFixed(2)}x</TableCell>
                  <TableCell className="text-right">{c.conversions || 0}</TableCell>
                  <TableCell className="text-right">{Number(c.ctr).toFixed(2)}%</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => toggle(c)}>
                    {c.status === "ACTIVE" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
