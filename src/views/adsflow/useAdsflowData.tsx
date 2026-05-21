"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_EMAIL = "oben.rockman@gmail.com";

export type AdsflowData = {
  loading: boolean;
  authed: boolean;
  projectId: string | null;
  account: any | null;
  campaigns: any[];
  adsets: any[];
  ads: any[];
  audiences: any[];
  pixels: any[];
  syncing: boolean;
  sync: () => Promise<void>;
  refresh: () => void;
};

export function useAdsflowData(): AdsflowData {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [account, setAccount] = useState<any | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [adsets, setAdsets] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [audiences, setAudiences] = useState<any[]>([]);
  const [pixels, setPixels] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === ADMIN_EMAIL) {
        setAuthed(true);
        const { data: projects } = await supabase
          .from("projects")
          .select("id")
          .eq("user_id", session.user.id)
          .limit(1);
        if (projects?.[0]) setProjectId(projects[0].id);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const [acc, camp, as, ad, aud, px] = await Promise.all([
        supabase.from("meta_ad_accounts").select("*").eq("project_id", projectId).maybeSingle(),
        supabase.from("meta_campaigns").select("*").eq("project_id", projectId).order("last_synced_at", { ascending: false }),
        supabase.from("meta_adsets").select("*").eq("project_id", projectId).order("last_synced_at", { ascending: false }),
        supabase.from("meta_ads").select("*").eq("project_id", projectId).order("last_synced_at", { ascending: false }),
        supabase.from("meta_audiences").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
        supabase.from("meta_pixels").select("*").eq("project_id", projectId),
      ]);
      setAccount(acc.data || null);
      setCampaigns(camp.data || []);
      setAdsets(as.data || []);
      setAds(ad.data || []);
      setAudiences(aud.data || []);
      setPixels(px.data || []);
    })();
  }, [projectId, refreshKey]);

  const sync = useCallback(async () => {
    if (!projectId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-sync", { body: { project_id: projectId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const c = data?.counts || {};
      toast.success(`Synced ${c.campaigns || 0} campaigns • ${c.adsets || 0} ad sets • ${c.ads || 0} ads`);
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast.error(`Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }, [projectId]);

  return {
    loading, authed, projectId, account, campaigns, adsets, ads, audiences, pixels,
    syncing, sync, refresh: () => setRefreshKey(k => k + 1),
  };
}

export function GuardGate({ data, children }: { data: AdsflowData; children: React.ReactNode }) {
  if (data.loading) return <div className="p-12 text-center text-[#9ca3af] text-sm">Loading…</div>;
  if (!data.authed) return <div className="p-12 text-center text-[#9ca3af] text-sm">Admin access required.</div>;
  if (!data.projectId) return <div className="p-12 text-center text-[#9ca3af] text-sm">No project found for this account.</div>;
  return <>{children}</>;
}

export function EmptyState({ title, hint, onSync, syncing }: { title: string; hint?: string; onSync?: () => void; syncing?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#1a1a1a] p-10 text-center">
      <div className="text-sm font-medium">{title}</div>
      {hint && <div className="text-xs text-[#9ca3af] mt-1">{hint}</div>}
      {onSync && (
        <button
          onClick={onSync}
          disabled={syncing}
          className="mt-4 h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium disabled:opacity-60"
        >
          {syncing ? "Syncing…" : "Sync from Meta"}
        </button>
      )}
    </div>
  );
}
