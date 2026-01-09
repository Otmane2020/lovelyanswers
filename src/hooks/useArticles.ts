import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "./useProjects";

export interface Article {
  id: string;
  project_id: string;
  linked_answer_id: string | null;
  title: string;
  content: string | null;
  status: string;
  word_count: number;
  aeo_score: number | null;
  created_at: string;
  updated_at: string;
}

export function useArticles() {
  const { project } = useActiveProject();

  return useQuery({
    queryKey: ["articles", project?.id],
    queryFn: async () => {
      if (!project) return [];
      
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Article[];
    },
    enabled: !!project,
  });
}
