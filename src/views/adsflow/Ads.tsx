"use client";
import { useState } from "react";
import AdsFlowLayout, { Card, StatusBadge } from "./Layout";
import { mockAds } from "./mockData";
import { Plus, LayoutGrid, List, Image as ImageIcon, Film, Layers } from "lucide-react";
import { toast } from "sonner";

const formatIcon = (f: string) => f === "video" ? <Film className="h-3 w-3" /> : f === "carousel" ? <Layers className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />;

export default function AdsFlowAds() {
  const [view, setView] = useState<"grid" | "list">("grid");

  return (
    <AdsFlowLayout title="Ads">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#9ca3af]">Your ad creatives across campaigns.</p>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#1a1a1a] border border-white/5 rounded-lg p-0.5">
            <button onClick={() => setView("grid")} className={`h-8 w-8 rounded ${view === "grid" ? "bg-white/10" : ""} flex items-center justify-center`}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setView("list")} className={`h-8 w-8 rounded ${view === "list" ? "bg-white/10" : ""} flex items-center justify-center`}><List className="h-4 w-4" /></button>
          </div>
          <button onClick={() => toast.info("Open Ad composer")} className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4" /> Create Ad</button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockAds.map(ad => (
            <Card key={ad.id} className="overflow-hidden hover:border-white/10 transition-colors cursor-pointer">
              <div className="aspect-video bg-[#0f0f0f] relative">
                <img src={ad.thumb} alt={ad.name} className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-md bg-black/60 backdrop-blur border border-white/10 flex items-center gap-1">
                  {formatIcon(ad.format)} {ad.format.replace("_", " ")}
                </span>
                <span className="absolute top-2 right-2"><StatusBadge status={ad.status} /></span>
              </div>
              <div className="p-3">
                <div className="font-medium text-sm">{ad.name}</div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div><div className="text-[#9ca3af]">CTR</div><div className="font-medium">{ad.ctr}%</div></div>
                  <div><div className="text-[#9ca3af]">ROAS</div><div className="font-medium text-emerald-400">{ad.roas}x</div></div>
                  <div><div className="text-[#9ca3af]">Spend</div><div className="font-medium">€{ad.spend}</div></div>
                </div>
              </div>
            </Card>
          ))}
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
              {mockAds.map(ad => (
                <tr key={ad.id} className="border-t border-white/5">
                  <td className="p-3 flex items-center gap-3"><img src={ad.thumb} className="h-10 w-10 rounded object-cover" alt="" /><span className="font-medium">{ad.name}</span></td>
                  <td className="p-3 text-[#9ca3af] capitalize">{ad.format.replace("_", " ")}</td>
                  <td className="p-3"><StatusBadge status={ad.status} /></td>
                  <td className="p-3 text-right">€{ad.spend}</td>
                  <td className="p-3 text-right">{ad.ctr}%</td>
                  <td className="p-3 text-right text-emerald-400">{ad.roas}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </AdsFlowLayout>
  );
}
