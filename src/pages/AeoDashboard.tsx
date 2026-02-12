import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useRedditPreload } from "@/hooks/useRedditPreload";
import { useActiveProject } from "@/hooks/useProjects";
import { MessageSquare, TrendingUp, Globe, ArrowRight, Sparkles, Lightbulb, Link, Settings, Crown, Target, Check, Lock, FileText } from "lucide-react";

const AI_PLATFORMS = ['ChatGPT', 'Gemini', 'Perplexity', 'Copilot', 'Claude'];

interface LockedArticle {
  id: string;
  title: string;
  scheduled_date: string | null;
  status: string | null;
}

export default function AeoDashboard() {
  const navigate = useNavigate();
  const { project } = useActiveProject();
  const { subscribed, startCheckout, isLoading } = useSubscription();
  useRedditPreload();
  
  const [answersStats, setAnswersStats] = useState({ total: 0, published: 0, highCitation: 0, avgScore: 0 });
  const [lockedArticles, setLockedArticles] = useState<LockedArticle[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!project) return;
      try {
        // Fetch answers stats
        const { data: answers } = await supabase.from('answers').select('id, score').eq('project_id', project.id);
        if (answers) {
          const total = answers.length;
          const highCitation = answers.filter(a => (a.score || 0) >= 80).length;
          const avgScore = total > 0 ? Math.round(answers.reduce((sum, a) => sum + (a.score || 0), 0) / total) : 0;
          setAnswersStats({ total, published: total, highCitation, avgScore });
        }

        // Fetch locked/scheduled articles (titles only)
        const { data: articles } = await supabase
          .from('articles')
          .select('id, title, scheduled_date, status')
          .eq('project_id', project.id)
          .order('scheduled_date', { ascending: true })
          .limit(30);
        
        if (articles) {
          setLockedArticles(articles);
        }
      } catch (error) { console.error('Error fetching data:', error); }
    };
    fetchData();
  }, [project]);

  const stats = [
    { label: "Content Titles", sublabel: "Generated for 30 days", value: `${lockedArticles.length}`, icon: FileText },
    { label: "Keywords Detected", sublabel: "From your website", value: answersStats.total > 0 ? `${answersStats.total}` : "—", icon: Target },
    { label: "Avg AEO Score", sublabel: "Citation potential", value: answersStats.avgScore > 0 ? `${answersStats.avgScore}%` : "—", icon: TrendingUp },
    { label: "AI Platforms", sublabel: AI_PLATFORMS.slice(0, 3).join(' · '), value: AI_PLATFORMS.length.toString(), icon: Globe },
  ];

  const quickActions = [
    { title: "AEO Wizard", description: "Generate citation opportunities", icon: Lightbulb, url: "/wizard" },
    { title: "Opportunities", description: "View your AEO opportunities", icon: Sparkles, url: "/opportunities" },
    { title: "Integrations", description: "Connect your platforms", icon: Link, url: "/integrations" },
    { title: "Settings", description: "Configure LLMs.txt", icon: Settings, url: "/settings" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">AEO Dashboard</h1>
        <p className="text-muted-foreground mt-1">Optimize your visibility on AI answer engines</p>
      </div>

      {/* Subscription CTA */}
      {!subscribed && (
        <Card className="p-6 bg-gradient-to-r from-primary/10 to-blue-500/10 border-primary/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[hsl(222,47%,11%)]">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Unlock All Your Content</h3>
                <p className="text-sm text-muted-foreground">
                  {lockedArticles.length} articles & AEO answers ready — subscribe to generate full content
                </p>
              </div>
            </div>
            <Button onClick={startCheckout} disabled={isLoading} size="lg" className="bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,15%)] text-white">
              Subscribe to Unlock <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {subscribed && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[hsl(222,47%,11%)]">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">All-in-One Plan Active</h3>
                <p className="text-sm text-muted-foreground">Full access to all features</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {["30 SEO articles/month", "AEO answers", "Auto-publish", "Reddit agent", "20+ Languages"].map((feature, index) => (
                <span key={index} className="inline-flex items-center gap-1 text-xs bg-foreground/5 text-foreground/70 px-2 py-1 rounded-full">
                  <Check className="w-3 h-3" />{feature}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6 hover:border-foreground/20 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
                {stat.sublabel && <p className="text-xs text-muted-foreground mt-1">{stat.sublabel}</p>}
              </div>
              <div className="w-10 h-10 rounded-xl bg-[hsl(222,47%,11%)] flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Locked Content Preview */}
      {lockedArticles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Your 30-Day Content Plan</h2>
            {!subscribed && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Lock className="w-4 h-4" /> Subscribe to unlock full content
              </span>
            )}
          </div>
          <div className="grid gap-2">
            {lockedArticles.slice(0, 10).map((article) => (
              <Card 
                key={article.id} 
                className={`p-4 flex items-center justify-between transition-all ${
                  subscribed ? 'hover:border-foreground/20 cursor-pointer' : 'opacity-80'
                }`}
                onClick={() => subscribed && navigate('/articles')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {subscribed ? (
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={`text-sm truncate ${subscribed ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {article.title}
                  </span>
                </div>
                {article.scheduled_date && (
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-4">
                    {new Date(article.scheduled_date).toLocaleDateString()}
                  </span>
                )}
              </Card>
            ))}
            {lockedArticles.length > 10 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                +{lockedArticles.length - 10} more articles...
              </p>
            )}
          </div>

          {!subscribed && (
            <div className="mt-4 text-center">
              <Button onClick={startCheckout} disabled={isLoading} className="bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,15%)] text-white">
                <Crown className="w-4 h-4 mr-2" />
                Unlock All {lockedArticles.length} Articles
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold mb-4">Quick actions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Card key={index} className="p-6 hover:border-foreground/20 transition-all cursor-pointer group" onClick={() => navigate(action.url)}>
              <div className="w-12 h-12 rounded-xl bg-[hsl(222,47%,11%)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold mb-1">{action.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{action.description}</p>
              <div className="flex items-center text-foreground text-sm font-medium">
                Go <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <Card className="bg-[hsl(222,47%,11%)] border-white/10 p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2 text-white">Ready to be cited by AI?</h2>
            <p className="text-white/60">
              {subscribed 
                ? "Start by generating your first AEO opportunities with the wizard." 
                : "Subscribe to unlock all your content and start ranking on AI platforms."
              }
            </p>
          </div>
          <Button 
            size="lg" 
            className="bg-white text-[hsl(222,47%,11%)] hover:bg-white/90" 
            onClick={() => subscribed ? navigate('/wizard') : startCheckout()}
          >
            {subscribed ? 'Start wizard' : 'Subscribe now'} <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
