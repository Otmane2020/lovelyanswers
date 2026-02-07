import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2, Tag, Trash2, Sparkles, Check, Globe } from "lucide-react";
import { BulkKeywordsDialog } from "@/components/keywords/BulkKeywordsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface KeywordSuggestion {
  keyword: string;
  intent: IntentKey;
}

interface KeywordRow {
  id: string;
  keyword: string;
  intent: string | null;
  is_used: boolean | null;
  search_volume: number | null;
  difficulty: number | null;
}

type IntentKey = "informational" | "transactional" | "navigational" | "commercial";

const INTENT_BADGE: Record<IntentKey, { label: string; className: string }> = {
  informational: {
    label: "Informational",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  transactional: {
    label: "Transactional",
    className: "bg-accent text-accent-foreground border-border",
  },
  navigational: {
    label: "Navigational",
    className: "bg-secondary text-secondary-foreground border-border",
  },
  commercial: {
    label: "Commercial",
    className: "bg-muted text-foreground border-border",
  },
};

function normalizeIntent(intent: string | null): IntentKey {
  const v = (intent || "informational").toLowerCase();
  if (v === "transactional" || v === "navigational" || v === "commercial") return v;
  return "informational";
}

export function KeywordsSettings() {
  const { project } = useActiveProject();
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState("");
  const [newIntent, setNewIntent] = useState<IntentKey>("informational");
  const [isAdding, setIsAdding] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  useEffect(() => {
    if (project?.id) fetchKeywords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const fetchKeywords = async () => {
    if (!project?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("keywords")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setKeywords((data as KeywordRow[]) || []);
    } catch (error) {
      console.error("Error fetching keywords:", error);
      toast.error("Failed to load keywords");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKeyword = async () => {
    if (!project?.id || !newKeyword.trim()) return;

    if (keywords.some((k) => k.keyword.toLowerCase() === newKeyword.trim().toLowerCase())) {
      toast.error("This keyword already exists");
      return;
    }

    setIsAdding(true);
    try {
      const { data, error } = await supabase
        .from("keywords")
        .insert({
          project_id: project.id,
          keyword: newKeyword.trim(),
          intent: newIntent,
          is_used: false,
        })
        .select()
        .single();

      if (error) throw error;
      setKeywords([data as KeywordRow, ...keywords]);
      setNewKeyword("");
      toast.success("Keyword added");
    } catch (error) {
      console.error("Error adding keyword:", error);
      toast.error("Failed to add keyword");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    try {
      const { error } = await supabase.from("keywords").delete().eq("id", keywordId);
      if (error) throw error;

      setKeywords(keywords.filter((k) => k.id !== keywordId));
      toast.success("Keyword removed");
    } catch (error) {
      console.error("Error deleting keyword:", error);
      toast.error("Failed to remove keyword");
    }
  };

  const handleDeleteAllKeywords = async () => {
    if (!project?.id) return;

    setIsDeletingAll(true);
    try {
      const { error } = await supabase.from("keywords").delete().eq("project_id", project.id);
      if (error) throw error;

      setKeywords([]);
      setShowDeleteAll(false);
      toast.success("All keywords removed");
    } catch (error) {
      console.error("Error deleting all keywords:", error);
      toast.error("Failed to remove keywords");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newKeyword.trim()) handleAddKeyword();
  };

  const fetchAISuggestions = async () => {
    if (!project?.id) return;

    setIsFetchingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-keywords", {
        body: {
          projectId: project.id,
          existingKeywords: keywords.map((k) => k.keyword),
        },
      });

      if (error) throw error;

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
        if (data.suggestions.length === 0) {
          toast.info("No new keyword suggestions available");
        } else {
          toast.success(`${data.suggestions.length} keywords suggested`);
        }
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      toast.error("Failed to get AI suggestions");
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  const acceptSuggestion = async (suggestion: KeywordSuggestion) => {
    if (!project?.id) return;

    try {
      const { data, error } = await supabase
        .from("keywords")
        .insert({
          project_id: project.id,
          keyword: suggestion.keyword,
          intent: suggestion.intent,
          is_used: false,
        })
        .select()
        .single();

      if (error) throw error;

      setKeywords([data as KeywordRow, ...keywords]);
      setSuggestions(suggestions.filter((s) => s.keyword !== suggestion.keyword));
      toast.success(`Added: ${suggestion.keyword}`);
    } catch (error) {
      console.error("Error accepting suggestion:", error);
      toast.error("Failed to add keyword");
    }
  };

  const dismissSuggestion = (keyword: string) => {
    setSuggestions(suggestions.filter((s) => s.keyword !== keyword));
  };

  const handleAutoFillFromWebsite = async () => {
    if (!project?.id) return;

    setIsAutoFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-website", {
        body: { url: project.website_url },
      });

      if (error) throw error;

      if (data?.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
        const existingLower = keywords.map((k) => k.keyword.toLowerCase());
        const newKeywords = data.keywords
          .map((k: any) => (typeof k === "string" ? { keyword: k, intent: "informational" } : k))
          .filter((k: any) => !existingLower.includes(k.keyword.toLowerCase()));

        if (newKeywords.length === 0) {
          toast.info("No new keywords found from your website");
          return;
        }

        const rows = newKeywords.map((k: any) => ({
          project_id: project.id,
          keyword: k.keyword,
          intent: k.intent || "informational",
          is_used: false,
        }));

        const { error: insertError } = await supabase.from("keywords").insert(rows);
        if (insertError) throw insertError;

        await fetchKeywords();
        toast.success(`${newKeywords.length} keywords extracted from your website`);
      } else {
        toast.info("No keywords found on your website");
      }
    } catch (error) {
      console.error("Error auto-filling keywords:", error);
      toast.error("Failed to extract keywords from website");
    } finally {
      setIsAutoFilling(false);
    }
  };

  const usedCount = keywords.filter((k) => k.is_used).length;
  const unusedCount = keywords.filter((k) => !k.is_used).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            SEO Keywords
          </CardTitle>
          <CardDescription>
            Manage the keywords used to generate your Q&A and articles. These keywords should reflect the real topics on
            your website.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{keywords.length}</span>
              <span className="text-muted-foreground">total</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{usedCount}</span>
              <span className="text-muted-foreground">used</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{unusedCount}</span>
              <span className="text-muted-foreground">available</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add a keyword…"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Select value={newIntent} onValueChange={(v) => setNewIntent(v as IntentKey)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="informational">Informational</SelectItem>
                <SelectItem value="transactional">Transactional</SelectItem>
                <SelectItem value="navigational">Navigational</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddKeyword} disabled={isAdding || !newKeyword.trim()} size="icon">
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
            {project && (
              <BulkKeywordsDialog
                projectId={project.id}
                existingKeywords={keywords.map((k) => k.keyword)}
                onKeywordsAdded={fetchKeywords}
              />
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleAutoFillFromWebsite}
              disabled={isAutoFilling}
              className="flex-1 gap-2"
            >
              {isAutoFilling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting from website...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  Auto-fill from website
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={fetchAISuggestions}
              disabled={isFetchingSuggestions}
              className="flex-1 gap-2"
            >
              {isFetchingSuggestions ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating suggestions...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  AI suggestions
                </>
              )}
            </Button>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-primary">
                AI Suggestions ({suggestions.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => {
                  const intent = normalizeIntent(s.intent);
                  return (
                    <Badge
                      key={s.keyword}
                      variant="outline"
                      className={`px-3 py-1.5 text-sm flex items-center gap-2 ${INTENT_BADGE[intent].className}`}
                    >
                      <span>{s.keyword}</span>
                      <button
                        onClick={() => acceptSuggestion(s)}
                        className="ml-1 rounded-full p-0.5 hover:bg-primary/20 text-primary"
                        aria-label={`Accept ${s.keyword}`}
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => dismissSuggestion(s.keyword)}
                        className="rounded-full p-0.5 hover:bg-muted/60"
                        aria-label={`Dismiss ${s.keyword}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : keywords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No keywords yet. Add some manually or use AI suggestions.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => {
                const intent = normalizeIntent(kw.intent);
                return (
                  <Badge
                    key={kw.id}
                    variant="outline"
                    className={`px-3 py-1.5 text-sm flex items-center gap-2 ${kw.is_used ? "opacity-60" : ""} ${
                      INTENT_BADGE[intent].className
                    }`}
                  >
                    <span>{kw.keyword}</span>
                    {kw.is_used && <span className="text-xs">(used)</span>}
                    <button
                      onClick={() => handleDeleteKeyword(kw.id)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted/60"
                      aria-label={`Remove keyword ${kw.keyword}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          {keywords.length > 0 && (
            <div className="pt-4 border-t">
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteAll(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Remove all keywords
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Intent legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 text-sm">
            {(Object.keys(INTENT_BADGE) as IntentKey[]).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <Badge className={INTENT_BADGE[k].className}>{INTENT_BADGE[k].label}</Badge>
                <span className="text-muted-foreground">
                  {k === "informational"
                    ? "General questions"
                    : k === "transactional"
                      ? "Buying intent"
                      : k === "commercial"
                        ? "Research / comparison"
                        : "Find a specific site"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove all keywords?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {keywords.length} keywords. You can re-run the website analysis or add them back
              manually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllKeywords}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingAll}
            >
              {isDeletingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Remove all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
