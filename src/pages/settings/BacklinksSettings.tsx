import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Link2, 
  Plus, 
  ExternalLink, 
  Trash2, 
  Sparkles, 
  TrendingUp,
  ArrowLeftRight,
  Globe,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface BacklinkPartner {
  id: string;
  target_name: string;
  target_url: string;
  target_description: string | null;
  anchor_examples: string[] | null;
  is_enabled: boolean;
}

const PLATFORM_PARTNERS = [
  {
    target_name: "Vends-le",
    target_url: "https://vends-le.fr",
    target_description: "Marketplace de vente de meubles et objets d'occasion entre particuliers",
    anchor_examples: ["Vends-le", "marketplace de meubles d'occasion", "annonces entre particuliers", "vendre ses meubles rapidement"],
  },
  {
    target_name: "Starlinko",
    target_url: "https://starlinko.fr",
    target_description: "Plateforme d'avis clients et de visibilité locale boostée par l'IA",
    anchor_examples: ["Starlinko", "avis clients automatisés", "visibilité locale IA", "collecter des avis"],
  },
  {
    target_name: "LovelyAnswers",
    target_url: "https://lovelyanswers.com",
    target_description: "Plateforme d'optimisation pour les moteurs de recherche IA (AEO/GEO)",
    anchor_examples: ["LovelyAnswers", "optimisation IA SEO", "AEO", "Answer Engine Optimization"],
  },
];

