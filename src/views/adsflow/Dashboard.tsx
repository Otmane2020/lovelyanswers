"use client";
import { useState, useMemo } from "react";
import AdsFlowLayout, { Card } from "./Layout";
import { useAdsflowData, GuardGate, EmptyState } from "./useAdsflowData";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function fmt(v: number, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, ...opts }).format(v || 0);
}

function KpiCard({ label, value, prefix = "", suffix = "" }: { label: string; value: number; prefix?: string; suffix?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-[#9ca3af]">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{prefix}{fmt(value)}{suffix}</div>
    </Card>
  );
}

export default function AdsFlowDashboard() {
  const data = useAdsflowData();
  const [range, setRange] = useState("30d");
  const curr = data.account?.currency || "EUR";
  const sym = curr === "USD" ? "$" : curr === "GBP" ? "£" : "€";

  const totals = useMemo(() => {
    const c = data.campaigns;
    const spend = c.reduce((s, x) => s + Number(x.spend || 0), 0);
    const impr = c.reduce((s, x) => s + Number(x.impressions || 0), 0);
    const clicks = c.reduce((s, x) => s + Number(x.clicks || 0), 0);
    const conv = c.reduce((s, x) => s + Number(x.conversions || 0), 0);
    const ctr = impr ? (clicks / impr) * 100 : 0;
    const cpc = clicks ? spend / clicks : 0;
    const cpm = impr ? (spend / impr) * 1000 : 0;
    const roasAvg = c.length ? c.reduce((s, x) => s + Number(x.roas || 0), 0) / c.length : 0;
    return { spend, impr, clicks, conv, ctr, cpc, cpm, roas: roasAvg };
  }, [data.campaigns]);

  const budgetDist = data.campaigns
    .filter(c => Number(c.spend) > 0)
    .slice(0, 6)
    .map(c => ({ name: (c.name || "Untitled").slice(0, 28), value: Number(c.spend) }));

  const topClicks = [...data.campaigns]
    .sort((a, b) => Number(b.clicks || 0) - Number(a.clicks || 0))
    .slice(0, 5)
    .map(c => ({ name: (c.name || "—").slice(0, 24), clicks: Number(c.clicks || 0) }));

  // Cumulative-style spend chart over campaigns
  const spendSeries = data.campaigns.slice(0, 30).map(c => ({
    date: (c.name || "").slice(0, 12),
    spend: Number(c.spend || 0),
    revenue: Number(c.spend || 0) * Number(c.roas || 0),
  }));

  return (
    <AdsFlowLayout title="Dashboard" accountName={data.account?.name} onSync={data.sync} syncing={data.syncing}>
      <GuardGate data={data}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-[#9ca3af]">Live overview from your Meta Ad Account{data.account ? ` • ${data.account.account_id}` : ""}.</p>
          <div className="flex items-center gap-2">
            {["today", "7d", "30d", "custom"].map(r => (
              <button key={r} onClick={() => setRange(r)} className={`h-9 px-3 rounded-lg text-sm border flex items-center gap-1.5 ${range === r ? "bg-indigo-600/15 border-indigo-500/30 text-indigo-200" : "bg-[#1a1a1a] border-white/5 text-[#9ca3af] hover:bg-white/5"}`}>
                {r === "custom" && <Calendar className="h-3.5 w-3.5" />}
                {r === "today" ? "Today" : r === "7d" ? "Last 7d" : r === "30d" ? "Last 30d" : "Custom"}
              </button>
            ))}
          </div>
        </div>

        {data.campaigns.length === 0 ? (
          <EmptyState title="No campaigns synced yet" hint="Click below to pull campaigns, ad sets and ads from your Meta Ad Account." onSync={data.sync} syncing={data.syncing} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <KpiCard label="Total Spend" value={totals.spend} prefix={sym} />
              <KpiCard label="Impressions" value={totals.impr} />
              <KpiCard label="Clicks" value={totals.clicks} />
              <KpiCard label="Avg CTR" value={totals.ctr} suffix="%" />
              <KpiCard label="Conversions" value={totals.conv} />
              <KpiCard label="Avg ROAS" value={totals.roas} suffix="x" />
              <KpiCard label="CPM" value={totals.cpm} prefix={sym} />
              <KpiCard label="CPC" value={totals.cpc} prefix={sym} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <Card className="p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold mb-3">Spend vs Revenue by campaign</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={spendSeries}>
                    <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="spend" stroke="#4f46e5" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3">Spend distribution</h3>
                {budgetDist.length === 0 ? (
                  <div className="text-xs text-[#9ca3af] text-center py-10">No spend recorded.</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={budgetDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                          {budgetDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 mt-2">
                      {budgetDist.map((b, i) => (
                        <div key={b.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-[#9ca3af] truncate"><span className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />{b.name}</span>
                          <span>{sym}{fmt(b.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <Card className="p-4 lg:col-span-1">
                <h3 className="text-sm font-semibold mb-3">Top campaigns — Clicks</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topClicks} layout="vertical">
                    <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
                    <XAxis type="number" stroke="#9ca3af" fontSize={11} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} width={120} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }} />
                    <Bar dataKey="clicks" fill="#4f46e5" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4 lg:col-span-2 overflow-x-auto">
                <h3 className="text-sm font-semibold mb-3">Top performing ads</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#9ca3af] text-xs">
                      <th className="text-left font-medium pb-2">Ad</th>
                      <th className="text-right font-medium pb-2">Spend</th>
                      <th className="text-right font-medium pb-2">Clicks</th>
                      <th className="text-right font-medium pb-2">CTR</th>
                      <th className="text-right font-medium pb-2">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.ads].sort((a, b) => Number(b.spend || 0) - Number(a.spend || 0)).slice(0, 6).map(a => (
                      <tr key={a.id} className="border-t border-white/5">
                        <td className="py-2.5 font-medium">{a.name || a.ad_id}</td>
                        <td className="py-2.5 text-right">{sym}{fmt(Number(a.spend || 0))}</td>
                        <td className="py-2.5 text-right">{fmt(Number(a.clicks || 0))}</td>
                        <td className="py-2.5 text-right">{fmt(Number(a.ctr || 0))}%</td>
                        <td className="py-2.5 text-right text-emerald-400">{fmt(Number(a.roas || 0))}x</td>
                      </tr>
                    ))}
                    {data.ads.length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-xs text-[#9ca3af]">No ads yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          </>
        )}
      </GuardGate>
    </AdsFlowLayout>
  );
}
