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
import { Plus, Loader2, Sparkles, Brain, Zap, Search, Link, Image, FileText, Users, ShieldCheck } from "lucide-react";

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

const CTA_OPTIONS = [
  "SIGN_UP", "LEARN_MORE", "GET_QUOTE", "SUBSCRIBE", "CONTACT_US", "BOOK_NOW",
];

interface Sitelink {
  text: string;
  description1: string;
  description2: string;
  finalUrl: string;
}

interface AudienceSignals {
  customSegments: string[];
  interests: string[];
  demographics: { ageRanges: string[]; genders: string[] };
}

export function CreatePmaxCampaignDialog() {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  // Campaign basics
  const [campaignName, setCampaignName] = useState("");
  const [dailyBudget, setDailyBudget] = useState("25");
  const [biddingStrategy, setBiddingStrategy] = useState<"maximize_conversions" | "target_cpa">("maximize_conversions");
  const [targetCpa, setTargetCpa] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [language, setLanguage] = useState("en");
  const [brandName, setBrandName] = useState("");
  const [finalUrl, setFinalUrl] = useState("");

  // Text assets
  const [searchThemes, setSearchThemes] = useState("");
  const [headlines, setHeadlines] = useState("");
  const [longHeadlines, setLongHeadlines] = useState("");
  const [descriptions, setDescriptions] = useState("");

  // Extensions
  const [sitelinks, setSitelinks] = useState<Sitelink[]>([]);
  const [callouts, setCallouts] = useState("");
  const [callToAction, setCallToAction] = useState("SIGN_UP");

  // Images & Logo
  const [businessLogoUrl, setBusinessLogoUrl] = useState("");
  const [imageUrls, setImageUrls] = useState("");

  // Lead Form
  const [leadFormHeadline, setLeadFormHeadline] = useState("");
  const [leadFormDescription, setLeadFormDescription] = useState("");
  const [leadFormFields, setLeadFormFields] = useState("");
  const [leadFormPrivacyUrl, setLeadFormPrivacyUrl] = useState("");

  // Audience & Exclusions
  const [audienceSignals, setAudienceSignals] = useState<AudienceSignals | null>(null);
  const [negativeKeywords, setNegativeKeywords] = useState("");
  const [urlExclusions, setUrlExclusions] = useState("");

  // Display path
  const [displayPath1, setDisplayPath1] = useState("");
  const [displayPath2, setDisplayPath2] = useState("");

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

      // New fields
      setSitelinks(data.sitelinks || []);
      setCallouts((data.callouts || []).join("\n"));
      setCallToAction(data.callToAction || "SIGN_UP");
      setBusinessLogoUrl(data.businessLogoUrl || "");
      setImageUrls((data.imageUrls || []).join("\n"));
      setLeadFormHeadline(data.leadFormHeadline || "");
      setLeadFormDescription(data.leadFormDescription || "");
      setLeadFormFields((data.leadFormFields || []).join("\n"));
      setLeadFormPrivacyUrl(data.leadFormPrivacyPolicyUrl || "");
      setAudienceSignals(data.audienceSignals || null);
      setNegativeKeywords((data.negativeKeywords || []).join("\n"));
      setUrlExclusions((data.urlExclusions || []).join("\n"));
      setDisplayPath1(data.displayPath1 || "");
      setDisplayPath2(data.displayPath2 || "");

      setAiGenerated(true);
      toast({
        title: "✨ Campagne PMax complète générée",
        description: `${data.searchThemes?.length || 0} themes, ${data.headlines?.length || 0} headlines, ${data.sitelinks?.length || 0} sitelinks, ${data.callouts?.length || 0} callouts`,
      });
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
        sitelinks,
        callouts: callouts.split("\n").map(s => s.trim()).filter(Boolean),
        callToAction,
        businessLogoUrl,
        imageUrls: imageUrls.split("\n").map(s => s.trim()).filter(Boolean),
        leadForm: {
          headline: leadFormHeadline,
          description: leadFormDescription,
          fields: leadFormFields.split("\n").map(s => s.trim()).filter(Boolean),
          privacyPolicyUrl: leadFormPrivacyUrl,
        },
        audienceSignals,
        negativeKeywords: negativeKeywords.split("\n").map(s => s.trim()).filter(Boolean),
        urlExclusions: urlExclusions.split("\n").map(s => s.trim()).filter(Boolean),
        displayPath1,
        displayPath2,
      };

      if (biddingStrategy === "target_cpa" && targetCpa) {
        body.targetCpaMicros = Math.round(parseFloat(targetCpa) * 1_000_000);
      }

      const { data, error } = await supabase.functions.invoke("manage-pmax-service", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "✅ Campagne PMax créée !", description: "Statut PAUSED — vérifiez dans Google Ads" });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Erreur création", description: err.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const updateSitelink = (index: number, field: keyof Sitelink, value: string) => {
    setSitelinks(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2"><Zap className="h-4 w-4" />Campagne PMax</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Créer Campagne PMax (Complète)</DialogTitle>
          <DialogDescription>
            {aiGenerated ? "✨ Pré-rempli par IA — Sitelinks, images, lead form, audiences inclus" : "Générez automatiquement avec l'IA"}
          </DialogDescription>
        </DialogHeader>

        {!aiGenerated && !isGenerating && (
          <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center space-y-3 bg-primary/5">
            <Brain className="h-10 w-10 mx-auto text-primary" />
            <div>
              <p className="font-semibold">Génération IA complète</p>
              <p className="text-sm text-muted-foreground">Search themes, headlines, sitelinks, callouts, images, lead form, audiences...</p>
            </div>
            <Button onClick={handleAIGenerate} className="gap-2"><Sparkles className="h-4 w-4" />Générer avec l'IA</Button>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyse complète du site et génération PMax...</p>
          </div>
        )}

        {aiGenerated && (
          <>
            <ScrollArea className="max-h-[55vh] pr-4">
              <div className="space-y-5">
                {/* Campaign Settings */}
                <Section title="Campagne" icon={<Zap className="h-4 w-4" />}>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nom"><Input value={campaignName} onChange={e => setCampaignName(e.target.value)} className="text-xs" /></Field>
                    <Field label="Budget/jour (€)"><Input type="number" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} className="text-xs" /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Enchères">
                      <Select value={biddingStrategy} onValueChange={(v: any) => setBiddingStrategy(v)}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="maximize_conversions">Max Conversions</SelectItem>
                          <SelectItem value="target_cpa">Target CPA</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    {biddingStrategy === "target_cpa" && (
                      <Field label="Target CPA (€)"><Input type="number" value={targetCpa} onChange={e => setTargetCpa(e.target.value)} className="text-xs" /></Field>
                    )}
                    <Field label="Langue">
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Brand Name"><Input value={brandName} onChange={e => setBrandName(e.target.value)} className="text-xs" /></Field>
                    <Field label="URL finale"><Input value={finalUrl} onChange={e => setFinalUrl(e.target.value)} className="text-xs" /></Field>
                  </div>
                  <Field label="Ciblage géo">
                    <div className="flex flex-wrap gap-1.5">
                      {LOCATIONS.map(loc => (
                        <Badge key={loc.code} variant={selectedLocations.includes(loc.code) ? "default" : "outline"}
                          className="cursor-pointer text-xs" onClick={() => toggleLocation(loc.code)}>
                          {loc.label}
                        </Badge>
                      ))}
                    </div>
                  </Field>
                </Section>

                <Separator />

                {/* Search Themes */}
                <Section title="Search Themes (max 25)" icon={<Search className="h-4 w-4" />}>
                  <Textarea value={searchThemes} onChange={e => setSearchThemes(e.target.value)} rows={6} className="text-xs" placeholder="1 par ligne" />
                </Section>

                <Separator />

                {/* Text Assets */}
                <Section title="Assets texte" icon={<FileText className="h-4 w-4" />}>
                  <Field label="Headlines (30 car. max, 1/ligne)">
                    <Textarea value={headlines} onChange={e => setHeadlines(e.target.value)} rows={5} className="text-xs" />
                  </Field>
                  <Field label="Long Headlines (90 car. max, 1/ligne)">
                    <Textarea value={longHeadlines} onChange={e => setLongHeadlines(e.target.value)} rows={3} className="text-xs" />
                  </Field>
                  <Field label="Descriptions (90 car. max, 1/ligne)">
                    <Textarea value={descriptions} onChange={e => setDescriptions(e.target.value)} rows={4} className="text-xs" />
                  </Field>
                  <Field label="Call to Action">
                    <Select value={callToAction} onValueChange={setCallToAction}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CTA_OPTIONS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </Section>

                <Separator />

                {/* Sitelinks */}
                <Section title={`Sitelinks (${sitelinks.length})`} icon={<Link className="h-4 w-4" />}>
                  {sitelinks.map((sl, i) => (
                    <div key={i} className="border rounded-md p-2 space-y-1.5 bg-muted/30">
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={sl.text} onChange={e => updateSitelink(i, "text", e.target.value)} placeholder="Texte" className="text-xs" />
                        <Input value={sl.finalUrl} onChange={e => updateSitelink(i, "finalUrl", e.target.value)} placeholder="URL" className="text-xs" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={sl.description1} onChange={e => updateSitelink(i, "description1", e.target.value)} placeholder="Description 1" className="text-xs" />
                        <Input value={sl.description2} onChange={e => updateSitelink(i, "description2", e.target.value)} placeholder="Description 2" className="text-xs" />
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => setSitelinks(prev => [...prev, { text: "", description1: "", description2: "", finalUrl: "" }])}>
                    <Plus className="h-3 w-3 mr-1" />Ajouter sitelink
                  </Button>
                </Section>

                <Separator />

                {/* Callouts */}
                <Section title="Callouts (max 25 car.)" icon={<ShieldCheck className="h-4 w-4" />}>
                  <Textarea value={callouts} onChange={e => setCallouts(e.target.value)} rows={3} className="text-xs" placeholder="1 par ligne" />
                </Section>

                <Separator />

                {/* Images & Logo */}
                <Section title="Images & Logo" icon={<Image className="h-4 w-4" />}>
                  <Field label="Logo URL">
                    <Input value={businessLogoUrl} onChange={e => setBusinessLogoUrl(e.target.value)} className="text-xs" placeholder="https://..." />
                  </Field>
                  <Field label="Image URLs (1/ligne)">
                    <Textarea value={imageUrls} onChange={e => setImageUrls(e.target.value)} rows={3} className="text-xs" placeholder="https://..." />
                  </Field>
                </Section>

                <Separator />

                {/* Lead Form */}
                <Section title="Lead Form (Contact)" icon={<FileText className="h-4 w-4" />}>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Titre"><Input value={leadFormHeadline} onChange={e => setLeadFormHeadline(e.target.value)} className="text-xs" /></Field>
                    <Field label="Privacy URL"><Input value={leadFormPrivacyUrl} onChange={e => setLeadFormPrivacyUrl(e.target.value)} className="text-xs" /></Field>
                  </div>
                  <Field label="Description">
                    <Textarea value={leadFormDescription} onChange={e => setLeadFormDescription(e.target.value)} rows={2} className="text-xs" />
                  </Field>
                  <Field label="Champs (FULL_NAME, EMAIL, PHONE_NUMBER, COMPANY_NAME...)">
                    <Textarea value={leadFormFields} onChange={e => setLeadFormFields(e.target.value)} rows={2} className="text-xs" placeholder="1 par ligne" />
                  </Field>
                </Section>

                <Separator />

                {/* Audience Signals */}
                <Section title="Audience Signals" icon={<Users className="h-4 w-4" />}>
                  {audienceSignals && (
                    <div className="space-y-2 text-xs">
                      <div><span className="font-medium">Custom Segments:</span> <span className="text-muted-foreground">{audienceSignals.customSegments?.join(", ")}</span></div>
                      <div><span className="font-medium">Interests:</span> <span className="text-muted-foreground">{audienceSignals.interests?.join(", ")}</span></div>
                      <div><span className="font-medium">Ages:</span> <span className="text-muted-foreground">{audienceSignals.demographics?.ageRanges?.join(", ")}</span></div>
                    </div>
                  )}
                </Section>

                <Separator />

                {/* Display Path */}
                <Section title="Display Path" icon={<Link className="h-4 w-4" />}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">www.lovelyanswers.com /</span>
                    <Input value={displayPath1} onChange={e => setDisplayPath1(e.target.value)} placeholder="path1" className="text-xs w-28" maxLength={15} />
                    <span>/</span>
                    <Input value={displayPath2} onChange={e => setDisplayPath2(e.target.value)} placeholder="path2" className="text-xs w-28" maxLength={15} />
                  </div>
                </Section>

                <Separator />

                {/* Negative Keywords & URL Exclusions */}
                <Section title="Exclusions" icon={<ShieldCheck className="h-4 w-4" />}>
                  <Field label="Negative Keywords (1/ligne)">
                    <Textarea value={negativeKeywords} onChange={e => setNegativeKeywords(e.target.value)} rows={3} className="text-xs" />
                  </Field>
                  <Field label="URL Exclusions (1/ligne)">
                    <Textarea value={urlExclusions} onChange={e => setUrlExclusions(e.target.value)} rows={2} className="text-xs" />
                  </Field>
                </Section>
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

// Helper components
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">{icon}{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
