"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "./useProjects";
import { toast } from "sonner";

interface BusinessInsights {
  views: number;
  clicks: number;
  calls: number;
  directions: number;
}

interface Business {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  insights?: BusinessInsights;
}

interface PublishPostParams {
  content: string;
  type: "UPDATE" | "OFFER" | "EVENT";
  imageUrl?: string;
}

export function useGoogleBusiness() {
  const { project } = useActiveProject();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (project?.id) {
      checkConnection();
    }
  }, [project?.id]);

  const checkConnection = async () => {
    if (!project?.id) return;
    
    try {
      const { data: integration } = await supabase
        .from("integrations")
        .select("*")
        .eq("project_id", project.id)
        .eq("platform", "google_business")
        .single();

      if (integration?.is_connected) {
        setIsConnected(true);
        await fetchBusiness();
      }
    } catch (error) {
      console.error("Error checking GMB connection:", error);
    }
  };

  const connectGMB = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in first");
        return;
      }

      // Store return path
      sessionStorage.setItem("gmb_redirect_uri", window.location.pathname);

      const { data, error } = await supabase.functions.invoke("gmb-oauth-url", {
        body: { 
          redirectUri: `${window.location.origin}/integrations`,
          projectId: project?.id 
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error connecting GMB:", error);
      toast.error("Failed to connect Google Business");
    }
  };

  const fetchBusiness = async () => {
    if (!project?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("gmb-fetch-business", {
        body: { projectId: project.id },
      });

      if (error) throw error;
      
      if (data?.business) {
        setBusiness(data.business);
      }
    } catch (error) {
      console.error("Error fetching business:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInsights = async () => {
    if (!project?.id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("gmb-fetch-insights", {
        body: { projectId: project.id },
      });

      if (error) throw error;
      
      if (data?.insights && business) {
        setBusiness({ ...business, insights: data.insights });
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
    }
  };

  const publishPost = async (params: PublishPostParams) => {
    if (!project?.id) throw new Error("No project selected");
    
    const { data, error } = await supabase.functions.invoke("gmb-publish-post", {
      body: { 
        projectId: project.id,
        ...params 
      },
    });

    if (error) throw error;
    return data;
  };

  return {
    business,
    isLoading,
    isConnected,
    connectGMB,
    fetchBusiness,
    fetchInsights,
    publishPost,
  };
}
