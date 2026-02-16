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
  Plus, Loader2, Megaphone, Trash2, Sparkles, Target, Link, Key, Type,
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
  name: "",
  finalUrl: "",
  seedKeywords: "",
  headlines: "",
  descriptions: "",
  path1: "",
  path2: "",
});

const LOCATIONS = [
  { code: "FR", label: "🇫🇷 France" },
  { code: "BE", label: "🇧🇪 Belgique" },
  { code: "CH", label: "🇨🇭 Suisse" },
  { code: "DE", label: "🇩🇪 Allemagne" },
  { code: "ES", label: "🇪🇸 Espagne" },
  { code: "IT", label: "🇮🇹 Italie" },
  { code: "NL", label: "🇳🇱 Pays-Bas" },
  { code: "US", label: "🇺🇸 États-Unis" },
  { code: "GB", label: "🇬🇧 Royaume-Uni" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "PT", label: "🇵🇹 Portugal" },
  { code: "MA", label: "🇲🇦 Maroc" },
];

const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "nl", label: "Nederlands" },
];

export function CreateSearchCampaignDialog() {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Campaign fields
  const [campaignName, setCampaignName] = useState("Search - ");
  const [dailyBudget, setDailyBudget] = useState("25");
  const [biddingStrategy, setBiddingStrategy] = useState("maximize_conversions");
  const [targetCpa, setTargetCpa] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["FR"]);
  const [language, setLanguage] = useState("fr");

  // Extensions
  const [callouts, setCallouts] = useState("Livraison rapide\nPaiement sécurisé\nRetours gratuits");
  const [sitelinksRaw, setSitelinksRaw] = useState("");
  const [negativeKeywords, setNegativeKeywords] = useState("gratuit\nikea\noccasion");

  // Ad Groups
  const [adGroups, setAdGroups] = useState<AdGroupForm[]>([emptyAdGroup()]);

  const toggleLocation = (code: string) => {
    setSelectedLocations(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const updateAdGroup = (index: number, field: keyof AdGroupForm, value: string) => {
    setAdGroups(prev => prev.map((ag, i) => i === index ? { ...ag, [field]: value } : ag));
  };

  const addAdGroup = () => setAdGroups(prev => [...prev, emptyAdGroup()]);
  const removeAdGroup = (index: number) => setAdGroups(prev => prev.filter((_, i) => i !== index));

  const parseSitelinks = () => {
    if (!sitelinksRaw.trim()) return undefined;
    return sitelinksRaw.split("\n").filter(Boolean).map(line => {
      const [linkText, url] = line.split("|").map(s => s.trim());
      return { linkText: linkText || "Lien", finalUrls: [url || "#"] };
    });
  };

  const handleCreate = async () => {
    if (!campaignName.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    if (adGroups.every(ag => !ag.name.trim())) {
      toast({ title: "Au moins un ad group requis", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: campaignName,
        dailyBudget: parseFloat(dailyBudget) || 25,
        biddingStrategy,
        locations: selectedLocations,
        language,
        adGroups: adGroups
          .filter(ag => ag.name.trim())
          .map(ag => ({
            name: ag.name,
            finalUrl: ag.finalUrl || "https://example.com",
            ...(ag.seedKeywords.trim()
              ? { seedKeywords: ag.seedKeywords.split("\n").map(s => s.trim()).filter(Boolean) }
              : {}),
            ...(ag.headlines.trim()
              ? { headlines: ag.headlines.split("\n").map(s => s.trim()).filter(Boolean) }
              : {}),
            ...(ag.descriptions.trim()
              ? { descriptions: ag.descriptions.split("\n").map(s => s.trim()).filter(Boolean) }
              : {}),
            ...(ag.path1 ? { path1: ag.path1 } : {}),
            ...(ag.path2 ? { path2: ag.path2 } : {}),
          })),
        callouts: callouts.split("\n").map(s => s.trim()).filter(Boolean),
        sitelinks: parseSitelinks(),
        negativeKeywords: negativeKeywords
          .split("\n")
          .map(s => s.trim())
          .filter(Boolean)
          .map(text => ({ text, matchType: "PHRASE" })),
      };

      if (biddingStrategy === "target_cpa" && targetCpa) {
        body.targetCpaMicros = Math.round(parseFloat(targetCpa) * 1_000_000);
      }

      const { data, error } = await supabase.functions.invoke("create-search-campaign", { body });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "✅ Campagne Search créée !",
        description: `${data.adGroups} ad group(s), ${data.totalKeywords} keywords, ${data.sitelinks || 0} sitelinks — statut PAUSED`,
      });

      if (data.warnings?.length) {
        data.warnings.forEach((w: string) =>
          toast({ title: "⚠️ Warning", description: w, variant: "destructive" })
        );
      }

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
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Créer Campagne Search
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Créer une Campagne Search (Agency Pro)
          </DialogTitle>
          <DialogDescription>
            Campagne complète avec expansion de mots-clés, RSA auto-générés, sitelinks & callouts
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Campaign Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                Campagne
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom de la campagne</Label>
                  <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Search - Canapés FR" />
                </div>
                <div className="space-y-2">
                  <Label>Budget journalier (€)</Label>
                  <Input type="number" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stratégie d'enchères</Label>
                  <Select value={biddingStrategy} onValueChange={setBiddingStrategy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maximize_conversions">Maximize Conversions</SelectItem>
                      <SelectItem value="maximize_clicks">Maximize Clicks</SelectItem>
                      <SelectItem value="manual_cpc">Manual CPC</SelectItem>
                      <SelectItem value="target_cpa">Target CPA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {biddingStrategy === "target_cpa" && (
                  <div className="space-y-2">
                    <Label>Target CPA (€)</Label>
                    <Input type="number" value={targetCpa} onChange={e => setTargetCpa(e.target.value)} placeholder="15" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Langue</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => (
                        <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-2">
                <Label>Ciblage géographique</Label>
                <div className="flex flex-wrap gap-2">
                  {LOCATIONS.map(loc => (
                    <Badge
                      key={loc.code}
                      variant={selectedLocations.includes(loc.code) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleLocation(loc.code)}
                    >
                      {loc.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Ad Groups */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Ad Groups ({adGroups.length})
                </h3>
                <Button variant="outline" size="sm" onClick={addAdGroup}>
                  <Plus className="h-3 w-3 mr-1" /> Ajouter
                </Button>
              </div>

              {adGroups.map((ag, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3 relative">
                  {adGroups.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-7 w-7 p-0"
                      onClick={() => removeAdGroup(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nom du groupe</Label>
                      <Input
                        value={ag.name}
                        onChange={e => updateAdGroup(idx, "name", e.target.value)}
                        placeholder="Canapé convertible"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><Link className="h-3 w-3" /> URL finale</Label>
                      <Input
                        value={ag.finalUrl}
                        onChange={e => updateAdGroup(idx, "finalUrl", e.target.value)}
                        placeholder="https://example.com/canapes"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Key className="h-3 w-3" /> Seed Keywords
                      <span className="text-muted-foreground ml-1">(1 par ligne — expansion auto)</span>
                    </Label>
                    <Textarea
                      value={ag.seedKeywords}
                      onChange={e => updateAdGroup(idx, "seedKeywords", e.target.value)}
                      placeholder={"canapé convertible\ncanapé lit\ncanapé couchage"}
                      rows={3}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Type className="h-3 w-3" /> Headlines
                      <span className="text-muted-foreground ml-1">(optionnel — auto-générés si vide, 30 car. max)</span>
                    </Label>
                    <Textarea
                      value={ag.headlines}
                      onChange={e => updateAdGroup(idx, "headlines", e.target.value)}
                      placeholder={"Canapé Convertible Design\nLivraison Rapide 48h\nPaiement en 3x"}
                      rows={3}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Descriptions <span className="text-muted-foreground">(optionnel, 90 car. max)</span></Label>
                    <Textarea
                      value={ag.descriptions}
                      onChange={e => updateAdGroup(idx, "descriptions", e.target.value)}
                      placeholder={"Découvrez nos canapés convertibles confortables.\nCommandez en ligne. Livraison rapide."}
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Path 1 <span className="text-muted-foreground">(15 car.)</span></Label>
                      <Input value={ag.path1} onChange={e => updateAdGroup(idx, "path1", e.target.value)} placeholder="canapes" className="text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Path 2 <span className="text-muted-foreground">(15 car.)</span></Label>
                      <Input value={ag.path2} onChange={e => updateAdGroup(idx, "path2", e.target.value)} placeholder="convertible" className="text-xs" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Extensions */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Extensions & Négatives
              </h3>

              <div className="space-y-2">
                <Label className="text-xs">Callouts (1 par ligne, 25 car. max)</Label>
                <Textarea
                  value={callouts}
                  onChange={e => setCallouts(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Sitelinks <span className="text-muted-foreground">(format: Texte|URL — 1 par ligne)</span></Label>
                <Textarea
                  value={sitelinksRaw}
                  onChange={e => setSitelinksRaw(e.target.value)}
                  placeholder={"Canapés|https://example.com/canapes\nTables|https://example.com/tables"}
                  rows={3}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Mots-clés négatifs (1 par ligne)</Label>
                <Textarea
                  value={negativeKeywords}
                  onChange={e => setNegativeKeywords(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleCreate} disabled={isCreating} className="gap-2">
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
            {isCreating ? "Création en cours..." : "Créer la campagne"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
