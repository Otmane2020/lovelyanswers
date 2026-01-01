import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  MessageSquare,
  Search,
  Key,
  Bot,
  Link,
  ArrowRight,
  Zap,
  Crown,
  Clock,
} from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { useAnswers } from "@/hooks/useAnswers";
import { useArticles } from "@/hooks/useArticles";
import { useActiveProject } from "@/hooks/useProjects";
import { useSubscription } from "@/hooks/useSubscription";

const quickActions = [
  { title: "SEO Audit", description: "Analyze your website", icon: Search, href: "/seo-audit", color: "from-rose-500 to-pink-600" },
  { title: "Keywords", description: "Research opportunities", icon: Key, href: "/keywords", color: "from-amber-500 to-orange-600" },
  { title: "Articles", description: "Generate SEO content", icon: FileText, href: "/articles", color: "from-blue-500 to-cyan-600" },
  { title: "Reddit Agent", description: "Build brand visibility", icon: Bot, href: "/reddit", color: "from-violet-500 to-purple-600" },
];

export default function Dashboard() {
  const { data: answers = [] } = useAnswers();
  const { data: articles = [] } = useArticles();
  const { project } = useActiveProject();
  const { subscribed, trial, isLoading, startCheckout, openCustomerPortal } = useSubscription();

  const articlesThisMonth = articles.filter(a => {
    const created = new Date(a.created_at || '');
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  const getSubscriptionStatus = () => {
    if (isLoading) return { label: "Loading...", variant: "secondary" as const, icon: Clock };
    if (trial) return { label: "Trial Active", variant: "default" as const, icon: Clock };
    if (subscribed) return { label: "All-in-One", variant: "default" as const, icon: Crown };
    return { label: "No subscription", variant: "secondary" as const, icon: Zap };
  };

  const status = getSubscriptionStatus();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl gradient-bg p-8 text-primary-foreground shadow-glow">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <Badge className={`${subscribed || trial ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/20 text-white border-0'} backdrop-blur-sm`}>
                <status.icon className="mr-1 h-3 w-3" />
                {status.label}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Welcome to Aeoreply
            </h1>
            <p className="mt-2 max-w-xl text-lg text-white/80">
              {project ? `Managing ${project.name}` : "Get cited by ChatGPT, Gemini & AI assistants."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {subscribed || trial ? (
                <>
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg" asChild>
                    <RouterLink to="/articles"><Zap className="mr-2 h-4 w-4" />Generate Articles</RouterLink>
                  </Button>
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={openCustomerPortal}>
                    Manage Subscription
                  </Button>
                </>
              ) : (
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg" onClick={startCheckout}>
                  <Zap className="mr-2 h-4 w-4" />Start 3-Day Free Trial
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <GlassCard hover gradient className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Subscription</p>
              <p className="text-2xl font-bold">{status.label}</p>
              {(subscribed || trial) && (
                <p className="text-sm text-muted-foreground mt-1">
                  {trial ? "3-day trial" : "$99/month"}
                </p>
              )}
            </div>
          </GlassCard>

          <GlassCard hover gradient className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10">
              <FileText className="h-6 w-6 text-blue-500" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Articles This Month</p>
              <p className="text-3xl font-bold">{articlesThisMonth}<span className="text-lg text-muted-foreground">/30</span></p>
            </div>
          </GlassCard>

          <GlassCard hover gradient className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
              <MessageSquare className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">AI Answers</p>
              <p className="text-3xl font-bold">{answers.length}</p>
            </div>
          </GlassCard>

          <GlassCard hover gradient className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
              <Link className="h-6 w-6 text-violet-500" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Integrations</p>
              <Button variant="link" className="p-0 h-auto text-primary" asChild>
                <RouterLink to="/integrations">Connect CMS<ArrowRight className="ml-1 h-3 w-3" /></RouterLink>
              </Button>
            </div>
          </GlassCard>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <RouterLink key={action.href} to={action.href}>
                <GlassCard hover className="group p-6">
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${action.color} shadow-lg transition-transform group-hover:scale-110`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                  <ArrowRight className="mt-4 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </GlassCard>
              </RouterLink>
            ))}
          </div>
        </div>

        {/* Getting Started / CTA */}
        {!subscribed && !trial && (
          <GlassCard className="p-8 text-center border-primary/30">
            <div className="max-w-lg mx-auto">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                <Crown className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Unlock All-in-One Features</h3>
              <p className="text-muted-foreground mt-2">
                Get 30 SEO articles/month, automatic backlinks, Reddit agent, and more.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-muted-foreground line-through">$247</span>
                <span className="text-3xl font-bold">$99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <Button size="lg" className="mt-6 gradient-bg text-primary-foreground shadow-glow" onClick={startCheckout}>
                Start 3-Day Free Trial
              </Button>
            </div>
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  );
}
