import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bot, 
  Brain, 
  Zap, 
  Sparkles, 
  RefreshCw, 
  Lightbulb,
  Plus,
  CheckCircle2
} from "lucide-react";
import { useTranslation } from "@/lib/language";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { AeoArticleGenerationDialog } from "./AeoArticleGenerationDialog";

interface AiAnswer {
  id: string;
  platforms: string[];
  question: string;
  answer: string;
  score: number | null;
  has_article: boolean | null;
  created_at: string;
}

interface GeneratedArticle {
  id: string;
  title: string;
  content: string;
  meta_description?: string;
  keywords?: string[];
}

interface AeoOpportunitiesListProps {
  platform: string;
}

const platformConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  description: { fr: string; en: string };
}> = {
  chatgpt: {
    icon: Bot,
    color: "#10b981",
    label: "ChatGPT",
    description: {
      fr: "Questions conversationnelles et comparaisons",
      en: "Conversational questions and comparisons"
    }
  },
  gemini: {
    icon: Brain,
    color: "#3b82f6",
    label: "Gemini",
    description: {
      fr: "Requêtes factuelles et recherche Google",
      en: "Factual queries and Google search"
    }
  },
  copilot: {
    icon: Zap,
    color: "#8b5cf6",
    label: "Copilot",
    description: {
      fr: "Tutoriels et intégration Bing",
      en: "Tutorials and Bing integration"
    }
  },
  perplexity: {
    icon: Lightbulb,
    color: "#f59e0b",
    label: "Perplexity",
    description: {
      fr: "Recherche approfondie avec sources",
      en: "Deep research with sources"
    }
  },
  claude: {
    icon: Brain,
    color: "#ec4899",
    label: "Claude",
    description: {
      fr: "Analyses détaillées et raisonnement",
      en: "Detailed analysis and reasoning"
    }
  }
};

