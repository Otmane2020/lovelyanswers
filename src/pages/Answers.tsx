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
import { Search, Filter, Plus, Eye, Pencil, Newspaper, ExternalLink, Copy, Globe, Loader2, RefreshCw, Zap, Send } from "lucide-react";
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

const platforms = ["ChatGPT", "Gemini", "Claude", "Perplexity", "Copilot"];

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
  
  // New Answer Modal State
  const [showNewAnswerModal, setShowNewAnswerModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [generating30, setGenerating30] = useState(false);
  const [unusedKeywordsCount, setUnusedKeywordsCount] = useState(0);
  const [showCmsPopup, setShowCmsPopup] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

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

  const handleTogglePublish = (id: string, currentState: boolean) => {
    togglePublic.mutate({ id, isPublic: !currentState });
  };

  const handleViewAnswer = (answer: typeof answers[0]) => {
    setViewingAnswer(answer);
  };

  const handleEditAnswer = (answerId: string) => {
    navigate(`/answers/${answerId}/edit`);
  };

  const handleGenerateArticle = (answerId: string) => {
    navigate(`/articles?generate=${answerId}`);
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
        return;
      }

      const project = projects[0];
      
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
        ? `Génération de ${unusedKeywords.length} nouvelles réponses depuis les keywords...`
        : "Génération de nouvelles réponses depuis le contexte du projet...");
      
      const { data, error } = await supabase.functions.invoke('generate-aeo-answers', {
        body: { 
          projectId: project.id,
          useKeywords: true,
          language: project.language || 'fr'
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      
      if (error) {
        console.error('Error generating answers:', error);
        toast.error("Erreur lors de la génération");
      } else {
        const count = data?.count || data?.answers?.length || 0;
        toast.success(`${count} nouvelles réponses générées!`);
      }
      
      refetch();
    } catch (error) {
      console.error('Error regenerating all answers:', error);
      toast.error("Erreur lors de la régénération");
    } finally {
    setRegeneratingAll(false);
    }
  };

  const generate30Answers = async () => {
    if (!user) return;
    
    setGenerating30(true);
    
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

      const project = projectWithKeywords || projects[0];
      console.log(`[generate30Answers] Using project: ${project.id} (${project.name})`);
      
      toast.info("Génération de 30 Q/A planifiées sur 30 jours...");
      
      const { data, error } = await supabase.functions.invoke('auto-generate-aeo', {
        body: { 
          projectId: project.id,
          generate30: true,
          language: project.language || 'fr'
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      
      if (error) {
        console.error('Error generating 30 answers:', error);
        toast.error("Erreur lors de la génération");
      } else {
        toast.success(`${data?.answers_created || 30} réponses générées et planifiées!`);
        setShowCmsPopup(true); // Show CMS popup after generation
      }
      
      refetch();
    } catch (error) {
      console.error('Error generating 30 answers:', error);
      toast.error("Erreur lors de la génération");
    } finally {
      setGenerating30(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src={chatGptLogo} alt="ChatGPT" className="h-10 w-10 rounded-lg" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AEO Answers</h1>
              <p className="text-muted-foreground">Optimized, citable answers for AI assistants</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline"
              onClick={generate30Answers}
              disabled={generating30}
              className="gap-2 border-emerald-500/50 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
            >
              {generating30 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Générer 30 Q/A (30 jours)
            </Button>
            <Button 
              variant="outline"
              onClick={regenerateAllAnswers}
              disabled={regeneratingAll}
              className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
            >
              {regeneratingAll ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {unusedKeywordsCount > 0 ? `Générer (${unusedKeywordsCount})` : "Régénérer"}
            </Button>
            <Button onClick={() => setShowNewAnswerModal(true)} className="gap-2 gradient-bg text-primary-foreground shadow-glow-sm">
              <Plus className="h-4 w-4" />New Answer
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search answers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
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
        </div>

        <div className="space-y-4">
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
                    {answer.has_article && <Badge className="bg-violet-500/20 text-violet-500 border-0"><Newspaper className="mr-1 h-3 w-3" />Has Article</Badge>}
                  </div>
                  <div className="flex items-center gap-2 pt-2 flex-wrap">
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleViewAnswer(answer)}><Eye className="h-4 w-4" />View</Button>
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleEditAnswer(answer.id)}><Pencil className="h-4 w-4" />Edit</Button>
                    {!answer.has_article && <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleGenerateArticle(answer.id)}><Newspaper className="h-4 w-4" />Generate Article</Button>}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2 text-primary hover:text-primary" 
                      onClick={() => handlePublishToCms(answer.id)}
                      disabled={publishingId === answer.id}
                    >
                      {publishingId === answer.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Publish to CMS
                    </Button>
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
        </div>
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

      {/* CMS Connect Popup */}
      <CmsConnectPopup open={showCmsPopup} onOpenChange={setShowCmsPopup} />
    </DashboardLayout>
  );
}