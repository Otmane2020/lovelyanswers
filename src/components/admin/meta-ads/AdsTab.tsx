"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, ExternalLink, Image as ImageIcon } from "lucide-react";
import AdComposer from "./composer/AdComposer";

export default function AdsTab({ projectId, refreshKey, onChange, account }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [adsets, setAdsets] = useState<any[]>([]);
  const [pixels, setPixels] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const [{ data: a }, { data: s }, { data: p }] = await Promise.all([
        supabase.from("meta_ads").select("*").eq("project_id", projectId).order("spend", { ascending: false }),
        supabase.from("meta_adsets").select("adset_id,name").eq("project_id", projectId),
        supabase.from("meta_pixels").select("pixel_id,name").eq("project_id", projectId),
      ]);
      setItems(a || []); setAdsets(s || []); setPixels(p || []);
    })();
  }, [projectId, refreshKey]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} ads synced</p>
        <Button onClick={() => setOpen(true)} disabled={!account?.page_id}>
          <Plus className="h-4 w-4 mr-1" />Create Ad
        </Button>
      </div>
      {!account?.page_id && (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">
          No Facebook Page linked to this ad account. Click <strong>Sync all</strong> at the top — we'll pull the Page automatically.
        </CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl p-4">
          {open && (
            <AdComposer
              projectId={projectId}
              account={account}
              adsets={adsets}
              pixels={pixels}
              onCreated={() => { setOpen(false); onChange?.(); }}
              onCancel={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && <Card className="sm:col-span-2 lg:col-span-3"><CardContent className="p-8 text-center text-muted-foreground">No ads yet — Sync to pull existing, or Create one</CardContent></Card>}
        {items.map(a => (
          <Card key={a.id}><CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm truncate">{a.name}</p>
              <Badge variant={a.status === "ACTIVE" ? "default" : "secondary"} className="shrink-0">{a.status}</Badge>
            </div>
            {a.creative?.thumbnail_url ? (
              <img src={a.creative.thumbnail_url} alt="" className="w-full h-32 object-cover rounded" />
            ) : (
              <div className="w-full h-32 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground/40" /></div>
            )}
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
