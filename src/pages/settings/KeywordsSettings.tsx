import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2, Tag, Trash2 } from "lucide-react";
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
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : keywords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No keywords yet. Add some manually or re-run the website analysis.
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
