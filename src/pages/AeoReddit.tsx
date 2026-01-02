import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  TrendingUp, 
  Eye,
  Zap,
  Copy,
  ExternalLink,
  RefreshCw,
  Sparkles,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Search,
  Shield,
  User,
  EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProject } from "@/hooks/useProjects";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Brand visibility modes
type VisibilityMode = "stealth" | "soft" | "profile-only";

interface RedditPost {
  id: string;
  subreddit: string;
  title: string;
  body?: string;
  views: string;
  trending: boolean;
  suggestedComment?: string;
  url: string;
  estimatedScore?: number;
  brandMentioned?: boolean;
  linkIncluded?: boolean;
}

// 🔒 FIXED: Dynamic subreddit generation with STRICT language separation
const getSubredditsForKeywords = (keywords: string[], language: string): string[] => {
  const subreddits = new Set<string>();
  
  // Category mappings with SEPARATE French and English subreddits
  const categoryMappings: Record<string, { fr: string[]; en: string[] }> = {
    // Tech/SaaS/Startup
    "ai|ia|artificial intelligence|intelligence artificielle|machine learning|gpt|llm|mvp|startup|saas|tech|software|logiciel": {
      fr: ["startups_fr", "developpeurs", "vosfinances", "AskFrance", "france"],
      en: ["artificialintelligence", "MachineLearning", "startups", "SideProject", "indiehackers", "SaaS"]
    },
    // Furniture/Home/Decor
    "meuble|furniture|décor|canapé|sofa|interior|design|maison|home|mobilier|fauteuil|table|lit": {
      fr: ["france", "deco", "maison", "ameublement", "BricoDecoMaison"],
      en: ["InteriorDesign", "furniture", "homedesign", "HomeImprovement", "malelivingspace"]
    },
    // E-commerce/Retail
    "ecommerce|e-commerce|shopify|boutique|store|vente|commerce|magasin": {
      fr: ["ecommerce_france", "vosfinances", "entrepreneur", "france"],
      en: ["ecommerce", "shopify", "dropship", "Entrepreneur", "FulfillmentByAmazon"]
    },
    // Marketing/SEO
    "seo|marketing|digital marketing|growth|traffic|référencement|acquisition|leads": {
      fr: ["SEOfr", "marketing_france", "vosfinances", "france"],
      en: ["SEO", "bigseo", "marketing", "digitalmarketing", "GrowthHacking"]
    },
    // Development
    "dev|développement|development|coding|programming|react|web app|application web": {
      fr: ["developpeurs", "france", "AskFrance"],
      en: ["webdev", "reactjs", "programming", "learnprogramming"]
    },
    // No-code/Low-code
    "no-code|nocode|low-code|lowcode|bubble|webflow|framer|glide": {
      fr: ["nocode_france", "france", "vosfinances"],
      en: ["nocode", "lowcode", "webflow", "Bubble", "SideProject"]
    },
    // Freelance/Agency
    "freelance|agency|agence|consultant|client|prestataire": {
      fr: ["freelance_france", "vosfinances", "france", "AskFrance"],
      en: ["freelance", "webdev", "Entrepreneur", "DigitalNomad"]
    },
    // Finance/Investment
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
        // 🔒 CRITICAL: Only add subreddits for the project's language
        const langSubs = language === "fr" ? subs.fr : subs.en;
        langSubs.forEach(sub => subreddits.add(sub));
      }
    });
  });
  
  // 🔒 Strict language-based fallback (NO MIXING)
  if (subreddits.size === 0) {
    if (language === "fr") {
      ["france", "vosfinances", "AskFrance", "entrepreneur"].forEach(s => subreddits.add(s));
    } else {
      ["startups", "Entrepreneur", "smallbusiness", "SideProject", "webdev"].forEach(s => subreddits.add(s));
    }
  }
  
  console.log(`[Reddit] Lang=${language}, Subreddits: ${Array.from(subreddits).join(", ")}`);
  return Array.from(subreddits);
};

