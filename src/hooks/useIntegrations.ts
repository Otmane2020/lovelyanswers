import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "./useProjects";
import { Json } from "@/integrations/supabase/types";

export interface Integration {
  id: string;
  project_id: string;
  platform: string;
  config: Record<string, string>;
  is_connected: boolean;
  created_at: string;
  updated_at: string;
}

export function useIntegrations() {
  const { project } = useActiveProject();

  return useQuery({
    queryKey: ["integrations", project?.id],
    queryFn: async () => {
      if (!project) return [];

      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map(item => ({
        ...item,
        config: (item.config as Record<string, string>) || {},
        is_connected: item.is_connected ?? false,
      })) as Integration[];
    },
    enabled: !!project,
  });
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integrationId: string) => {
      const { error } = await supabase
        .from("integrations")
        .delete()
        .eq("id", integrationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}

export function usePublishToIntegration() {
  return useMutation({
    mutationFn: async ({
      integrationId,
      content,
    }: {
      integrationId: string;
      content: {
        title: string;
        body: string;
        type: "answer" | "article";
        sourceId: string;
      };
    }) => {
      const { data, error } = await supabase.functions.invoke("cms-publish", {
        body: { integrationId, content },
      });

      if (error) throw error;
      return data;
    },
  });
}
