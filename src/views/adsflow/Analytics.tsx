"use client";
import AdsFlowLayout, { Card } from "./Layout";
import { mockSpendRevenue, mockCampaigns } from "./mockData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";
import { Download, FileText, Mail } from "lucide-react";
import { toast } from "sonner";

const breakdowns = ["Campaign", "Ad Set", "Ad", "Day", "Age", "Gender", "Placement", "Country", "Device"];

export default function AdsFlowAnalytics() {
  const scatterData = mockCampaigns.filter(c => c.spent > 0).map(c => ({ name: c.name, spend: c.spent, roas: c.roas }));

  return (
    <AdsFlowLayout title="Analytics & Reports">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <select className="h-9 px-3 rounded-lg bg-[#1a1a1a] border border-white/5 text-sm">
            <option>Last 30 days</option><option>Last 7 days</option><option>This month</option>
          </select>
          <select className="h-9 px-3 rounded-lg bg-[#1a1a1a] border border-white/5 text-sm">
            <option>Breakdown: Campaign</option>
            {breakdowns.map(b => <option key={b}>By {b}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success("CSV exported")} className="h-9 px-3 rounded-lg bg-[#1a1a1a] border border-white/5 text-sm flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> CSV</button>
          <button onClick={() => toast.success("PDF generated")} className="h-9 px-3 rounded-lg bg-[#1a1a1a] border border-white/5 text-sm flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> PDF</button>
          <button onClick={() => toast.success("Weekly report scheduled")} className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Schedule</button>
        </div>
      </div>

      <Card className="p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3">Impressions, Clicks & Conversions over time</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={mockSpendRevenue.map((d, i) => ({ ...d, clicks: 200 + i * 8 + Math.round(Math.random() * 50), conversions: 20 + Math.round(Math.random() * 30) }))}>
            <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }} />
            <Line dataKey="spend" stroke="#4f46e5" strokeWidth={2} dot={false} name="Impressions (k)" />
            <Line dataKey="clicks" stroke="#10b981" strokeWidth={2} dot={false} name="Clicks" />
            <Line dataKey="conversions" stroke="#f59e0b" strokeWidth={2} dot={false} name="Conversions" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Heatmap — Day × Hour Performance</h3>
          <Heatmap />
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Funnel — Reach → Conversion</h3>
          <Funnel />
        </Card>
      </div>

      <Card className="p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3">Spend vs ROAS per Campaign</h3>
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart>
            <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="spend" name="Spend" unit="€" stroke="#9ca3af" fontSize={11} />
            <YAxis type="number" dataKey="roas" name="ROAS" unit="x" stroke="#9ca3af" fontSize={11} />
            <ZAxis range={[100, 600]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }} />
            <Scatter data={scatterData} fill="#4f46e5" />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Customize Columns</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {["Impressions", "Reach", "Frequency", "CPM", "CTR", "CPC", "Clicks", "Likes", "Comments", "Shares", "Video Views", "ThruPlays", "Conversions", "CPA", "ROAS", "Revenue", "Add to Cart", "Spend", "Budget", "% Spent"].map(c => (
            <label key={c} className="flex items-center gap-2 p-2 rounded-md bg-[#0f0f0f] border border-white/5">
              <input type="checkbox" defaultChecked className="accent-indigo-500" />
              <span>{c}</span>
            </label>
          ))}
        </div>
      </Card>
    </AdsFlowLayout>
  );
}

function Heatmap() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-[40px_repeat(24,1fr)] gap-0.5 text-[9px] text-[#9ca3af] min-w-[500px]">
        <div></div>
        {Array.from({ length: 24 }).map((_, h) => <div key={h} className="text-center">{h}</div>)}
        {days.map((d, di) => (
          <>
            <div key={d} className="flex items-center text-[10px]">{d}</div>
            {Array.from({ length: 24 }).map((_, h) => {
              const v = Math.sin(h / 4 + di) * 0.5 + 0.5;
              return <div key={`${d}-${h}`} className="h-5 rounded-sm" style={{ background: `rgba(79,70,229,${0.1 + v * 0.7})` }} />;
            })}
          </>
        ))}
      </div>
    </div>
  );
}

function Funnel() {
  const stages = [
    { label: "Reach", value: 1240000, color: "#4f46e5" },
    { label: "Impressions", value: 6960210, color: "#6366f1" },
    { label: "Clicks", value: 142840, color: "#8b5cf6" },
    { label: "Conversions", value: 4218, color: "#10b981" },
  ];
  const max = Math.max(...stages.map(s => s.value));
  return (
    <div className="space-y-2">
      {stages.map(s => (
        <div key={s.label}>
          <div className="flex justify-between text-xs mb-1"><span>{s.label}</span><span className="text-[#9ca3af]">{s.value.toLocaleString()}</span></div>
          <div className="h-8 rounded-md overflow-hidden bg-[#0f0f0f]">
            <div className="h-full transition-all" style={{ width: `${(s.value / max) * 100}%`, background: s.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
