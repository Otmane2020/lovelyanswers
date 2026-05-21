"use client";
import AdsFlowLayout, { Card, StatusBadge } from "./Layout";
import { mockKpis, mockSpendRevenue, mockClicksByCampaign, mockBudgetDistribution, mockTopAds } from "./mockData";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState } from "react";

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function KpiCard({ label, value, change, prefix = "", suffix = "" }: { label: string; value: number; change: number; prefix?: string; suffix?: string }) {
  const up = change >= 0;
  const formatted = value >= 1000 ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return (
    <Card className="p-4">
      <div className="text-xs text-[#9ca3af]">{label}</div>
      <div className="mt-2 flex items-end justify-between">
        <div className="text-2xl font-semibold tracking-tight">{prefix}{formatted}{suffix}</div>
        <div className={`flex items-center gap-1 text-xs font-medium ${up ? "text-emerald-400" : "text-rose-400"}`}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(change)}%
        </div>
      </div>
    </Card>
  );
}

export default function AdsFlowDashboard() {
  const [range, setRange] = useState("30d");
  return (
    <AdsFlowLayout title="Dashboard">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-[#9ca3af]">Overview of all campaign performance.</p>
        <div className="flex items-center gap-2">
          {["today", "7d", "30d", "custom"].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`h-9 px-3 rounded-lg text-sm border transition-colors flex items-center gap-1.5 ${
                range === r ? "bg-indigo-600/15 border-indigo-500/30 text-indigo-200" : "bg-[#1a1a1a] border-white/5 text-[#9ca3af] hover:bg-white/5"
              }`}
            >
              {r === "custom" && <Calendar className="h-3.5 w-3.5" />}
              {r === "today" ? "Today" : r === "7d" ? "Last 7 days" : r === "30d" ? "Last 30 days" : "Custom"}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total Spend" value={mockKpis.spend.value} change={mockKpis.spend.change} prefix="€" />
        <KpiCard label="Impressions" value={mockKpis.impressions.value} change={mockKpis.impressions.change} />
        <KpiCard label="Clicks" value={mockKpis.clicks.value} change={mockKpis.clicks.change} />
        <KpiCard label="Avg CTR" value={mockKpis.ctr.value} change={mockKpis.ctr.change} suffix="%" />
        <KpiCard label="Conversions" value={mockKpis.conversions.value} change={mockKpis.conversions.change} />
        <KpiCard label="ROAS" value={mockKpis.roas.value} change={mockKpis.roas.change} suffix="x" />
        <KpiCard label="CPM" value={mockKpis.cpm.value} change={mockKpis.cpm.change} prefix="€" />
        <KpiCard label="CPC" value={mockKpis.cpc.value} change={mockKpis.cpc.change} prefix="€" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Spend vs Revenue — Last 30 days</h3>
            <div className="flex gap-3 text-[11px] text-[#9ca3af]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Spend</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Revenue</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={mockSpendRevenue}>
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
          <h3 className="text-sm font-semibold mb-3">Budget Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={mockBudgetDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {mockBudgetDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {mockBudgetDistribution.map((b, i) => (
              <div key={b.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[#9ca3af]"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{b.name}</span>
                <span>€{b.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Top 5 Campaigns — Clicks</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={mockClicksByCampaign} layout="vertical">
              <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
              <XAxis type="number" stroke="#9ca3af" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} width={120} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }} />
              <Bar dataKey="clicks" fill="#4f46e5" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3">Top Performing Ads</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#9ca3af] text-xs">
                  <th className="text-left font-medium pb-2">Ad</th>
                  <th className="text-left font-medium pb-2">Campaign</th>
                  <th className="text-right font-medium pb-2">Spend</th>
                  <th className="text-right font-medium pb-2">Clicks</th>
                  <th className="text-right font-medium pb-2">CTR</th>
                  <th className="text-right font-medium pb-2">ROAS</th>
                  <th className="text-right font-medium pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockTopAds.map(a => (
                  <tr key={a.id} className="border-t border-white/5">
                    <td className="py-2.5 font-medium">{a.name}</td>
                    <td className="py-2.5 text-[#9ca3af]">{a.campaign}</td>
                    <td className="py-2.5 text-right">€{a.spend}</td>
                    <td className="py-2.5 text-right">{a.clicks.toLocaleString()}</td>
                    <td className="py-2.5 text-right">{a.ctr}%</td>
                    <td className="py-2.5 text-right font-medium text-emerald-400">{a.roas}x</td>
                    <td className="py-2.5 text-right"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdsFlowLayout>
  );
}
