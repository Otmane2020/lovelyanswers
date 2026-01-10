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
import { useState, useEffect, useRef } from "react";
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

// Mock data for the reach chart
const reachData = [
  { month: "Jan", current: 0, projected: 5 },
  { month: "Feb", current: 8, projected: 15 },
  { month: "Mar", current: 22, projected: 30 },
  { month: "Apr", current: 35, projected: 42 },
  { month: "May", current: 42, projected: 55 },
  { month: "Jun", current: 48, projected: 65 },
  { month: "Jul", current: 52, projected: 72 },
  { month: "Aug", current: 55, projected: 80 },
  { month: "Sep", current: 58, projected: 88 },
  { month: "Oct", current: 60, projected: 95 },
  { month: "Nov", current: 62, projected: 102 },
  { month: "Dec", current: 65, projected: 110 },
];

// Languages data
const languages = [
  { code: "ES", name: "Spanish", reach: "800M", flag: "🇪🇸" },
  { code: "FR", name: "French", reach: "430M", flag: "🇫🇷" },
  { code: "DE", name: "German", reach: "230M", flag: "🇩🇪" },
  { code: "CZ", name: "Czech", reach: "11M", flag: "🇨🇿" },
  { code: "RO", name: "Romanian", reach: "28M", flag: "🇷🇴" },
  { code: "NL", name: "Dutch", reach: "30M", flag: "🇳🇱" },
  { code: "PT", name: "Portuguese", reach: "280M", flag: "🇵🇹" },
];


export default function Dashboard() {
  const { user } = useAuth();
  const { project } = useActiveProject();
  const [languageCount, setLanguageCount] = useState([1]);
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

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  // Fetch real stats from database
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Potential Reach Chart */}
          <div className="lg:col-span-2">
            <Card className="p-6 border border-border/50">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Potential Reach</h2>
                  <p className="text-sm text-muted-foreground">
                    Estimated audience reach based on language expansion
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                  <Plus className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    Add 3 languages and increase your reach by 1.5B
                  </span>
                </div>
              </div>

              {/* Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reachData}>
                    <defs>
                      <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
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
                      dataKey="projected"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="transparent"
                    />
                    <Area
                      type="monotone"
                      dataKey="current"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorCurrent)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-primary rounded" />
                  <span className="text-sm text-muted-foreground">Current Reach</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-muted-foreground rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, hsl(var(--muted-foreground)) 2px, hsl(var(--muted-foreground)) 4px)' }} />
                  <span className="text-sm text-muted-foreground">Projected Reach</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Languages Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 border border-border/50">
              <h3 className="text-lg font-semibold text-foreground mb-4">Languages</h3>
              
              {/* Slider */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Number of languages</span>
                  <span className="text-sm font-medium text-foreground">{languageCount[0]}</span>
                </div>
                <Slider
                  value={languageCount}
                  onValueChange={setLanguageCount}
                  max={25}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Languages List */}
              <div className="space-y-3">
                {languages.slice(0, languageCount[0]).map((lang) => (
                  <div key={lang.code} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-sm text-foreground">{lang.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{lang.reach}</span>
                  </div>
                ))}
              </div>

              {/* Add Languages Button */}
              <Button 
                className="w-full mt-4 bg-foreground hover:bg-foreground/90 text-background"
                onClick={() => setLanguageCount([Math.min(languageCount[0] + 3, 25)])}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add 3 languages
              </Button>
            </Card>
          </div>
        </div>

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
            <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
              {[
                { name: "Wix", icon: "W" },
                { name: "WordPress", icon: "W" },
                { name: "Shopify", icon: "S" },
                { name: "Webflow", icon: "W" },
              ].map((cms) => (
                <div 
                  key={cms.name}
                  className="aspect-square rounded-lg sm:rounded-xl border border-border flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                >
                  <span className="text-lg sm:text-2xl font-bold text-muted-foreground">{cms.icon}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:gap-3">
              <Button className="w-full bg-foreground hover:bg-foreground/90 text-background h-9 sm:h-10 text-sm">
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
