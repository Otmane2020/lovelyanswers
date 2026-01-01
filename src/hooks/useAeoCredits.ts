import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CreditCategory {
  used: number;
  limit: number;
}

interface AeoCredits {
  optimizations: CreditCategory;
  articles: CreditCategory;
  answers: CreditCategory;
}

const DEFAULT_CREDITS: AeoCredits = {
  optimizations: { used: 0, limit: 50 },
  articles: { used: 0, limit: 20 },
  answers: { used: 0, limit: 100 },
};

export function useAeoCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<AeoCredits>(DEFAULT_CREDITS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredits = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: creditsData } = await supabase
          .from("credits")
          .select("credits_total, credits_used")
          .eq("user_id", user.id)
          .single();

        if (creditsData) {
          const total = creditsData.credits_total || 100;
          const used = creditsData.credits_used || 0;
          
          setCredits({
            optimizations: { used: Math.min(used, 50), limit: 50 },
            articles: { used: Math.floor(used / 5), limit: 20 },
            answers: { used, limit: total },
          });
        }
      } catch (error) {
        console.error("Error fetching credits:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
  }, [user]);

  const getUsagePercentage = (category: keyof AeoCredits) => {
    const cat = credits[category];
    return cat.limit > 0 ? (cat.used / cat.limit) * 100 : 0;
  };

  const isLimitReached = (category: keyof AeoCredits) => {
    const cat = credits[category];
    return cat.used >= cat.limit;
  };

  return { credits, loading, getUsagePercentage, isLimitReached };
}
