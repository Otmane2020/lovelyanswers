import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useGoogleSearchConsole() {
  const queryClient = useQueryClient();

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

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          google_oauth_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
          google_console_email: null,
        })
        .eq("id", user.id);

      if (error) throw error;
      
      // Clear any stored OAuth state
      sessionStorage.removeItem("gsc_oauth_redirect_uri");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-search-console-status"] });
      toast.success("Google connection reset. You can reconnect now.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reset Google connection");
    },
  });

  return {
    isConnected: query.data?.isConnected ?? false,
    needsReconnect: query.data?.needsReconnect ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
    resetConnection: resetMutation.mutate,
    isResetting: resetMutation.isPending,
  };
}
