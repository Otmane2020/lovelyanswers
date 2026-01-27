import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "./useProjects";
import { toast } from "sonner";

interface BusinessReview {
  text: string;
  rating: number;
}

interface Business {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  types: string[];
  openingHours?: string[];
  location?: { lat: number; lng: number };
  reviews?: BusinessReview[];
}

interface SearchResult {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  types: string[];
}

export function useLocalBusiness() {
  const { project } = useActiveProject();
  const [business, setBusiness] = useState<Business | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Load saved business on mount
  useEffect(() => {
    const loadSavedBusiness = async () => {
      if (!project?.id) {
        setIsInitialLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("local_businesses")
          .select("*")
          .eq("project_id", project.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setBusiness({
            id: data.place_id,
            name: data.name,
            address: data.address || "",
            phone: data.phone || "",
            website: data.website || "",
            rating: data.rating || 0,
            reviewCount: data.review_count || 0,
            types: data.types || [],
          });
        }
      } catch (error) {
        console.error("Error loading saved business:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadSavedBusiness();
  }, [project?.id]);

  const searchBusinesses = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("places-search", {
        body: { query },
      });

      if (error) throw error;
      
      setSearchResults(data?.results || []);
    } catch (error) {
      console.error("Error searching businesses:", error);
      toast.error("Failed to search businesses");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectBusiness = async (placeId: string) => {
    if (!project?.id) {
      toast.error("No active project");
      return null;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("places-search", {
        body: { placeId },
      });

      if (error) throw error;
      
      if (data?.business) {
        const businessData = data.business;

        // Save to database (upsert)
        const { error: upsertError } = await supabase
          .from("local_businesses")
          .upsert({
            project_id: project.id,
            place_id: businessData.id,
            name: businessData.name,
            address: businessData.address,
            phone: businessData.phone,
            website: businessData.website,
            rating: businessData.rating,
            review_count: businessData.reviewCount,
            types: businessData.types,
          }, {
            onConflict: "project_id",
          });

        if (upsertError) {
          console.error("Error saving business:", upsertError);
        }

        setBusiness(businessData);
        setSearchResults([]);
        toast.success("Business loaded successfully");
        return businessData;
      }
    } catch (error) {
      console.error("Error fetching business details:", error);
      toast.error("Failed to load business details");
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  const clearBusiness = async () => {
    if (project?.id) {
      try {
        await supabase
          .from("local_businesses")
          .delete()
          .eq("project_id", project.id);
      } catch (error) {
        console.error("Error deleting business:", error);
      }
    }
    setBusiness(null);
    setSearchResults([]);
  };

  return {
    business,
    searchResults,
    isLoading,
    isSearching,
    isInitialLoading,
    searchBusinesses,
    selectBusiness,
    clearBusiness,
  };
}
