import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { ScoreRing } from "@/components/ui/score-ring";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Plus, Eye, Pencil, Newspaper, ExternalLink, Copy, Globe, Loader2, RefreshCw, Zap, Send, FileText, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAnswers, useToggleAnswerPublic } from "@/hooks/useAnswers";
import { usePublishAnswer } from "@/hooks/usePublishAnswer";
import { useActiveProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CmsConnectPopup } from "@/components/CmsConnectPopup";
import chatGptLogo from "@/assets/chatgpt-logo.png";
import chatGptIcon from "@/assets/chatgpt-icon.png";

const platforms = ["ChatGPT", "Gemini", "Claude", "Perplexity", "Copilot"];

interface Article {
  id: string;
  title: string;
  status: string | null;
  word_count: number | null;
  aeo_score: number | null;
  created_at: string | null;
  linked_answer_id: string | null;
  content?: string | null;
  html_content?: string | null;
  scheduled_date?: string | null;
}

export default function Answers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { project } = useActiveProject();
  const { data: answers = [], isLoading, refetch } = useAnswers();
  const togglePublic = useToggleAnswerPublic();
  const publishAnswer = usePublishAnswer();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [showHighCitation, setShowHighCitation] = useState(false);
  const [showPublishedOnly, setShowPublishedOnly] = useState(false);
  const [viewingAnswer, setViewingAnswer] = useState<typeof answers[0] | null>(null);
  const [activeTab, setActiveTab] = useState("answers");
  
  // Articles state
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  
  // Progress bar state
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGeneratingWithProgress, setIsGeneratingWithProgress] = useState(false);
  
  // New Answer Modal State
  const [showNewAnswerModal, setShowNewAnswerModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [generating30, setGenerating30] = useState(false);
  const [unusedKeywordsCount, setUnusedKeywordsCount] = useState(0);
  const [showCmsPopup, setShowCmsPopup] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [generatedArticle, setGeneratedArticle] = useState<{ id: string; title: string; html: string; answerId: string } | null>(null);
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null);
  const [loadingArticleContent, setLoadingArticleContent] = useState(false);

  // Fetch articles
  useEffect(() => {
    const fetchArticles = async () => {
      if (!project) return;
      setLoadingArticles(true);
      try {
        const { data, error } = await supabase
          .from("articles")
          .select("id, title, status, word_count, aeo_score, created_at, linked_answer_id, content, html_content, scheduled_date")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setArticles(data || []);
      } catch (error) {
        console.error("Error fetching articles:", error);
      } finally {
        setLoadingArticles(false);
      }
    };
    fetchArticles();
  }, [project]);

  const handlePublishToCms = async (answerId: string) => {
    if (!project) {
      toast.error("No active project");
      return;
    }
    setPublishingId(answerId);
    try {
      await publishAnswer.mutateAsync({ answerId, projectId: project.id });
    } finally {
      setPublishingId(null);
    }
  };

  // Fetch unused keywords count
  useEffect(() => {
    const fetchKeywordsCount = async () => {
      if (!user) return;
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1);
      
      if (projects && projects.length > 0) {
        const { count } = await supabase
          .from("keywords")
          .select("id", { count: 'exact', head: true })
          .eq("project_id", projects[0].id)
          .eq("is_used", false);
        
        setUnusedKeywordsCount(count || 0);
      }
    };
    fetchKeywordsCount();
  }, [user]);

  const filteredAnswers = answers.filter((answer) => {
    const matchesSearch = answer.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = selectedPlatforms.length === 0 || selectedPlatforms.some((p) => answer.platforms?.includes(p));
    const matchesHighCitation = !showHighCitation || answer.high_citation;
    const matchesPublished = !showPublishedOnly || answer.is_public;
    return matchesSearch && matchesPlatform && matchesHighCitation && matchesPublished;
  });

  const filteredArticles = articles.filter((article) => {
    return article.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleTogglePublish = (id: string, currentState: boolean) => {
    togglePublic.mutate({ id, isPublic: !currentState });
  };

  const handleViewAnswer = (answer: typeof answers[0]) => {
    setViewingAnswer(answer);
  };

  const handleEditAnswer = (answerId: string) => {
    navigate(`/answers/${answerId}/edit`);
  };

  const [generatingArticleId, setGeneratingArticleId] = useState<string | null>(null);

  const handleGenerateArticle = async (answerId: string) => {
    if (!project) {
      toast.error("No active project");
      return;
    }
    
    setGeneratingArticleId(answerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("generate-aeo-article", {
        body: { 
          answerId, 
          language: project.language || "fr" 
        },
        headers: { 
          Authorization: `Bearer ${session?.access_token}` 
        }
      });
      
      if (error) throw error;
      
      // Show preview popup with article
      if (data?.article && data?.html) {
        setGeneratedArticle({
          id: data.article.id,
          title: data.article.title,
          html: data.html,
          answerId
        });
      }
      
      toast.success("Article generated!");
      refetch();
    } catch (error) {
      console.error("Error generating article:", error);
      toast.error("Failed to generate article");
    } finally {
      setGeneratingArticleId(null);
    }
  };

  const handlePublishGeneratedArticle = async () => {
    if (!generatedArticle || !project) return;
    
    setPublishingId(generatedArticle.answerId);
    try {
      await publishAnswer.mutateAsync({ 
        answerId: generatedArticle.answerId, 
        projectId: project.id 
      });
      setGeneratedArticle(null);
    } finally {
      setPublishingId(null);
    }
  };

  const handleViewPublic = (slug: string) => {
    window.open(`/answers/${slug}`, "_blank");
  };

  const handleCopyLink = (slug: string) => {
    const publicUrl = `${window.location.origin}/answers/${slug}`;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied to clipboard!");
  };

  const handleGenerateNewAnswer = async () => {
    if (!newQuestion.trim() || !user) return;
    
    setIsGenerating(true);
    try {
      // Get project
      const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1);
      
      if (!projects || projects.length === 0) {
        toast.error("No active project found");
        return;
      }

      const project = projects[0];
      
      // Call the generate-aeo-answers edge function
      const { data, error } = await supabase.functions.invoke("generate-aeo-answers", {
        body: {
          projectId: project.id,
          questions: [newQuestion],
          businessContext: {
            name: project.brand_name || project.name,
            description: project.business_description,
            audience: project.audience,
            language: project.language
          }
        }
      });

      if (error) throw error;
      
      toast.success("Answer generated successfully!");
      setShowNewAnswerModal(false);
      setNewQuestion("");
      refetch();
    } catch (error) {
      console.error("Error generating answer:", error);
      toast.error("Failed to generate answer");
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateAllAnswers = async () => {
    if (!user) return;
    
    setRegeneratingAll(true);
    setIsGeneratingWithProgress(true);
    setGenerationProgress(0);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Get active project
      const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1);
      
      if (!projects || projects.length === 0) {
        toast.error("No active project found");
        setRegeneratingAll(false);
        setIsGeneratingWithProgress(false);
        return;
      }

      const project = projects[0];
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 500);
      
      // Check if there are unused keywords
      const { data: unusedKeywords } = await supabase
        .from("keywords")
        .select("id, keyword")
        .eq("project_id", project.id)
        .eq("is_used", false)
        .limit(10);
      
      const hasUnusedKeywords = unusedKeywords && unusedKeywords.length > 0;
      console.log(`[ANSWERS] Found ${unusedKeywords?.length || 0} unused keywords`);
      
      // Generate from keywords (new questions from unused keywords)
      toast.info(hasUnusedKeywords 
        ? `Generating ${unusedKeywords.length} new answers from keywords...`
        : "Generating new answers from project context...");
      
      const { data, error } = await supabase.functions.invoke('auto-generate-aeo', {
        body: { 
          projectId: project.id,
          useKeywords: true,
          language: project.language || 'fr'
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      
      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      if (error) {
        console.error('Error generating answers:', error);
        toast.error("Error during generation");
      } else {
        const count = data?.count || data?.answers?.length || 0;
        toast.success(`${count} new answers generated!`);
      }
      
      refetch();
    } catch (error) {
      console.error('Error regenerating all answers:', error);
      toast.error("Error during regeneration");
    } finally {
      setRegeneratingAll(false);
      setTimeout(() => {
        setIsGeneratingWithProgress(false);
        setGenerationProgress(0);
      }, 1000);
    }
  };

  const generate30Answers = async () => {
    if (!user) return;
    
    setGenerating30(true);
    setIsGeneratingWithProgress(true);
    setGenerationProgress(0);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Get all active projects and find one with keywords
      const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      if (!projects || projects.length === 0) {
        toast.error("No active project found");
        setGenerating30(false);
        setIsGeneratingWithProgress(false);
        return;
      }

      // Find project with keywords
      let projectWithKeywords = null;
      for (const p of projects) {
        const { count } = await supabase
          .from("keywords")
          .select("*", { count: "exact", head: true })
          .eq("project_id", p.id);
        
        if (count && count > 0) {
          projectWithKeywords = p;
          console.log(`[generate30Answers] Found project with ${count} keywords: ${p.id}`);
          break;
        }
      }

      const activeProject = projectWithKeywords || projects[0];
      console.log(`[generate30Answers] Using project: ${activeProject.id} (${activeProject.name})`);
      
      toast.info("Generating 30 Q/A + 30 Articles over 30 days...");
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 3, 90));
      }, 1000);
      
      const { data, error } = await supabase.functions.invoke('generate-30-days-content', {
        body: { 
          projectId: activeProject.id,
          days: 30,
          language: activeProject.language || 'fr'
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      
      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      if (error) {
        console.error('Error generating content:', error);
        toast.error("Error during generation");
      } else {
        toast.success(`${data?.answers_created || 0} answers + ${data?.articles_created || 0} articles scheduled!`);
        setShowCmsPopup(true); // Show CMS popup after generation
      }
      
      refetch();
      // Refresh articles list
      if (project) {
        const { data: newArticles } = await supabase
          .from("articles")
          .select("id, title, status, word_count, aeo_score, created_at, linked_answer_id")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false });
        setArticles(newArticles || []);
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error("Error during generation");
    } finally {
      setGenerating30(false);
      setTimeout(() => {
        setIsGeneratingWithProgress(false);
        setGenerationProgress(0);
      }, 1000);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'published': return 'bg-emerald-500/20 text-emerald-500';
      case 'draft': return 'bg-amber-500/20 text-amber-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ChatGPT Logo + Badge - Separate Line */}
        <div className="flex items-center gap-3">
          <img src={chatGptLogo} alt="ChatGPT" className="h-16 w-auto" />
          <Badge className="bg-gradient-to-r from-primary to-blue-500 text-white border-0 font-bold text-sm px-3 py-1">
            Rank First!
          </Badge>
        </div>

        {/* Hero Header */}
        <div className="rounded-xl bg-gradient-to-r from-primary/10 via-blue-500/10 to-emerald-500/10 p-6 border border-border/50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <img src={chatGptIcon} alt="ChatGPT" className="h-10 w-10 rounded-lg" />
                <h1 className="text-3xl font-bold tracking-tight">AEO Answers</h1>
              </div>
              <p className="text-muted-foreground">Optimized, citable answers for AI assistants</p>
            </div>
          </div>
        </div>

        {/* Progress Bar - After AEO Answers Banner */}
        {isGeneratingWithProgress && (
          <div className="rounded-lg bg-background/80 backdrop-blur-sm border px-4 py-3">
            <div className="flex items-center gap-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <div className="flex-1">
                <Progress value={generationProgress} className="h-2" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{generationProgress}%</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="answers" className="gap-2">
              <Search className="h-4 w-4" />
              AEO Answers ({answers.length})
            </TabsTrigger>
            <TabsTrigger value="articles" className="gap-2">
              <FileText className="h-4 w-4" />
              Articles ({articles.length})
            </TabsTrigger>
          </TabsList>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            {activeTab === "answers" && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />Platform
                      {selectedPlatforms.length > 0 && <Badge variant="secondary" className="ml-1">{selectedPlatforms.length}</Badge>}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {platforms.map((platform) => (
                      <DropdownMenuCheckboxItem key={platform} checked={selectedPlatforms.includes(platform)} onCheckedChange={(checked) => {
                        if (checked) setSelectedPlatforms([...selectedPlatforms, platform]);
                        else setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
                      }}>{platform}</DropdownMenuCheckboxItem>
                    ))}
                    {selectedPlatforms.length > 0 && (<><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setSelectedPlatforms([])}>Clear all</DropdownMenuItem></>)}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant={showHighCitation ? "default" : "outline"} size="sm" onClick={() => setShowHighCitation(!showHighCitation)} className={showHighCitation ? "gradient-bg text-primary-foreground" : ""}>High Citation</Button>
                <Button variant={showPublishedOnly ? "default" : "outline"} size="sm" onClick={() => setShowPublishedOnly(!showPublishedOnly)} className={showPublishedOnly ? "gradient-bg text-primary-foreground" : ""}>Published Only</Button>
              </>
            )}
          </div>

          {/* Answers Tab Content */}
          <TabsContent value="answers" className="mt-4 space-y-4">
            {filteredAnswers.map((answer, index) => (
              <GlassCard key={answer.id} hover className="p-6 animate-fade-in" style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}>
                <div className="flex gap-6">
                  <div className="flex-shrink-0"><ScoreRing score={answer.score} size="lg" /></div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-lg font-semibold leading-tight">{answer.question}</h3>
                      <div className="flex items-center gap-2">
                        <Switch checked={answer.is_public} onCheckedChange={() => handleTogglePublish(answer.id, answer.is_public ?? false)} />
                        <span className="text-sm text-muted-foreground">{answer.is_public ? "Public" : "Draft"}</span>
                      </div>
                    </div>
                    <p className="text-muted-foreground line-clamp-2">{answer.answer}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {answer.platforms?.map((p) => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
                      {answer.high_citation && <Badge className="bg-emerald-500/20 text-emerald-500 border-0">High Citation</Badge>}
                      {answer.is_public && <Badge className="bg-blue-500/20 text-blue-500 border-0"><Globe className="mr-1 h-3 w-3" />Public</Badge>}
                      {!answer.is_public && answer.scheduled_date && (
                        <Badge className="bg-amber-500/20 text-amber-500 border-0">
                          <Clock className="mr-1 h-3 w-3" />
                          Planned: {new Date(answer.scheduled_date).toLocaleDateString()}
                        </Badge>
                      )}
                      {answer.has_article && <Badge className="bg-violet-500/20 text-violet-500 border-0"><Newspaper className="mr-1 h-3 w-3" />Has Article</Badge>}
                    </div>
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleViewAnswer(answer)}><Eye className="h-4 w-4" />View</Button>
                      {answer.has_article && (
                        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(`/articles/${answer.article_id}`)}><Newspaper className="h-4 w-4" />Article</Button>
                      )}
                      <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleEditAnswer(answer.id)}><Pencil className="h-4 w-4" />Edit</Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-2" 
                        onClick={() => {
                          const content = `Question: ${answer.question}\n\nAnswer: ${answer.answer}`;
                          navigator.clipboard.writeText(content);
                          toast.success("Answer copied to clipboard!");
                        }}
                      >
                        <Copy className="h-4 w-4" />Copy Answer
                      </Button>
                      {answer.has_article && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2" 
                          onClick={async () => {
                            const { data: article } = await supabase
                              .from("articles")
                              .select("title, content, html_content")
                              .eq("id", answer.article_id)
                              .single();
                            if (article) {
                              navigator.clipboard.writeText(article.html_content || article.content || "");
                              toast.success("Article HTML copied to clipboard!");
                            }
                          }}
                        >
                          <Copy className="h-4 w-4" />Copy Article
                        </Button>
                      )}
                      {answer.is_public && (
                        <>
                          <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleViewPublic(answer.slug)}><ExternalLink className="h-4 w-4" />View Public</Button>
                          <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleCopyLink(answer.slug)}><Copy className="h-4 w-4" />Copy Link</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}

            {filteredAnswers.length === 0 && (
              <GlassCard className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted"><Search className="h-8 w-8 text-muted-foreground" /></div>
                  <div><h3 className="text-lg font-semibold">No answers found</h3><p className="text-muted-foreground">{answers.length === 0 ? "Generate your first AI-ready answer" : "Try adjusting your filters"}</p></div>
                  <Button onClick={() => setShowNewAnswerModal(true)} className="gap-2 gradient-bg text-primary-foreground"><Plus className="h-4 w-4" />Create Answer</Button>
                </div>
              </GlassCard>
            )}
          </TabsContent>

          {/* Articles Tab Content */}
          <TabsContent value="articles" className="mt-4 space-y-4">
            {loadingArticles ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredArticles.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted"><FileText className="h-8 w-8 text-muted-foreground" /></div>
                  <div><h3 className="text-lg font-semibold">No articles found</h3><p className="text-muted-foreground">Generate articles from your AEO answers</p></div>
                </div>
              </GlassCard>
            ) : (
              filteredArticles.map((article, index) => (
                <GlassCard key={article.id} hover className="p-6 animate-fade-in" style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <ScoreRing score={article.aeo_score || 0} size="lg" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-lg font-semibold leading-tight">{article.title}</h3>
                        <Badge className={getStatusColor(article.status)}>
                          {article.status || 'draft'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span>{article.word_count || 0} words</span>
                        <span>•</span>
                        <span>AEO Score: {article.aeo_score || 0}</span>
                        <span>•</span>
                        <span>{new Date(article.created_at || '').toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-2 flex-wrap">
                        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setViewingArticle(article)}>
                          <Eye className="h-4 w-4" />View Article
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(`/articles/${article.id}/edit`)}>
                          <Pencil className="h-4 w-4" />Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2" 
                          onClick={() => {
                            const content = article.html_content || article.content || "";
                            navigator.clipboard.writeText(content);
                            toast.success("Article copied to clipboard!");
                          }}
                        >
                          <Copy className="h-4 w-4" />Copy Article
                        </Button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* View Answer Dialog */}
      <Dialog open={!!viewingAnswer} onOpenChange={() => setViewingAnswer(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingAnswer?.question}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <ScoreRing score={viewingAnswer?.score ?? 0} size="sm" />
                <span>Citation Score: {viewingAnswer?.score ?? 0}</span>
                {viewingAnswer?.is_public && <Badge className="bg-blue-500/20 text-blue-500 border-0">Public</Badge>}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <h4 className="font-medium mb-2">Answer</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{viewingAnswer?.answer}</p>
            </div>
            {viewingAnswer?.platforms && viewingAnswer.platforms.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Target Platforms</h4>
                <div className="flex flex-wrap gap-2">
                  {viewingAnswer.platforms.map((p) => <Badge key={p} variant="secondary">{p}</Badge>)}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Answer Modal */}
      <Dialog open={showNewAnswerModal} onOpenChange={setShowNewAnswerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New Answer</DialogTitle>
            <DialogDescription>
              Enter a question and we'll generate an AI-optimized, citable answer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Textarea
                id="question"
                placeholder="e.g., What is AEO and how does it differ from SEO?"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAnswerModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateNewAnswer}
              disabled={!newQuestion.trim() || isGenerating}
              className="gradient-bg text-primary-foreground"
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Answer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Article Preview Dialog */}
      <Dialog open={!!generatedArticle} onOpenChange={() => setGeneratedArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              Article Generated
            </DialogTitle>
            <DialogDescription>
              Preview your AEO-optimized article before publishing to your CMS.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto border rounded-lg bg-background">
            {generatedArticle?.html && (
              <iframe
                srcDoc={generatedArticle.html}
                className="w-full h-[400px] border-0"
                title="Article Preview"
              />
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setGeneratedArticle(null)}>
              Close
            </Button>
            <Button 
              onClick={handlePublishGeneratedArticle}
              disabled={publishingId === generatedArticle?.answerId}
              className="gradient-bg text-primary-foreground gap-2"
            >
              {publishingId === generatedArticle?.answerId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publish to CMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CMS Connect Popup */}
      <CmsConnectPopup open={showCmsPopup} onOpenChange={setShowCmsPopup} />

      {/* View Article Popup */}
      <Dialog open={!!viewingArticle} onOpenChange={() => setViewingArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {viewingArticle?.title}
            </DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <ScoreRing score={viewingArticle?.aeo_score || 0} size="sm" />
                  <span>AEO Score: {viewingArticle?.aeo_score || 0}</span>
                </div>
                <span>•</span>
                <span>{viewingArticle?.word_count || 0} words</span>
                {viewingArticle?.scheduled_date && (
                  <>
                    <span>•</span>
                    <Badge variant="secondary">
                      Scheduled: {new Date(viewingArticle.scheduled_date).toLocaleDateString()}
                    </Badge>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto border rounded-lg bg-background p-4">
            {viewingArticle?.html_content ? (
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: viewingArticle.html_content }}
              />
            ) : viewingArticle?.content ? (
              <div className="whitespace-pre-wrap text-sm">{viewingArticle.content}</div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No content available</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => {
                const content = viewingArticle?.html_content || viewingArticle?.content || "";
                navigator.clipboard.writeText(content);
                toast.success("Article copied to clipboard!");
              }}
            >
              <Copy className="h-4 w-4" />
              Copy Article
            </Button>
            <Button variant="outline" onClick={() => setViewingArticle(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
