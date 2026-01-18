import { useState, useEffect } from "react";
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

interface Keyword {
  id: string;
  keyword: string;
  intent: string | null;
  is_used: boolean | null;
  search_volume: number | null;
  difficulty: number | null;
}

const INTENT_COLORS: Record<string, string> = {
  informational: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  transactional: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  navigational: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  commercial: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export function KeywordsSettings() {
  const { project } = useActiveProject();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState("");
  const [newIntent, setNewIntent] = useState("informational");
  const [isAdding, setIsAdding] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  useEffect(() => {
    if (project?.id) {
      fetchKeywords();
    }
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
      setKeywords(data || []);
    } catch (error) {
      console.error("Error fetching keywords:", error);
      toast.error("Erreur lors du chargement des mots-clés");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKeyword = async () => {
    if (!project?.id || !newKeyword.trim()) return;

    // Check if keyword already exists
    if (keywords.some(k => k.keyword.toLowerCase() === newKeyword.trim().toLowerCase())) {
      toast.error("Ce mot-clé existe déjà");
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

      setKeywords([data, ...keywords]);
      setNewKeyword("");
      toast.success("Mot-clé ajouté");
    } catch (error) {
      console.error("Error adding keyword:", error);
      toast.error("Erreur lors de l'ajout du mot-clé");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    try {
      const { error } = await supabase
        .from("keywords")
        .delete()
        .eq("id", keywordId);

      if (error) throw error;

      setKeywords(keywords.filter(k => k.id !== keywordId));
      toast.success("Mot-clé supprimé");
    } catch (error) {
      console.error("Error deleting keyword:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleDeleteAllKeywords = async () => {
    if (!project?.id) return;

    setIsDeletingAll(true);
    try {
      const { error } = await supabase
        .from("keywords")
        .delete()
        .eq("project_id", project.id);

      if (error) throw error;

      setKeywords([]);
      setShowDeleteAll(false);
      toast.success("Tous les mots-clés ont été supprimés");
    } catch (error) {
      console.error("Error deleting all keywords:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newKeyword.trim()) {
      handleAddKeyword();
    }
  };

  const usedCount = keywords.filter(k => k.is_used).length;
  const unusedCount = keywords.filter(k => !k.is_used).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Mots-clés SEO
          </CardTitle>
          <CardDescription>
            Gérez les mots-clés utilisés pour générer vos Q&A et articles. Ces mots-clés sont extraits de votre site et utilisés pour créer du contenu pertinent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{keywords.length}</span>
              <span className="text-muted-foreground">mots-clés total</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-green-600">{usedCount}</span>
              <span className="text-muted-foreground">utilisés</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-600">{unusedCount}</span>
              <span className="text-muted-foreground">disponibles</span>
            </div>
          </div>

          {/* Add new keyword */}
          <div className="flex gap-2">
            <Input
              placeholder="Ajouter un mot-clé..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Select value={newIntent} onValueChange={setNewIntent}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="informational">Informationnel</SelectItem>
                <SelectItem value="transactional">Transactionnel</SelectItem>
                <SelectItem value="navigational">Navigationnel</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddKeyword} 
              disabled={isAdding || !newKeyword.trim()}
              size="icon"
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {/* Keywords list as tags */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : keywords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun mot-clé. Ajoutez-en manuellement ou relancez l'analyse de votre site.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => (
                <Badge
                  key={kw.id}
                  variant="outline"
                  className={`
                    px-3 py-1.5 text-sm flex items-center gap-2 
                    ${kw.is_used ? 'opacity-50' : ''} 
                    ${INTENT_COLORS[kw.intent || 'informational']}
                  `}
                >
                  <span>{kw.keyword}</span>
                  {kw.is_used && <span className="text-xs">(utilisé)</span>}
                  <button
                    onClick={() => handleDeleteKeyword(kw.id)}
                    className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Delete all button */}
          {keywords.length > 0 && (
            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteAll(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer tous les mots-clés
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Légende des intentions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge className={INTENT_COLORS.informational}>Info</Badge>
              <span className="text-muted-foreground">Questions générales</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={INTENT_COLORS.transactional}>Trans</Badge>
              <span className="text-muted-foreground">Intention d'achat</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={INTENT_COLORS.commercial}>Comm</Badge>
              <span className="text-muted-foreground">Recherche produit</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={INTENT_COLORS.navigational}>Nav</Badge>
              <span className="text-muted-foreground">Recherche de site</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete all confirmation */}
      <AlertDialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer tous les mots-clés ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement les {keywords.length} mots-clés. 
              Vous devrez relancer l'analyse de votre site ou les ajouter manuellement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllKeywords}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingAll}
            >
              {isDeletingAll ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Supprimer tout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}