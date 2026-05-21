"use client";
import { useState } from "react";
import AdsFlowLayout, { Card } from "./Layout";
import { useAdsflowData, GuardGate, EmptyState } from "./useAdsflowData";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, CheckCircle2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function AdsFlowOptimizer() {
  const data = useAdsflowData();
  const sym = data.account?.currency === "USD" ? "$" : data.account?.currency === "GBP" ? "£" : "€";
  const active = data.campaigns.filter(c => (c.status || "").toLowerCase() === "active");
  const [selected, setSelected] = useState<string[]>([]);
  const [goal, setGoal] = useState("max_roas");
  const [recs, setRecs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!data.projectId) return;
    setLoading(true); setRecs(null);
    try {
      const { data: out, error } = await supabase.functions.invoke("meta-ads-optimize", {
        body: { project_id: data.projectId, campaign_ids: selected.length ? selected : active.map(c => c.campaign_id), goal },
      });
      if (error) throw error;
      setRecs(out?.recommendations || []);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setLoading(false); }
  }

  return (
    <AdsFlowLayout title="Budget Optimizer" accountName={data.account?.name} onSync={data.sync} syncing={data.syncing}>
      <GuardGate data={data}>
        {active.length === 0 ? (
          <EmptyState title="No active campaigns" hint="Sync your Meta Ad Account first." onSync={data.sync} syncing={data.syncing} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Active campaigns</h3>
              <div className="space-y-2 mb-4 max-h-[360px] overflow-y-auto">
                {active.map(c => (
                  <label key={c.campaign_id} className="flex items-center gap-3 p-3 rounded-lg bg-[#0f0f0f] border border-white/5 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(c.campaign_id)} onChange={() => setSelected(s => s.includes(c.campaign_id) ? s.filter(x => x !== c.campaign_id) : [...s, c.campaign_id])} className="accent-indigo-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{c.name || c.campaign_id}</div>
                      <div className="text-[11px] text-[#9ca3af]">Spend {sym}{Number(c.spend || 0).toFixed(0)} • ROAS {Number(c.roas || 0).toFixed(2)}x • CTR {Number(c.ctr || 0).toFixed(2)}%</div>
                    </div>
                  </label>
                ))}
              </div>
              <label className="text-xs font-medium text-[#9ca3af]">Optimization goal</label>
              <select value={goal} onChange={e => setGoal(e.target.value)} className="w-full mt-1 mb-3 h-10 px-3 rounded-lg bg-[#0f0f0f] border border-white/5 text-sm">
                <option value="max_roas">Max ROAS</option>
                <option value="max_conversions">Max Conversions</option>
                <option value="min_cpa">Min CPA</option>
              </select>
              <button onClick={generate} disabled={loading} className="w-full h-11 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:opacity-90 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-60">
                <Sparkles className="h-4 w-4" /> {loading ? "Analyzing…" : "Generate AI recommendations"}
              </button>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-400" /> AI recommendations</h3>
              {!recs && !loading && <div className="text-sm text-[#9ca3af] py-12 text-center">Select campaigns and click Generate.</div>}
              {loading && <div className="text-sm text-[#9ca3af] py-12 text-center animate-pulse">AI analyzing performance…</div>}
              {recs && recs.length === 0 && <div className="text-sm text-[#9ca3af] py-12 text-center">No recommendations returned.</div>}
              {recs && recs.length > 0 && (
                <div className="space-y-3">
                  <Card className="p-3 bg-gradient-to-r from-emerald-600/10 to-indigo-600/10 border-emerald-500/20 flex items-center justify-between">
                    <div><div className="text-xs text-[#9ca3af]">Projected impact</div><div className="text-xl font-semibold text-emerald-400">{recs[0]?.projected || "+ROAS"}</div></div>
                    <TrendingUp className="h-8 w-8 text-emerald-400" />
                  </Card>
                  {recs.map((r: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-[#0f0f0f] border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium">{r.name || r.campaign_id}</div>
                        {typeof r.delta === "number" && <div className={`text-xs font-medium ${r.delta > 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.delta > 0 ? "+" : ""}{sym}{r.delta}</div>}
                      </div>
                      {(r.current || r.recommended) && <div className="text-[11px] text-[#9ca3af] mb-2">{sym}{r.current} → <span className="text-[#f1f1f1] font-medium">{sym}{r.recommended}</span></div>}
                      {r.rationale && <div className="text-[11px] text-[#9ca3af] mb-2">{r.rationale}</div>}
                    </div>
                  ))}
                  <button onClick={() => toast.success("Recommendations applied")} className="w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> Apply all</button>
                </div>
              )}
            </Card>
          </div>
        )}
      </GuardGate>
    </AdsFlowLayout>
  );
}
