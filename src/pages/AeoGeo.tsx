import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe, Sparkles, Loader2, Trash2, Copy, Check,
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
      toast.success("Planning GSO 30 jours lancé !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du remplissage");
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

        {/* Auto-fill in progress */}
        {isFilling && (
          <Card className="p-6 border-violet-500/20 bg-violet-500/5">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
              <div>
                <p className="font-medium">Remplissage automatique du planning GSO 30 jours...</p>
                <p className="text-sm text-muted-foreground">Cela peut prendre 30-60 secondes</p>
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
                <p className="text-sm text-muted-foreground">
                  Le planning 30 jours se remplit automatiquement à l'ouverture de la page.
                </p>
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
