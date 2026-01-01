import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, Search, Copy, Check, TrendingUp, 
  Sparkles, FileText, RefreshCw, ExternalLink, Globe,
  ChevronDown, ChevronUp, Zap, Target, HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SupportingContent {
  bullets?: string[];
  faq?: Array<{ q: string; a: string }>;
}

interface AeoAnswer {
  id: string;
  question: string;
  answer: string;
  platforms: string[];
  score: number;
  created_at: string;
  slug: string | null;
  is_public: boolean | null;
  has_article: boolean | null;
  intent: string | null;
  difficulty: string | null;
  supporting_content: SupportingContent | null;
  article_id: string | null;
}

export default function AeoAnswers() {
  const { user } = useAuth();
  
  const [answers, setAnswers] = useState<AeoAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [generatingArticleId, setGeneratingArticleId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAnswers();
    }
  }, [user]);

  const fetchAnswers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('answers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnswers((data || []) as AeoAnswer[]);
    } catch (error) {
      console.error('Error fetching answers:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (question: string): string => {
    let slug = question.toLowerCase();
    slug = slug.replace(/[àáâãäå]/g, 'a');
    slug = slug.replace(/[èéêë]/g, 'e');
    slug = slug.replace(/[ìíîï]/g, 'i');
    slug = slug.replace(/[òóôõö]/g, 'o');
    slug = slug.replace(/[ùúûü]/g, 'u');
    slug = slug.replace(/[ç]/g, 'c');
    slug = slug.replace(/[^a-z0-9\s-]/g, '');
    slug = slug.replace(/\s+/g, '-');
    slug = slug.replace(/-+/g, '-');
    slug = slug.replace(/^-|-$/g, '');
    return slug.slice(0, 100);
  };

  const publishAnswer = async (answer: AeoAnswer) => {
    if (!user) return;
    
    setPublishingId(answer.id);
    try {
      const slug = generateSlug(answer.question);
      
      const { error } = await supabase
        .from('answers')
        .update({
          is_public: true,
          slug: slug
        })
        .eq('id', answer.id);

      if (error) throw error;
      
      toast.success("Answer published!");
      fetchAnswers();
    } catch (error) {
      console.error('Error publishing answer:', error);
      toast.error("Error publishing");
    } finally {
      setPublishingId(null);
    }
  };

  const generateArticle = async (answer: AeoAnswer) => {
    if (!user) return;
    
    setGeneratingArticleId(answer.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('generate-aeo-article', {
        body: { answerId: answer.id, language: 'fr' },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;
      
      toast.success("Article generated successfully!");
      fetchAnswers();
    } catch (error) {
      console.error('Error generating article:', error);
      toast.error("Error generating article");
    } finally {
      setGeneratingArticleId(null);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Answer copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyPublicUrl = async (answer: AeoAnswer) => {
    const url = `${window.location.origin}/answers/${answer.slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Public URL copied!");
  };

  const openPublicUrl = (answer: AeoAnswer) => {
    const url = `/answers/${answer.slug}`;
    window.open(url, '_blank');
  };

  const getPlatformColor = (platform: string | undefined) => {
    if (!platform) return "bg-violet-500/20 text-violet-400 border-violet-500/30";
    const colors: Record<string, string> = {
      chatgpt: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      gemini: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      claude: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      perplexity: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      copilot: "bg-blue-600/20 text-blue-400 border-blue-600/30",
    };
    return colors[platform?.toLowerCase()] || "bg-violet-500/20 text-violet-400 border-violet-500/30";
  };

  const getIntentColor = (intent: string | null) => {
    const colors: Record<string, string> = {
      price: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      what: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      why: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      howto: "bg-green-500/20 text-green-400 border-green-500/30",
      best: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      comparison: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      criteria: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
      duration: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    };
    return colors[intent || ''] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  const getIntentLabel = (intent: string | null) => {
    const labels: Record<string, string> = {
      price: "💰 Prix",
      what: "❓ Définition",
      why: "🎯 Pourquoi",
      howto: "📝 Comment",
      best: "🏆 Meilleur",
      comparison: "⚖️ Comparaison",
      criteria: "📋 Critères",
      duration: "⏱️ Durée",
    };
    return labels[intent || ''] || intent || "Info";
  };

  const getDifficultyColor = (difficulty: string | null) => {
    const colors: Record<string, string> = {
      easy: "text-emerald-400",
      medium: "text-amber-400",
      hard: "text-red-400",
    };
    return colors[difficulty || ''] || "text-slate-400";
  };

  const filteredAnswers = answers.filter(answer => 
    answer.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    answer.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">AEO Answers</h1>
            <p className="text-muted-foreground mt-1">AI-optimized answers for citation by ChatGPT, Gemini, Claude</p>
          </div>
          <Button onClick={fetchAnswers} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{answers.length}</p>
                <p className="text-xs text-muted-foreground">Total answers</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{answers.filter(a => a.is_public).length}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {answers.length > 0 
                    ? Math.round(answers.reduce((sum, a) => sum + (a.score || 0), 0) / answers.length)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Avg score</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{answers.filter(a => (a.score || 0) >= 80).length}</p>
                <p className="text-xs text-muted-foreground">High citation</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Answers List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : filteredAnswers.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No answers yet</h3>
            <p className="text-muted-foreground mb-6">
              Complete the wizard to generate AEO-optimized answers.
            </p>
            <Button className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              Start wizard
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAnswers.map((answer) => (
              <Card key={answer.id} className="p-6 hover:shadow-md transition-all">
                <div className="flex flex-col gap-4">
                  {/* Header row */}
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{answer.question}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {/* Intent badge */}
                            {answer.intent && (
                              <Badge className={getIntentColor(answer.intent)}>
                                {getIntentLabel(answer.intent)}
                              </Badge>
                            )}
                            
                            {/* Platform badges */}
                            {answer.platforms?.map((platform, idx) => (
                              <Badge key={idx} className={getPlatformColor(platform)}>
                                {platform}
                              </Badge>
                            ))}
                            
                            {/* Score badge */}
                            <Badge variant="outline" className="gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {answer.score || 0}%
                              <span className={getDifficultyColor(answer.difficulty)}>
                                ({answer.difficulty || 'medium'})
                              </span>
                            </Badge>
                            
                            {answer.is_public && (
                              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
                                <Globe className="w-3 h-3 mr-1" />
                                Published
                              </Badge>
                            )}
                            {answer.has_article && (
                              <Badge variant="outline" className="border-blue-500/30 text-blue-600">
                                <FileText className="w-3 h-3 mr-1" />
                                Article
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Answer content */}
                      <div className="bg-muted/50 rounded-lg p-4 ml-13">
                        <p className="text-sm leading-relaxed">{answer.answer}</p>
                      </div>
                      
                      {/* Supporting content (collapsible) */}
                      {(answer.supporting_content?.bullets?.length || answer.supporting_content?.faq?.length) && (
                        <Collapsible 
                          open={expandedId === answer.id}
                          onOpenChange={() => setExpandedId(expandedId === answer.id ? null : answer.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="ml-13 text-muted-foreground">
                              {expandedId === answer.id ? (
                                <ChevronUp className="w-4 h-4 mr-1" />
                              ) : (
                                <ChevronDown className="w-4 h-4 mr-1" />
                              )}
                              Supporting content
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="ml-13 mt-2 space-y-3">
                            {/* Bullets */}
                            {answer.supporting_content?.bullets && answer.supporting_content.bullets.length > 0 && (
                              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
                                  <Zap className="w-4 h-4" />
                                  Key Points
                                </div>
                                <ul className="space-y-1">
                                  {answer.supporting_content.bullets.map((bullet, idx) => (
                                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                      <span className="text-emerald-400 mt-1">•</span>
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* FAQ */}
                            {answer.supporting_content?.faq && answer.supporting_content.faq.length > 0 && (
                              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2">
                                  <HelpCircle className="w-4 h-4" />
                                  Related FAQ
                                </div>
                                <div className="space-y-2">
                                  {answer.supporting_content.faq.map((faq, idx) => (
                                    <div key={idx} className="text-sm">
                                      <p className="text-foreground font-medium">{faq.q}</p>
                                      <p className="text-muted-foreground">{faq.a}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      
                      {/* Public URL display if published */}
                      {answer.is_public && answer.slug && (
                        <div className="flex items-center gap-2 ml-13 mt-2">
                          <span className="text-xs text-muted-foreground">URL:</span>
                          <code className="text-xs text-primary bg-muted px-2 py-1 rounded">
                            /answers/{answer.slug}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyPublicUrl(answer)}
                            className="h-6 px-2"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openPublicUrl(answer)}
                            className="h-6 px-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      {/* Generate Article button */}
                      {!answer.has_article && (
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => generateArticle(answer)}
                          disabled={generatingArticleId === answer.id}
                          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        >
                          {generatingArticleId === answer.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <FileText className="w-4 h-4 mr-1" />
                              Article
                            </>
                          )}
                        </Button>
                      )}
                      
                      {!answer.is_public ? (
                        <Button 
                          size="sm"
                          onClick={() => publishAnswer(answer)}
                          disabled={publishingId === answer.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {publishingId === answer.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Globe className="w-4 h-4 mr-1" />
                              Publish
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => openPublicUrl(answer)}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(answer.answer, answer.id)}
                      >
                        {copiedId === answer.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
