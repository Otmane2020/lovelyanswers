import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/language";
import { aeoTranslations } from "@/lib/translations/aeo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useAeoCredits } from "@/hooks/useAeoCredits";
import { SoftPaywallBanner } from "@/components/aeo/SoftPaywallBanner";
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
  AlertTriangle,
  Zap,
  Target,
} from "lucide-react";

const AI_PLATFORMS = ['ChatGPT', 'Gemini', 'Perplexity', 'Copilot', 'Claude'];

export default function AeoDashboard() {
  const { language } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = aeoTranslations[language] || aeoTranslations.fr;
  const { credits, loading: creditsLoading, getUsagePercentage, isLimitReached } = useAeoCredits();
  
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
      label: language === 'fr' ? "Réponses AEO actives" : "Active AEO Answers",
      sublabel: language === 'fr' ? `${answersStats.total} générées` : `${answersStats.total} generated`,
      value: `${answersStats.published}`, 
      icon: MessageSquare,
      color: "from-primary to-purple-500"
    },
    { 
      label: language === 'fr' ? "Haute citation" : "High Citation",
      sublabel: language === 'fr' ? "Score ≥ 80%" : "Score ≥ 80%",
      value: answersStats.highCitation.toString(), 
      icon: Target,
      color: "from-emerald-500 to-teal-500"
    },
    { 
      label: language === 'fr' ? "Score AEO moyen" : "Avg AEO Score",
      sublabel: language === 'fr' ? "Potentiel de citation" : "Citation potential",
      value: answersStats.avgScore > 0 ? `${answersStats.avgScore}%` : "—", 
      icon: TrendingUp,
      color: "from-blue-500 to-cyan-500"
    },
    { 
      label: language === 'fr' ? "Plateformes IA ciblées" : "AI Platforms Targeted",
      sublabel: AI_PLATFORMS.slice(0, 3).join(' · '),
      value: AI_PLATFORMS.length.toString(), 
      icon: Globe,
      color: "from-orange-500 to-amber-500"
    },
  ];

  const quickActions = [
    {
      title: language === 'fr' ? "Assistant AEO" : "AEO Wizard",
      description: language === 'fr' ? "Générer des opportunités de citation" : "Generate citation opportunities",
      icon: Lightbulb,
      url: "/wizard",
      color: "from-primary to-purple-500"
    },
    {
      title: language === 'fr' ? "Opportunités" : "Opportunities",
      description: language === 'fr' ? "Voir vos opportunités AEO" : "View your AEO opportunities",
      icon: Sparkles,
      url: "/opportunities",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: language === 'fr' ? "Intégrations" : "Integrations",
      description: language === 'fr' ? "Connecter vos plateformes" : "Connect your platforms",
      icon: Link,
      url: "/integrations",
      color: "from-emerald-500 to-teal-500"
    },
    {
      title: language === 'fr' ? "Paramètres" : "Settings",
      description: language === 'fr' ? "Configurer LLMs.txt" : "Configure LLMs.txt",
      icon: Settings,
      url: "/settings",
      color: "from-orange-500 to-amber-500"
    },
  ];

  const usageItems = [
    {
      label: language === 'fr' ? "Optimisations AEO" : "AEO Optimizations",
      used: credits.optimizations.used,
      limit: credits.optimizations.limit,
      percentage: getUsagePercentage('optimizations'),
      isLimited: isLimitReached('optimizations'),
    },
    {
      label: language === 'fr' ? "Articles AEO" : "AEO Articles",
      used: credits.articles.used,
      limit: credits.articles.limit,
      percentage: getUsagePercentage('articles'),
      isLimited: isLimitReached('articles'),
    },
    {
      label: language === 'fr' ? "Réponses AEO actives" : "Active AEO Answers",
      used: answersStats.published,
      limit: credits.answers.limit,
      percentage: credits.answers.limit > 0 ? (answersStats.published / credits.answers.limit) * 100 : 0,
      isLimited: answersStats.published >= credits.answers.limit,
    },
  ];

  const anyLimitReached = usageItems.some(item => item.isLimited);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t.dashboard.title}</h1>
        <p className="text-muted-foreground mt-1">{t.dashboard.subtitle}</p>
      </div>

      {/* Usage Banner */}
      <Card className={`p-6 ${anyLimitReached ? 'bg-destructive/10 border-destructive/30' : 'bg-gradient-to-r from-primary/10 to-blue-500/10 border-primary/20'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${anyLimitReached ? 'bg-destructive/20' : 'bg-gradient-to-br from-primary to-blue-500'}`}>
              {anyLimitReached ? (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              ) : (
                <Zap className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">
                {anyLimitReached 
                  ? (language === 'fr' ? "Limite atteinte" : "Limit reached")
                  : (language === 'fr' ? "Utilisation mensuelle" : "Monthly usage")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {anyLimitReached
                  ? (language === 'fr' ? "Passez à un plan supérieur pour continuer" : "Upgrade your plan to continue")
                  : (language === 'fr' ? "Crédits AEO utilisés ce mois" : "AEO credits used this month")}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 flex-1 max-w-2xl">
            {usageItems.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className={`text-xs font-medium ${item.isLimited ? 'text-destructive' : ''}`}>
                    {item.used} / {item.limit}
                  </span>
                </div>
                <Progress 
                  value={item.percentage} 
                  className={`h-2 ${item.isLimited ? 'bg-destructive/20' : ''}`}
                />
              </div>
            ))}
          </div>

          {anyLimitReached && (
            <Button 
              onClick={() => navigate('/subscription')}
              className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600 text-primary-foreground"
            >
              {language === 'fr' ? "Upgrade" : "Upgrade"}
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
        <h2 className="text-xl font-bold mb-4">
          {language === 'fr' ? "Actions rapides" : "Quick actions"}
        </h2>
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
                {language === 'fr' ? "Accéder" : "Go"}
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
            <h2 className="text-2xl font-bold mb-2">
              {language === 'fr' ? "Prêt à être cité par l'IA ?" : "Ready to be cited by AI?"}
            </h2>
            <p className="text-muted-foreground">
              {language === 'fr' 
                ? "Commencez par générer vos premières opportunités AEO avec l'assistant."
                : "Start by generating your first AEO opportunities with the wizard."}
            </p>
          </div>
          <Button 
            size="lg"
            className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600 text-primary-foreground shadow-lg shadow-primary/25"
            onClick={() => navigate('/wizard')}
          >
            {language === 'fr' ? "Lancer l'assistant" : "Start wizard"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
