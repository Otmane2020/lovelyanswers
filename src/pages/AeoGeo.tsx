import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Globe, Sparkles, FileText, MessageSquare, BarChart3,
  Loader2, Trash2, ExternalLink, Copy, Check, Plus, Zap,
  TrendingUp, CalendarDays
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { useGeoContents, useGenerateGeoContent, useDeleteGeoContent, GeoContent } from "@/hooks/useGeoContents";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { ScoreRing } from "@/components/ui/score-ring";
import { cn } from "@/lib/utils";

export default function AeoGeo() {
  const { project } = useActiveProject();
  const { data: contents = [], isLoading } = useGeoContents();
  const generateMutation = useGenerateGeoContent();
  const deleteMutation = useDeleteGeoContent();
  const { isSubscribed } = useSubscriptionContext();

  const [showGenerate, setShowGenerate] = useState(false);
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [contentType, setContentType] = useState("article");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isFilling30, setIsFilling30] = useState(false);
  const hasSuggestedRef = useRef(false);

  const handleFill30Days = async () => {
    if (!project || isFilling30) return;
    setIsFilling30(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-30-gso-contents", {
        body: { projectId: project.id },
      });
      if (error) throw new Error(error.message);
      toast.success(`${data?.created || 0} GSO contents generated and scheduled!`);
      // Reload contents
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate 30-day GSO plan");
    } finally {
      setIsFilling30(false);
    }
  };

  // Auto-trigger AI suggestion when dialog opens
  useEffect(() => {
    if (showGenerate && !hasSuggestedRef.current && project && !topic) {
      hasSuggestedRef.current = true;
      handleAiSuggest();
    }
    if (!showGenerate) {
      hasSuggestedRef.current = false;
    }
  }, [showGenerate]);

  const brand = project?.brand_name || "";
  const website = project?.website_url || "";

  const handleAiSuggest = async () => {
    if (!project) return;
    setIsSuggesting(true);
    try {
      const res = await supabase.functions.invoke("generate-geo-content", {
        body: {
          mode: "suggest",
          brand: brand || "Brand",
          website,
          projectId: project.id,
          contentType,
          language: project.language || "en",
        },
      });
      if (res.error) throw new Error(res.error.message);
      const data = res.data;
      if (data?.topic) setTopic(data.topic);
      if (data?.keywords?.length) setKeywords(data.keywords.join(", "));
      toast.success("AI suggestion applied!");
    } catch (err: any) {
      toast.error(err.message || "AI suggestion failed");
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim() || !project) return;
    
    setShowGenerate(false);
    await generateMutation.mutateAsync({
      topic: topic.trim(),
      brand: brand || "Brand",
      website,
      keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
      projectId: project.id,
      contentType,
      language: project.language || "en",
    });
    setTopic("");
    setKeywords("");
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success("Content copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "article": return "GSO Article";
      case "pillar": return "Pillar Page";
      case "mentions": return "Brand Mentions";
      case "comparison": return "Comparison";
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "article": return "bg-violet-500/10 text-violet-700 border-violet-500/20";
      case "pillar": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
      case "mentions": return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "comparison": return "bg-amber-500/10 text-amber-700 border-amber-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const articles = contents.filter(c => c.content_type === "article" || c.content_type === "pillar");
  const mentions = contents.filter(c => c.content_type === "mentions");
  const comparisons = contents.filter(c => c.content_type === "comparison");
  const pillars = contents.filter(c => c.content_type === "pillar");

  const ContentCard = ({ item }: { item: GeoContent }) => {
    const isExpanded = expandedId === item.id;
    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className={cn("text-[10px]", getTypeColor(item.content_type))}>
                {getTypeLabel(item.content_type)}
              </Badge>
              {item.score > 0 && (
                <div className="flex items-center gap-1">
                  <ScoreRing score={item.score} size="sm" showLabel={false} />
                  <span className="text-xs text-muted-foreground">{item.score}%</span>
                </div>
              )}
            </div>
            <h3 className="font-semibold text-sm truncate">{item.title || item.topic}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.brand} · {new Date(item.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => item.content && handleCopy(item.content, item.id)}
            >
              {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => deleteMutation.mutate(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-xs"
          onClick={() => setExpandedId(isExpanded ? null : item.id)}
        >
          {isExpanded ? "Hide content" : "Show content"}
        </Button>
        {isExpanded && item.content && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
            {item.content}
          </div>
        )}
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-violet-600" />
              GSO Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generative Search Optimization — Make your brand appear in AI-generated answers
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleFill30Days}
              disabled={isFilling30}
              className="border-violet-500/30 text-violet-700 hover:bg-violet-50"
            >
              {isFilling30 ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating 30 days...</>
              ) : (
                <><CalendarDays className="h-4 w-4 mr-2" />Fill 30 Days</>
              )}
            </Button>

            <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate GSO Content
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-violet-600" />
                  Generate GSO Content
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleAiSuggest}
                  disabled={isSuggesting}
                >
                  {isSuggesting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Suggesting...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />AI Suggestion</>
                  )}
                </Button>
                <div>
                  <Label>Topic *</Label>
                  <Input
                    placeholder="e.g. best tools to manage Google reviews"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Content Type</Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          GSO Article (1500+ words)
                        </div>
                      </SelectItem>
                      <SelectItem value="pillar">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Pillar Page (2000+ words)
                        </div>
                      </SelectItem>
                      <SelectItem value="mentions">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Brand Mentions (10 snippets)
                        </div>
                      </SelectItem>
                      <SelectItem value="comparison">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Comparison Article
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Keywords (comma separated)</Label>
                  <Textarea
                    placeholder="review automation, local SEO, AI visibility"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="font-medium">Brand: {brand || "Not set"}</p>
                  <p className="text-muted-foreground">Website: {website || "Not set"}</p>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={!topic.trim() || generateMutation.isPending}
                  className="w-full bg-gradient-to-r from-violet-600 to-blue-600"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{contents.length}</p>
            <p className="text-xs text-muted-foreground">Total GSO</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{articles.length}</p>
            <p className="text-xs text-muted-foreground">Articles</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{mentions.length}</p>
            <p className="text-xs text-muted-foreground">Mentions</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{comparisons.length}</p>
            <p className="text-xs text-muted-foreground">Comparisons</p>
          </Card>
        </div>

        {/* Generation in progress */}
        {generateMutation.isPending && (
          <Card className="p-6 border-violet-500/20 bg-violet-500/5">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
              <div>
                <p className="font-medium">Generating GEO content...</p>
                <p className="text-sm text-muted-foreground">This may take 30-60 seconds</p>
              </div>
            </div>
          </Card>
        )}

        {/* Content Tabs */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({contents.length})</TabsTrigger>
            <TabsTrigger value="article">Articles ({articles.length})</TabsTrigger>
            <TabsTrigger value="mentions">Mentions ({mentions.length})</TabsTrigger>
            <TabsTrigger value="comparison">Comparisons ({comparisons.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : contents.length === 0 ? (
              <Card className="p-12 text-center">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No GSO content yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate AI-optimized content to make your brand appear in ChatGPT, Gemini & Perplexity answers.
                </p>
                <Button onClick={() => setShowGenerate(true)} className="bg-gradient-to-r from-violet-600 to-blue-600">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate your first GSO content
                </Button>
              </Card>
            ) : (
              contents.map(item => <ContentCard key={item.id} item={item} />)
            )}
          </TabsContent>

          {["article", "mentions", "comparison"].map(type => (
            <TabsContent key={type} value={type} className="space-y-3 mt-4">
              {contents.filter(c => c.content_type === type).length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground text-sm">No {getTypeLabel(type)} content yet</p>
                </Card>
              ) : (
                contents.filter(c => c.content_type === type).map(item => <ContentCard key={item.id} item={item} />)
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
