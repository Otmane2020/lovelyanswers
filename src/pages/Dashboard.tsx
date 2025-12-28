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
} from "lucide-react";
import { Link } from "react-router-dom";

// Stats data
const stats = {
  optimizations: { used: 45, max: 100 },
  answers: { used: 32, max: 50 },
  articles: { used: 13, max: 25 },
  avgScore: 78,
  platforms: ["ChatGPT", "Gemini", "Claude", "Perplexity"],
};

const quickActions = [
  {
    title: "Assistant AEO",
    description: "Generate AI-ready answers",
    icon: MessageSquare,
    href: "/assistant",
    color: "from-violet-500 to-purple-600",
  },
  {
    title: "Opportunities",
    description: "Discover answer gaps",
    icon: Lightbulb,
    href: "/opportunities",
    color: "from-amber-500 to-orange-600",
  },
  {
    title: "Integrations",
    description: "Connect your platforms",
    icon: Plug,
    href: "/integrations",
    color: "from-blue-500 to-cyan-600",
  },
  {
    title: "LLMs.txt",
    description: "Configure AI access",
    icon: Settings,
    href: "/settings",
    color: "from-emerald-500 to-teal-600",
  },
];

const recentAnswers = [
  {
    id: 1,
    question: "What is the best delivery time for cakes?",
    score: 92,
    platforms: ["ChatGPT", "Gemini"],
    status: "published",
  },
  {
    id: 2,
    question: "How to store birthday cakes properly?",
    score: 85,
    platforms: ["Claude", "Perplexity"],
    status: "published",
  },
  {
    id: 3,
    question: "What flavors are available for wedding cakes?",
    score: 67,
    platforms: ["ChatGPT"],
    status: "draft",
  },
];

export default function Dashboard() {
  const limitWarning = stats.answers.used >= stats.answers.max * 0.9;

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
              Get cited by ChatGPT, Gemini & AI assistants. Generate answer-first content that LLMs trust and recommend.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 shadow-lg"
                asChild
              >
                <Link to="/assistant">
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Answers
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                asChild
              >
                <Link to="/opportunities">
                  View Opportunities
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        {limitWarning && (
          <GlassCard className="border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-500">
                  You're approaching your answer limit
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.answers.max - stats.answers.used} answers remaining this month
                </p>
              </div>
              <Button className="gradient-bg text-primary-foreground shadow-glow-sm">
                Upgrade Plan
              </Button>
            </div>
          </GlassCard>
        )}

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* AEO Optimizations */}
          <GlassCard hover gradient className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <TrendingUp className="mr-1 h-3 w-3" />
                +12%
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">AEO Optimizations</p>
              <p className="text-3xl font-bold">
                {stats.optimizations.used}
                <span className="text-lg text-muted-foreground">/{stats.optimizations.max}</span>
              </p>
              <Progress value={(stats.optimizations.used / stats.optimizations.max) * 100} className="mt-3 h-2" />
            </div>
          </GlassCard>

          {/* Answers */}
          <GlassCard hover gradient className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <ScoreRing score={stats.avgScore} size="sm" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">AI Answers</p>
              <p className="text-3xl font-bold">
                {stats.answers.used}
                <span className="text-lg text-muted-foreground">/{stats.answers.max}</span>
              </p>
              <Progress value={(stats.answers.used / stats.answers.max) * 100} className="mt-3 h-2" />
            </div>
          </GlassCard>

          {/* Articles */}
          <GlassCard hover gradient className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Newspaper className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">AEO Articles</p>
              <p className="text-3xl font-bold">
                {stats.articles.used}
                <span className="text-lg text-muted-foreground">/{stats.articles.max}</span>
              </p>
              <Progress value={(stats.articles.used / stats.articles.max) * 100} className="mt-3 h-2" />
            </div>
          </GlassCard>

          {/* Platforms */}
          <GlassCard hover gradient className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
                <Target className="h-6 w-6 text-violet-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">AI Platforms</p>
              <p className="text-3xl font-bold">{stats.platforms.length}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {stats.platforms.slice(0, 3).map((platform) => (
                  <Badge key={platform} variant="secondary" className="text-xs">
                    {platform}
                  </Badge>
                ))}
                {stats.platforms.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{stats.platforms.length - 3}
                  </Badge>
                )}
              </div>
            </div>
        </GlassCard>

        {/* Potential AI Citations */}
        <div className="lg:col-span-4">
          <GlassCard gradient className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Potential AI Citations
                </h3>
                <p className="text-sm text-muted-foreground">Estimated visibility across AI platforms</p>
              </div>
              <Badge className="bg-primary/10 text-primary border-0">
                <TrendingUp className="mr-1 h-3 w-3" />
                Growing
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { name: "ChatGPT", score: 85, color: "from-emerald-500 to-teal-500" },
                { name: "Gemini", score: 72, color: "from-blue-500 to-cyan-500" },
                { name: "Claude", score: 68, color: "from-violet-500 to-purple-500" },
                { name: "Perplexity", score: 54, color: "from-amber-500 to-orange-500" },
                { name: "Copilot", score: 45, color: "from-pink-500 to-rose-500" },
              ].map((platform) => (
                <div key={platform.name} className="text-center p-3 rounded-xl bg-background/50 border border-border">
                  <ScoreRing score={platform.score} size="md" />
                  <p className="mt-2 text-sm font-medium">{platform.name}</p>
                  <p className="text-xs text-muted-foreground">{platform.score}% ready</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.href} to={action.href}>
                <GlassCard hover className="group p-6">
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${action.color} shadow-lg transition-transform group-hover:scale-110`}
                  >
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
              <Link to="/answers">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {recentAnswers.map((answer) => (
              <GlassCard key={answer.id} hover className="p-4">
                <div className="flex items-center gap-4">
                  <ScoreRing score={answer.score} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{answer.question}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {answer.platforms.map((platform) => (
                        <Badge key={platform} variant="secondary" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                      <Badge
                        variant={answer.status === "published" ? "default" : "secondary"}
                        className={answer.status === "published" ? "bg-emerald-500/20 text-emerald-500" : ""}
                      >
                        {answer.status}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
