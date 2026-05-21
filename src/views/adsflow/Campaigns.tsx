"use client";
import { useState, useMemo } from "react";
import AdsFlowLayout, { Card, StatusBadge } from "./Layout";
import { useAdsflowData, GuardGate, EmptyState } from "./useAdsflowData";
import CreateCampaignWizard from "./CreateCampaignWizard";
import { Search, BarChart3, Plus } from "lucide-react";

export default function AdsFlowCampaigns() {
  const data = useAdsflowData();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const curr = data.account?.currency || "EUR";
  const sym = curr === "USD" ? "$" : curr === "GBP" ? "£" : "€";

  const filtered = useMemo(() => data.campaigns.filter(c => {
    const status = (c.status || "").toLowerCase();
    const matchStatus = statusFilter === "all" || status === statusFilter;
    const matchSearch = (c.name || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }), [data.campaigns, statusFilter, search]);

  return (
    <AdsFlowLayout title="Campaigns" accountName={data.account?.name} onSync={data.sync} syncing={data.syncing}>
      <GuardGate data={data}>
        <div className="flex items-center justify-between mb-4 gap-3">
          <p className="text-sm text-[#9ca3af]">All campaigns from your connected Meta Ad Account.</p>
          <button onClick={() => setWizardOpen(true)} className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white flex items-center gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> Create Campaign
          </button>
        </div>


        <Card className="p-3 mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-[#0f0f0f] border border-white/5 text-sm flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-[#9ca3af]" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent outline-none flex-1" placeholder="Search by name…" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 px-3 rounded-lg bg-[#0f0f0f] border border-white/5 text-sm">
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </Card>

        {data.campaigns.length === 0 ? (
          <EmptyState title="No campaigns synced" hint="Sync from Meta to pull all your live campaigns." onSync={data.sync} syncing={data.syncing} />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0f0f0f]/50">
                  <tr className="text-[#9ca3af] text-xs">
                    <th className="text-left p-3 font-medium">Campaign</th>
                    <th className="text-left p-3 font-medium">Objective</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Budget</th>
                    <th className="text-right p-3 font-medium">Spent</th>
                    <th className="text-right p-3 font-medium">Impressions</th>
                    <th className="text-right p-3 font-medium">CTR</th>
                    <th className="text-right p-3 font-medium">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const budget = Number(c.daily_budget || c.lifetime_budget || 0) / 100;
                    const status = ((c.status || "draft").toLowerCase());
                    return (
                      <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3">
                          <div className="font-medium">{c.name || c.campaign_id}</div>
                          <div className="text-[11px] text-[#9ca3af] font-mono">{c.campaign_id}</div>
                        </td>
                        <td className="p-3 text-[#9ca3af]">{c.objective || "—"}</td>
                        <td className="p-3"><StatusBadge status={status === "active" ? "active" : status === "paused" ? "paused" : "draft"} /></td>
                        <td className="p-3 text-right">{budget ? `${sym}${budget.toFixed(2)} ${c.daily_budget ? "/d" : "/lt"}` : "—"}</td>
                        <td className="p-3 text-right">{sym}{Number(c.spend || 0).toFixed(2)}</td>
                        <td className="p-3 text-right">{Number(c.impressions || 0).toLocaleString()}</td>
                        <td className="p-3 text-right">{Number(c.ctr || 0).toFixed(2)}%</td>
                        <td className="p-3 text-right font-medium text-emerald-400">{Number(c.roas || 0).toFixed(2)}x</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="p-12 text-center text-[#9ca3af]"><BarChart3 className="h-6 w-6 mx-auto mb-2 opacity-40" />No campaigns match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </GuardGate>
    </AdsFlowLayout>
  );
}
