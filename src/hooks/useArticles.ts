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
        .order("scheduled_date", { ascending: true })
        .limit(1000);

      if (error) throw error;
      
      // Flatten the published_url from linked answer and build URL from slug if needed
      const articles = (data || []).map((article: any) => {
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

      // Sort: today's articles first, then by scheduled_date ascending
      const today = new Date().toISOString().split('T')[0];
      return articles.sort((a, b) => {
        const dateA = a.scheduled_date?.split('T')[0] || '';
        const dateB = b.scheduled_date?.split('T')[0] || '';
        
        // Today's articles first
        if (dateA === today && dateB !== today) return -1;
        if (dateB === today && dateA !== today) return 1;
        
        // Then by date ascending
        return dateA.localeCompare(dateB);
      });
    },
    enabled: !!project,
  });
}