export function AeoOpportunitiesList({ platform }: AeoOpportunitiesListProps) {
  const { language } = useTranslation();
  const { user } = useAuth();
  const { project } = useActiveProject();
  
  const [opportunities, setOpportunities] = useState<AiAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Article generation state
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState<string>('analyzing');
  const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<AiAnswer | null>(null);

  const config = platformConfig[platform] || platformConfig.chatgpt;

  useEffect(() => {
    if (user?.id && project?.id) {
      fetchOpportunities();
    }
  }, [user?.id, project?.id, platform]);

  const fetchOpportunities = async () => {
    if (!user?.id || !project?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("answers")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOpportunities((data as AiAnswer[]) || []);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      toast.error(language === 'fr' ? "Erreur lors du chargement" : "Error loading opportunities");
    } finally {
      setLoading(false);
    }
  };

  const generateOpportunities = async () => {
    if (!user?.id || !project?.id) return;
    
    setRefreshing(true);
    try {
      // Mock generation for now
      await new Promise(r => setTimeout(r, 1000));
      toast.success(language === 'fr' ? "Opportunités générées" : "Opportunities generated");
      fetchOpportunities();
    } catch (error) {
      console.error("Error generating opportunities:", error);
      toast.error(language === 'fr' ? "Erreur lors de la génération" : "Error generating opportunities");
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateArticle = async (opportunity: AiAnswer) => {
    if (!project?.id) return;
    
    setSelectedOpportunity(opportunity);
    setGeneratedArticle(null);
    setGenerationProgress(0);
    setGenerationStep('analyzing');
    setIsGeneratingArticle(true);
    setGenerationDialogOpen(true);

    try {
      const steps = ['analyzing', 'structuring', 'generating', 'optimizing', 'complete'];
      
      for (let i = 0; i < steps.length - 1; i++) {
        setGenerationStep(steps[i]);
        setGenerationProgress((i + 1) * 20);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Mock article generation
      setGenerationStep('complete');
      setGenerationProgress(100);

      setGeneratedArticle({
        id: crypto.randomUUID(),
        title: `Article: ${opportunity.question}`,
        content: `# ${opportunity.question}\n\n${opportunity.answer}`,
      });

      setOpportunities(prev => 
        prev.map(o => o.id === opportunity.id ? { ...o, status: 'treated' } : o)
      );

      toast.success(language === 'fr' ? "Article AEO généré !" : "AEO article generated!");
    } catch (error) {
      console.error("Error generating article:", error);
      toast.error(language === 'fr' ? "Erreur lors de la génération" : "Error generating article");
      setGenerationDialogOpen(false);
    } finally {
      setIsGeneratingArticle(false);
    }
  };

  const getDifficultyBadge = (difficulty: string | null) => {
    const colors: Record<string, string> = {
      easy: "bg-green-500/10 text-green-600 border-green-500/20",
      medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      hard: "bg-red-500/10 text-red-600 border-red-500/20"
    };
    const labels: Record<string, Record<string, string>> = {
      easy: { fr: "Facile", en: "Easy" },
      medium: { fr: "Moyen", en: "Medium" },
      hard: { fr: "Difficile", en: "Hard" }
    };
    return (
      <Badge variant="outline" className={colors[difficulty || "medium"]}>
        {labels[difficulty || "medium"]?.[language] || difficulty}
      </Badge>
    );
  };

  const PlatformIcon = config.icon;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Platform Header */}
      <Card className="border-l-4" style={{ borderLeftColor: config.color }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div 
                className="p-1.5 rounded"
                style={{ backgroundColor: config.color }}
              >
                <PlatformIcon className="h-4 w-4 text-white" />
              </div>
              {config.label}
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={generateOpportunities} 
                disabled={refreshing}
                size="sm"
                style={{ backgroundColor: config.color }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {language === 'fr' ? 'Nouvelles' : 'New'}
              </Button>
              <Button 
                onClick={fetchOpportunities} 
                disabled={refreshing || loading}
                variant="outline"
                size="icon"
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <CardDescription>
            {config.description[language as 'fr' | 'en']}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Opportunities List */}
      {opportunities.length > 0 ? (
        <div className="space-y-4">
          {opportunities.map((opp) => {
            const isTreated = opp.has_article === true;
            return (
              <Card 
                key={opp.id} 
                className={`hover:shadow-md transition-shadow ${isTreated ? 'opacity-70' : ''}`}
                style={{ borderColor: isTreated ? undefined : `${config.color}30` }}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Question */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {language === 'fr' ? 'Question type' : 'Typical question'}
                    </p>
                    <p className="font-medium text-lg">"{opp.question}"</p>
                  </div>

                  {/* Direct Answer */}
                  {opp.answer && (
                    <div className="bg-muted/50 p-3 rounded-lg border-l-4" style={{ borderLeftColor: config.color }}>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {language === 'fr' ? 'Réponse citable' : 'Citable answer'}
                      </p>
                      <p className="text-sm font-medium leading-relaxed">
                        "{opp.answer}"
                      </p>
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {getDifficultyBadge('medium')}
                    
                    {opp.score && (
                      <Badge variant="secondary">
                        {language === 'fr' ? 'Score' : 'Score'}: {opp.score}%
                      </Badge>
                    )}

                    {isTreated && (
                      <Badge className="bg-green-500 hover:bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {language === 'fr' ? 'Traité' : 'Treated'}
                      </Badge>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <Button 
                      size="sm" 
                      className="w-full sm:w-auto"
                      onClick={() => handleGenerateArticle(opp)}
                      disabled={isTreated}
                      style={{ backgroundColor: isTreated ? undefined : config.color }}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isTreated 
                        ? (language === 'fr' ? 'Article généré' : 'Article generated')
                        : (language === 'fr' ? 'Générer article AEO' : 'Generate AEO article')
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {!project?.id 
                ? (language === 'fr' ? 'Sélectionnez un projet' : 'Select a project')
                : (language === 'fr' ? 'Aucune opportunité trouvée' : 'No opportunities found')
              }
            </p>
            {project?.id && (
              <Button onClick={generateOpportunities} disabled={refreshing}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Générer des opportunités' : 'Generate opportunities'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Article Generation Dialog */}
      <AeoArticleGenerationDialog
        open={generationDialogOpen}
        onClose={() => setGenerationDialogOpen(false)}
        isGenerating={isGeneratingArticle}
        progress={generationProgress}
        currentStep={generationStep}
        generatedArticle={generatedArticle}
        opportunityTitle={selectedOpportunity?.question}
        platformColor={config.color}
      />
    </div>
  );
}
