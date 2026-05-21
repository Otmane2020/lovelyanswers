"use client";
import AdsFlowLayout, { Card } from "./Layout";
import { useAdsflowData, GuardGate, EmptyState } from "./useAdsflowData";

export default function AdsFlowBilling() {
  const data = useAdsflowData();
  const sym = data.account?.currency === "USD" ? "$" : data.account?.currency === "GBP" ? "£" : "€";
  const totalSpend = data.campaigns.reduce((s, c) => s + Number(c.spend || 0), 0);
  const totalRevenue = data.campaigns.reduce((s, c) => s + Number(c.spend || 0) * Number(c.roas || 0), 0);

  return (
    <AdsFlowLayout title="Billing" accountName={data.account?.name} onSync={data.sync} syncing={data.syncing}>
      <GuardGate data={data}>
        {!data.account ? (
          <EmptyState title="No Meta account connected" onSync={data.sync} syncing={data.syncing} />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <Card className="p-5">
                <div className="text-xs text-[#9ca3af]">Total ad spend</div>
                <div className="text-2xl font-semibold mt-1">{sym}{totalSpend.toFixed(2)}</div>
                <div className="text-[11px] text-[#9ca3af] mt-1">Across {data.campaigns.length} campaigns</div>
              </Card>
              <Card className="p-5">
                <div className="text-xs text-[#9ca3af]">Attributed revenue</div>
                <div className="text-2xl font-semibold mt-1 text-emerald-400">{sym}{totalRevenue.toFixed(2)}</div>
              </Card>
              <Card className="p-5">
                <div className="text-xs text-[#9ca3af]">Account currency</div>
                <div className="text-2xl font-semibold mt-1">{data.account?.currency}</div>
                <div className="text-[11px] text-[#9ca3af] mt-1">{data.account?.timezone}</div>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <div className="p-4 border-b border-white/5"><h3 className="text-sm font-semibold">Spend per campaign</h3></div>
              <table className="w-full text-sm">
                <thead className="text-[#9ca3af] text-xs"><tr><th className="text-left p-3">Campaign</th><th className="text-right p-3">Spend</th><th className="text-right p-3">ROAS</th><th className="text-right p-3">Revenue</th></tr></thead>
                <tbody>
                  {data.campaigns.map(c => {
                    const sp = Number(c.spend || 0);
                    const ro = Number(c.roas || 0);
                    return (
                      <tr key={c.id} className="border-t border-white/5">
                        <td className="p-3 font-medium">{c.name || c.campaign_id}</td>
                        <td className="p-3 text-right">{sym}{sp.toFixed(2)}</td>
                        <td className="p-3 text-right">{ro.toFixed(2)}x</td>
                        <td className="p-3 text-right text-emerald-400">{sym}{(sp * ro).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {data.campaigns.length === 0 && (
                    <tr><td colSpan={4} className="p-6 text-center text-xs text-[#9ca3af]">No spend data.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </GuardGate>
    </AdsFlowLayout>
  );
}
