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
import {
  Plus, Loader2, Megaphone, Trash2, Sparkles, Target, Link, Key, Type, Brain,
} from "lucide-react";

interface AdGroupForm {
  name: string;
  finalUrl: string;
  seedKeywords: string;
  headlines: string;
  descriptions: string;
  path1: string;
  path2: string;
}

const emptyAdGroup = (): AdGroupForm => ({
  name: "", finalUrl: "", seedKeywords: "", headlines: "", descriptions: "", path1: "", path2: "",
});

const LOCATIONS = [
  { code: "FR", label: "🇫🇷 France" }, { code: "BE", label: "🇧🇪 Belgique" },
  { code: "CH", label: "🇨🇭 Suisse" }, { code: "DE", label: "🇩🇪 Allemagne" },
  { code: "ES", label: "🇪🇸 Espagne" }, { code: "IT", label: "🇮🇹 Italie" },
  { code: "US", label: "🇺🇸 États-Unis" }, { code: "GB", label: "🇬🇧 Royaume-Uni" },
  { code: "CA", label: "🇨🇦 Canada" },
];

const LANGUAGES = [
  { code: "fr", label: "Français" }, { code: "en", label: "English" },
  { code: "de", label: "Deutsch" }, { code: "es", label: "Español" },
];

export function CreateSearchCampaignDialog() {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  const [campaignName, setCampaignName] = useState("");
  const [dailyBudget, setDailyBudget] = useState("25");
  const [biddingStrategy, setBiddingStrategy] = useState("maximize_conversions");
  const [targetCpa, setTargetCpa] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [language, setLanguage] = useState("en");
  const [callouts, setCallouts] = useState("");
  const [sitelinksRaw, setSitelinksRaw] = useState("");
  const [negativeKeywords, setNegativeKeywords] = useState("");
  const [adGroups, setAdGroups] = useState<AdGroupForm[]>([emptyAdGroup()]);

  const toggleLocation = (code: string) => {
    setSelectedLocations(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const updateAdGroup = (index: number, field: keyof AdGroupForm, value: string) => {
    setAdGroups(prev => prev.map((ag, i) => i === index ? { ...ag, [field]: value } : ag));
  };

  const addAdGroup = () => setAdGroups(prev => [...prev, emptyAdGroup()]);
  const removeAdGroup = (index: number) => setAdGroups(prev => prev.filter((_, i) => i !== index));

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-google-ads", {
        body: { type: "search" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Pre-fill all fields
      setCampaignName(data.campaignName || "Search - AutoPilot Geo");
      setDailyBudget(String(data.dailyBudget || 30));
      setBiddingStrategy(data.biddingStrategy || "maximize_conversions");
      setLanguage(data.language || "en");
      setSelectedLocations(data.locations || ["FR", "US"]);
      setCallouts((data.callouts || []).join("\n"));
      setNegativeKeywords((data.negativeKeywords || []).join("\n"));

      if (data.sitelinks?.length) {
        setSitelinksRaw(data.sitelinks.map((s: any) => `${s.text || s.linkText}|${s.url || s.finalUrls?.[0] || ""}`).join("\n"));
      }

      if (data.adGroups?.length) {
        setAdGroups(data.adGroups.map((ag: any) => ({
          name: ag.name || "",
          finalUrl: ag.finalUrl || "",
          seedKeywords: (ag.seedKeywords || []).join("\n"),
          headlines: (ag.headlines || []).join("\n"),
          descriptions: (ag.descriptions || []).join("\n"),
          path1: ag.path1 || "",
          path2: ag.path2 || "",
        })));
      }

      setAiGenerated(true);
      toast({ title: "✨ Campagne Search générée par IA", description: `${data.adGroups?.length || 0} ad groups pré-remplis` });
    } catch (err: any) {
      toast({ title: "Erreur IA", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const parseSitelinks = () => {
    if (!sitelinksRaw.trim()) return undefined;
    return sitelinksRaw.split("\n").filter(Boolean).map(line => {
      const [linkText, url] = line.split("|").map(s => s.trim());
      return { linkText: linkText || "Lien", finalUrls: [url || "#"] };
    });
  };

  const handleCreate = async () => {
    if (!campaignName.trim()) { toast({ title: "Nom requis", variant: "destructive" }); return; }
    if (adGroups.every(ag => !ag.name.trim())) { toast({ title: "Au moins un ad group requis", variant: "destructive" }); return; }

    setIsCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: campaignName,
        dailyBudget: parseFloat(dailyBudget) || 25,
        biddingStrategy, locations: selectedLocations, language,
        adGroups: adGroups.filter(ag => ag.name.trim()).map(ag => ({
          name: ag.name, finalUrl: ag.finalUrl || "https://autopilotgeo.com",
          ...(ag.seedKeywords.trim() ? { seedKeywords: ag.seedKeywords.split("\n").map(s => s.trim()).filter(Boolean) } : {}),
          ...(ag.headlines.trim() ? { headlines: ag.headlines.split("\n").map(s => s.trim()).filter(Boolean) } : {}),
          ...(ag.descriptions.trim() ? { descriptions: ag.descriptions.split("\n").map(s => s.trim()).filter(Boolean) } : {}),
          ...(ag.path1 ? { path1: ag.path1 } : {}),
          ...(ag.path2 ? { path2: ag.path2 } : {}),
        })),
        callouts: callouts.split("\n").map(s => s.trim()).filter(Boolean),
        sitelinks: parseSitelinks(),
        negativeKeywords: negativeKeywords.split("\n").map(s => s.trim()).filter(Boolean).map(text => ({ text, matchType: "PHRASE" })),
      };

      if (biddingStrategy === "target_cpa" && targetCpa) {
        body.targetCpaMicros = Math.round(parseFloat(targetCpa) * 1_000_000);
      }

      const { data, error } = await supabase.functions.invoke("create-search-campaign", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "✅ Campagne Search créée !", description: `${data.adGroups} ad group(s), ${data.totalKeywords} keywords — statut PAUSED` });
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
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Campagne Search</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />Créer Campagne Search
          </DialogTitle>
          <DialogDescription>
            {aiGenerated ? "✨ Pré-rempli par IA — Vérifiez et validez avant création" : "Générez automatiquement avec l'IA ou remplissez manuellement"}
          </DialogDescription>
        </DialogHeader>

        {!aiGenerated && !isGenerating && (
          <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center space-y-3 bg-primary/5">
            <Brain className="h-10 w-10 mx-auto text-primary" />
            <div>
              <p className="font-semibold">Génération IA automatique</p>
              <p className="text-sm text-muted-foreground">Analyse autopilotgeo.com et génère ad groups, keywords, headlines, sitelinks...</p>
            </div>
            <Button onClick={handleAIGenerate} className="gap-2">
              <Sparkles className="h-4 w-4" />Générer avec l'IA
            </Button>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyse du site et génération des campagnes...</p>
          </div>
        )}

        {aiGenerated && (
          <>
            <ScrollArea className="max-h-[55vh] pr-4">
              <div className="space-y-5">
                {/* Campaign Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Megaphone className="h-4 w-4" />Campagne</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nom</Label>
                      <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Budget/jour (€)</Label>
                      <Input type="number" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Enchères</Label>
                      <Select value={biddingStrategy} onValueChange={setBiddingStrategy}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="maximize_conversions">Max Conversions</SelectItem>
                          <SelectItem value="maximize_clicks">Max Clicks</SelectItem>
                          <SelectItem value="manual_cpc">Manual CPC</SelectItem>
                          <SelectItem value="target_cpa">Target CPA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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

                {/* Ad Groups */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4" />Ad Groups ({adGroups.length})</h3>
                    <Button variant="outline" size="sm" onClick={addAdGroup}><Plus className="h-3 w-3 mr-1" />Ajouter</Button>
                  </div>
                  {adGroups.map((ag, idx) => (
                    <div key={idx} className="border rounded-lg p-3 space-y-2 relative">
                      {adGroups.length > 1 && (
                        <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-6 w-6 p-0" onClick={() => removeAdGroup(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Nom</Label>
                          <Input value={ag.name} onChange={e => updateAdGroup(idx, "name", e.target.value)} className="text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1"><Link className="h-3 w-3" />URL</Label>
                          <Input value={ag.finalUrl} onChange={e => updateAdGroup(idx, "finalUrl", e.target.value)} className="text-xs" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1"><Key className="h-3 w-3" />Seed Keywords</Label>
                        <Textarea value={ag.seedKeywords} onChange={e => updateAdGroup(idx, "seedKeywords", e.target.value)} rows={3} className="text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1"><Type className="h-3 w-3" />Headlines (30 car.)</Label>
                        <Textarea value={ag.headlines} onChange={e => updateAdGroup(idx, "headlines", e.target.value)} rows={3} className="text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Descriptions (90 car.)</Label>
                        <Textarea value={ag.descriptions} onChange={e => updateAdGroup(idx, "descriptions", e.target.value)} rows={2} className="text-xs" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Path 1</Label>
                          <Input value={ag.path1} onChange={e => updateAdGroup(idx, "path1", e.target.value)} className="text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Path 2</Label>
                          <Input value={ag.path2} onChange={e => updateAdGroup(idx, "path2", e.target.value)} className="text-xs" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Extensions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" />Extensions & Négatives</h3>
                  <div className="space-y-1">
                    <Label className="text-xs">Callouts (1/ligne, 25 car.)</Label>
                    <Textarea value={callouts} onChange={e => setCallouts(e.target.value)} rows={3} className="text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sitelinks (Texte|URL)</Label>
                    <Textarea value={sitelinksRaw} onChange={e => setSitelinksRaw(e.target.value)} rows={3} className="text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mots-clés négatifs (1/ligne)</Label>
                    <Textarea value={negativeKeywords} onChange={e => setNegativeKeywords(e.target.value)} rows={3} className="text-xs" />
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
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                {isCreating ? "Création..." : "✅ Valider & Créer"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
