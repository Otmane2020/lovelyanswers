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
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
}

// Mock data for demo
const mockRedditPosts: RedditPost[] = [
  {
    id: "1",
    subreddit: "r/seo",
    title: "What is a good SEO tool for beginners?",
    views: "11K",
    trending: true,
    url: "https://reddit.com/r/seo/example1"
  },
  {
    id: "2",
    subreddit: "r/marketing",
    title: "How do you track ROI on content marketing?",
    views: "8.2K",
    trending: true,
    url: "https://reddit.com/r/marketing/example2"
  },
  {
    id: "3",
    subreddit: "r/smallbusiness",
    title: "Best way to improve local SEO for a restaurant?",
    views: "5.1K",
    trending: false,
    url: "https://reddit.com/r/smallbusiness/example3"
  },
  {
    id: "4",
    subreddit: "r/seo",
    title: "Is AI content detection hurting rankings?",
    views: "15K",
    trending: true,
    url: "https://reddit.com/r/seo/example4"
  },
];

export default function AeoReddit() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [posts, setPosts] = useState<RedditPost[]>(mockRedditPosts);
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [onboardingProgress] = useState(45);
  const [timeLeft] = useState("17 minutes");

  const generateReplyForPost = async (post: RedditPost) => {
    setGeneratingId(post.id);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('reddit-agent', {
        body: {
          action: 'aeo-reply',
          title: post.title,
          body: post.body || '',
          subreddit: post.subreddit.replace('r/', ''),
          mention_brand: false,
          tone: 'expert_human'
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });

      if (error) throw error;

      // Update the post with generated reply
      setPosts(prev => prev.map(p => 
        p.id === post.id 
          ? { 
              ...p, 
              suggestedComment: data.reply,
              estimatedScore: data.estimatedScore
            }
          : p
      ));

      toast({
        title: "Reply generated!",
        description: `Reddit score: ${data.estimatedScore}/100`,
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
        await generateReplyForPost(post);
        // Small delay between requests
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    setLoading(false);
    toast({
      title: "All replies generated!",
      description: "Your Reddit engagement opportunities are ready.",
    });
  };

  const refreshPosts = async () => {
    setLoading(true);
    // In real implementation, this would fetch new Reddit posts
    // For now, reset suggested comments
    setPosts(mockRedditPosts.map(p => ({ ...p, suggestedComment: undefined, estimatedScore: undefined })));
    setLoading(false);
    
    toast({
      title: "Posts refreshed",
      description: "Scanning for new Reddit opportunities...",
    });
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
            <p className="text-muted-foreground mt-1">Generate human-like replies for brand visibility</p>
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
          {posts.map((post) => (
            <Card key={post.id} className="p-5 border border-border/50">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Reddit Icon */}
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
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-600">Generated Reply</span>
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
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => generateReplyForPost(post)}
                    disabled={generatingId === post.id}
                    className="w-full"
                  >
                    {generatingId === post.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Reply
                      </>
                    )}
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
          ))}
        </div>

        {/* Footer Text */}
        <p className="text-center text-muted-foreground text-sm py-4">
          Replies are generated with a human tone. No SEO jargon, no promotional language.
        </p>
      </div>
    </DashboardLayout>
  );
}
