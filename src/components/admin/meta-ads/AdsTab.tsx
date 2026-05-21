"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Play, Pause, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function AdsTab({ projectId, refreshKey, onChange }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [adsets, setAdsets] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<any>({ name: "", adset_id: "", title: "", body: "", link_url: "", cta_type: "LEARN_MORE", media_url: "", media_type: "image" });

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const [{ data: a }, { data: s }] = await Promise.all([
        supabase.from("meta_ads").select("*").eq("project_id", projectId).order("spend", { ascending: false }),
        supabase.from("meta_adsets").select("adset_id,name").eq("project_id", projectId),
      ]);
      setItems(a || []); setAdsets(s || []);
    })();
  }, [projectId, refreshKey]);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${projectId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("meta-creatives").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("meta-creatives").getPublicUrl(path);
      setForm({ ...form, media_url: data.publicUrl, media_type: file.type.startsWith("video") ? "video" : "image" });
      toast.success("Media uploaded");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  }

  async function create() {
    try {
      const { data, error } = await supabase.functions.invoke("meta-ad-create", {
        body: { project_id: projectId, ...form },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Ad created (paused)");
      setOpen(false); onChange?.();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New Ad</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Ad</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Ad name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Ad Set</Label>
                <Select value={form.adset_id} onValueChange={v => setForm({...form, adset_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select ad set" /></SelectTrigger>
                  <SelectContent>{adsets.map(s => <SelectItem key={s.adset_id} value={s.adset_id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Image/Video file</Label>
                <Input type="file" accept="image/*,video/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading…</p>}
                {form.media_url && <p className="text-xs text-emerald-600 mt-1">✓ {form.media_type}</p>}
              </div>
              <div><Label>Headline / Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
              <div><Label>Body / Message</Label><Textarea rows={3} value={form.body} onChange={e => setForm({...form, body: e.target.value})} /></div>
              <div><Label>Landing URL</Label><Input type="url" value={form.link_url} onChange={e => setForm({...form, link_url: e.target.value})} placeholder="https://" /></div>
              <div><Label>Call to action</Label>
                <Select value={form.cta_type} onValueChange={v => setForm({...form, cta_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["LEARN_MORE","SHOP_NOW","SIGN_UP","SUBSCRIBE","DOWNLOAD","BOOK_TRAVEL","GET_QUOTE","CONTACT_US","APPLY_NOW","ORDER_NOW"].map(c => <SelectItem key={c} value={c}>{c.replace("_"," ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={create} disabled={!form.name || !form.adset_id || !form.media_url || !form.link_url}>Create Ad</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && <Card className="sm:col-span-2 lg:col-span-3"><CardContent className="p-8 text-center text-muted-foreground">No ads yet</CardContent></Card>}
        {items.map(a => (
          <Card key={a.id}><CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm truncate">{a.name}</p>
              <Badge variant={a.status === "ACTIVE" ? "default" : "secondary"} className="shrink-0">{a.status}</Badge>
            </div>
            {a.creative?.thumbnail_url && <img src={a.creative.thumbnail_url} alt="" className="w-full h-32 object-cover rounded" />}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><p className="text-muted-foreground">Spend</p><p className="font-mono">{Number(a.spend).toFixed(0)}</p></div>
              <div><p className="text-muted-foreground">ROAS</p><p className="font-mono">{Number(a.roas || 0).toFixed(2)}x</p></div>
              <div><p className="text-muted-foreground">Conv.</p><p className="font-mono">{a.conversions || 0}</p></div>
            </div>
            {a.preview_url && <Button asChild variant="outline" size="sm" className="w-full"><a href={a.preview_url} target="_blank" rel="noopener">Preview <ExternalLink className="h-3 w-3 ml-1" /></a></Button>}
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
