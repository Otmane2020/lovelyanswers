import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  website_url: string;
  domain: string | null;
  language: string;
  business_description: string | null;
  business_type: string | null;
  audience: string | null;
  brand_name: string | null;
  example_url: string | null;
  competitors: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useProjects() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user,
  });
}

export function useActiveProject() {
  const { data: projects, isLoading } = useProjects();
  
  const activeProject = projects?.find((p) => p.is_active) || projects?.[0];
  
  return {
    project: activeProject,
    projects,
    isLoading,
  };
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (projectData: {
      name: string;
      website_url: string;
      domain?: string;
      language: string;
      business_description?: string;
      business_type?: string;
      audience?: string;
      brand_name?: string;
      example_url?: string;
      competitors?: string[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("projects")
        .insert({
          ...projectData,
          user_id: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useSetActiveProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!user) throw new Error("Not authenticated");

      // First, set all projects to inactive
      await supabase
        .from("projects")
        .update({ is_active: false })
        .eq("user_id", user.id);

      // Then set the selected project as active
      const { error } = await supabase
        .from("projects")
        .update({ is_active: true })
        .eq("id", projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
