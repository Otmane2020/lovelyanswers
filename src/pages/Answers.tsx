import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { ScoreRing } from "@/components/ui/score-ring";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Plus, Eye, Pencil, Newspaper, ExternalLink, Copy, Globe, Loader2, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useAnswers, useToggleAnswerPublic } from "@/hooks/useAnswers";
import { useActiveProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import chatGptLogo from "@/assets/chatgpt-logo.png";
import chatGptIcon from "@/assets/chatgpt-icon.png";

// Define interfaces
interface Answer {
  id: string;
  question: string;
  answer: string;
  score: number | null;
  platforms: string[];
  high_citation: boolean;
  is_public: boolean | null;
  scheduled_date: string | null;
  has_article: boolean;
  article_id: string | null;
}

const platforms = ["ChatGPT", "Gemini", "Claude", "Perplexity", "Copilot"];
interface Article { id: string; title: string; status: string | null; word_count: number | null; aeo_score: number | null; created_at: string | null; linked_answer_id: string | null; content?: string | null; html_content?: string | null; scheduled_date?: string | null; }

export default function Answers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { project } = useActiveProject();
  const { data: answers = [], isLoading, refetch } = useAnswers();
  const togglePublic = useToggleAnswerPublic();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [showHighCitation, setShowHighCitation] = useState(false);
  const [showPublishedOnly, setShowPublishedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("answers");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  useEffect(() => {
    const fetchArticles = async () => {
      if (!project?.id) return;
      setLoadingArticles(true);
      try {
        const { data, error } = await supabase.from('articles').select('*').eq('project_id', project.id);
        if (error) throw error;
        setArticles(data || []);
      } catch (error: any) { toast.error(error.message || "Error fetching articles"); } finally { setLoadingArticles(false); }
    };
    fetchArticles();
  }, [project?.id]);

  const filteredAnswers = answers.filter((answer) => {
    const searchMatch = answer.question.toLowerCase().includes(searchQuery.toLowerCase()) || answer.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const platformMatch = selectedPlatforms.length === 0 || answer.platforms?.some(p => selectedPlatforms.includes(p));
    const citationMatch = !showHighCitation || (answer.score !== null && answer.score >= 80);
    const publishedMatch = !showPublishedOnly || answer.is_public;
    return searchMatch && platformMatch && citationMatch && publishedMatch;
  });

  const filteredArticles = articles.filter((article) => {
    const searchMatch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
    return searchMatch;
  });

  const handleTogglePublish = async (id: string, currentState: boolean) => {
    if (!project) return;
    try {
      await togglePublic.mutateAsync({ id, isPublic: !currentState });
      refetch();
      toast.success(`Answer ${currentState ? 'unpublished' : 'published'}!`);
    } catch (error: any) { toast.error(error.message || "Error toggling publish"); }
  };

  const handleViewAnswer = (answer: any) => {
    console.log("View answer:", answer);
  };

  const handleEditAnswer = (answerId: string) => {
    navigate(`/answers/${answerId}`);
  };

  const handleViewPublic = (answer: any) => {
    if (!answer.slug) { toast.error("No public URL available"); return; }
    window.open(`${window.location.origin}/answers/${answer.slug}`, "_blank");
  };

  const handleCopyLink = (answer: any) => {
    if (!answer.slug) { toast.error("No public URL available"); return; }
    navigator.clipboard.writeText(`${window.location.origin}/answers/${answer.slug}`);
    toast.success("Public link copied!");
  };

  const getStatusColor = (status: string | null) => "bg-muted";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <img src={chatGptLogo} alt="ChatGPT" className="h-16 w-auto" />
           <Badge className="bg-[hsl(222,47%,11%)] text-white border-0 font-bold text-sm px-3 py-1">Rank First!</Badge>
        </div>

        <div className="rounded-xl bg-[hsl(222,47%,11%)]/10 p-6 border border-[hsl(222,47%,11%)]/20">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="answers" className="gap-2"><Search className="h-4 w-4" />AEO Answers ({answers.length})</TabsTrigger>
            <TabsTrigger value="articles" className="gap-2"><Newspaper className="h-4 w-4" />Articles ({articles.length})</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px] max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
            {activeTab === "answers" && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" className="gap-2"><Filter className="h-4 w-4" />Platform</Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">{platforms.map((platform) => (
                    <DropdownMenuCheckboxItem key={platform} checked={selectedPlatforms.includes(platform)} onCheckedChange={(checked) => {
                      if (checked) setSelectedPlatforms([...selectedPlatforms, platform]);
                      else setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
                    }}>{platform}</DropdownMenuCheckboxItem>))}</DropdownMenuContent>
                </DropdownMenu>
                <Button variant={showHighCitation ? "default" : "outline"} size="sm" onClick={() => setShowHighCitation(!showHighCitation)} className={showHighCitation ? "bg-[hsl(222,47%,11%)] text-white" : ""}>High Citation</Button>
                <Button variant={showPublishedOnly ? "default" : "outline"} size="sm" onClick={() => setShowPublishedOnly(!showPublishedOnly)} className={showPublishedOnly ? "bg-[hsl(222,47%,11%)] text-white" : ""}>Published Only</Button>
              </>
            )}
          </div>

          <TabsContent value="answers" className="mt-4 space-y-4">
            {filteredAnswers.map((answer, index) => (
              <GlassCard key={answer.id} hover className="p-6 animate-fade-in" style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}>
                <div className="flex gap-6">
                  <div className="flex-shrink-0"><ScoreRing score={answer.score} size="lg" /></div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-lg font-semibold leading-tight">{answer.question}</h3>
                      <div className="flex items-center gap-2"><Switch checked={answer.is_public} onCheckedChange={() => handleTogglePublish(answer.id, answer.is_public ?? false)} /><span className="text-sm text-muted-foreground">{answer.is_public ? "Public" : "Draft"}</span></div>
                    </div>
                    <p className="text-muted-foreground line-clamp-2">{answer.answer}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {answer.platforms?.map((p) => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
                      {answer.high_citation && <Badge className="bg-emerald-500/20 text-emerald-500 border-0">High Citation</Badge>}
                      {answer.is_public && <Badge className="bg-blue-500/20 text-blue-500 border-0"><Globe className="mr-1 h-3 w-3" />Public</Badge>}
                      {!answer.is_public && answer.scheduled_date && (<Badge className="bg-amber-500/20 text-amber-500 border-0"><Clock className="mr-1 h-3 w-3" />Planned: {new Date(answer.scheduled_date).toLocaleDateString()}</Badge>)}
                      {answer.has_article && <Badge className="bg-[hsl(222,47%,11%)]/10 text-[hsl(222,47%,30%)] border-0"><Newspaper className="mr-1 h-3 w-3" />Has Article</Badge>}
                    </div>
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleViewAnswer(answer)}><Eye className="h-4 w-4" />View</Button>
                      {answer.has_article && (<Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(`/articles/${answer.article_id}`)}><Newspaper className="h-4 w-4" />Article</Button>)}
                      <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleEditAnswer(answer.id)}><Pencil className="h-4 w-4" />Edit</Button>
                      <Button variant="ghost" size="sm" className="gap-2" onClick={() => { navigator.clipboard.writeText(`Question: ${answer.question}\n\nAnswer: ${answer.answer}`); toast.success("Answer copied!"); }}><Copy className="h-4 w-4" />Copy Answer</Button>
                      {answer.is_public && (<>
                        <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleViewPublic(answer)}><ExternalLink className="h-4 w-4" />View Public</Button>
                        <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleCopyLink(answer)}><Copy className="h-4 w-4" />Copy Link</Button>
                      </>)}
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </TabsContent>
          
          <TabsContent value="articles" className="mt-4 space-y-4">
            {filteredArticles.map((article, index) => (
              <GlassCard key={article.id} hover className="p-6 animate-fade-in" style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}>
                <div className="flex gap-6">
                  <div className="flex-shrink-0"><ScoreRing score={article.aeo_score} size="lg" /></div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-lg font-semibold leading-tight">{article.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-[hsl(222,47%,11%)]/10 text-[hsl(222,47%,30%)] border-0"><Newspaper className="mr-1 h-3 w-3" />Article</Badge>
                    </div>
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(`/articles/${article.id}`)}><Eye className="h-4 w-4" />View</Button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
