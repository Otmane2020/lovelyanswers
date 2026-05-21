"use client";
import { useState } from "react";
import AdsFlowLayout, { Card } from "./Layout";
import { mockAudiences } from "./mockData";
import { Plus, Users, Globe, Smartphone, MessageCircle, FileText } from "lucide-react";
import { toast } from "sonner";

const tabs = [
  { id: "saved", label: "Saved Audiences" },
  { id: "custom", label: "Custom Audiences" },
  { id: "lookalike", label: "Lookalike Audiences" },
] as const;

export default function AdsFlowAudiences() {
  const [tab, setTab] = useState<typeof tabs[number]["id"]>("saved");
  const data = mockAudiences[tab];

  return (
    <AdsFlowLayout title="Audiences">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#9ca3af]">Manage your saved, custom and lookalike audiences.</p>
        <button onClick={() => toast.info("Open audience builder")} className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4" /> Create Audience</button>
      </div>

      <div className="flex gap-1 mb-4 border-b border-white/5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm border-b-2 transition-colors ${tab === t.id ? "border-indigo-500 text-indigo-300" : "border-transparent text-[#9ca3af] hover:text-[#f1f1f1]"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "custom" && (
        <Card className="p-4 mb-4">
          <div className="text-xs font-medium text-[#9ca3af] mb-3">Create Custom Audience — choose a source</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { icon: FileText, label: "Customer List", desc: "Upload CSV" },
              { icon: Globe, label: "Website Traffic", desc: "Pixel-based" },
              { icon: Smartphone, label: "App Activity", desc: "SDK events" },
              { icon: MessageCircle, label: "Engagement", desc: "Video, page, leads" },
            ].map(s => (
              <button key={s.label} onClick={() => toast.info(`${s.label} flow`)} className="p-3 rounded-xl bg-[#0f0f0f] border border-white/5 hover:border-indigo-500/30 text-left">
                <s.icon className="h-5 w-5 text-indigo-300 mb-2" />
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-[11px] text-[#9ca3af]">{s.desc}</div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0f0f0f]/50 text-[#9ca3af] text-xs">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-right p-3 font-medium">Size</th>
              {tab === "custom" && <th className="text-left p-3 font-medium">Status</th>}
              <th className="text-right p-3 font-medium">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a: any) => (
              <tr key={a.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="p-3 font-medium flex items-center gap-2"><Users className="h-4 w-4 text-indigo-300" />{a.name}</td>
                <td className="p-3 text-[#9ca3af]">{a.type}</td>
                <td className="p-3 text-right">{a.size.toLocaleString()}</td>
                {tab === "custom" && <td className="p-3"><span className={`text-[11px] px-2 py-0.5 rounded-md ${a.status === "ready" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{a.status}</span></td>}
                <td className="p-3 text-right text-[#9ca3af]">{a.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AdsFlowLayout>
  );
}
