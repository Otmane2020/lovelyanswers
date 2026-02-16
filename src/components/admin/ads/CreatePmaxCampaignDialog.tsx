import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Loader2, Sparkles, Brain, Zap, Search } from "lucide-react";

const LOCATIONS = [
  { code: "FR", label: "🇫🇷 France" }, { code: "BE", label: "🇧🇪 Belgique" },
  { code: "CH", label: "🇨🇭 Suisse" }, { code: "DE", label: "🇩🇪 Allemagne" },
  { code: "US", label: "🇺🇸 États-Unis" }, { code: "GB", label: "🇬🇧 Royaume-Uni" },
  { code: "CA", label: "🇨🇦 Canada" },
];

const LANGUAGES = [
  { code: "fr", label: "Français" }, { code: "en", label: "English" },
  { code: "de", label: "Deutsch" }, { code: "es", label: "Español" },
];

export function CreatePmaxCampaignDialog() {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  const [campaignName, setCampaignName] = useState("");
  const [dailyBudget, setDailyBudget] = useState("25");
  const [biddingStrategy, setBiddingStrategy] = useState<"maximize_conversions" | "target_cpa">("maximize_conversions");
  const [targetCpa, setTargetCpa] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [language, setLanguage] = useState("en");
  const [brandName, setBrandName] = useState("");
  const [finalUrl, setFinalUrl] = useState("");
  const [searchThemes, setSearchThemes] = useState("");
  const [headlines, setHeadlines] = useState("");
  const [longHeadlines, setLongHeadlines] = useState("");
  const [descriptions, setDescriptions] = useState("");

  const toggleLocation = (code: string) => {
    setSelectedLocations(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-google-ads", {
        body: { type: "pmax" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCampaignName(data.campaignName || "PMax - LovelyAnswers");
      setDailyBudget(String(data.dailyBudget || 25));
      setBiddingStrategy(data.biddingStrategy || "maximize_conversions");
      setLanguage(data.language || "en");
      setSelectedLocations(data.locations || ["FR", "US"]);
      setBrandName(data.brandName || "LovelyAnswers");
      setFinalUrl(data.finalUrl || "https://lovelyanswers.com");
      setSearchThemes((data.searchThemes || []).join("\n"));
      setHeadlines((data.headlines || []).join("\n"));
      setLongHeadlines((data.longHeadlines || []).join("\n"));
      setDescriptions((data.descriptions || []).join("\n"));

      setAiGenerated(true);
      toast({ title: "✨ Campagne PMax générée par IA", description: `${data.searchThemes?.length || 0} search themes, ${data.headlines?.length || 0} headlines` });
    } catch (err: any) {
      toast({ title: "Erreur IA", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!campaignName.trim()) { toast({ title: "Nom requis", variant: "destructive" }); return; }
    if (!finalUrl.trim()) { toast({ title: "URL finale requise", variant: "destructive" }); return; }

    setIsCreating(true);
    try {
      const body: Record<string, unknown> = {
        action: "create",
        name: campaignName,
        dailyBudget: parseFloat(dailyBudget) || 25,
        biddingStrategy,
        finalUrl,
        brandName,
        language,
        locations: selectedLocations,
        searchThemes: searchThemes.split("\n").map(s => s.trim()).filter(Boolean),
        headlines: headlines.split("\n").map(s => s.trim()).filter(Boolean),
        longHeadlines: longHeadlines.split("\n").map(s => s.trim()).filter(Boolean),
        descriptions: descriptions.split("\n").map(s => s.trim()).filter(Boolean),
      };

      if (biddingStrategy === "target_cpa" && targetCpa) {
        body.targetCpaMicros = Math.round(parseFloat(targetCpa) * 1_000_000);
      }

      const { data, error } = await supabase.functions.invoke("manage-pmax-service", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "✅ Campagne PMax créée !", description: `${data.searchThemes || 0} search themes, ${data.headlines || 0} headlines — statut PAUSED` });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Erreur création", description: err.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2"><Zap className="h-4 w-4" />Campagne PMax</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Créer Campagne PMax (Service)</DialogTitle>
          <DialogDescription>
            {aiGenerated ? "✨ Pré-rempli par IA — Vérifiez et validez avant création" : "Générez automatiquement avec l'IA"}
          </DialogDescription>
        </DialogHeader>

        {!aiGenerated && !isGenerating && (
          <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center space-y-3 bg-primary/5">
            <Brain className="h-10 w-10 mx-auto text-primary" />
            <div>
              <p className="font-semibold">Génération IA automatique</p>
              <p className="text-sm text-muted-foreground">Analyse lovelyanswers.com et génère search themes, headlines, descriptions...</p>
            </div>
            <Button onClick={handleAIGenerate} className="gap-2"><Sparkles className="h-4 w-4" />Générer avec l'IA</Button>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyse du site et génération PMax...</p>
          </div>
        )}

        {aiGenerated && (
          <>
            <ScrollArea className="max-h-[55vh] pr-4">
              <div className="space-y-5">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Campagne</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nom</Label>
                      <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} className="text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Budget/jour (€)</Label>
                      <Input type="number" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} className="text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Enchères</Label>
                      <Select value={biddingStrategy} onValueChange={(v: any) => setBiddingStrategy(v)}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="maximize_conversions">Max Conversions</SelectItem>
                          <SelectItem value="target_cpa">Target CPA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {biddingStrategy === "target_cpa" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Target CPA (€)</Label>
                        <Input type="number" value={targetCpa} onChange={e => setTargetCpa(e.target.value)} className="text-xs" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Langue</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Brand Name</Label>
                      <Input value={brandName} onChange={e => setBrandName(e.target.value)} className="text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">URL finale</Label>
                      <Input value={finalUrl} onChange={e => setFinalUrl(e.target.value)} className="text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ciblage géo</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {LOCATIONS.map(loc => (
                        <Badge key={loc.code} variant={selectedLocations.includes(loc.code) ? "default" : "outline"}
                          className="cursor-pointer text-xs" onClick={() => toggleLocation(loc.code)}>
                          {loc.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Search className="h-4 w-4" />Search Themes (max 25)</h3>
                  <Textarea value={searchThemes} onChange={e => setSearchThemes(e.target.value)} rows={6} className="text-xs" placeholder="1 par ligne" />
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Assets texte</h3>
                  <div className="space-y-1">
                    <Label className="text-xs">Headlines (30 car. max, 1/ligne)</Label>
                    <Textarea value={headlines} onChange={e => setHeadlines(e.target.value)} rows={5} className="text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Long Headlines (90 car. max, 1/ligne)</Label>
                    <Textarea value={longHeadlines} onChange={e => setLongHeadlines(e.target.value)} rows={3} className="text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Descriptions (90 car. max, 1/ligne)</Label>
                    <Textarea value={descriptions} onChange={e => setDescriptions(e.target.value)} rows={4} className="text-xs" />
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => { setAiGenerated(false); handleAIGenerate(); }}>
                <Sparkles className="h-3 w-3 mr-1" />Regénérer
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={isCreating} className="gap-2">
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {isCreating ? "Création..." : "✅ Valider & Créer"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
