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
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

export default function AdSetsTab({ projectId, refreshKey, onChange }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [audiences, setAudiences] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", campaign_id: "", daily_budget: 10, countries: "US", age_min: 18, age_max: 65, optimization_goal: "LINK_CLICKS", custom_audiences: [] as string[] });
  const [interestQ, setInterestQ] = useState("");
  const [interestResults, setInterestResults] = useState<any[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<any[]>([]);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const [{ data: a }, { data: c }, { data: au }] = await Promise.all([
        supabase.from("meta_adsets").select("*").eq("project_id", projectId).order("spend", { ascending: false }),
        supabase.from("meta_campaigns").select("campaign_id,name").eq("project_id", projectId),
        supabase.from("meta_audiences").select("audience_id,name,type").eq("project_id", projectId),
      ]);
      setItems(a || []); setCampaigns(c || []); setAudiences(au || []);
    })();
  }, [projectId, refreshKey]);

  async function searchInterests() {
    if (interestQ.length < 2) return;
    const { data } = await supabase.functions.invoke("meta-interest-search", { body: {}, method: "GET" as any });
    // Use direct URL since GET with query params via invoke is tricky
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-interest-search?q=${encodeURIComponent(interestQ)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } });
      const j = await res.json();
      setInterestResults(j.data || []);
    } catch {}
  }

  async function create() {
    try {
      const { data, error } = await supabase.functions.invoke("meta-adset-create", {
        body: {
          name: form.name, campaign_id: form.campaign_id,
          daily_budget: Math.round(form.daily_budget * 100),
          countries: form.countries.split(",").map((s: string) => s.trim()),
          age_min: form.age_min, age_max: form.age_max,
          optimization_goal: form.optimization_goal,
          interests: selectedInterests,
          custom_audiences: form.custom_audiences,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Ad set created (paused)");
      setOpen(false);
      onChange?.();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New Ad Set</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Ad Set</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="col-span-2"><Label>Campaign</Label>
                <Select value={form.campaign_id} onValueChange={v => setForm({...form, campaign_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                  <SelectContent>{campaigns.map(c => <SelectItem key={c.campaign_id} value={c.campaign_id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Daily budget</Label><Input type="number" value={form.daily_budget} onChange={e => setForm({...form, daily_budget: Number(e.target.value)})} /></div>
              <div><Label>Optimization goal</Label>
                <Select value={form.optimization_goal} onValueChange={v => setForm({...form, optimization_goal: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LINK_CLICKS">Link clicks</SelectItem>
                    <SelectItem value="IMPRESSIONS">Impressions</SelectItem>
                    <SelectItem value="REACH">Reach</SelectItem>
                    <SelectItem value="OFFSITE_CONVERSIONS">Conversions</SelectItem>
                    <SelectItem value="LEAD_GENERATION">Leads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Countries (comma separated ISO codes)</Label><Input value={form.countries} onChange={e => setForm({...form, countries: e.target.value})} placeholder="US, FR, GB" /></div>
              <div><Label>Age min</Label><Input type="number" min={13} max={65} value={form.age_min} onChange={e => setForm({...form, age_min: Number(e.target.value)})} /></div>
              <div><Label>Age max</Label><Input type="number" min={13} max={65} value={form.age_max} onChange={e => setForm({...form, age_max: Number(e.target.value)})} /></div>
              <div className="col-span-2">
                <Label>Interests</Label>
                <div className="flex gap-2">
                  <Input value={interestQ} onChange={e => setInterestQ(e.target.value)} placeholder="Search interests" />
                  <Button type="button" variant="outline" onClick={searchInterests}><Search className="h-4 w-4" /></Button>
                </div>
                {interestResults.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                    {interestResults.map(r => (
                      <button key={r.id} className="text-xs block hover:bg-muted px-2 py-1 rounded w-full text-left"
                        onClick={() => { setSelectedInterests([...selectedInterests, r]); setInterestResults([]); setInterestQ(""); }}>
                        + {r.name} <span className="text-muted-foreground">({(r.audience_size_lower_bound || 0).toLocaleString()})</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedInterests.map((i, idx) => (
                    <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => setSelectedInterests(selectedInterests.filter((_, x) => x !== idx))}>{i.name} ×</Badge>
                  ))}
                </div>
              </div>
              {audiences.length > 0 && (
                <div className="col-span-2"><Label>Custom/Lookalike audiences</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {audiences.map(a => (
                      <Badge key={a.audience_id} variant={form.custom_audiences.includes(a.audience_id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const has = form.custom_audiences.includes(a.audience_id);
                          setForm({...form, custom_audiences: has ? form.custom_audiences.filter((x: string) => x !== a.audience_id) : [...form.custom_audiences, a.audience_id]});
                        }}>{a.name} <span className="text-xs ml-1">({a.type})</span></Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter><Button onClick={create} disabled={!form.name || !form.campaign_id}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Targeting</TableHead><TableHead>Status</TableHead>
            <TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">ROAS</TableHead><TableHead className="text-right">Conv.</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No ad sets — sync or create one</TableCell></TableRow>
              : items.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.targeting_summary || "—"}</TableCell>
                  <TableCell><Badge variant={a.status === "ACTIVE" ? "default" : "secondary"}>{a.status}</Badge></TableCell>
                  <TableCell className="text-right">{a.daily_budget ? `${Number(a.daily_budget).toFixed(0)}/d` : "—"}</TableCell>
                  <TableCell className="text-right">{Number(a.spend).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(a.roas || 0).toFixed(2)}x</TableCell>
                  <TableCell className="text-right">{a.conversions || 0}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
