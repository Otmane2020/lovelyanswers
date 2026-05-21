"use client";
import { useState } from "react";
import AdsFlowLayout, { Card, StatusBadge } from "./Layout";
import { useAdsflowData, GuardGate, EmptyState } from "./useAdsflowData";
import { LayoutGrid, List, Image as ImageIcon, Film, Layers } from "lucide-react";

function getThumb(creative: any): string | null {
  if (!creative) return null;
  return creative?.image_url || creative?.thumbnail_url || creative?.object_story_spec?.link_data?.picture || null;
}
function getFormat(creative: any): string {
  if (!creative) return "single_image";
  if (creative?.object_story_spec?.video_data) return "video";
  if (creative?.object_story_spec?.link_data?.child_attachments) return "carousel";
  return "single_image";
}
const formatIcon = (f: string) => f === "video" ? <Film className="h-3 w-3" /> : f === "carousel" ? <Layers className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />;

export default function AdsFlowAds() {
  const data = useAdsflowData();
  const [view, setView] = useState<"grid" | "list">("grid");
  const sym = data.account?.currency === "USD" ? "$" : data.account?.currency === "GBP" ? "£" : "€";

  return (
    <AdsFlowLayout title="Ads" accountName={data.account?.name} onSync={data.sync} syncing={data.syncing}>
      <GuardGate data={data}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[#9ca3af]">Your live ad creatives synced from Meta.</p>
          <div className="flex bg-[#1a1a1a] border border-white/5 rounded-lg p-0.5">
            <button onClick={() => setView("grid")} className={`h-8 w-8 rounded ${view === "grid" ? "bg-white/10" : ""} flex items-center justify-center`}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setView("list")} className={`h-8 w-8 rounded ${view === "list" ? "bg-white/10" : ""} flex items-center justify-center`}><List className="h-4 w-4" /></button>
          </div>
        </div>

        {data.ads.length === 0 ? (
          <EmptyState title="No ads synced" onSync={data.sync} syncing={data.syncing} />
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.ads.map(ad => {
              const thumb = getThumb(ad.creative);
              const format = getFormat(ad.creative);
              const status = (ad.status || "draft").toLowerCase();
              return (
                <Card key={ad.id} className="overflow-hidden hover:border-white/10 transition-colors">
                  <div className="aspect-video bg-[#0f0f0f] relative">
                    {thumb ? <img src={thumb} alt={ad.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#9ca3af] text-xs">No preview</div>}
                    <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-md bg-black/60 backdrop-blur border border-white/10 flex items-center gap-1">
                      {formatIcon(format)} {format.replace("_", " ")}
                    </span>
                    <span className="absolute top-2 right-2"><StatusBadge status={status === "active" ? "active" : status === "paused" ? "paused" : "draft"} /></span>
                  </div>
                  <div className="p-3">
                    <div className="font-medium text-sm truncate">{ad.name || ad.ad_id}</div>
                    <div className="text-[11px] text-[#9ca3af] font-mono">{ad.ad_id}</div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div><div className="text-[#9ca3af]">CTR</div><div className="font-medium">{Number(ad.ctr || 0).toFixed(2)}%</div></div>
                      <div><div className="text-[#9ca3af]">ROAS</div><div className="font-medium text-emerald-400">{Number(ad.roas || 0).toFixed(2)}x</div></div>
                      <div><div className="text-[#9ca3af]">Spend</div><div className="font-medium">{sym}{Number(ad.spend || 0).toFixed(2)}</div></div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#0f0f0f]/50 text-[#9ca3af] text-xs">
                <tr>
                  <th className="text-left p-3 font-medium">Ad</th>
                  <th className="text-left p-3 font-medium">Format</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Spend</th>
                  <th className="text-right p-3 font-medium">CTR</th>
                  <th className="text-right p-3 font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {data.ads.map(ad => {
                  const thumb = getThumb(ad.creative);
                  const format = getFormat(ad.creative);
                  const status = (ad.status || "draft").toLowerCase();
                  return (
                    <tr key={ad.id} className="border-t border-white/5">
                      <td className="p-3 flex items-center gap-3">
                        {thumb ? <img src={thumb} className="h-10 w-10 rounded object-cover" alt="" /> : <div className="h-10 w-10 rounded bg-[#0f0f0f]" />}
                        <div>
                          <div className="font-medium">{ad.name || ad.ad_id}</div>
                          <div className="text-[10px] text-[#9ca3af] font-mono">{ad.ad_id}</div>
                        </div>
                      </td>
                      <td className="p-3 text-[#9ca3af] capitalize">{format.replace("_", " ")}</td>
                      <td className="p-3"><StatusBadge status={status === "active" ? "active" : status === "paused" ? "paused" : "draft"} /></td>
                      <td className="p-3 text-right">{sym}{Number(ad.spend || 0).toFixed(2)}</td>
                      <td className="p-3 text-right">{Number(ad.ctr || 0).toFixed(2)}%</td>
                      <td className="p-3 text-right text-emerald-400">{Number(ad.roas || 0).toFixed(2)}x</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </GuardGate>
    </AdsFlowLayout>
  );
}
