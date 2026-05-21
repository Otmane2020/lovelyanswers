"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Bar, ComposedChart, CartesianGrid } from "recharts";

export default function OverviewTab({ projectId, account, refreshKey }: any) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [snaps, setSnaps] = useState<any[]>([]);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const [{ data: cps }, { data: ss }] = await Promise.all([
        supabase.from("meta_campaigns").select("*").eq("project_id", projectId),
        supabase.from("meta_roas_snapshots").select("*").eq("project_id", projectId).eq("level", "campaign").order("snapshot_date"),
      ]);
      setCampaigns(cps || []);
      setSnaps(ss || []);
    })();
  }, [projectId, refreshKey]);

  const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend || 0), 0);
  const totalRev = campaigns.reduce((s, c) => s + Number(c.revenue || 0), 0);
  const totalConv = campaigns.reduce((s, c) => s + Number(c.conversions || 0), 0);
  const totalImpr = campaigns.reduce((s, c) => s + Number(c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + Number(c.clicks || 0), 0);
  const roas = totalSpend > 0 ? totalRev / totalSpend : 0;
  const cpa = totalConv > 0 ? totalSpend / totalConv : 0;
  const ctr = totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0;

  // Aggregate by date
  const byDate: Record<string, { date: string; spend: number; revenue: number; roas: number }> = {};
  for (const s of snaps) {
    const d = s.snapshot_date;
    if (!byDate[d]) byDate[d] = { date: d, spend: 0, revenue: 0, roas: 0 };
    byDate[d].spend += Number(s.spend || 0);
    byDate[d].revenue += Number(s.revenue || 0);
  }
  const chart = Object.values(byDate).map(d => ({ ...d, roas: d.spend > 0 ? d.revenue / d.spend : 0 }));

  const sorted = [...campaigns].sort((a, b) => Number(b.roas || 0) - Number(a.roas || 0));
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3).reverse();

  const cur = account?.currency || "";
  const kpis = [
    { label: "Spend", value: `${totalSpend.toFixed(2)} ${cur}` },
    { label: "Revenue", value: `${totalRev.toFixed(2)} ${cur}` },
    { label: "ROAS", value: roas.toFixed(2) + "x" },
    { label: "CPA", value: cpa ? `${cpa.toFixed(2)} ${cur}` : "—" },
    { label: "Conversions", value: totalConv.toLocaleString() },
    { label: "Impressions", value: totalImpr.toLocaleString() },
    { label: "Clicks", value: totalClicks.toLocaleString() },
    { label: "CTR", value: `${ctr.toFixed(2)}%` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-2xl font-bold mt-1">{k.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {chart.length > 0 && (
        <Card><CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Spend & ROAS (30d)</p>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar yAxisId="l" dataKey="spend" fill="hsl(var(--primary))" opacity={0.6} />
              <Line yAxisId="r" type="monotone" dataKey="roas" stroke="hsl(var(--accent-foreground))" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm font-medium mb-2 text-emerald-600">Top performers</p>
          {top3.length === 0 ? <p className="text-xs text-muted-foreground">No data</p> :
            top3.map(c => (
              <div key={c.campaign_id} className="flex justify-between py-1 text-sm">
                <span className="truncate">{c.name}</span>
                <span className="font-mono">{Number(c.roas).toFixed(2)}x</span>
              </div>
            ))}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm font-medium mb-2 text-red-600">Bottom performers</p>
          {bottom3.length === 0 ? <p className="text-xs text-muted-foreground">No data</p> :
            bottom3.map(c => (
              <div key={c.campaign_id} className="flex justify-between py-1 text-sm">
                <span className="truncate">{c.name}</span>
                <span className="font-mono">{Number(c.roas).toFixed(2)}x</span>
              </div>
            ))}
        </CardContent></Card>
      </div>
    </div>
  );
}
