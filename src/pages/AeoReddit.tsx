import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  Loader2, 
  Search,
  MessageSquare,
  TrendingUp,
  Users,
  Zap,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";

interface Opportunity {
  subreddit: string;
  title: string;
  url: string;
  score: number;
  comments: number;
  relevance: number;
  suggested_response: string;
}

interface SubredditAnalysis {
  subreddit: string;
  relevance: number;
  audience_match: number;
  activity_level: string;
  best_post_types: string[];
}

interface RedditData {
  opportunities?: Opportunity[];
  responses?: { subreddit: string; topic: string; response: string }[];
  analysis?: SubredditAnalysis[];
  recommended_subreddits?: string[];
}

export default function AeoReddit() {
  const [subreddits, setSubreddits] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [data, setData] = useState<RedditData | null>(null);
  const { project } = useActiveProject();
  const { toast } = useToast();

  const runAction = async (action: "findOpportunities" | "generateResponses" | "analyzeSubreddits") => {
    if (!project) {
      toast({ title: "Error", description: "Please complete onboarding first", variant: "destructive" });
      return;
    }

    setLoading(true);
    setActiveAction(action);
    try {
      const { data: result, error } = await supabase.functions.invoke("reddit-agent", {
        body: { 
          action,
          projectId: project.id, 
          subreddits: subreddits.split(",").map(s => s.trim()).filter(Boolean),
          keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
        }
      });

      if (error) throw error;
      setData(result);
      toast({ title: "Success", description: `${action} completed.` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Reddit Agent</h1>
          <p className="text-muted-foreground mt-1">
            Build brand visibility and authority on Reddit
          </p>
        </div>

        {/* Config */}
        <GlassCard className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Target Subreddits</label>
              <Input
                placeholder="r/marketing, r/SEO, r/smallbusiness"
                value={subreddits}
                onChange={(e) => setSubreddits(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Keywords</label>
              <Input
                placeholder="SEO, content marketing, AI tools"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => runAction("findOpportunities")} 
              disabled={loading || !project}
            >
              {loading && activeAction === "findOpportunities" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Find Opportunities
            </Button>
            <Button 
              variant="secondary"
              onClick={() => runAction("analyzeSubreddits")} 
              disabled={loading || !project}
            >
              {loading && activeAction === "analyzeSubreddits" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="mr-2 h-4 w-4" />
              )}
              Analyze Subreddits
            </Button>
            <Button 
              variant="secondary"
              onClick={() => runAction("generateResponses")} 
              disabled={loading || !project}
            >
              {loading && activeAction === "generateResponses" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="mr-2 h-4 w-4" />
              )}
              Generate Responses
            </Button>
          </div>
        </GlassCard>

        {/* Results */}
        {data && (
          <Tabs defaultValue="opportunities" className="space-y-4">
            <TabsList>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="analysis">Subreddit Analysis</TabsTrigger>
              <TabsTrigger value="responses">Response Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="opportunities">
              {data.opportunities && data.opportunities.length > 0 ? (
                <div className="space-y-4">
                  {data.opportunities.map((opp, i) => (
                    <GlassCard key={i} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">r/{opp.subreddit}</Badge>
                            <Badge className="bg-emerald-500/20 text-emerald-500">
                              {opp.relevance}% relevant
                            </Badge>
                          </div>
                          <h3 className="font-semibold">{opp.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>⬆️ {opp.score}</span>
                            <span>💬 {opp.comments}</span>
                          </div>
                          {opp.suggested_response && (
                            <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm">
                              <strong>Suggested Response:</strong>
                              <p className="mt-1">{opp.suggested_response}</p>
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={opp.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              ) : (
                <GlassCard className="p-8 text-center">
                  <p className="text-muted-foreground">No opportunities found. Try different keywords.</p>
                </GlassCard>
              )}
            </TabsContent>

            <TabsContent value="analysis">
              {data.analysis && data.analysis.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {data.analysis.map((sub, i) => (
                    <GlassCard key={i} className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">r/{sub.subreddit}</h3>
                          <p className="text-sm text-muted-foreground">{sub.activity_level} activity</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Relevance</span>
                          <span className="font-medium">{sub.relevance}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Audience Match</span>
                          <span className="font-medium">{sub.audience_match}%</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sub.best_post_types?.map((type, j) => (
                            <Badge key={j} variant="secondary" className="text-xs">{type}</Badge>
                          ))}
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              ) : (
                <GlassCard className="p-8 text-center">
                  <p className="text-muted-foreground">No analysis data. Run "Analyze Subreddits" first.</p>
                </GlassCard>
              )}
            </TabsContent>

            <TabsContent value="responses">
              {data.responses && data.responses.length > 0 ? (
                <div className="space-y-4">
                  {data.responses.map((resp, i) => (
                    <GlassCard key={i} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">r/{resp.subreddit}</Badge>
                        <span className="text-sm text-muted-foreground">{resp.topic}</span>
                      </div>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{resp.response}</p>
                    </GlassCard>
                  ))}
                </div>
              ) : (
                <GlassCard className="p-8 text-center">
                  <p className="text-muted-foreground">No responses generated. Run "Generate Responses" first.</p>
                </GlassCard>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {!data && !loading && (
          <GlassCard className="p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Configure Your Reddit Agent</h3>
            <p className="text-muted-foreground mt-1">
              Enter target subreddits and keywords, then run an action to get started.
            </p>
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  );
}
