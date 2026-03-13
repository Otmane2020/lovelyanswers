"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "./useProjects";

interface SitePage {
  id: string;
  project_id: string;
  url: string;
  title: string | null;
  meta_description: string | null;
  last_crawled_at: string | null;
  created_at: string;
}

export function useSitePages() {
  const { project } = useActiveProject();

  return useQuery({
    queryKey: ["site-pages", project?.id],
    queryFn: async (): Promise<SitePage[]> => {
      if (!project?.id) return [];

      const { data, error } = await supabase
        .from("site_pages")
        .select("*")
        .eq("project_id", project.id)
        .order("title", { ascending: true });

      if (error) throw error;
      return (data || []) as SitePage[];
    },
    enabled: !!project?.id,
  });
}

export function useParseSitemap() {
  const { project } = useActiveProject();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sitemapUrl: string) => {
      if (!project?.id) throw new Error("No project selected");

      const { data, error } = await supabase.functions.invoke("parse-sitemap", {
        body: {
          projectId: project.id,
          sitemapUrl,
          fetchMetadata: true,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to parse sitemap");

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-pages", project?.id] });
    },
  });
}

export function useSitePagesCount() {
  const { project } = useActiveProject();

  return useQuery({
    queryKey: ["site-pages-count", project?.id],
    queryFn: async (): Promise<number> => {
      if (!project?.id) return 0;

      const { count, error } = await supabase
        .from("site_pages")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!project?.id,
  });
}
