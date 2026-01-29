import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "./useProjects";

export interface Article {
  id: string;
  project_id: string;
  linked_answer_id: string | null;
  title: string;
  content: string | null;
  html_content: string | null;
  status: string;
  slug: string | null;
  word_count: number;
  aeo_score: number | null;
  created_at: string;
  updated_at: string;
  scheduled_date: string | null;
  gsc_indexed: boolean | null;
  gsc_indexed_at: string | null;
  gsc_index_error: string | null;
  // From linked answer
  published_url: string | null;
}

export function useArticles() {
  const { project } = useActiveProject();

  return useQuery({
    queryKey: ["articles", project?.id],
    queryFn: async () => {
      if (!project) return [];
      
      // Fetch articles with linked answer's published_url
      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          answers:linked_answer_id (
            published_url
          )
        `)
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      
      // Flatten the published_url from linked answer and build URL from slug if needed
      return (data || []).map((article: any) => {
        let publishedUrl = article.answers?.published_url || null;
        
        // If no published_url but article is published and has slug, build internal URL
        if (!publishedUrl && article.status === "published" && article.slug) {
          publishedUrl = `${window.location.origin}/blog/${article.slug}`;
        }
        
        return {
          ...article,
          published_url: publishedUrl,
          answers: undefined, // Remove nested object
        };
      }) as Article[];
    },
    enabled: !!project,
  });
}
