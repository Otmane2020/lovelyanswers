"use client";
import { useEffect, useState } from "react";
import AdsFlowLayout, { Card } from "./Layout";
import { useAdsflowData, GuardGate } from "./useAdsflowData";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Trash2, Image as ImageIcon, Film } from "lucide-react";
import { toast } from "sonner";

export default function AdsFlowCreatives() {
  const data = useAdsflowData();
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

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
    <AdsFlowLayout title="Creative Library" accountName={data.account?.name} onSync={data.sync} syncing={data.syncing}>
      <GuardGate data={data}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[#9ca3af]">Upload images & videos used in your Meta ads.</p>
          <label className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center gap-2 cursor-pointer">
            <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload"}
            <input type="file" accept="image/*,video/*" className="hidden" onChange={upload} />
          </label>
        </div>

        {files.length === 0 ? (
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
