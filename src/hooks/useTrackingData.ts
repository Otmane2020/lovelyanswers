"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { toast } from "sonner";

export function useVisibilityScores() {
  const { project } = useActiveProject();

  return useQuery({
    queryKey: ["visibility-scores", project?.id],
    queryFn: async () => {
      if (!project) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("visibility_scores")
        .select("*")
        .eq("project_id", project.id)
        .eq("date", today);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!project,
  });
}

export function useVisibilityHistory(days = 30) {
  const { project } = useActiveProject();

  return useQuery({
    queryKey: ["visibility-history", project?.id, days],
    queryFn: async () => {
      if (!project) return [];
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const { data, error } = await supabase
        .from("visibility_scores")
        .select("date, platform, score, citation_rate")
        .eq("project_id", project.id)
        .gte("date", since)
        .order("date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!project,
  });
}

export function useRecentMentions(limit = 20) {
  const { project } = useActiveProject();

  return useQuery({
    queryKey: ["recent-mentions", project?.id, limit],
    queryFn: async () => {
      if (!project) return [];
      const { data, error } = await supabase
        .from("mentions")
        .select("*")
        .eq("project_id", project.id)
        .eq("brand_mentioned", true)
        .order("queried_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!project,
  });
}

export function useTrackedQueries() {
  const { project } = useActiveProject();

  return useQuery({
    queryKey: ["tracked-queries", project?.id],
    queryFn: async () => {
      if (!project) return [];
      const { data, error } = await supabase
        .from("tracked_queries")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!project,
  });
}

export function useAddTrackedQuery() {
  const queryClient = useQueryClient();
  const { project } = useActiveProject();

  return useMutation({
    mutationFn: async ({
      query,
      platforms = ["perplexity", "gemini"],
    }: {
      query: string;
      platforms?: string[];
    }) => {
      if (!project) throw new Error("No project");
      const rows = platforms.map((platform) => ({
        project_id: project.id,
        query,
        platform,
        category: "brand",
      }));
      const { error } = await supabase
        .from("tracked_queries")
        .upsert(rows, { onConflict: "project_id,query,platform", ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-queries"] });
    },
  });
}

export function useTriggerTracking() {
  const queryClient = useQueryClient();
  const { project } = useActiveProject();

  return useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No project");
      const { error } = await supabase.functions.invoke("track-mentions", {
        body: { project_id: project.id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visibility-scores"] });
      queryClient.invalidateQueries({ queryKey: ["recent-mentions"] });
      queryClient.invalidateQueries({ queryKey: ["visibility-history"] });
    },
    // The mutation's error was captured by React Query but nothing rendered
    // it anywhere — the "Run first check" button just quietly reset to
    // idle on failure (e.g. no AI provider key configured), with zero
    // indication anything went wrong. Surface it directly here so every
    // caller gets the error regardless of whether it also checks
    // trigger.isError itself.
    onError: (error: unknown) => {
      console.error("track-mentions failed:", error);
      toast.error(error instanceof Error ? error.message : "Could not run the visibility check — try again.");
    },
  });
}
