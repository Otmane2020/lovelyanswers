import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/glass-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Globe, Loader2, Trash2, Copy, Check, Eye, EyeOff, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { useGeoContents, useDeleteGeoContent, GeoContent } from "@/hooks/useGeoContents";
import { ScoreRing } from "@/components/ui/score-ring";
import { cn } from "@/lib/utils";

export default function AeoGeo() {
  const { project } = useActiveProject();
  const { data: contents = [], isLoading } = useGeoContents();
  const deleteMutation = useDeleteGeoContent();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<GeoContent | null>(null);
  const [isFilling, setIsFilling] = useState(false);
  const hasTriggeredRef = useRef(false);

  // Auto-trigger 30-day fill on page open if fewer than 30 scheduled contents
  useEffect(() => {
    if (!project || hasTriggeredRef.current || isLoading) return;
    hasTriggeredRef.current = true;

    const now = new Date();
    const in30 = new Date();
    in30.setDate(now.getDate() + 30);
    const scheduled = contents.filter(c => {
      if (!c.scheduled_date) return false;
      const d = new Date(c.scheduled_date);
      return d >= now && d <= in30;
    });

    if (scheduled.length < 30) {
      handleFill30();
    }
  }, [project, isLoading, contents]);

  const handleFill30 = async () => {
    if (!project || isFilling) return;
    setIsFilling(true);
    try {
      const res = await supabase.functions.invoke("generate-30-gso-contents", {
        body: { projectId: project.id },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success("GEO 30-day planning started!");
    } catch (err: any) {
      toast.error(err.message || "Failed to fill planning");
    } finally {
      setIsFilling(false);
    }
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success("Content copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "article": return "GEO Article";
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

  const ContentCard = ({ item }: { item: GeoContent }) => {
    const isExpanded = expandedId === item.id;
    return (
      <GlassCard hover className="p-4 sm:p-6 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="shrink-0">
            <ScoreRing score={item.score} size="sm" />
          </div>
          <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm sm:text-base leading-snug line-clamp-2">
                {item.title || item.topic}
              </h3>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                  onClick={() => item.content && handleCopy(item.content, item.id)}
                >
                  {copiedId === item.id ? <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500" /> : <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(item.id)}
                >
                  <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              {item.brand} · {new Date(item.created_at).toLocaleDateString()}
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <Badge variant="outline" className={cn("text-[10px] sm:text-xs", getTypeColor(item.content_type))}>
                {getTypeLabel(item.content_type)}
              </Badge>
              {item.is_public && (
                <Badge className="bg-emerald-500/20 text-emerald-500 border-0 text-[10px] sm:text-xs">Public</Badge>
              )}
              {!item.is_public && item.scheduled_date && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(item.scheduled_date).toLocaleDateString()}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={() => setViewingItem(item)}>
                <Eye className="h-3 w-3" />
                Preview
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>
    );
  };

  const renderContentList = (items: GeoContent[], emptyLabel: string) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <Card className="p-8 sm:p-12 text-center">
          <Globe className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold mb-2">{emptyLabel}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            The 30-day planning fills automatically.
          </p>
        </Card>
      );
    }
    return items.map(item => <ContentCard key={item.id} item={item} />);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 sm:h-7 sm:w-7 text-violet-600" />
            GEO Engine
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Generative Search Optimization — AI visibility for your brand
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold">{contents.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total GSO</p>
          </Card>
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold">{articles.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Articles</p>
          </Card>
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold">{mentions.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Mentions</p>
          </Card>
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold">{comparisons.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Comparisons</p>
          </Card>
        </div>

        {/* Auto-fill in progress */}
        {isFilling && (
          <Card className="p-4 sm:p-6 border-violet-500/20 bg-violet-500/5">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-violet-600" />
              <div>
                <p className="font-medium text-sm sm:text-base">Auto-filling GSO 30-day planning...</p>
                <p className="text-xs sm:text-sm text-muted-foreground">This may take 30-60 seconds</p>
              </div>
            </div>
          </Card>
        )}

        {/* Content Tabs */}
        <Tabs defaultValue="all">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max sm:w-auto">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All ({contents.length})
              </TabsTrigger>
              <TabsTrigger value="article" className="text-xs sm:text-sm">
                Articles ({articles.length})
              </TabsTrigger>
              <TabsTrigger value="mentions" className="text-xs sm:text-sm">
                Mentions ({mentions.length})
              </TabsTrigger>
              <TabsTrigger value="comparison" className="text-xs sm:text-sm">
                Comparisons ({comparisons.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            {renderContentList(contents, "No GSO content yet")}
          </TabsContent>

          {["article", "mentions", "comparison"].map(type => (
            <TabsContent key={type} value={type} className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              {renderContentList(
                contents.filter(c => c.content_type === type),
                `No ${getTypeLabel(type)} content yet`
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Editorial Preview Dialog */}
      <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold leading-tight">
              {viewingItem?.title || viewingItem?.topic}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {viewingItem?.content_type}
                </Badge>
                <span>{viewingItem?.brand}</span>
                {viewingItem?.score && <ScoreRing score={viewingItem.score} size="sm" />}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 ml-auto"
                  onClick={() => {
                    const content = viewingItem?.html_content || viewingItem?.content || "";
                    navigator.clipboard.writeText(content);
                    toast.success("HTML copied!");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy HTML
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto border rounded-lg bg-background p-6 sm:p-8">
            {viewingItem?.html_content || viewingItem?.content ? (
              <article
                className="editorial-prose max-w-none"
                dangerouslySetInnerHTML={{ __html: (() => {
                  let raw = viewingItem.html_content || viewingItem.content || "";
                  // If the content is a JSON string, extract the "content" field
                  const trimmed = raw.trim();
                  if (trimmed.startsWith("{") && trimmed.includes('"content"')) {
                    try {
                      const parsed = JSON.parse(trimmed);
                      if (parsed.content) raw = parsed.content;
                    } catch { /* not JSON, use as-is */ }
                  }
                  return raw
                    .replace(/^[\s\S]*?<body[^>]*>/i, "")
                    .replace(/<\/body>[\s\S]*$/i, "")
                    .replace(/<!DOCTYPE[^>]*>/i, "")
                    .replace(/<\/?html[^>]*>/gi, "")
                    .replace(/<head>[\s\S]*?<\/head>/i, "")
                    .replace(/<\/?body[^>]*>/gi, "")
                    .replace(/```html\s*/gi, "")
                    .replace(/```\s*$/gi, "")
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                    .trim();
                })() }}
              />
            ) : (
              <p className="text-muted-foreground text-center py-8">No content available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
