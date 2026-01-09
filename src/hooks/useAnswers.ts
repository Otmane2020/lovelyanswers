import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "./useProjects";

export interface Answer {
  id: string;
  project_id: string;
  question: string;
  answer: string;
  slug: string;
  score: number;
  platforms: string[];
  is_public: boolean;
  has_article: boolean;
  high_citation: boolean;
  article_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useAnswers() {
  const { project } = useActiveProject();

  return useQuery({
    queryKey: ["answers", project?.id],
    queryFn: async () => {
      if (!project) return [];
      
      const { data, error } = await supabase
        .from("answers")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Answer[];
    },
    enabled: !!project,
  });
}

export function useToggleAnswerPublic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const { error } = await supabase
        .from("answers")
        .update({ is_public: isPublic })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["answers"] });
    },
  });
}
