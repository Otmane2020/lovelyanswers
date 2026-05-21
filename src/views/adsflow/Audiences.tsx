"use client";
import { useState, useMemo } from "react";
import AdsFlowLayout, { Card } from "./Layout";
import { useAdsflowData, GuardGate, EmptyState } from "./useAdsflowData";
import { Users } from "lucide-react";

const tabs = [
  { id: "saved", label: "Saved" },
  { id: "custom", label: "Custom Audiences" },
  { id: "lookalike", label: "Lookalikes" },
] as const;

export default function AdsFlowAudiences() {
  const data = useAdsflowData();
  const [tab, setTab] = useState<typeof tabs[number]["id"]>("custom");

  const filtered = useMemo(() => {
    return data.audiences.filter(a => {
      const t = (a.type || "").toLowerCase();
      const sub = (a.subtype || "").toLowerCase();
      if (tab === "lookalike") return t.includes("lookalike") || sub.includes("lookalike");
      if (tab === "custom") return t.includes("custom") && !t.includes("lookalike");
      return !t.includes("custom") && !t.includes("lookalike");
    });
  }, [data.audiences, tab]);

  return (
    <AdsFlowLayout title="Audiences" accountName={data.account?.name} onSync={data.sync} syncing={data.syncing}>
      <GuardGate data={data}>
        <p className="text-sm text-[#9ca3af] mb-4">Custom & lookalike audiences synced from your Meta Ad Account.</p>

        <div className="flex gap-1 mb-4 border-b border-white/5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm border-b-2 ${tab === t.id ? "border-indigo-500 text-indigo-300" : "border-transparent text-[#9ca3af] hover:text-[#f1f1f1]"}`}>{t.label}</button>
          ))}
        </div>

        {data.audiences.length === 0 ? (
          <EmptyState title="No audiences synced" onSync={data.sync} syncing={data.syncing} />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#0f0f0f]/50 text-[#9ca3af] text-xs">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Subtype</th>
                  <th className="text-right p-3 font-medium">Approx. size</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 font-medium flex items-center gap-2"><Users className="h-4 w-4 text-indigo-300" />{a.name}</td>
                    <td className="p-3 text-[#9ca3af]">{a.type}</td>
                    <td className="p-3 text-[#9ca3af]">{a.subtype || "—"}</td>
                    <td className="p-3 text-right">{Number(a.approximate_count || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-xs text-[#9ca3af]">No audiences in this category.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        )}
      </GuardGate>
    </AdsFlowLayout>
  );
}
