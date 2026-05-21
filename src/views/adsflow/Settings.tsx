"use client";
import { useState } from "react";
import AdsFlowLayout, { Card } from "./Layout";
import { useAdsflowData, GuardGate, EmptyState } from "./useAdsflowData";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

const tabs = ["Account", "Ad Accounts", "Facebook Pixel"] as const;

export default function AdsFlowSettings() {
  const data = useAdsflowData();
  const [tab, setTab] = useState<typeof tabs[number]>("Ad Accounts");

  return (
    <AdsFlowLayout title="Settings" accountName={data.account?.name} onSync={data.sync} syncing={data.syncing}>
      <GuardGate data={data}>
        <div className="flex gap-1 mb-4 border-b border-white/5">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm border-b-2 ${tab === t ? "border-indigo-500 text-indigo-300" : "border-transparent text-[#9ca3af]"}`}>{t}</button>
          ))}
        </div>

        {tab === "Account" && (
          <Card className="p-5 max-w-2xl space-y-3">
            <div className="text-sm"><span className="text-[#9ca3af]">Project ID:</span> <span className="font-mono">{data.projectId}</span></div>
            <div className="text-sm"><span className="text-[#9ca3af]">Connected Meta account:</span> {data.account?.name || "—"}</div>
            <div className="text-sm"><span className="text-[#9ca3af]">Currency:</span> {data.account?.currency || "—"} • <span className="text-[#9ca3af]">Timezone:</span> {data.account?.timezone || "—"}</div>
          </Card>
        )}

        {tab === "Ad Accounts" && (
          <Card className="p-5 max-w-2xl">
            <h3 className="text-sm font-semibold mb-3">Meta Ad Account (system token)</h3>
            {!data.account ? (
              <EmptyState title="No Meta account connected" hint="Sync to pull the account configured via META_ACCESS_TOKEN." onSync={data.sync} syncing={data.syncing} />
            ) : (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f0f0f] border border-white/5">
                <div>
                  <div className="text-sm font-medium">{data.account.name}</div>
                  <div className="text-[11px] text-[#9ca3af] font-mono">act_{data.account.account_id.replace(/^act_/, "")} • {data.account.currency}</div>
                  {data.account.page_name && <div className="text-[11px] text-[#9ca3af]">Page: {data.account.page_name}</div>}
                </div>
                <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="h-3 w-3" /> Active</span>
              </div>
            )}
          </Card>
        )}

        {tab === "Facebook Pixel" && (
          <Card className="p-5 max-w-2xl">
            {data.pixels.length === 0 ? (
              <EmptyState title="No pixels synced" onSync={data.sync} syncing={data.syncing} />
            ) : (
              <div className="space-y-3">
                {data.pixels.map(p => (
                  <div key={p.id} className="p-3 rounded-lg bg-[#0f0f0f] border border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{p.name || "Pixel"}</div>
                        <div className="text-[11px] text-[#9ca3af] font-mono">{p.pixel_id}</div>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(p.pixel_id); toast.success("Copied"); }} className="h-8 px-2 rounded-md hover:bg-white/5 text-[#9ca3af]"><Copy className="h-3.5 w-3.5" /></button>
                    </div>
                    {p.code_snippet && (
                      <pre className="mt-3 p-3 rounded-md bg-black/40 border border-white/5 text-[10px] text-[#9ca3af] overflow-x-auto whitespace-pre-wrap">{p.code_snippet}</pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </GuardGate>
    </AdsFlowLayout>
  );
}
