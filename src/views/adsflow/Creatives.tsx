"use client";
import { useEffect, useMemo, useState } from "react";
import AdsFlowLayout, { Card } from "./Layout";
import { useAdsflowData, GuardGate } from "./useAdsflowData";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, Trash2, Image as ImageIcon, Film, Heart, MessageCircle, Send,
  Bookmark, MoreHorizontal, ThumbsUp, Share2, Globe, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

type Placement = "feed" | "story" | "right";

function getCreative(ad: any) {
  const c = ad.creative || {};
  const link = c?.object_story_spec?.link_data || {};
  return {
    image: c.image_url || c.thumbnail_url || null,
    pageName: c?.object_story_spec?.page_name || "Your Page",
    headline: link.name || ad.name || "Headline",
    primary: link.message || "Primary text describing the offer.",
    description: link.description || "",
    cta: (link.call_to_action?.type || "LEARN_MORE").replace(/_/g, " "),
    link: link.link || "#",
    domain: (() => { try { return new URL(link.link || "https://example.com").hostname.replace(/^www\./, ""); } catch { return "example.com"; } })(),
  };
}

function FeedPreview({ ad }: { ad: any }) {
  const c = getCreative(ad);
  return (
    <div className="w-full max-w-[360px] mx-auto rounded-xl overflow-hidden bg-white text-[#050505] shadow-xl">
      <div className="flex items-center gap-2 p-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold">
          {c.pageName.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate">{c.pageName}</div>
          <div className="text-[11px] text-[#65676B] flex items-center gap-1">Sponsored · <Globe className="h-2.5 w-2.5" /></div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-[#65676B]" />
      </div>
      <div className="px-3 pb-3 text-[13px] whitespace-pre-line line-clamp-4">{c.primary}</div>
      <div className="bg-[#f0f2f5] aspect-square">
        {c.image ? <img src={c.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#65676B] text-xs">No image</div>}
      </div>
      <div className="flex items-center justify-between px-3 py-2 bg-[#f7f8fa]">
        <div className="min-w-0">
          <div className="text-[10px] uppercase text-[#65676B] truncate">{c.domain}</div>
          <div className="text-[13px] font-semibold truncate">{c.headline}</div>
          {c.description && <div className="text-[11px] text-[#65676B] truncate">{c.description}</div>}
        </div>
        <button className="ml-2 shrink-0 text-[12px] font-semibold bg-[#e4e6eb] text-[#050505] px-3 py-1.5 rounded-md">{c.cta}</button>
      </div>
      <div className="flex items-center justify-around border-t border-[#e4e6eb] py-1.5 text-[#65676B] text-[12px]">
        <span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4" />Like</span>
        <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" />Comment</span>
        <span className="flex items-center gap-1"><Share2 className="h-4 w-4" />Share</span>
      </div>
    </div>
  );
}

function StoryPreview({ ad }: { ad: any }) {
  const c = getCreative(ad);
  return (
    <div className="w-full max-w-[240px] mx-auto aspect-[9/16] rounded-xl overflow-hidden relative bg-black text-white shadow-xl">
      {c.image ? <img src={c.image} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-fuchsia-500 to-amber-500" />}
      <div className="absolute inset-x-2 top-2 flex gap-1">
        <div className="h-0.5 flex-1 bg-white/80 rounded-full" />
        <div className="h-0.5 flex-1 bg-white/30 rounded-full" />
      </div>
      <div className="absolute inset-x-3 top-5 flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-500 to-yellow-500 p-[2px]">
          <div className="h-full w-full rounded-full bg-black flex items-center justify-center text-[10px] font-bold">{c.pageName.slice(0,1)}</div>
        </div>
        <div className="text-[11px] font-semibold truncate flex-1">{c.pageName}</div>
        <span className="text-[9px] text-white/70">Sponsored</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <div className="text-[12px] font-semibold line-clamp-2 mb-2">{c.headline}</div>
        <button className="w-full text-[12px] font-semibold bg-white text-black py-2 rounded-md flex items-center justify-center gap-1">
          {c.cta} <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function RightColumnPreview({ ad }: { ad: any }) {
  const c = getCreative(ad);
  return (
    <div className="w-full max-w-[260px] mx-auto rounded-md overflow-hidden bg-white text-[#050505] shadow-xl border border-[#dadde1]">
      <div className="flex gap-2 p-2">
        <div className="w-20 h-20 bg-[#f0f2f5] shrink-0 rounded">
          {c.image && <img src={c.image} alt="" className="w-full h-full object-cover rounded" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold line-clamp-2 leading-tight">{c.headline}</div>
          <div className="text-[10px] text-[#65676B] uppercase mt-1 truncate">{c.domain}</div>
          <div className="text-[10px] text-[#65676B] line-clamp-2 mt-1">{c.description || c.primary}</div>
        </div>
      </div>
      <div className="px-2 pb-2 text-[10px] text-[#65676B]">Sponsored</div>
    </div>
  );
}

function PlacementSwitcher({ value, onChange }: { value: Placement; onChange: (p: Placement) => void }) {
  const opts: { id: Placement; label: string }[] = [
    { id: "feed", label: "Feed" },
    { id: "story", label: "Story / Reel" },
    { id: "right", label: "Right column" },
  ];
  return (
    <div className="inline-flex rounded-lg bg-[#1a1a1a] border border-white/5 p-0.5">
      {opts.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`px-3 py-1 text-xs rounded-md transition ${value === o.id ? "bg-indigo-600 text-white" : "text-[#9ca3af] hover:text-white"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function AdPreviewCard({ ad }: { ad: any }) {
  const [placement, setPlacement] = useState<Placement>("feed");
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-xs text-[#9ca3af] uppercase tracking-wide">{ad.status || "—"}</div>
          <div className="text-sm font-semibold truncate" title={ad.name}>{ad.name}</div>
        </div>
        <PlacementSwitcher value={placement} onChange={setPlacement} />
      </div>
      <div className="bg-[#0a0a0a] rounded-xl p-4 flex items-center justify-center min-h-[420px]">
        {placement === "feed" && <FeedPreview ad={ad} />}
        {placement === "story" && <StoryPreview ad={ad} />}
        {placement === "right" && <RightColumnPreview ad={ad} />}
      </div>
    </Card>
  );
}

export default function AdsFlowCreatives() {
  const data = useAdsflowData();
  const [tab, setTab] = useState<"ads" | "library">("ads");
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<"all" | "ACTIVE" | "PAUSED">("all");

  const ads = useMemo(() => {
    const list = data.ads || [];
    if (filter === "all") return list;
    return list.filter(a => (a.status || "").toUpperCase() === filter);
  }, [data.ads, filter]);

  async function load() {
    if (!data.projectId) return;
    const { data: list } = await supabase.storage.from("meta-creatives").list(data.projectId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    setFiles(list || []);
  }
  useEffect(() => { load(); }, [data.projectId]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !data.projectId) return;
    setUploading(true);
    const path = `${data.projectId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("meta-creatives").upload(path, file);
    if (error) toast.error(error.message); else { toast.success("Uploaded"); load(); }
    setUploading(false);
  }

  async function remove(name: string) {
    if (!data.projectId) return;
    await supabase.storage.from("meta-creatives").remove([`${data.projectId}/${name}`]);
    toast.success("Deleted"); load();
  }

  function publicUrl(name: string) {
    return supabase.storage.from("meta-creatives").getPublicUrl(`${data.projectId}/${name}`).data.publicUrl;
  }

  return (
    <AdsFlowLayout title="Creatives & Previews" accountName={data.account?.name} onSync={data.sync} syncing={data.syncing}>
      <GuardGate data={data}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="inline-flex rounded-lg bg-[#1a1a1a] border border-white/5 p-0.5">
            <button onClick={() => setTab("ads")} className={`px-3 py-1.5 text-xs rounded-md ${tab === "ads" ? "bg-indigo-600 text-white" : "text-[#9ca3af]"}`}>Ad previews ({data.ads?.length || 0})</button>
            <button onClick={() => setTab("library")} className={`px-3 py-1.5 text-xs rounded-md ${tab === "library" ? "bg-indigo-600 text-white" : "text-[#9ca3af]"}`}>Library ({files.length})</button>
          </div>
          {tab === "ads" ? (
            <div className="inline-flex rounded-lg bg-[#1a1a1a] border border-white/5 p-0.5">
              {(["all","ACTIVE","PAUSED"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-xs rounded-md capitalize ${filter === f ? "bg-emerald-600 text-white" : "text-[#9ca3af]"}`}>{f.toLowerCase()}</button>
              ))}
            </div>
          ) : (
            <label className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center gap-2 cursor-pointer">
              <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload"}
              <input type="file" accept="image/*,video/*" className="hidden" onChange={upload} />
            </label>
          )}
        </div>

        {tab === "ads" ? (
          ads.length === 0 ? (
            <Card className="p-10 text-center text-sm text-[#9ca3af]">No ads to preview. Sync your account first.</Card>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {ads.map(ad => <AdPreviewCard key={ad.id} ad={ad} />)}
            </div>
          )
        ) : files.length === 0 ? (
          <Card className="p-10 text-center text-sm text-[#9ca3af]">No creatives uploaded yet.</Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {files.filter(f => f.name && !f.name.startsWith(".")).map(f => {
              const isVideo = /\.(mp4|mov|webm)$/i.test(f.name);
              const url = publicUrl(f.name);
              return (
                <Card key={f.name} className="overflow-hidden hover:border-white/10">
                  <div className="aspect-square bg-[#0f0f0f] relative">
                    {isVideo ? <video src={url} className="w-full h-full object-cover" /> : <img src={url} alt={f.name} className="w-full h-full object-cover" />}
                    <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-md bg-black/60 border border-white/10 flex items-center gap-1">
                      {isVideo ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />} {(f.metadata?.size ? Math.round(f.metadata.size / 1024) + " KB" : "")}
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="text-xs font-medium truncate" title={f.name}>{f.name.replace(/^\d+-/, "")}</div>
                    <button onClick={() => remove(f.name)} className="mt-2 h-7 w-7 rounded-md bg-rose-500/15 text-rose-400 flex items-center justify-center"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </GuardGate>
    </AdsFlowLayout>
  );
}
