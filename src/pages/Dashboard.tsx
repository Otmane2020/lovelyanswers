import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { ScoreRing } from "@/components/ui/score-ring";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Newspaper,
  Sparkles,
  Target,
  MessageSquare,
  Lightbulb,
  Plug,
  Settings,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Zap,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAnswers } from "@/hooks/useAnswers";
import { useArticles } from "@/hooks/useArticles";
import { useCredits } from "@/hooks/useCredits";
import { useActiveProject } from "@/hooks/useProjects";

const quickActions = [
  { title: "Assistant AEO", description: "Generate AI-ready answers", icon: MessageSquare, href: "/assistant", color: "from-violet-500 to-purple-600" },
  { title: "Opportunities", description: "Discover answer gaps", icon: Lightbulb, href: "/opportunities", color: "from-amber-500 to-orange-600" },
  { title: "Integrations", description: "Connect your platforms", icon: Plug, href: "/integrations", color: "from-blue-500 to-cyan-600" },
  { title: "LLMs.txt", description: "Configure AI access", icon: Settings, href: "/settings", color: "from-emerald-500 to-teal-600" },
];

export default function Dashboard() {
  const { data: answers = [] } = useAnswers();
  const { data: articles = [] } = useArticles();
  const { data: credits } = useCredits();
  const { project } = useActiveProject();

  const creditsUsed = credits?.credits_used || 0;
  const creditsTotal = credits?.credits_total || 100;
  const limitWarning = creditsUsed >= creditsTotal * 0.9;

  const recentAnswers = answers.slice(0, 3);
  const platforms = ["ChatGPT", "Gemini", "Claude", "Perplexity"];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl gradient-bg p-8 text-primary-foreground shadow-glow">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="relative">
            <Badge className="mb-4 bg-white/20 text-white border-0 backdrop-blur-sm">
              <Sparkles className="mr-1 h-3 w-3" />
              Answer Engine Optimization
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Welcome to Aeoreply
            </h1>
            <p className="mt-2 max-w-xl text-lg text-white/80">
              {project ? `Managing ${project.name}` : "Get cited by ChatGPT, Gemini & AI assistants."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg" asChild>
                <Link to="/assistant"><Zap className="mr-2 h-4 w-4" />Generate Answers</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" asChild>
                <Link to="/opportunities">View Opportunities<ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>

        {limitWarning && (
          <GlassCard className="border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-500">You're approaching your credit limit</p>
                <p className="text-sm text-muted-foreground">{creditsTotal - creditsUsed} credits remaining</p>
              </div>
              <Button className="gradient-bg text-primary-foreground shadow-glow-sm">Upgrade Plan</Button>
            </div>
          </GlassCard>
        )}

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <GlassCard hover gradient className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Credits Used</p>
              <p className="text-3xl font-bold">{creditsUsed}<span className="text-lg text-muted-foreground">/{creditsTotal}</span></p>
              <Progress value={(creditsUsed / creditsTotal) * 100} className="mt-3 h-2" />
            </div>
          </GlassCard>

          <GlassCard hover gradient className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10">
              <FileText className="h-6 w-6 text-blue-500" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">AI Answers</p>
              <p className="text-3xl font-bold">{answers.length}</p>
            </div>
          </GlassCard>

          <GlassCard hover gradient className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
              <Newspaper className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">AEO Articles</p>
              <p className="text-3xl font-bold">{articles.length}</p>
            </div>
          </GlassCard>

          <GlassCard hover gradient className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
              <Target className="h-6 w-6 text-violet-500" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">AI Platforms</p>
              <p className="text-3xl font-bold">{platforms.length}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {platforms.slice(0, 3).map((p) => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.href} to={action.href}>
                <GlassCard hover className="group p-6">
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${action.color} shadow-lg transition-transform group-hover:scale-110`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                  <ArrowRight className="mt-4 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </GlassCard>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Answers */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Answers</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/answers">View all<ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          {recentAnswers.length > 0 ? (
            <div className="space-y-3">
              {recentAnswers.map((answer) => (
                <GlassCard key={answer.id} hover className="p-4">
                  <div className="flex items-center gap-4">
                    <ScoreRing score={answer.score} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{answer.question}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {answer.platforms?.map((p) => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
                        <Badge variant={answer.is_public ? "default" : "secondary"} className={answer.is_public ? "bg-emerald-500/20 text-emerald-500" : ""}>
                          {answer.is_public ? "published" : "draft"}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm"><ArrowRight className="h-4 w-4" /></Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <GlassCard className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No answers yet</h3>
                  <p className="text-muted-foreground">Generate your first AI-ready answer</p>
                </div>
                <Button className="gap-2 gradient-bg text-primary-foreground" asChild>
                  <Link to="/assistant"><Plus className="h-4 w-4" />Generate Answer</Link>
                </Button>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
