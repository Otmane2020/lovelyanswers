import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { toast } from "sonner";

export interface ShoppingPlanningEntry {
  id: string;
  project_id: string;
  product_id: string;
  scheduled_date: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    title: string;
    ai_title: string | null;
    image_url: string | null;
    price: number | null;
    currency: string | null;
    ai_score: number | null;
  };
}

export function useShoppingPlanning() {
  const { project } = useActiveProject();

  return useQuery({
    queryKey: ["shopping-planning", project?.id],
    queryFn: async () => {
      if (!project) return [];
      const { data, error } = await (supabase
        .from("shopping_planning" as any)
        .select("*, product:shopping_products(id, title, ai_title, image_url, price, currency, ai_score)")
        .eq("project_id", project.id)
        .order("scheduled_date", { ascending: true }) as any);
      if (error) throw error;
      return (data || []) as ShoppingPlanningEntry[];
    },
    enabled: !!project,
  });
}

export function useFillShoppingPlanning() {
  const queryClient = useQueryClient();
  const { project } = useActiveProject();

  return useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No active project");
      const { data, error } = await supabase.functions.invoke("fill-shopping-planning", {
        body: { projectId: project.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shopping-planning"] });
      if (data?.daysAdded > 0) {
        toast.success(`${data.daysAdded} jours planifiés avec des produits aléatoires`);
      } else {
        toast.info(data?.message || "Planning déjà complet");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Échec de la planification");
    },
  });
}

export function useClearShoppingPlanning() {
  const queryClient = useQueryClient();
  const { project } = useActiveProject();

  return useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No active project");
      const { error } = await (supabase
        .from("shopping_planning" as any)
        .delete()
        .eq("project_id", project.id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-planning"] });
      toast.success("Planning vidé");
    },
  });
}
