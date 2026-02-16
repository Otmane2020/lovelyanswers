import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Settings, TrendingUp, DollarSign, Target, AlertCircle, CheckCircle2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CampaignSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  onUpdated?: () => void;
}

interface CampaignSettings {
  campaignId: string;
  campaignName: string;
  status: string;
  channelType: string;
  biddingStrategyType: string;
  targetRoas: number | null;
  targetCpaMicros: number | null;
  budgetAmountMicros: number;
  budgetResourceName: string;
  metrics: {
    cost: number;
    conversions: number;
    value: number;
    roas: number;
    cpa: number;
  };
}

interface Suggestions {
  targetRoas?: {
    current: number | null;
    conservative: number;
    moderate: number;
    aggressive: number;
    explanation: string;
  };
  targetCpa?: {
    current: number | null;
    conservative: number;
    moderate: number;
    aggressive: number;
    explanation: string;
  };
  budget?: {
    current: number;
    scaleUp: number;
    scaleDown: number;
    explanation: string;
  };
}

const BIDDING_STRATEGIES = [
  { value: "MAXIMIZE_CONVERSIONS", label: "Maximiser les conversions", description: "Google optimise pour le plus de conversions possible" },
  { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximiser la valeur de conversion", description: "Google optimise pour la valeur totale des conversions" },
  { value: "TARGET_CPA", label: "CPA cible", description: "Objectif de coût par acquisition" },
  { value: "TARGET_ROAS", label: "ROAS cible", description: "Objectif de retour sur dépenses publicitaires" },
];

export function CampaignSettingsDialog({ open, onOpenChange, campaignId, campaignName, onUpdated }: CampaignSettingsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<CampaignSettings | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);

  // Editable state
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [targetRoas, setTargetRoas] = useState("");
  const [targetCpa, setTargetCpa] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");

  useEffect(() => {
    if (open && campaignId) {
      loadSettings();
    }
  }, [open, campaignId]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("update-campaign-settings", {
        body: { action: "get-settings", campaignId },
      });

      if (error || !data?.success) {
        toast({ title: "Erreur", description: data?.error || "Impossible de charger les paramètres", variant: "destructive" });
        return;
      }

      setSettings(data.settings);
      setSuggestions(data.suggestions);
      setSelectedStrategy(data.settings.biddingStrategyType || "");
      setTargetRoas(data.settings.targetRoas ? String(data.settings.targetRoas) : "");
      setTargetCpa(data.settings.targetCpaMicros ? String(data.settings.targetCpaMicros / 1_000_000) : "");
      setDailyBudget(String(data.settings.budgetAmountMicros / 1_000_000));
    } catch (err) {
      console.error("Load settings error:", err);
      toast({ title: "Erreur", description: "Échec du chargement", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const updates: Record<string, unknown> = {
        action: "update-settings",
        campaignId,
        campaignResourceName: `customers/${settings.campaignId}`, // will be overridden by edge fn
      };

      if (selectedStrategy !== settings.biddingStrategyType) {
        updates.biddingStrategy = selectedStrategy;
      }

      if (targetRoas && (selectedStrategy === "MAXIMIZE_CONVERSION_VALUE" || selectedStrategy === "TARGET_ROAS")) {
        updates.targetRoas = parseFloat(targetRoas);
      }

      if (targetCpa && (selectedStrategy === "MAXIMIZE_CONVERSIONS" || selectedStrategy === "TARGET_CPA")) {
        updates.targetCpaMicros = Math.round(parseFloat(targetCpa) * 1_000_000);
      }

      const newBudgetMicros = Math.round(parseFloat(dailyBudget) * 1_000_000);
      if (newBudgetMicros !== settings.budgetAmountMicros) {
        updates.budgetAmountMicros = newBudgetMicros;
        updates.budgetResourceName = settings.budgetResourceName;
      }

      updates.biddingStrategy = selectedStrategy;

      const { data, error } = await supabase.functions.invoke("update-campaign-settings", {
        body: updates,
      });

      if (error || !data?.success) {
        toast({ title: "❌ Erreur", description: data?.error || "Mise à jour échouée", variant: "destructive" });
        return;
      }

      toast({ title: "✅ Paramètres mis à jour", description: `"${campaignName}" — stratégie et budget mis à jour avec succès.` });
      onUpdated?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: "Erreur", description: "Échec de la mise à jour", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const showRoasField = selectedStrategy === "MAXIMIZE_CONVERSION_VALUE" || selectedStrategy === "TARGET_ROAS";
  const showCpaField = selectedStrategy === "MAXIMIZE_CONVERSIONS" || selectedStrategy === "TARGET_CPA";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Paramètres de campagne
          </DialogTitle>
          <DialogDescription>{campaignName}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Chargement des paramètres...</span>
          </div>
        ) : settings ? (
          <div className="space-y-5">
            {/* Current Performance */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Performance actuelle (30j)</p>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold">{settings.metrics.cost.toFixed(0)}€</p>
                    <p className="text-[10px] text-muted-foreground">Dépenses</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{settings.metrics.conversions.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">Conversions</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{settings.metrics.roas.toFixed(2)}x</p>
                    <p className="text-[10px] text-muted-foreground">ROAS</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{settings.metrics.cpa > 0 ? settings.metrics.cpa.toFixed(2) + "€" : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">CPA</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Bidding Strategy */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Stratégie d'enchères
              </Label>
              <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une stratégie" />
                </SelectTrigger>
                <SelectContent>
                  {BIDDING_STRATEGIES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <div>
                        <span className="font-medium">{s.label}</span>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStrategy !== settings.biddingStrategyType && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Changement de stratégie — la phase d'apprentissage sera relancée (2-4 semaines)
                </p>
              )}
            </div>

            {/* Target ROAS */}
            {showRoasField && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  ROAS cible
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={targetRoas}
                  onChange={(e) => setTargetRoas(e.target.value)}
                  placeholder="ex: 3.5"
                />
                {suggestions?.targetRoas && (
                  <div className="bg-muted/50 rounded-md p-3 space-y-2">
                    <p className="text-xs font-medium flex items-center gap-1">
                      <Zap className="h-3 w-3 text-primary" /> Suggestions IA
                    </p>
                    <p className="text-xs text-muted-foreground">{suggestions.targetRoas.explanation}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setTargetRoas(String(suggestions.targetRoas!.conservative))}>
                        📈 Volume ({suggestions.targetRoas.conservative}x)
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setTargetRoas(String(suggestions.targetRoas!.moderate))}>
                        ⚖️ Équilibré ({suggestions.targetRoas.moderate}x)
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setTargetRoas(String(suggestions.targetRoas!.aggressive))}>
                        💰 Rentabilité ({suggestions.targetRoas.aggressive}x)
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Target CPA */}
            {showCpaField && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  CPA cible (€)
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  value={targetCpa}
                  onChange={(e) => setTargetCpa(e.target.value)}
                  placeholder="ex: 15.00"
                />
                {suggestions?.targetCpa && (
                  <div className="bg-muted/50 rounded-md p-3 space-y-2">
                    <p className="text-xs font-medium flex items-center gap-1">
                      <Zap className="h-3 w-3 text-primary" /> Suggestions IA
                    </p>
                    <p className="text-xs text-muted-foreground">{suggestions.targetCpa.explanation}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setTargetCpa(String(suggestions.targetCpa!.conservative))}>
                        📈 Volume ({suggestions.targetCpa.conservative}€)
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setTargetCpa(String(suggestions.targetCpa!.moderate))}>
                        ⚖️ Équilibré ({suggestions.targetCpa.moderate}€)
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setTargetCpa(String(suggestions.targetCpa!.aggressive))}>
                        💰 Aggressif ({suggestions.targetCpa.aggressive}€)
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Budget */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Budget journalier (€)
              </Label>
              <Input
                type="number"
                step="1"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
              />
              {suggestions?.budget && (
                <div className="bg-muted/50 rounded-md p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">{suggestions.budget.explanation}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDailyBudget(String(suggestions.budget!.scaleDown))}>
                      ⬇️ Réduire ({suggestions.budget.scaleDown}€)
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDailyBudget(String(suggestions.budget!.current))}>
                      = Actuel ({suggestions.budget.current}€)
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDailyBudget(String(suggestions.budget!.scaleUp))}>
                      ⬆️ Scaler ({suggestions.budget.scaleUp}€)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Impossible de charger les paramètres</p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading || !settings}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Appliquer les changements
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