export default function AeoReddit() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { project: activeProject } = useActiveProject();
  
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("soft");
  const [generationSettings, setGenerationSettings] = useState<{
    language: string;
    business_description: string;
    target_audiences: string[];
  } | null>(null);

  // Fetch generation settings for language and business context
  useEffect(() => {
    const fetchSettings = async () => {
      if (!activeProject?.id) return;
      
      const { data } = await supabase
        .from("generation_settings")
        .select("language, business_description, target_audiences")
        .eq("project_id", activeProject.id)
        .single();
      
      if (data) {
        setGenerationSettings(data);
        console.log(`[Reddit] Loaded settings: language=${data.language}`);
      }
    };
    
    fetchSettings();
  }, [activeProject?.id]);

  // Fetch real Reddit posts from edge function
  const fetchRedditPosts = async () => {
    if (!activeProject?.id) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Fetch keywords from database
      const { data: dbKeywords } = await supabase
        .from("keywords")
        .select("keyword")
        .eq("project_id", activeProject.id)
        .limit(20);
      
      const projectKeywords: string[] = dbKeywords?.map(k => k.keyword.toLowerCase()) || [];
      
      // Add brand_name and business_type as context
      if (activeProject.brand_name) projectKeywords.push(activeProject.brand_name.toLowerCase());
      if (activeProject.business_type) projectKeywords.push(activeProject.business_type.toLowerCase());
      
      // Get language from generation settings or default to 'en'
      const language = generationSettings?.language || "en";
      
      console.log(`[Reddit] Using ${projectKeywords.length} keywords (lang=${language}):`, projectKeywords.slice(0, 5));
      
      // Generate subreddits dynamically based on keywords and language
      const targetSubreddits = getSubredditsForKeywords(projectKeywords, language);
      
      console.log(`[Reddit] Target subreddits:`, targetSubreddits);
      
      const { data, error } = await supabase.functions.invoke('reddit-agent', {
        body: {
          action: 'find-opportunities',
          projectId: activeProject.id,
          subreddits: targetSubreddits.slice(0, 8),
          keywords: projectKeywords.slice(0, 20),
          language,
          business_description: generationSettings?.business_description || "",
          target_audiences: generationSettings?.target_audiences || []
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });

      if (error) throw error;

      if (data?.opportunities && Array.isArray(data.opportunities)) {
        // 🔒 CRITICAL: Only accept posts with REAL Reddit URLs
        const transformedPosts: RedditPost[] = data.opportunities
          .filter((opp: any) => opp.url && opp.url.includes("reddit.com/r/"))
          .map((opp: any, index: number) => ({
            id: opp.id || `post-${index}`,
            subreddit: opp.subreddit ? `r/${opp.subreddit}` : 'r/unknown',
            title: opp.title || 'Untitled post',
            body: opp.body || '',
            views: opp.score ? `${opp.score} pts` : `${opp.comments || 0} comments`,
            trending: (opp.score || 0) > 100 || opp.engagementPotential === "high",
            url: opp.url // REAL URL only
          }));
        
        setPosts(transformedPosts);
        toast({
          title: "Posts loaded",
          description: `Found ${transformedPosts.length} real Reddit opportunities`,
        });
      } else {
        setPosts([]);
        toast({
          title: "No posts found",
          description: "Try configuring different subreddits in settings",
        });
      }
    } catch (error) {
      console.error('Error fetching Reddit posts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Reddit posts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  };

  // Load posts on mount when project is available
  useEffect(() => {
    if (activeProject?.id && !initialLoadDone) {
      fetchRedditPosts();
    }
  }, [activeProject?.id, initialLoadDone]);

  // Get brand mention probability based on visibility mode
  const getBrandMentionChance = (): boolean => {
    switch (visibilityMode) {
      case "stealth": return false; // 0% mention
      case "soft": return Math.random() < 0.15; // 15% mention
      case "profile-only": return false; // 0% in comments, bio only
      default: return false;
    }
  };

  const generateReplyForPost = async (post: RedditPost, options?: { mentionBrand?: boolean; includeLink?: boolean }) => {
    setGeneratingId(post.id);
    
    // Use visibility mode to determine brand mention unless explicitly overridden
    const shouldMentionBrand = options?.mentionBrand !== undefined 
      ? options.mentionBrand 
      : getBrandMentionChance();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('reddit-agent', {
        body: {
          action: 'aeo-reply',
          title: post.title,
          body: post.body || '',
          subreddit: post.subreddit.replace('r/', ''),
          mention_brand: shouldMentionBrand,
          include_link: options?.includeLink ?? false,
          tone: 'expert_human',
          brand_name: activeProject?.brand_name || '',
          brand_url: activeProject?.website_url || '',
          visibility_mode: visibilityMode,
          language: generationSettings?.language || 'en',
          business_description: generationSettings?.business_description || ''
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });

      if (error) throw error;

      setPosts(prev => prev.map(p => 
        p.id === post.id 
          ? { 
              ...p, 
              suggestedComment: data.reply,
              estimatedScore: data.estimatedScore,
              brandMentioned: data.brandMentioned,
              linkIncluded: data.linkIncluded
            }
          : p
      ));

      const brandInfo = data.brandMentioned 
        ? (data.linkIncluded ? " (with brand + link)" : " (with brand mention)") 
        : "";
      toast({
        title: "Reply generated!",
        description: `Reddit score: ${data.estimatedScore}/100${brandInfo}`,
      });
    } catch (error) {
      console.error('Error generating reply:', error);
      toast({
        title: "Error",
        description: "Failed to generate reply. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const generateAllReplies = async () => {
    setLoading(true);
    
    for (const post of posts) {
      if (!post.suggestedComment) {
        await generateReplyForPost(post, { mentionBrand: true, includeLink: false });
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    setLoading(false);
    toast({
      title: "All replies generated!",
      description: `Generated with brand mentions for ${activeProject?.brand_name || "your brand"}`,
    });
  };

  const refreshPosts = async () => {
    setInitialLoadDone(false);
    await fetchRedditPosts();
  };

  const handleCopyAndOpen = (post: RedditPost) => {
    if (post.suggestedComment) {
      navigator.clipboard.writeText(post.suggestedComment);
      toast({
        title: "Comment copied!",
        description: "Opening Reddit post in new tab...",
      });
    }
    window.open(post.url, "_blank");
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "text-muted-foreground";
    if (score >= 70) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreBadge = (score?: number) => {
    if (!score) return null;
    if (score >= 70) return (
      <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
        <CheckCircle className="w-3 h-3 mr-1" />
        Safe to post
      </Badge>
    );
    if (score >= 50) return (
      <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
        <AlertCircle className="w-3 h-3 mr-1" />
        Review needed
      </Badge>
    );
    return (
      <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
        <AlertCircle className="w-3 h-3 mr-1" />
        Risky
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reddit Engagement</h1>
            <p className="text-muted-foreground mt-1">
              Generate human-like replies for {activeProject?.brand_name || "your brand"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={refreshPosts}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={generateAllReplies}
              disabled={loading}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate All
            </Button>
          </div>
        </div>

        {/* Brand Visibility Mode Selector */}
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Brand Visibility: {activeProject?.brand_name || "Not set"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {visibilityMode === "stealth" && "0% brand mentions in comments"}
                  {visibilityMode === "soft" && "~15% soft brand mentions (safe)"}
                  {visibilityMode === "profile-only" && "Brand in Reddit bio only (recommended)"}
                </p>
              </div>
            </div>
            <Select value={visibilityMode} onValueChange={(v) => setVisibilityMode(v as VisibilityMode)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stealth">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4" />
                    <span>Stealth (0%)</span>
                  </div>
                </SelectItem>
                <SelectItem value="soft">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>Soft (15%)</span>
                  </div>
                </SelectItem>
                <SelectItem value="profile-only">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Profile Only</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {visibilityMode === "profile-only" && (
            <div className="mt-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                <strong>💡 Recommended:</strong> Add "{activeProject?.brand_name || "YourBrand"}" to your Reddit profile bio. 
                Curious users will click your profile after reading helpful comments.
              </p>
            </div>
          )}
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{posts.length}</p>
                <p className="text-xs text-muted-foreground">Opportunities</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{posts.filter(p => p.suggestedComment).length}</p>
                <p className="text-xs text-muted-foreground">Replies Ready</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{posts.filter(p => p.trending).length}</p>
                <p className="text-xs text-muted-foreground">Trending</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {posts.filter(p => (p.estimatedScore || 0) >= 70).length}
                </p>
                <p className="text-xs text-muted-foreground">Safe to Post</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Reddit Posts List */}
        <div className="space-y-4">
          {loading && !initialLoadDone ? (
            <Card className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Searching for Reddit opportunities...</p>
            </Card>
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No posts found</h3>
              <p className="text-muted-foreground mb-4">
                Click Refresh to search for Reddit opportunities in r/seo, r/marketing, r/smallbusiness
              </p>
              <Button onClick={refreshPosts} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Search Reddit
              </Button>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="p-5 border border-border/50">
                {/* Post Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">r/</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{post.subreddit}</span>
                        {post.trending && (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <h3 className="font-medium text-foreground">{post.title}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    <span>{post.views} views</span>
                  </div>
                </div>

                {/* Suggested Comment or Generate Button */}
                {post.suggestedComment ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-emerald-600">Generated Reply</span>
                        {post.brandMentioned && (
                          <Badge className="bg-violet-500/20 text-violet-600 border-violet-500/30 text-xs">
                            Brand mentioned
                          </Badge>
                        )}
                        {post.linkIncluded && (
                          <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 text-xs">
                            Link included
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getScoreBadge(post.estimatedScore)}
                        <span className={`text-sm font-medium ${getScoreColor(post.estimatedScore)}`}>
                          Score: {post.estimatedScore}/100
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-4">
                      {post.suggestedComment}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => generateReplyForPost(post, { mentionBrand: true })}
                      disabled={generatingId === post.id}
                      className="flex-1"
                    >
                      {generatingId === post.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate with Brand
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => generateReplyForPost(post, { mentionBrand: false })}
                      disabled={generatingId === post.id}
                      className="text-muted-foreground"
                    >
                      Neutral
                    </Button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 flex justify-end gap-2">
                  {post.suggestedComment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateReplyForPost(post)}
                      disabled={generatingId === post.id}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${generatingId === post.id ? 'animate-spin' : ''}`} />
                      Regenerate
                    </Button>
                  )}
                  <Button 
                    onClick={() => handleCopyAndOpen(post)}
                    disabled={!post.suggestedComment}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy & Open Post
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Footer Text */}
        <div className="text-center py-4 space-y-2">
          <p className="text-muted-foreground text-sm">
            Replies are generated with a human tone. No SEO jargon, no promotional language.
          </p>
          <p className="text-xs text-muted-foreground/70">
            💡 Pro tip: Real visibility comes from your Reddit profile bio and your AEO answer pages on {activeProject?.website_url || "your site"}.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
