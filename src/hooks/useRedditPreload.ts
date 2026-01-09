import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "./useProjects";

// Preload Reddit posts on dashboard mount and store in database
export function useRedditPreload() {
  const { project } = useActiveProject();
  const hasPreloaded = useRef(false);

  useEffect(() => {
    const preloadRedditPosts = async () => {
      if (!project?.id || hasPreloaded.current) return;
      
      // Check if we already have recent reddit_responses for this project (last 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("reddit_responses")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .gte("created_at", oneDayAgo);
      
      if (count && count > 0) {
        console.log(`[RedditPreload] Already have ${count} recent posts, skipping preload`);
        hasPreloaded.current = true;
        return;
      }

      console.log(`[RedditPreload] Preloading Reddit posts for project ${project.id}`);
      hasPreloaded.current = true;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Fetch keywords
        const { data: dbKeywords } = await supabase
          .from("keywords")
          .select("keyword")
          .eq("project_id", project.id)
          .limit(20);
        
        const projectKeywords: string[] = dbKeywords?.map(k => k.keyword.toLowerCase()) || [];
        if (project.brand_name) projectKeywords.push(project.brand_name.toLowerCase());
        if (project.business_type) projectKeywords.push(project.business_type.toLowerCase());

        // Get generation settings for language
        const { data: settings } = await supabase
          .from("generation_settings")
          .select("language")
          .eq("project_id", project.id)
          .single();
        
        // 🔒 CRITICAL: Use project.language as fallback (detected from URL)
        const language = settings?.language || project.language || "fr";

        // Generate subreddits dynamically
        const targetSubreddits = getSubredditsForKeywords(projectKeywords, language);

        // Call reddit-agent to fetch opportunities
        const { data, error } = await supabase.functions.invoke("reddit-agent", {
          body: {
            action: "find-opportunities",
            projectId: project.id,
            subreddits: targetSubreddits.slice(0, 8),
            keywords: projectKeywords.slice(0, 20),
            language,
            storeInDb: true // Tell the edge function to store results
          },
          headers: session?.access_token ? {
            Authorization: `Bearer ${session.access_token}`
          } : undefined
        });

        if (error) {
          console.error("[RedditPreload] Error:", error);
          return;
        }

        console.log(`[RedditPreload] Loaded ${data?.opportunities?.length || 0} posts`);
      } catch (err) {
        console.error("[RedditPreload] Failed:", err);
      }
    };

    preloadRedditPosts();
  }, [project?.id]);
}

// Subreddit mapping (same as AeoReddit.tsx)
function getSubredditsForKeywords(keywords: string[], language: string): string[] {
  const subreddits = new Set<string>();
  
  const categoryMappings: Record<string, { fr: string[]; en: string[] }> = {
    "ai|ia|artificial intelligence|intelligence artificielle|machine learning|gpt|llm|mvp|startup|saas|tech|software|logiciel": {
      fr: ["startups_fr", "developpeurs", "vosfinances", "AskFrance", "france"],
      en: ["artificialintelligence", "MachineLearning", "startups", "SideProject", "indiehackers", "SaaS"]
    },
    "meuble|furniture|décor|canapé|sofa|interior|design|maison|home|mobilier|fauteuil|table|lit": {
      fr: ["france", "deco", "maison", "ameublement", "BricoDecoMaison"],
      en: ["InteriorDesign", "furniture", "homedesign", "HomeImprovement", "malelivingspace"]
    },
    "ecommerce|e-commerce|shopify|boutique|store|vente|commerce|magasin": {
      fr: ["ecommerce_france", "vosfinances", "entrepreneur", "france"],
      en: ["ecommerce", "shopify", "dropship", "Entrepreneur", "FulfillmentByAmazon"]
    },
    "seo|marketing|digital marketing|growth|traffic|référencement|acquisition|leads": {
      fr: ["SEOfr", "marketing_france", "vosfinances", "france"],
      en: ["SEO", "bigseo", "marketing", "digitalmarketing", "GrowthHacking"]
    },
    "dev|développement|development|coding|programming|react|web app|application web": {
      fr: ["developpeurs", "france", "AskFrance"],
      en: ["webdev", "reactjs", "programming", "learnprogramming"]
    },
    "no-code|nocode|low-code|lowcode|bubble|webflow|framer|glide": {
      fr: ["nocode_france", "france", "vosfinances"],
      en: ["nocode", "lowcode", "webflow", "Bubble", "SideProject"]
    },
    "freelance|agency|agence|consultant|client|prestataire": {
      fr: ["freelance_france", "vosfinances", "france", "AskFrance"],
      en: ["freelance", "webdev", "Entrepreneur", "DigitalNomad"]
    },
    "finance|investissement|argent|épargne|bourse|crypto|trading": {
      fr: ["vosfinances", "france", "cryptoFR"],
      en: ["personalfinance", "investing", "stocks", "CryptoCurrency"]
    }
  };
  
  keywords.forEach(kw => {
    const kwLower = kw.toLowerCase();
    Object.entries(categoryMappings).forEach(([pattern, subs]) => {
      const regex = new RegExp(pattern.split("|").map(p => p.trim()).join("|"), "i");
      if (regex.test(kwLower)) {
        const langSubs = language === "fr" ? subs.fr : subs.en;
        langSubs.forEach(sub => subreddits.add(sub));
      }
    });
  });
  
  if (subreddits.size === 0) {
    if (language === "fr") {
      ["france", "vosfinances", "AskFrance", "entrepreneur"].forEach(s => subreddits.add(s));
    } else {
      ["startups", "Entrepreneur", "smallbusiness", "SideProject", "webdev"].forEach(s => subreddits.add(s));
    }
  }
  
  return Array.from(subreddits);
}
