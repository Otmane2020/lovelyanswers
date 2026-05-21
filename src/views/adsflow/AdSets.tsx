"use client";
import AdsFlowLayout, { Card, StatusBadge } from "./Layout";
import { useAdsflowData, GuardGate, EmptyState } from "./useAdsflowData";

export default function AdsFlowAdSets() {
  const data = useAdsflowData();
  const sym = data.account?.currency === "USD" ? "$" : data.account?.currency === "GBP" ? "£" : "€";
  const campMap = new Map(data.campaigns.map(c => [c.campaign_id, c.name]));

  return (
    <AdsFlowLayout title="Ad Sets" accountName={data.account?.name} onSync={data.sync} syncing={data.syncing}>
      <GuardGate data={data}>
        <p className="text-sm text-[#9ca3af] mb-4">Targeting & budgets per ad set, synced from Meta.</p>
        {data.adsets.length === 0 ? (
          <EmptyState title="No ad sets synced" onSync={data.sync} syncing={data.syncing} />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0f0f0f]/50 text-[#9ca3af] text-xs">
                  <tr>
                    <th className="text-left p-3 font-medium">Ad Set</th>
                    <th className="text-left p-3 font-medium">Campaign</th>
                    <th className="text-left p-3 font-medium">Targeting</th>
                    <th className="text-right p-3 font-medium">Budget</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Spend</th>
                    <th className="text-right p-3 font-medium">CPC</th>
                    <th className="text-right p-3 font-medium">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.adsets.map(a => {
                    const budget = Number(a.daily_budget || a.lifetime_budget || 0) / 100;
                    const status = ((a.status || "draft").toLowerCase());
                    return (
                      <tr key={a.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-medium">{a.name || a.adset_id}</td>
                        <td className="p-3 text-[#9ca3af]">{campMap.get(a.campaign_id) || a.campaign_id}</td>
                        <td className="p-3 text-[#9ca3af] max-w-[260px] truncate" title={a.targeting_summary || ""}>{a.targeting_summary || "—"}</td>
                        <td className="p-3 text-right">{budget ? `${sym}${budget.toFixed(2)}` : "—"}</td>
                        <td className="p-3"><StatusBadge status={status === "active" ? "active" : status === "paused" ? "paused" : "draft"} /></td>
                        <td className="p-3 text-right">{sym}{Number(a.spend || 0).toFixed(2)}</td>
                        <td className="p-3 text-right">{sym}{Number(a.cpc || 0).toFixed(2)}</td>
                        <td className="p-3 text-right">{Number(a.ctr || 0).toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </GuardGate>
    </AdsFlowLayout>
  );
}
