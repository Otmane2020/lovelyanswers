import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare,
  TrendingUp,
  Globe,
  ArrowRight,
  Sparkles,
  Lightbulb,
  Link,
  Settings,
  Crown,
  Target,
  Check,
} from "lucide-react";

const AI_PLATFORMS = ['ChatGPT', 'Gemini', 'Perplexity', 'Copilot', 'Claude'];

export default function AeoDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribed, startCheckout, isLoading } = useSubscription();
  
  const [answersStats, setAnswersStats] = useState({
    total: 0,
    published: 0,
    highCitation: 0,
    avgScore: 0,
  });

  useEffect(() => {
    const fetchAnswersStats = async () => {
      if (!user) return;

      try {
        const { data: answers } = await supabase
          .from('answers')
          .select('id, score')
          .eq('project_id', user.id);

        if (answers) {
          const total = answers.length;
          const published = answers.length;
          const highCitation = answers.filter(a => (a.score || 0) >= 80).length;
          const avgScore = total > 0 
            ? Math.round(answers.reduce((sum, a) => sum + (a.score || 0), 0) / total)
            : 0;

          setAnswersStats({ total, published, highCitation, avgScore });
        }
      } catch (error) {
        console.error('Error fetching answers stats:', error);
      }
    };

    fetchAnswersStats();
  }, [user]);

  const stats = [
    { 
      label: "Active AEO Answers",
      sublabel: `${answersStats.total} generated`,
      value: `${answersStats.published}`, 
      icon: MessageSquare,
      color: "from-primary to-purple-500"
    },
    { 
      label: "High Citation",
      sublabel: "Score ≥ 80%",
      value: answersStats.highCitation.toString(), 
      icon: Target,
      color: "from-emerald-500 to-teal-500"
    },
    { 
      label: "Avg AEO Score",
      sublabel: "Citation potential",
      value: answersStats.avgScore > 0 ? `${answersStats.avgScore}%` : "—", 
      icon: TrendingUp,
      color: "from-blue-500 to-cyan-500"
    },
    { 
      label: "AI Platforms Targeted",
      sublabel: AI_PLATFORMS.slice(0, 3).join(' · '),
      value: AI_PLATFORMS.length.toString(), 
      icon: Globe,
      color: "from-orange-500 to-amber-500"
    },
  ];

  const quickActions = [
    {
      title: "AEO Wizard",
      description: "Generate citation opportunities",
      icon: Lightbulb,
      url: "/wizard",
      color: "from-primary to-purple-500"
    },
    {
      title: "Opportunities",
      description: "View your AEO opportunities",
      icon: Sparkles,
      url: "/opportunities",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Integrations",
      description: "Connect your platforms",
      icon: Link,
      url: "/integrations",
      color: "from-emerald-500 to-teal-500"
    },
    {
      title: "Settings",
      description: "Configure LLMs.txt",
      icon: Settings,
      url: "/settings",
      color: "from-orange-500 to-amber-500"
    },
  ];

  const planFeatures = [
    "30 SEO/LLM optimized articles",
    "Automatic quality backlinks",
    "Technical SEO audits",
    "Reddit agent branding",
    "20+ languages support",
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">AEO Dashboard</h1>
        <p className="text-muted-foreground mt-1">Optimize your visibility on AI answer engines</p>
      </div>

      {/* Subscription Banner */}
      <Card className={`p-6 ${subscribed ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20' : 'bg-gradient-to-r from-primary/10 to-blue-500/10 border-primary/20'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${subscribed ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gradient-to-br from-primary to-blue-500'}`}>
              {subscribed ? (
                <Check className="w-6 h-6 text-white" />
              ) : (
                <Crown className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">
                {subscribed ? "All-in-One Plan Active" : "Start Your Free Trial"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {subscribed 
                  ? "Full access to all features"
                  : "3 days free, then $99/month"}
              </p>
            </div>
          </div>
          
          {subscribed ? (
            <div className="flex flex-wrap gap-2">
              {planFeatures.map((feature, index) => (
                <span key={index} className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full">
                  <Check className="w-3 h-3" />
                  {feature}
                </span>
              ))}
            </div>
          ) : (
            <Button 
              onClick={startCheckout}
              disabled={isLoading}
              className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600 text-primary-foreground"
            >
              Start 3-Day Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="p-6 hover:border-primary/40 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">
                  {stat.value}
                </p>
                {stat.sublabel && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.sublabel}</p>
                )}
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold mb-4">Quick actions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Card 
              key={index}
              className="p-6 hover:border-primary/40 transition-all cursor-pointer group"
              onClick={() => navigate(action.url)}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold mb-1">{action.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{action.description}</p>
              <div className="flex items-center text-primary text-sm font-medium">
                Go
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <Card className="bg-gradient-to-br from-primary/10 to-blue-500/10 border-primary/20 p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Ready to be cited by AI?</h2>
            <p className="text-muted-foreground">
              Start by generating your first AEO opportunities with the wizard.
            </p>
          </div>
          <Button 
            size="lg"
            className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600 text-primary-foreground shadow-lg shadow-primary/25"
            onClick={() => navigate('/wizard')}
          >
            Start wizard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}