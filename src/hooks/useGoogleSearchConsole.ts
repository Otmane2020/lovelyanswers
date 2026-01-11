import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useGoogleSearchConsole() {
  const query = useQuery({
    queryKey: ["google-search-console-status"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isConnected: false };

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("google_oauth_token, google_token_expires_at")
        .eq("id", user.id)
        .single();

      if (error || !profile) return { isConnected: false };

      const isConnected = !!profile.google_oauth_token;
      
      return { isConnected };
    },
  });

  return {
    isConnected: query.data?.isConnected ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
