"use client";
import { useState } from "react";
import AdsFlowLayout, { Card } from "./Layout";
import { mockCreatives } from "./mockData";
import { Upload, Download, Trash2, Plus, Image as ImageIcon, Film } from "lucide-react";
import { toast } from "sonner";

export default function AdsFlowCreatives() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? mockCreatives : mockCreatives.filter(c => c.type === filter);

  return (
    <AdsFlowLayout title="Creative Library">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#9ca3af]">All your uploaded images and videos.</p>
        <button onClick={() => toast.success("Upload started")} className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center gap-2"><Upload className="h-4 w-4" /> Upload</button>
      </div>

      <div onClick={() => toast.info("File picker would open")} className="rounded-2xl border-dashed border-2 border-white/10 bg-[#1a1a1a] p-6 mb-4 text-center hover:border-indigo-500/30 transition-colors cursor-pointer">
        <Upload className="h-8 w-8 mx-auto text-[#9ca3af] mb-2" />
        <div className="text-sm font-medium">Drop files here or click to upload</div>
        <div className="text-xs text-[#9ca3af] mt-1">JPG, PNG, WEBP, MP4, MOV — up to 4GB per file</div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {["all", "image", "video"].map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`h-8 px-3 rounded-md text-xs capitalize border ${filter === t ? "bg-indigo-600/15 border-indigo-500/30 text-indigo-200" : "bg-[#1a1a1a] border-white/5 text-[#9ca3af]"}`}>{t}</button>
        ))}
        <select className="h-8 px-3 rounded-md bg-[#1a1a1a] border border-white/5 text-xs ml-auto">
          <option>Sort: Most Recent</option><option>Best CTR</option><option>Best ROAS</option><option>Most Used</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map(c => (
          <Card key={c.id} className="overflow-hidden hover:border-white/10 transition-colors">
            <div className="aspect-square bg-[#0f0f0f] relative">
              <img src={c.thumb} alt={c.name} className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-md bg-black/60 border border-white/10 flex items-center gap-1">
                {c.type === "video" ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />} {c.dims}
              </span>
            </div>
            <div className="p-3">
              <div className="text-xs font-medium truncate">{c.name}</div>
              <div className="text-[10px] text-[#9ca3af] mt-1">Used in {c.usedIn} ads • CTR {c.ctr}% • ROAS {c.roas}x</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {c.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[#9ca3af]">{t}</span>)}
              </div>
              <div className="flex gap-1 mt-2">
                <button onClick={() => toast.success("Use in new ad")} className="flex-1 h-7 rounded-md bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 text-[10px] flex items-center justify-center gap-1"><Plus className="h-3 w-3" /> Use</button>
                <button onClick={() => toast.success("Downloaded")} className="h-7 w-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center"><Download className="h-3 w-3" /></button>
                <button onClick={() => toast.success("Deleted")} className="h-7 w-7 rounded-md bg-rose-500/15 text-rose-400 flex items-center justify-center"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AdsFlowLayout>
  );
}
