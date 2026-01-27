import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "./useProjects";
import { toast } from "sonner";

export interface LocalAnswer {
  id: string;
  project_id: string;
  business_id: string;
  business_name: string;
  question: string;
  answer: string;
  score: number;
  is_public: boolean;
  scheduled_date: string | null;
  published_at: string | null;
  published_url: string | null;
  slug: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export function useLocalAnswers(businessId?: string) {
  const { project } = useActiveProject();

  return useQuery({
    queryKey: ["local-answers", project?.id, businessId],
    queryFn: async () => {
      if (!project?.id) return [];
      
      let query = supabase
        .from("local_answers")
        .select("*")
        .eq("project_id", project.id)
        .order("scheduled_date", { ascending: true });
      
      if (businessId) {
        query = query.eq("business_id", businessId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching local answers:", error);
        throw error;
      }
      
      return (data || []) as LocalAnswer[];
    },
    enabled: !!project?.id,
  });
}

export function useCreateLocalAnswer() {
  const queryClient = useQueryClient();
  const { project } = useActiveProject();

  return useMutation({
    mutationFn: async (params: {
      question: string;
      answer: string;
      businessId: string;
      businessName: string;
      score?: number;
      scheduledDate?: string;
    }) => {
      if (!project?.id) throw new Error("No active project");

      const slug = params.question
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 60) + "-" + Date.now().toString(36);

      const { data, error } = await supabase
        .from("local_answers")
        .insert({
          project_id: project.id,
          business_id: params.businessId,
          business_name: params.businessName,
          question: params.question,
          answer: params.answer,
          score: params.score || 75,
          slug,
          scheduled_date: params.scheduledDate || null,
          language: project.language || "en",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-answers"] });
      toast.success("Local answer created!");
    },
    onError: (error) => {
      console.error("Error creating local answer:", error);
      toast.error("Failed to create local answer");
    },
  });
}

export function useUpdateLocalAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; updates: Partial<LocalAnswer> }) => {
      const { data, error } = await supabase
        .from("local_answers")
        .update(params.updates)
        .eq("id", params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-answers"] });
    },
    onError: (error) => {
      console.error("Error updating local answer:", error);
      toast.error("Failed to update local answer");
    },
  });
}

export function useDeleteLocalAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("local_answers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-answers"] });
      toast.success("Local answer deleted");
    },
    onError: (error) => {
      console.error("Error deleting local answer:", error);
      toast.error("Failed to delete local answer");
    },
  });
}

export function useGenerate30LocalAnswers() {
  const queryClient = useQueryClient();
  const { project } = useActiveProject();

  return useMutation({
    mutationFn: async (params: {
      businessId: string;
      businessName: string;
      businessAddress?: string;
      businessContext?: Record<string, unknown>;
    }) => {
      if (!project?.id) throw new Error("No active project");

      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("generate-30-local-answers", {
        body: {
          projectId: project.id,
          businessId: params.businessId,
          businessName: params.businessName,
          businessAddress: params.businessAddress,
          businessContext: params.businessContext,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["local-answers"] });
      toast.success(`${data?.created || 0} local Q&A generated!`);
    },
    onError: (error) => {
      console.error("Error generating local answers:", error);
      toast.error("Failed to generate local answers");
    },
  });
}
