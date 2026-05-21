"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function OptimizerTab({ projectId, refreshKey }: any) {
  const [settings, setSettings] = useState<any>({ auto_apply: false, min_roas: 1.5, min_spend: 50, lookback_days: 14, cron_enabled: false });
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const [{ data: s }, { data: r }] = await Promise.all([
        supabase.from("meta_optimization_settings").select("*").eq("project_id", projectId).maybeSingle(),
        supabase.from("meta_optimization_runs").select("*").eq("project_id", projectId).order("ran_at", { ascending: false }).limit(10),
      ]);
      if (s) setSettings(s);
      setRuns(r || []);
    })();
  }, [projectId, refreshKey]);

  async function saveSettings() {
    await supabase.from("meta_optimization_settings").upsert({ project_id: projectId, ...settings }, { onConflict: "project_id" });
    toast.success("Settings saved");
  }

  async function run(dry_run: boolean) {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-optimize", { body: { project_id: projectId, dry_run } });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success(dry_run ? `${data.actions?.length || 0} actions suggested` : `${data.applied} actions applied`);
      const { data: r } = await supabase.from("meta_optimization_runs").select("*").eq("project_id", projectId).order("ran_at", { ascending: false }).limit(10);
      setRuns(r || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" />ROAS Optimizer settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label>Min ROAS target</Label><Input type="number" step={0.1} value={settings.min_roas} onChange={e => setSettings({...settings, min_roas: Number(e.target.value)})} /></div>
            <div><Label>Min spend ($)</Label><Input type="number" value={settings.min_spend} onChange={e => setSettings({...settings, min_spend: Number(e.target.value)})} /></div>
            <div><Label>Lookback (days)</Label><Input type="number" value={settings.lookback_days} onChange={e => setSettings({...settings, lookback_days: Number(e.target.value)})} /></div>
            <div className="flex items-end gap-2"><Switch checked={settings.auto_apply} onCheckedChange={v => setSettings({...settings, auto_apply: v})} /><Label>Auto apply</Label></div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={settings.cron_enabled} onCheckedChange={v => setSettings({...settings, cron_enabled: v})} /><Label>Run daily (cron)</Label></div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={saveSettings}>Save settings</Button>
            <Button variant="outline" onClick={() => run(true)} disabled={loading}>{loading ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}Dry run</Button>
            <Button onClick={() => run(false)} disabled={loading}>Apply now</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent runs</CardTitle></CardHeader>
        <CardContent>
          {runs.length === 0 ? <p className="text-sm text-muted-foreground">No runs yet</p> :
            <div className="space-y-3">
              {runs.map(r => (
                <div key={r.id} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">{new Date(r.ran_at).toLocaleString()}</p>
                    <Badge variant={r.dry_run ? "secondary" : "default"}>{r.dry_run ? "Dry run" : `Applied (${r.applied_count})`}</Badge>
                  </div>
                  {r.summary && <p className="text-sm mb-2">{r.summary}</p>}
                  <ul className="text-xs space-y-1">
                    {(r.actions || []).slice(0, 5).map((a: any, i: number) => (
                      <li key={i}>• <strong>{a.kind}</strong> {a.target_name || a.target_id} {a.amount ? `→ $${a.amount}` : ""} — <span className="text-muted-foreground">{a.reason}</span></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>}
        </CardContent>
      </Card>
    </div>
  );
}
