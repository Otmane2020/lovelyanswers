import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ArrowRight,
  TrendingUp,
  Eye,
  Plus,
  FileText,
  MessageSquare,
} from "lucide-react";
import wordpressLogo from "@/assets/wordpress-logo-new.png";
import shopifyLogo from "@/assets/shopify-logo-new.png";
import wixLogo from "@/assets/wix-logo.png";
import framerLogo from "@/assets/framer-logo.png";
import bigcommerceLogo from "@/assets/bigcommerce-logo.png";
import { useIntegrations } from "@/hooks/useIntegrations";
import { CheckCircle2, Globe, Code, Webhook } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProject } from "@/hooks/useProjects";
import { useGeneration } from "@/contexts/GenerationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";



export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { project } = useActiveProject();
  const [activityData, setActivityData] = useState<{week: string; answers: number; articles: number}[]>([]);
  const [showAutopilotModal, setShowAutopilotModal] = useState(false);
  const hasTriggeredGeneration = useRef(false);
  
  // Real stats from database
  const [realStats, setRealStats] = useState({
    answersCount: 0,
    articlesCount: 0,
    redditOpportunities: 0,
    avgScore: 0
  });
  
  // Use global generation context
  const { startGeneration, stopGeneration, setGenerationProgress } = useGeneration();
  
  // Fetch connected integrations
  const { data: integrations } = useIntegrations();

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  // Fetch real stats and activity data from database
  useEffect(() => {
    const fetchRealStats = async () => {
      if (!project?.id) return;
      
      // Count answers
      const { count: answersCount } = await supabase
        .from("answers")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id);
      
      // Count articles
      const { count: articlesCount } = await supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id);
      
      // Count Reddit opportunities
      const { count: redditCount } = await supabase
        .from("reddit_responses")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id);
      
      // Average score
      const { data: scores } = await supabase
        .from("answers")
        .select("score")
        .eq("project_id", project.id);
      
      const avgScore = scores?.length 
        ? Math.round(scores.reduce((sum, a) => sum + (a.score || 0), 0) / scores.length)
        : 0;
      
      setRealStats({
        answersCount: answersCount || 0,
        articlesCount: articlesCount || 0,
        redditOpportunities: redditCount || 0,
        avgScore
      });

      // Fetch activity data for chart (last 8 weeks)
      const { data: answersData } = await supabase
        .from("answers")
        .select("created_at")
        .eq("project_id", project.id)
        .gte("created_at", new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString());

      const { data: articlesData } = await supabase
        .from("articles")
        .select("created_at")
        .eq("project_id", project.id)
        .gte("created_at", new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString());

      // Group by week
      const weeklyData: {[key: string]: {answers: number; articles: number}} = {};
      const now = new Date();
      
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekLabel = `S${8 - i}`;
        weeklyData[weekLabel] = { answers: 0, articles: 0 };
      }

      answersData?.forEach(answer => {
        const date = new Date(answer.created_at!);
        const weeksAgo = Math.floor((now.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weeksAgo >= 0 && weeksAgo < 8) {
          const weekLabel = `S${8 - weeksAgo}`;
          if (weeklyData[weekLabel]) {
            weeklyData[weekLabel].answers++;
          }
        }
      });

      articlesData?.forEach(article => {
        const date = new Date(article.created_at!);
        const weeksAgo = Math.floor((now.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weeksAgo >= 0 && weeksAgo < 8) {
          const weekLabel = `S${8 - weeksAgo}`;
          if (weeklyData[weekLabel]) {
            weeklyData[weekLabel].articles++;
          }
        }
      });

      const chartData = Object.entries(weeklyData).map(([week, data]) => ({
        week,
        answers: data.answers,
        articles: data.articles
      }));

      setActivityData(chartData);
    };
    
    fetchRealStats();
  }, [project?.id]);

  // Auto-trigger FULL 30-day generation on first signup
  useEffect(() => {
    const triggerAutoGeneration = async () => {
      if (!project || !user || hasTriggeredGeneration.current) return;
      
      // Check if there are any existing answers
      const { count } = await supabase
        .from("answers")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id);
      
      // Only auto-generate if no answers exist (first signup)
      if (count && count > 0) return;
      
      hasTriggeredGeneration.current = true;
      
      // Use global context for progress - persists across route changes
      startGeneration("🚀 Generating your 30-day content plan...");
      
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev: number) => Math.min(prev + 2, 95));
      }, 1500);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        toast.info("🚀 Generating your 30-day content plan...", { duration: 5000 });
        
        const { data, error } = await supabase.functions.invoke('generate-30-days-content', {
          body: { 
            projectId: project.id,
            language: project.language || 'fr',
            days: 30
          },
          headers: {
            Authorization: `Bearer ${session?.access_token}`
          }
        });
        
        clearInterval(progressInterval);
        
        if (error) {
          console.error('Error generating 30-day content:', error);
          toast.error("Error during content generation");
        } else {
          const answersCount = data?.answers_created || 0;
          const articlesCount = data?.articles_created || 0;
          toast.success(`✨ Generated ${answersCount} answers and ${articlesCount} articles!`, { duration: 5000 });
        }
      } catch (error) {
        console.error('Error generating content:', error);
        clearInterval(progressInterval);
      } finally {
        stopGeneration();
      }
    };

    triggerAutoGeneration();
  }, [project, user, startGeneration, stopGeneration, setGenerationProgress]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Progress bar is now in DashboardLayout - global and persistent */}

        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {userName}!
          </h1>
        </div>

        {/* Content Activity Chart */}
        <Card className="p-6 border border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Content Activity</h2>
              <p className="text-sm text-muted-foreground">
                Answers and articles created over the last 8 weeks
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">Answers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-500" />
                <span className="text-sm text-muted-foreground">Articles</span>
              </div>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorAnswers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorArticles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="week" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="answers"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorAnswers)"
                  name="Answers"
                />
                <Area
                  type="monotone"
                  dataKey="articles"
                  stroke="hsl(271, 91%, 65%)"
                  strokeWidth={2}
                  fill="url(#colorArticles)"
                  name="Articles"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Your Overview Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Your Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Answers Generated Card */}
            <Card className="p-5 border border-border/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Answers Generated</p>
                  <p className="text-3xl font-bold text-foreground">{realStats.answersCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Avg. score: <span className="text-foreground font-medium">{realStats.avgScore}/100</span>
              </p>
            </Card>

            {/* Articles Created Card */}
            <Card className="p-5 border border-border/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Articles Created</p>
                  <p className="text-3xl font-bold text-foreground">{realStats.articlesCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Ready to publish
              </p>
            </Card>

            {/* Reddit Opportunities Card */}
            <Card className="p-5 border border-border/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reddit Opportunities</p>
                  <p className="text-3xl font-bold text-foreground">{realStats.redditOpportunities}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Engagement ready
              </p>
            </Card>
          </div>
        </div>

        {/* Autopilot Modal Trigger */}
        <Card 
          className="p-4 sm:p-6 border border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={() => setShowAutopilotModal(true)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Publish Article on Autopilot</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Connect your CMS to automatically publish articles</p>
            </div>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
          </div>
        </Card>
      </div>

      {/* Autopilot Modal */}
      <Dialog open={showAutopilotModal} onOpenChange={setShowAutopilotModal}>
        <DialogContent className="w-[calc(100vw-32px)] max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-base sm:text-lg">Publish Article on Autopilot</DialogTitle>
          </DialogHeader>
          <div className="py-4 sm:py-6">
            <p className="text-center text-muted-foreground mb-4 sm:mb-6 text-xs sm:text-sm">
              Connect your CMS to automatically publish AI-generated articles
            </p>
            
            {/* CMS Icons Grid */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
              {[
                { name: "WordPress", id: "wordpress", logo: wordpressLogo },
                { name: "Shopify", id: "shopify", logo: shopifyLogo },
                { name: "Wix", id: "wix", logo: wixLogo },
                { name: "Framer", id: "framer", logo: framerLogo },
                { name: "BigCommerce", id: "bigcommerce", logo: bigcommerceLogo },
                { name: "Webflow", id: "webflow", icon: Globe },
                { name: "Custom API", id: "custom", icon: Code },
                { name: "Webhook", id: "webhook", icon: Webhook },
              ].map((cms) => {
                const isConnected = integrations?.some(i => i.platform === cms.id && i.is_connected);
                return (
                  <div 
                    key={cms.name}
                    onClick={() => {
                      setShowAutopilotModal(false);
                      navigate(`/integrations?platform=${cms.id}`);
                    }}
                    className={`relative aspect-square rounded-lg sm:rounded-xl border flex items-center justify-center transition-all cursor-pointer p-1.5 sm:p-2 hover:scale-105 active:scale-95 ${
                      isConnected 
                        ? "border-green-500 bg-green-50 hover:bg-green-100" 
                        : "border-border bg-white hover:bg-muted/50"
                    }`}
                    title={isConnected ? `${cms.name} (connecté)` : `Configurer ${cms.name}`}
                  >
                    {cms.logo ? (
                      <img src={cms.logo} alt={cms.name} className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
                    ) : cms.icon ? (
                      <cms.icon className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                    ) : null}
                    {isConnected && (
                      <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:gap-3">
              <Button 
                className="w-full bg-foreground hover:bg-foreground/90 text-background h-9 sm:h-10 text-sm"
                onClick={() => {
                  setShowAutopilotModal(false);
                  navigate("/integrations");
                }}
              >
                Connect Website
              </Button>
              <Button 
                variant="ghost" 
                className="w-full h-9 sm:h-10 text-sm"
                onClick={() => setShowAutopilotModal(false)}
              >
                No Thanks
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
