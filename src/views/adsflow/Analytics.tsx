"use client";
import { useMemo } from "react";
import AdsFlowLayout, { Card } from "./Layout";
import { useAdsflowData, GuardGate, EmptyState } from "./useAdsflowData";
import { ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from "recharts";
import { Download, FileText, Mail } from "lucide-react";
import { toast } from "sonner";

export default function AdsFlowAnalytics() {
  const data = useAdsflowData();
  const sym = data.account?.currency === "USD" ? "$" : data.account?.currency === "GBP" ? "£" : "€";

  const perfBar = useMemo(() => data.campaigns.slice(0, 10).map(c => ({
    name: (c.name || c.campaign_id).slice(0, 18),
    spend: Number(c.spend || 0),
    clicks: Number(c.clicks || 0),
    conversions: Number(c.conversions || 0),
  })), [data.campaigns]);

  const scatter = data.campaigns
    .filter(c => Number(c.spend) > 0)
    .map(c => ({ name: c.name, spend: Number(c.spend), roas: Number(c.roas || 0) }));

  const funnel = useMemo(() => {
    const impr = data.campaigns.reduce((s, c) => s + Number(c.impressions || 0), 0);
    const clicks = data.campaigns.reduce((s, c) => s + Number(c.clicks || 0), 0);
    const conv = data.campaigns.reduce((s, c) => s + Number(c.conversions || 0), 0);
    return [
      { label: "Impressions", value: impr, color: "#4f46e5" },
      { label: "Clicks", value: clicks, color: "#8b5cf6" },
      { label: "Conversions", value: conv, color: "#10b981" },
    ];
  }, [data.campaigns]);

  return (
    <AdsFlowLayout title="Analytics & Reports" accountName={data.account?.name} onSync={data.sync} syncing={data.syncing}>
      <GuardGate data={data}>
        <div className="flex items-center justify-end mb-4 flex-wrap gap-2">
          <button onClick={() => toast.success("CSV exported")} className="h-9 px-3 rounded-lg bg-[#1a1a1a] border border-white/5 text-sm flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> CSV</button>
          <button onClick={() => toast.success("PDF generated")} className="h-9 px-3 rounded-lg bg-[#1a1a1a] border border-white/5 text-sm flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> PDF</button>
          <button onClick={() => toast.success("Weekly report scheduled")} className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Schedule</button>
        </div>

        {data.campaigns.length === 0 ? (
          <EmptyState title="No data to analyze" hint="Sync your Meta Ad Account to populate analytics." onSync={data.sync} syncing={data.syncing} />
        ) : (
          <>
            <Card className="p-4 mb-4">
              <h3 className="text-sm font-semibold mb-3">Performance by campaign</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={perfBar}>
                  <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }} />
                  <Bar dataKey="spend" fill="#4f46e5" name={`Spend (${sym})`} />
                  <Bar dataKey="clicks" fill="#10b981" name="Clicks" />
                  <Bar dataKey="conversions" fill="#f59e0b" name="Conv." />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3">Funnel — Impressions → Conversions</h3>
                {(() => {
                  const max = Math.max(1, ...funnel.map(s => s.value));
                  return (
                    <div className="space-y-2">
                      {funnel.map(s => (
                        <div key={s.label}>
                          <div className="flex justify-between text-xs mb-1"><span>{s.label}</span><span className="text-[#9ca3af]">{s.value.toLocaleString()}</span></div>
                          <div className="h-8 rounded-md overflow-hidden bg-[#0f0f0f]">
                            <div className="h-full" style={{ width: `${(s.value / max) * 100}%`, background: s.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3">Spend vs ROAS per campaign</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <ScatterChart>
                    <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="spend" name="Spend" unit={sym} stroke="#9ca3af" fontSize={11} />
                    <YAxis type="number" dataKey="roas" name="ROAS" unit="x" stroke="#9ca3af" fontSize={11} />
                    <ZAxis range={[100, 600]} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }} />
                    <Scatter data={scatter} fill="#4f46e5" />
                  </ScatterChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </>
        )}
      </GuardGate>
    </AdsFlowLayout>
  );
}