export function BacklinksSettings() {
  const { project } = useActiveProject();
  const [backlinks, setBacklinks] = useState<BacklinkPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPartner, setNewPartner] = useState({
    target_name: "",
    target_url: "",
    target_description: "",
    anchor_examples: "",
  });

  useEffect(() => {
    if (project?.id) {
      fetchBacklinks();
    }
  }, [project?.id]);

  const fetchBacklinks = async () => {
    if (!project?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("project_backlinks" as any)
      .select("*")
      .eq("source_project_id", project.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setBacklinks(data as unknown as BacklinkPartner[]);
    }
    setLoading(false);
  };

  const addPlatformPartner = async (partner: typeof PLATFORM_PARTNERS[0]) => {
    if (!project?.id) return;

    const already = backlinks.find(b => b.target_url === partner.target_url);
    if (already) {
      toast.info("Ce partenaire est déjà dans votre liste");
      return;
    }

    const { error } = await supabase
      .from("project_backlinks" as any)
      .insert({
        source_project_id: project.id,
        target_project_id: project.id,
        target_name: partner.target_name,
        target_url: partner.target_url,
        target_description: partner.target_description,
        anchor_examples: partner.anchor_examples,
        is_enabled: false,
      });

    if (error) {
      toast.error("Erreur lors de l'ajout");
    } else {
      toast.success(`${partner.target_name} ajouté !`);
      fetchBacklinks();
    }
  };

  const toggleBacklink = async (backlinkId: string, enabled: boolean) => {
    setSaving(backlinkId);
    const { error } = await supabase
      .from("project_backlinks" as any)
      .update({ is_enabled: enabled })
      .eq("id", backlinkId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      setBacklinks(prev => prev.map(b => b.id === backlinkId ? { ...b, is_enabled: enabled } : b));
      toast.success(enabled ? "Backlink activé ✅" : "Backlink désactivé");
    }
    setSaving(null);
  };

  const deleteBacklink = async (backlinkId: string) => {
    const { error } = await supabase
      .from("project_backlinks" as any)
      .delete()
      .eq("id", backlinkId);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      setBacklinks(prev => prev.filter(b => b.id !== backlinkId));
      toast.success("Partenaire supprimé");
    }
  };

  const addCustomPartner = async () => {
    if (!project?.id || !newPartner.target_name || !newPartner.target_url) {
      toast.error("Nom et URL requis");
      return;
    }

    const anchors = newPartner.anchor_examples
      .split(",")
      .map(a => a.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("project_backlinks" as any)
      .insert({
        source_project_id: project.id,
        target_project_id: project.id,
        target_name: newPartner.target_name,
        target_url: newPartner.target_url,
        target_description: newPartner.target_description || null,
        anchor_examples: anchors.length > 0 ? anchors : null,
        is_enabled: false,
      });

    if (error) {
      toast.error("Erreur lors de l'ajout");
    } else {
      toast.success("Partenaire ajouté !");
      setShowAddDialog(false);
      setNewPartner({ target_name: "", target_url: "", target_description: "", anchor_examples: "" });
      fetchBacklinks();
    }
  };

  const enabledCount = backlinks.filter(b => b.is_enabled).length;

  const availablePartners = PLATFORM_PARTNERS.filter(
    p => !backlinks.find(b => b.target_url === p.target_url)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Réseau de Backlinks IA</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Activez des liens croisés entre vos sites pour créer une boucle d'autorité IA. 
          Ces mentions naturelles sont injectées dans votre contenu généré.
        </p>
      </div>

      {/* Strategy Info */}
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex gap-3">
          <div className="mt-0.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">💡 Stratégie Triangle d'Autorité</p>
            <p className="text-muted-foreground">
              Les IA (ChatGPT, Gemini, Perplexity) adorent les entités reliées. 
              En créant des mentions naturelles croisées entre vos sites, vous créez un 
              <strong className="text-foreground"> réseau de confiance IA</strong> — exactement 
              ce que font les startups US pour dominer les citations génératives.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary" className="text-xs">Entity relationship</Badge>
              <Badge variant="secondary" className="text-xs">Topical authority</Badge>
              <Badge variant="secondary" className="text-xs">IA citations croisées</Badge>
              <Badge variant="secondary" className="text-xs">Cluster produit réel</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      {backlinks.length > 0 && (
        <div className="flex gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link2 className="h-4 w-4" />
            <span>{backlinks.length} partenaire{backlinks.length > 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span>{enabledCount} actif{enabledCount > 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {/* Platform Partners to Add */}
      {availablePartners.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Partenaires plateforme disponibles
          </p>
          <div className="space-y-2">
            {availablePartners.map((partner) => (
              <Card key={partner.target_url} className="p-4 border-dashed">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{partner.target_name}</span>
                        <a
                          href={partner.target_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{partner.target_description}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addPlatformPartner(partner)}
                    className="flex-shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Ajouter
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active Backlinks */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-4">Chargement...</div>
      ) : backlinks.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Vos partenaires de backlinks
          </p>
          <div className="space-y-3">
            {backlinks.map((backlink) => (
              <Card key={backlink.id} className={`p-4 transition-all ${backlink.is_enabled ? "border-green-200 bg-green-50/30 dark:bg-green-950/10 dark:border-green-900" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${backlink.is_enabled ? "bg-green-100 dark:bg-green-900/50" : "bg-muted"}`}>
                      <ArrowLeftRight className={`h-4 w-4 ${backlink.is_enabled ? "text-green-600" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{backlink.target_name}</span>
                        {backlink.is_enabled && (
                          <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border-0">
                            Actif
                          </Badge>
                        )}
                        <a
                          href={backlink.target_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      {backlink.target_description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{backlink.target_description}</p>
                      )}
                      {backlink.anchor_examples && backlink.anchor_examples.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {backlink.anchor_examples.slice(0, 3).map((anchor, i) => (
                            <Badge key={i} variant="outline" className="text-xs py-0">
                              {anchor}
                            </Badge>
                          ))}
                          {backlink.anchor_examples.length > 3 && (
                            <Badge variant="outline" className="text-xs py-0 text-muted-foreground">
                              +{backlink.anchor_examples.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={backlink.is_enabled}
                      disabled={saving === backlink.id}
                      onCheckedChange={(checked) => toggleBacklink(backlink.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteBacklink(backlink.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {backlink.is_enabled && (
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-900">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 mt-0.5 text-green-600 flex-shrink-0" />
                      <span>
                        Une mention naturelle vers <strong>{backlink.target_name}</strong> sera automatiquement insérée 
                        dans votre prochain contenu généré (1 mention max par article, ancre variée).
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center border-dashed">
          <Link2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">Aucun partenaire encore</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ajoutez des partenaires ci-dessus ou créez un lien personnalisé
          </p>
        </Card>
      )}

      {/* Add Custom */}
      <Button
        variant="outline"
        onClick={() => setShowAddDialog(true)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Ajouter un partenaire personnalisé
      </Button>

      {/* Add Custom Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un partenaire backlink</DialogTitle>
            <DialogDescription>
              Ajoutez un site externe pour créer des mentions croisées naturelles dans votre contenu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nom du site *</Label>
              <Input
                placeholder="Ex: MonBlog.fr"
                value={newPartner.target_name}
                onChange={(e) => setNewPartner(p => ({ ...p, target_name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>URL *</Label>
              <Input
                placeholder="https://monsite.fr"
                value={newPartner.target_url}
                onChange={(e) => setNewPartner(p => ({ ...p, target_url: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optionnel)</Label>
              <Textarea
                placeholder="Ce que fait ce site..."
                value={newPartner.target_description}
                onChange={(e) => setNewPartner(p => ({ ...p, target_description: e.target.value }))}
                className="mt-1 resize-none"
                rows={2}
              />
            </div>
            <div>
              <Label>Ancres suggérées (séparées par des virgules)</Label>
              <Input
                placeholder="MonBlog, blog déco, conseils intérieur"
                value={newPartner.anchor_examples}
                onChange={(e) => setNewPartner(p => ({ ...p, anchor_examples: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={addCustomPartner} className="flex-1">
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
