import { useState, useEffect } from "react";
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
import { Plus, Loader2, Sparkles, Brain, Zap, Search, Link, Image, FileText, Users, ShieldCheck, Phone, Tag, DollarSign, Video, X, Wand2 } from "lucide-react";

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
  audienceName?: string;
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

  // New extensions
  const [promotions, setPromotions] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("FR");
  const [snippetHeader, setSnippetHeader] = useState("Services");
  const [snippetValues, setSnippetValues] = useState("");
  const [priceType, setPriceType] = useState("SERVICES");
  const [priceItems, setPriceItems] = useState("");

  // Images, Logo & Videos
  const [businessLogoUrl, setBusinessLogoUrl] = useState("");
  const [landscapeImageUrls, setLandscapeImageUrls] = useState<string[]>([]);
  const [squareImageUrls, setSquareImageUrls] = useState<string[]>([]);
  const [portraitImageUrls, setPortraitImageUrls] = useState<string[]>([]);
  const [youtubeVideoUrls, setYoutubeVideoUrls] = useState<string[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
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

  useEffect(() => {
    if (open && !aiGenerated && !isGenerating) {
      handleAIGenerate();
    }
  }, [open]);

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-google-ads", {
        body: { type: "pmax" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCampaignName(data.campaignName || "PMax - AutoPilot Geo");
      setDailyBudget(String(data.dailyBudget || 25));
      setBiddingStrategy(data.biddingStrategy || "maximize_conversions");
      setLanguage(data.language || "en");
      setSelectedLocations(data.locations || ["FR", "US"]);
      setBrandName(data.brandName || "AutoPilot Geo");
      setFinalUrl(data.finalUrl || "https://autopilotgeo.com");
      setSearchThemes((data.searchThemes || []).join("\n"));
      setHeadlines((data.headlines || []).join("\n"));
      setLongHeadlines((data.longHeadlines || []).join("\n"));
      setDescriptions((data.descriptions || []).join("\n"));

      // New fields
      setSitelinks(data.sitelinks || []);
      setCallouts((data.callouts || []).join("\n"));
      setCallToAction(data.callToAction || "SIGN_UP");
      setBusinessLogoUrl(data.businessLogoUrl || "");
      setLandscapeImageUrls(data.imageUrls || []);
      setSquareImageUrls(data.squareImageUrls || []);
      setPortraitImageUrls(data.portraitImageUrls || []);
      setYoutubeVideoUrls(data.youtubeVideoUrls || []);
      setLeadFormHeadline(data.leadFormHeadline || "");
      setLeadFormDescription(data.leadFormDescription || "");
      setLeadFormFields((data.leadFormFields || []).join("\n"));
      setLeadFormPrivacyUrl(data.leadFormPrivacyPolicyUrl || "");
      setAudienceSignals(data.audienceSignals || null);
      setNegativeKeywords((data.negativeKeywords || []).join("\n"));
      setUrlExclusions((data.urlExclusions || []).join("\n"));
      setDisplayPath1(data.displayPath1 || "");
      setDisplayPath2(data.displayPath2 || "");

      // New extension fields
      setPhoneNumber(data.phoneNumber || "");
      setPhoneCountry(data.phoneCountry || "FR");
      if (data.promotions?.length) setPromotions(data.promotions.map((p: any) => p.promotionTarget || "").filter(Boolean).join("\n"));
      if (data.structuredSnippets?.length) {
        setSnippetHeader(data.structuredSnippets[0]?.header || "Services");
        setSnippetValues((data.structuredSnippets[0]?.values || []).join("\n"));
      }
      if (data.prices?.length) {
        setPriceType(data.prices[0]?.type || "SERVICES");
        setPriceItems((data.prices[0]?.priceOfferings || []).map((o: any) => `${o.header}|${o.description || ""}|${o.price?.amountMicros ? (Number(o.price.amountMicros) / 1000000).toFixed(0) : "0"}|${o.unit || "PER_MONTH"}|${o.finalUrl || ""}`).join("\n"));
      }

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
        imageUrls: landscapeImageUrls,
        squareImageUrls,
        portraitImageUrls,
        youtubeVideoUrls,
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
        phoneNumber: phoneNumber.trim() || undefined,
        phoneCountry: phoneCountry || "FR",
        promotions: promotions.split("\n").map(s => s.trim()).filter(Boolean).map(t => ({ promotionTarget: t, occasion: "NONE" })),
        structuredSnippets: snippetValues.trim() ? [{ header: snippetHeader, values: snippetValues.split("\n").map(s => s.trim()).filter(Boolean) }] : [],
        prices: priceItems.trim() ? [{
          type: priceType,
          priceOfferings: priceItems.split("\n").map(s => s.trim()).filter(Boolean).map(line => {
            const [header, description, amount, unit, finalUrl] = line.split("|").map(s => s.trim());
            return {
              header: header || "Item",
              description: description || undefined,
              price: { currencyCode: "EUR", amountMicros: String(Math.round((parseFloat(amount) || 0) * 1000000)) },
              unit: unit || "PER_MONTH",
              finalUrl: finalUrl || finalUrl,
            };
          }),
        }] : [],
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

  const handleGenerateAIImage = async (format: "landscape" | "square" | "portrait", dimensions: string) => {
    setIsGeneratingImage(true);
    try {
      const prompt = `Professional marketing banner for "${brandName || "LovelyAnswers"}" - an AI-powered SEO & AEO platform. ${
        format === "landscape" ? "Wide landscape format (1.91:1 ratio)" :
        format === "square" ? "Square format (1:1 ratio)" :
        "Portrait format (4:5 ratio)"
      }. Modern, clean SaaS aesthetic with gradient background. Show data visualization, AI icons, search engine logos. Text: "Get Found by AI Search Engines". Ultra high resolution, ${dimensions}.`;

      const { data, error } = await supabase.functions.invoke("generate-product-ai", {
        body: { prompt, type: "image", dimensions },
      });

      if (error) throw error;
      const imageUrl = data?.imageUrl;
      if (!imageUrl) throw new Error("No image returned");

      if (format === "landscape") setLandscapeImageUrls(prev => [...prev, imageUrl]);
      else if (format === "square") setSquareImageUrls(prev => [...prev, imageUrl]);
      else setPortraitImageUrls(prev => [...prev, imageUrl]);

      toast({ title: "✨ Image générée", description: `Image ${format} ajoutée` });
    } catch (err: any) {
      toast({ title: "Erreur génération image", description: err.message, variant: "destructive" });
    } finally {
      setIsGeneratingImage(false);
    }
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

                {/* Promotions */}
                <Section title="Promotions" icon={<Tag className="h-4 w-4" />}>
                  <Field label="Promotions (1 par ligne, ex: Free Trial, 50% Off)">
                    <Textarea value={promotions} onChange={e => setPromotions(e.target.value)} rows={2} className="text-xs" placeholder="Free Trial&#10;50% Off First Month" />
                  </Field>
                </Section>

                <Separator />

                {/* Calls */}
                <Section title="Appel téléphonique" icon={<Phone className="h-4 w-4" />}>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Numéro de téléphone">
                      <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="text-xs" placeholder="+33 1 23 45 67 89" />
                    </Field>
                    <Field label="Pays">
                      <Select value={phoneCountry} onValueChange={setPhoneCountry}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FR">🇫🇷 France</SelectItem>
                          <SelectItem value="US">🇺🇸 USA</SelectItem>
                          <SelectItem value="GB">🇬🇧 UK</SelectItem>
                          <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                          <SelectItem value="DE">🇩🇪 Allemagne</SelectItem>
                          <SelectItem value="BE">🇧🇪 Belgique</SelectItem>
                          <SelectItem value="CH">🇨🇭 Suisse</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </Section>

                <Separator />

                {/* Structured Snippets */}
                <Section title="Extraits structurés" icon={<FileText className="h-4 w-4" />}>
                  <Field label="En-tête">
                    <Select value={snippetHeader} onValueChange={setSnippetHeader}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Amenities", "Brands", "Courses", "Degree programs", "Destinations", "Featured hotels", "Insurance coverage", "Models", "Neighborhoods", "Service catalog", "Shows", "Styles", "Types"].map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Valeurs (1 par ligne, min 3)">
                    <Textarea value={snippetValues} onChange={e => setSnippetValues(e.target.value)} rows={3} className="text-xs" placeholder="AEO Content&#10;SEO Audit&#10;Keyword Research" />
                  </Field>
                </Section>

                <Separator />

                {/* Prices */}
                <Section title="Prix" icon={<DollarSign className="h-4 w-4" />}>
                  <Field label="Type">
                    <Select value={priceType} onValueChange={setPriceType}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["SERVICES", "BRANDS", "EVENTS", "LOCATIONS", "NEIGHBORHOODS", "PRODUCT_CATEGORIES", "PRODUCT_TIERS", "SERVICE_CATEGORIES", "SERVICE_TIERS"].map(t => (
                          <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Offres (format: Header|Description|Prix€|Unité|URL, 1/ligne)">
                    <Textarea value={priceItems} onChange={e => setPriceItems(e.target.value)} rows={3} className="text-xs" placeholder="Starter|Basic plan|29|PER_MONTH|https://...&#10;Pro|Advanced|79|PER_MONTH|https://..." />
                  </Field>
                </Section>

                <Separator />
                <Section title="Images, Logo & Vidéos" icon={<Image className="h-4 w-4" />}>
                  {/* Logo */}
                  <Field label="🏷️ Logo (carré 1:1, min 128x128px) — REQUIS">
                    <div className="flex gap-2 items-start">
                      <Input value={businessLogoUrl} onChange={e => setBusinessLogoUrl(e.target.value)} className="text-xs flex-1" placeholder="https://..." />
                      {businessLogoUrl && (
                        <img src={businessLogoUrl} alt="Logo" className="h-10 w-10 rounded border object-contain bg-white" onError={e => (e.currentTarget.style.display = "none")} />
                      )}
                    </div>
                  </Field>

                  {/* Brand Name */}
                  <Field label="🏢 Business Name — REQUIS">
                    <Input value={brandName} onChange={e => setBrandName(e.target.value)} className="text-xs" placeholder="LovelyAnswers" />
                  </Field>

                  <Separator className="my-2" />

                  {/* Landscape Images (1.91:1) */}
                  <Field label={`🖼️ Images paysage (1.91:1, 1200x628px) — ${landscapeImageUrls.length} ajoutées`}>
                    <MediaUrlList urls={landscapeImageUrls} setUrls={setLandscapeImageUrls} placeholder="https://image-landscape.png" />
                    <Button size="sm" variant="ghost" className="text-xs mt-1 gap-1" onClick={() => handleGenerateAIImage("landscape", "1200x628")} disabled={isGeneratingImage}>
                      {isGeneratingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      Générer avec IA
                    </Button>
                  </Field>

                  {/* Square Images (1:1) */}
                  <Field label={`🟦 Images carrées (1:1, 1200x1200px) — ${squareImageUrls.length} ajoutées`}>
                    <MediaUrlList urls={squareImageUrls} setUrls={setSquareImageUrls} placeholder="https://image-square.png" />
                    <Button size="sm" variant="ghost" className="text-xs mt-1 gap-1" onClick={() => handleGenerateAIImage("square", "1200x1200")} disabled={isGeneratingImage}>
                      {isGeneratingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      Générer avec IA
                    </Button>
                  </Field>

                  {/* Portrait Images (4:5) */}
                  <Field label={`📱 Images portrait (4:5, 960x1200px) — ${portraitImageUrls.length} ajoutées`}>
                    <MediaUrlList urls={portraitImageUrls} setUrls={setPortraitImageUrls} placeholder="https://image-portrait.png" />
                    <Button size="sm" variant="ghost" className="text-xs mt-1 gap-1" onClick={() => handleGenerateAIImage("portrait", "960x1200")} disabled={isGeneratingImage}>
                      {isGeneratingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      Générer avec IA
                    </Button>
                  </Field>

                  <Separator className="my-2" />

                  {/* YouTube Videos */}
                  <Field label={`🎬 Vidéos YouTube — ${youtubeVideoUrls.length} ajoutées`}>
                    <MediaUrlList urls={youtubeVideoUrls} setUrls={setYoutubeVideoUrls} placeholder="https://youtube.com/watch?v=..." />
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
                <Section title="Signal d'audience" icon={<Users className="h-4 w-4" />}>
                  <p className="text-xs text-muted-foreground">Touchez les bonnes personnes plus rapidement sur Google grâce à un signal d'audience.</p>
                  <Field label="Vos données — Les données first party peuvent nous aider à toucher vos clients (1 par ligne)">
                    <Textarea
                      value={audienceSignals?.customSegments?.join("\n") || ""}
                      onChange={e => setAudienceSignals(prev => ({
                        customSegments: e.target.value.split("\n").map(s => s.trim()).filter(Boolean),
                        interests: prev?.interests || [],
                        demographics: prev?.demographics || { ageRanges: [], genders: [] },
                        audienceName: prev?.audienceName || "",
                      }))}
                      rows={3} className="text-xs" placeholder="SEO professionals&#10;Digital marketing managers&#10;Small business owners"
                    />
                  </Field>
                  <Field label="Signaux supplémentaires — Centres d'intérêt (1 par ligne)">
                    <Textarea
                      value={audienceSignals?.interests?.join("\n") || ""}
                      onChange={e => setAudienceSignals(prev => ({
                        customSegments: prev?.customSegments || [],
                        interests: e.target.value.split("\n").map(s => s.trim()).filter(Boolean),
                        demographics: prev?.demographics || { ageRanges: [], genders: [] },
                        audienceName: prev?.audienceName || "",
                      }))}
                      rows={3} className="text-xs" placeholder="Search Engine Optimization&#10;Content Marketing&#10;Business Technology"
                    />
                  </Field>
                  <Field label="Tranches d'âge">
                    <div className="flex flex-wrap gap-1.5">
                      {["18-24", "25-34", "35-44", "45-54", "55-64", "65+"].map(age => {
                        const selected = audienceSignals?.demographics?.ageRanges?.includes(age);
                        return (
                          <Badge key={age} variant={selected ? "default" : "outline"} className="cursor-pointer text-xs"
                            onClick={() => setAudienceSignals(prev => {
                              const current = prev?.demographics?.ageRanges || [];
                              const newAges = selected ? current.filter(a => a !== age) : [...current, age];
                              return {
                                customSegments: prev?.customSegments || [],
                                interests: prev?.interests || [],
                                demographics: { ageRanges: newAges, genders: prev?.demographics?.genders || [] },
                                audienceName: prev?.audienceName || "",
                              };
                            })}>
                            {age}
                          </Badge>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Genres">
                    <div className="flex flex-wrap gap-1.5">
                      {["Homme", "Femme", "Inconnu"].map((g, idx) => {
                        const values = ["Male", "Female", "Unknown"];
                        const val = values[idx];
                        const selected = audienceSignals?.demographics?.genders?.includes(val);
                        return (
                          <Badge key={val} variant={selected ? "default" : "outline"} className="cursor-pointer text-xs"
                            onClick={() => setAudienceSignals(prev => {
                              const current = prev?.demographics?.genders || [];
                              const newG = selected ? current.filter(x => x !== val) : [...current, val];
                              return {
                                customSegments: prev?.customSegments || [],
                                interests: prev?.interests || [],
                                demographics: { ageRanges: prev?.demographics?.ageRanges || [], genders: newG },
                                audienceName: prev?.audienceName || "",
                              };
                            })}>
                            {g}
                          </Badge>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Nom de l'audience — Attribuez un nom à votre audience pour l'enregistrer dans votre bibliothèque (facultatif)">
                    <Input
                      value={audienceSignals?.audienceName || ""}
                      onChange={e => setAudienceSignals(prev => ({
                        customSegments: prev?.customSegments || [],
                        interests: prev?.interests || [],
                        demographics: prev?.demographics || { ageRanges: [], genders: [] },
                        audienceName: e.target.value,
                      }))}
                      className="text-xs" placeholder="Entrez le nom de l'audience"
                    />
                  </Field>
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

function MediaUrlList({ urls, setUrls, placeholder }: { urls: string[]; setUrls: (fn: (prev: string[]) => string[]) => void; placeholder: string }) {
  const [newUrl, setNewUrl] = useState("");
  return (
    <div className="space-y-1.5">
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, i) => (
            <div key={i} className="relative group">
              {url.includes("youtube") || url.includes("youtu.be") ? (
                <div className="h-16 w-24 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  🎬 Video {i + 1}
                </div>
              ) : (
                <img src={url} alt={`Asset ${i + 1}`} className="h-16 w-16 rounded border object-cover bg-white" onError={e => { (e.currentTarget as HTMLImageElement).src = ""; (e.currentTarget as HTMLImageElement).alt = "❌"; }} />
              )}
              <button
                onClick={() => setUrls(prev => prev.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <Input
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          className="text-xs flex-1"
          placeholder={placeholder}
          onKeyDown={e => {
            if (e.key === "Enter" && newUrl.trim()) {
              e.preventDefault();
              setUrls(prev => [...prev, newUrl.trim()]);
              setNewUrl("");
            }
          }}
        />
        <Button size="sm" variant="outline" className="text-xs px-2" onClick={() => {
          if (newUrl.trim()) { setUrls(prev => [...prev, newUrl.trim()]); setNewUrl(""); }
        }}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
