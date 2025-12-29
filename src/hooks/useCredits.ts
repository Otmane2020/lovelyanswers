import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Credits {
  id: string;
  user_id: string;
  credits_total: number;
  credits_used: number;
  created_at: string;
  updated_at: string;
}

export function useCredits() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["credits", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("credits")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // If no credits record exists, return default values
        if (error.code === "PGRST116") {
          return {
            credits_total: 100,
            credits_used: 0,
          } as Credits;
        }
        throw error;
      }
      return data as Credits;
    },
    enabled: !!user,
  });
}
