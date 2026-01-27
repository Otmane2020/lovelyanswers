import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [business, setBusiness] = useState<Business | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

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
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("places-search", {
        body: { placeId },
      });

      if (error) throw error;
      
      if (data?.business) {
        setBusiness(data.business);
        setSearchResults([]);
        toast.success("Business loaded successfully");
        return data.business;
      }
    } catch (error) {
      console.error("Error fetching business details:", error);
      toast.error("Failed to load business details");
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  const clearBusiness = () => {
    setBusiness(null);
    setSearchResults([]);
  };

  return {
    business,
    searchResults,
    isLoading,
    isSearching,
    searchBusinesses,
    selectBusiness,
    clearBusiness,
  };
}
