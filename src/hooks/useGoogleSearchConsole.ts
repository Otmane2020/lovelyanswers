import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useGoogleSearchConsole() {
  const query = useQuery({
    queryKey: ["google-search-console-status"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isConnected: false, needsReconnect: false };

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("google_oauth_token, google_token_expires_at, google_refresh_token")
        .eq("id", user.id)
        .single();

      if (error || !profile) return { isConnected: false, needsReconnect: false };

      // Check if we have a valid token
      const hasToken = !!profile.google_oauth_token;
      const hasRefreshToken = !!profile.google_refresh_token;
      
      // If we have a token but no refresh token, connection is incomplete
      if (hasToken && !hasRefreshToken) {
        return { isConnected: false, needsReconnect: true };
      }

      return { 
        isConnected: hasToken,
        needsReconnect: false
      };
    },
  });

  return {
    isConnected: query.data?.isConnected ?? false,
    needsReconnect: query.data?.needsReconnect ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
