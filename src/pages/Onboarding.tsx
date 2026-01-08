import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  ArrowRight,
  Rocket,
  Loader2,
  X,
  Plus,
  Check,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCreateProject } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OnboardingData {
  websiteUrl: string;
  language: string;
  businessDescription: string;
  targetAudiences: string[];
  competitors: string[];
  brandColor: string;
  exampleUrl: string;
  referralSource: string;
  keywords: Array<{keyword: string; intent: string}>;
}

const languages = [
  { code: "en", name: "English (US)", flag: "🇺🇸", audience: "332 million" },
  { code: "fr", name: "Français", flag: "🇫🇷", audience: "77 million" },
  { code: "de", name: "Deutsch", flag: "🇩🇪", audience: "83 million" },
  { code: "es", name: "Español", flag: "🇪🇸", audience: "460 million" },
  { code: "it", name: "Italiano", flag: "🇮🇹", audience: "60 million" },
  { code: "pt", name: "Português", flag: "🇧🇷", audience: "260 million" },
];

const referralSources = [
  { id: "google", label: "Google", icon: "G" },
  { id: "linkedin", label: "LinkedIn", icon: "in" },
  { id: "twitter", label: "Twitter/X", icon: "𝕏" },
  { id: "facebook", label: "Facebook", icon: "f" },
  { id: "friend", label: "Friend", icon: "👤" },
  { id: "other", label: "Other", icon: "?" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createProject = useCreateProject();
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isLoadingFast, setIsLoadingFast] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [newAudience, setNewAudience] = useState("");
  const [newCompetitor, setNewCompetitor] = useState("");
  const analysisStartedRef = useRef<string | null>(null);
  
  const [data, setData] = useState<OnboardingData>({
    websiteUrl: "",
    language: "en", // Default to English before detection
    businessDescription: "",
    targetAudiences: [],
    competitors: [],
    brandColor: "#000000",
    exampleUrl: "",
    referralSource: "",
    keywords: [],
  });

  const totalSteps = 6;

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // Validate URL format
  const isValidUrl = (url: string): boolean => {
    if (!url || url.length < 3) return false;
    // Allow domain formats like example.com or full URLs
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;
    return urlPattern.test(url.trim());
  };

  // Trigger analysis immediately when URL becomes valid
  useEffect(() => {
    const url = data.websiteUrl.trim();
    if (isValidUrl(url) && analysisStartedRef.current !== url) {
      // Debounce: wait 500ms after last keystroke
      const timer = setTimeout(() => {
        if (isValidUrl(url) && analysisStartedRef.current !== url) {
          console.log('[ONBOARDING] Auto-triggering analysis for:', url);
          analysisStartedRef.current = url;
          analyzeWebsite(url);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [data.websiteUrl]);

  const handleUrlChange = (value: string) => {
    updateData("websiteUrl", value);
    setUrlError("");
    // Reset analysis flag if URL changes significantly
    if (analysisStartedRef.current && !value.includes(analysisStartedRef.current.replace(/^https?:\/\//, '').split('/')[0])) {
      setHasAnalyzed(false);
      analysisStartedRef.current = null;
    }
  };

  const validateAndProceed = () => {
    if (currentStep === 1 && !isValidUrl(data.websiteUrl)) {
      setUrlError("Please enter a valid URL (e.g., example.com or https://example.com)");
      toast({
        title: "Invalid URL",
        description: "Please enter a valid website URL format.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  // Two-phase website analysis for fast UX
  const analyzeWebsite = useCallback(async (url: string) => {
    if (!url || url.length < 5) return;
    
    setIsLoadingFast(true);
    
    // PHASE 1: Fast scrape (3-4s) - gets language + description + audiences
    const fastPromise = supabase.functions.invoke('firecrawl-scrape-fast', {
      body: { url }
    }).then(({ data: fastResult, error }) => {
      if (!error && fastResult?.success) {
        console.log('[ONBOARDING] Fast data received:', fastResult.data);
        setData(prev => ({
          ...prev,
          language: fastResult.data.language || prev.language,
          businessDescription: fastResult.data.description || prev.businessDescription,
          targetAudiences: fastResult.data.audiences?.length > 0 ? fastResult.data.audiences : prev.targetAudiences,
          exampleUrl: fastResult.data.sourceUrl || prev.exampleUrl,
        }));
      }
      setIsLoadingFast(false);
    }).catch(err => {
      console.error('[ONBOARDING] Fast scrape error:', err);
      setIsLoadingFast(false);
    });

    // PHASE 2: Full enrichment (8-15s) - gets audiences, competitors, keywords
    const enrichPromise = supabase.functions.invoke('firecrawl-scrape', {
      body: { url }
    }).then(({ data: scrapeResult, error }) => {
      if (!error && scrapeResult?.success) {
        const { audiences: scrapedAudiences, competitors: scrapedCompetitors, keywords: scrapedKeywords, description, language: detectedLang } = scrapeResult.data;
        
        console.log('[ONBOARDING] Enrichment data received:', {
          audiences: scrapedAudiences?.length,
          competitors: scrapedCompetitors?.length,
          keywords: scrapedKeywords?.length
        });
        
        setData(prev => ({
          ...prev,
          // Only override if we have better data
          language: detectedLang || prev.language,
          businessDescription: description || prev.businessDescription,
          // Don't override audiences if we already have them from fast scrape
          targetAudiences: prev.targetAudiences.length > 0 ? prev.targetAudiences : (scrapedAudiences?.length >= 2 ? scrapedAudiences : ["business owners", "professionals", "decision makers"]),
          competitors: scrapedCompetitors?.length > 0 ? scrapedCompetitors : prev.competitors,
          keywords: scrapedKeywords?.length > 0 ? scrapedKeywords : prev.keywords,
          exampleUrl: url.startsWith("http") ? url : `https://${url}`,
        }));
      }
    }).catch(err => {
      console.error('[ONBOARDING] Enrichment error:', err);
    });

    // Run both in parallel - Phase 1 will complete much faster
    try {
      await Promise.all([fastPromise, enrichPromise]);
    } catch (err) {
      console.error('[ONBOARDING] Analysis error:', err);
      await fallbackAnalysis(url);
    } finally {
      setHasAnalyzed(true);
    }
  }, []);

  const fallbackAnalysis = async (url: string) => {
    let domain = "";
    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      domain = urlObj.hostname.replace("www.", "");
    } catch {
      domain = url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
    }
    
    const brandName = domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    
    let detectedLanguage = "en";
    if (domain.endsWith(".fr")) detectedLanguage = "fr";
    else if (domain.endsWith(".de")) detectedLanguage = "de";
    else if (domain.endsWith(".es")) detectedLanguage = "es";
    
    setData(prev => ({
      ...prev,
      language: detectedLanguage,
      businessDescription: `${brandName} is a professional service provider offering high-quality solutions to its target audience.`,
      targetAudiences: ["business owners", "professionals", "decision makers"],
      competitors: [], // Empty - user adds manually
      exampleUrl: `https://${domain}`,
    }));
    
    toast({
      title: "Basic analysis complete",
      description: "Please review and refine the auto-filled information.",
    });
  };

  // No more hardcoded competitors - let user add manually if API fails
  const generateCompetitors = (_url: string): string[] => {
    // Return empty - user can add competitors manually
    return [];
  };

  // Analysis now auto-triggers on valid URL input (see useEffect above)

  const canProceed = () => {
    switch (currentStep) {
      case 1: return data.websiteUrl.length > 0 && isValidUrl(data.websiteUrl);
      case 2: return true;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (!validateAndProceed()) return;
    
    if (currentStep < totalSteps) {
      // If advancing from step 2 without language, default to English
      if (currentStep === 2 && !data.language) {
        updateData("language", "en");
      }
      setCurrentStep(currentStep + 1);
    } else {
      // Ensure we have minimum data before completing
      if (!data.language) updateData("language", "en");
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsAnalyzing(true);
    try {
      let domain = "";
      try {
        const urlObj = new URL(data.websiteUrl.startsWith("http") ? data.websiteUrl : `https://${data.websiteUrl}`);
        domain = urlObj.hostname.replace("www.", "");
      } catch { domain = data.websiteUrl; }
      
      const brandName = domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      
      const newProject = await createProject.mutateAsync({
        name: brandName,
        website_url: data.websiteUrl,
        domain: domain,
        language: data.language,
        business_description: data.businessDescription,
        business_type: "service",
        audience: data.targetAudiences.join(", "),
        brand_name: brandName,
        example_url: data.exampleUrl || undefined,
        competitors: data.competitors,
      });
      
      // Save extracted keywords to database
      if (data.keywords && data.keywords.length > 0) {
        console.log('[ONBOARDING] Saving', data.keywords.length, 'keywords to database');
        const keywordsToInsert = data.keywords.map(k => ({
          project_id: newProject.id,
          keyword: k.keyword,
          intent: k.intent || 'informational',
          source_url: data.websiteUrl,
          is_used: false,
        }));
        
        const { error: keywordsError } = await supabase
          .from('keywords')
          .insert(keywordsToInsert);
        
        if (keywordsError) {
          console.error('Keywords save error:', keywordsError);
        } else {
          console.log('[ONBOARDING] Keywords saved successfully');
        }
      }
      
      // Auto-generate initial AEO content
      try {
        await supabase.functions.invoke('auto-generate-aeo', {
          body: { 
            projectId: newProject.id,
            language: data.language 
          }
        });
      } catch (aeoError) {
        console.error('AEO generation error:', aeoError);
        // Continue even if AEO generation fails
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Redirect to checkout page
      navigate("/checkout");
    } catch (error) {
      toast({ title: "Error", description: "Failed to create project.", variant: "destructive" });
      setIsAnalyzing(false);
    }
  };

  const addAudience = () => {
    if (newAudience.trim() && !data.targetAudiences.includes(newAudience.trim())) {
      updateData("targetAudiences", [...data.targetAudiences, newAudience.trim()]);
      setNewAudience("");
    }
  };

  const removeAudience = (audience: string) => {
    updateData("targetAudiences", data.targetAudiences.filter(a => a !== audience));
  };

  const addCompetitor = () => {
    if (newCompetitor.trim() && !data.competitors.includes(newCompetitor.trim())) {
      updateData("competitors", [...data.competitors, newCompetitor.trim()]);
      setNewCompetitor("");
    }
  };

  const removeCompetitor = (comp: string) => {
    updateData("competitors", data.competitors.filter(c => c !== comp));
  };

  const getDescriptionLabel = () => {
    const lang = languages.find(l => l.code === data.language);
    if (!lang) return "Description";
    
    switch (data.language) {
      case "fr": return "Description (en français)";
      case "de": return "Beschreibung (auf Deutsch)";
      case "es": return "Descripción (en español)";
      case "it": return "Descrizione (in italiano)";
      case "pt": return "Descrição (em português)";
      default: return "Description";
    }
  };

  if (isAnalyzing) {
    return <AnalyzingScreen websiteUrl={data.websiteUrl} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-bg shadow-glow-sm">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Aeo<span className="gradient-text">reply</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Form */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-12">
          <div className="w-full max-w-xl">
            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 bg-primary rounded-full" />
                <span className="font-semibold">
                  {currentStep === 1 && "Let's begin"}
                  {currentStep === 2 && "Step 2"}
                  {currentStep === 3 && "Step 3"}
                  {currentStep === 4 && "Step 4 (Optional)"}
                  {currentStep === 5 && "Step 5 (Optional)"}
                  {currentStep === 6 && "Survey"}
                </span>
              </div>
              <span className="text-muted-foreground text-sm">Step {currentStep} of {totalSteps}</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight">Insert Your Website URL</h1>
                      <p className="text-muted-foreground mt-2">Enter the website URL you want to optimize for AI visibility.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          type="url"
                          placeholder="example.com"
                          value={data.websiteUrl}
                          onChange={(e) => handleUrlChange(e.target.value)}
                          className={cn("h-14 text-lg pr-12", urlError && "border-destructive focus-visible:ring-destructive")}
                        />
                        {isAutoFilling && (
                          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
                        )}
                      </div>
                      {urlError && (
                        <p className="text-sm text-destructive">{urlError}</p>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight">Choose Your Language</h1>
                      <p className="text-muted-foreground mt-2">Select the language for your AI-optimized content.</p>
                    </div>
                    <div className="relative">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full h-14 justify-between text-left font-normal">
                            {data.language ? (
                              <div className="flex items-center gap-2">
                                <span>{languages.find(l => l.code === data.language)?.flag}</span>
                                <span>{languages.find(l => l.code === data.language)?.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Select a language</span>
                            )}
                            <div className="flex items-center gap-2">
                              <ChevronDown className="h-4 w-4" />
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-full min-w-[400px]">
                          {languages.map((lang) => (
                            <DropdownMenuItem key={lang.code} onClick={() => updateData("language", lang.code)} className="py-3">
                              <span className="mr-2">{lang.flag}</span>
                              <span>{lang.name}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {data.language && (
                      <div className="flex items-center gap-2 text-primary">
                        <Check className="h-4 w-4" />
                        <span className="text-sm">Speakers: {languages.find(l => l.code === data.language)?.audience}</span>
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight">Describe Your Business</h1>
                    </div>
                    <div className="space-y-2">
                      <Label>{getDescriptionLabel()}</Label>
                      {isLoadingFast && !data.businessDescription ? (
                        <div className="min-h-[150px] rounded-md border border-border bg-muted/30 p-3 animate-pulse">
                          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                          <div className="h-4 bg-muted rounded w-full mb-2" />
                          <div className="h-4 bg-muted rounded w-5/6" />
                        </div>
                      ) : (
                        <Textarea
                          value={data.businessDescription}
                          onChange={(e) => updateData("businessDescription", e.target.value)}
                          className="min-h-[150px] resize-none"
                          placeholder={data.language === "fr" ? "Décrivez votre entreprise..." : "Describe your business..."}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. business owners in Florida"
                          value={newAudience}
                          onChange={(e) => setNewAudience(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAudience())}
                        />
                        <Button onClick={addAudience} size="icon" className="shrink-0 gradient-bg text-primary-foreground">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {isLoadingFast && data.targetAudiences.length === 0 ? (
                          <>
                            <div className="h-8 w-32 bg-muted rounded-full animate-pulse" />
                            <div className="h-8 w-28 bg-muted rounded-full animate-pulse" />
                            <div className="h-8 w-36 bg-muted rounded-full animate-pulse" />
                          </>
                        ) : (
                          data.targetAudiences.map((audience) => (
                            <Badge key={audience} variant="secondary" className="gap-1 py-1.5 px-3">
                              {audience}
                              <button onClick={() => removeAudience(audience)} className="ml-1 hover:text-destructive">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight">Select Your Competitors</h1>
                      <p className="text-muted-foreground mt-2">This step is optional. You can always add competitors later in settings.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2">
                      <p className="text-sm text-muted-foreground">If you add competitors, we can better:</p>
                      <ul className="text-sm space-y-1">
                        <li>• <strong>Find trending topics</strong> and content gaps to stay ahead of the competition.</li>
                        <li>• <strong>Identify industry keywords</strong> to understand the language of your domain.</li>
                      </ul>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type competitor domain (e.g. competitor.com)"
                        value={newCompetitor}
                        onChange={(e) => setNewCompetitor(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCompetitor())}
                      />
                      <Button onClick={addCompetitor} size="icon" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.competitors.map((comp) => (
                        <Badge key={comp} variant="secondary" className="gap-2 py-1.5 px-3">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">G</span>
                          {comp}
                          <button onClick={() => removeCompetitor(comp)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight">Customize Your Brand</h1>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-1">
                      <p className="text-sm">• <strong>Brand color</strong> is used to style your articles</p>
                      <p className="text-sm">• <strong>Example article</strong> is used to match your writing style and tone</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Brand Color (optional)</Label>
                      <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
                        <input
                          type="color"
                          value={data.brandColor}
                          onChange={(e) => updateData("brandColor", e.target.value)}
                          className="h-8 w-8 rounded border-0 cursor-pointer"
                        />
                        <span className="text-sm font-mono"># {data.brandColor.replace("#", "")}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Article URL for brand voice (optional)</Label>
                      <Input
                        type="url"
                        placeholder="https://yourwebsite.com/article-title"
                        value={data.exampleUrl}
                        onChange={(e) => updateData("exampleUrl", e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 6 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight">How did you hear about Aeoreply?</h1>
                      <p className="text-muted-foreground mt-2">Your answer helps us improve our marketing strategies.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {referralSources.map((source) => (
                        <button
                          key={source.id}
                          onClick={() => updateData("referralSource", source.id)}
                          className={cn(
                            "flex items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                            data.referralSource === source.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <span className="text-lg">{source.icon}</span>
                          <span className="font-medium">{source.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Continue Button */}
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="w-full h-14 mt-8 gap-2 bg-foreground text-background hover:bg-foreground/90 text-lg font-medium"
            >
              Continue
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Right Panel - Illustration */}
        <div className="hidden lg:flex w-1/2 bg-muted/30 items-center justify-center relative overflow-hidden">
          {currentStep <= 2 && <WorldMapIllustration />}
          {currentStep === 3 && <WorldMapIllustration />}
          {currentStep === 4 && <GrowthArrowsIllustration />}
          {currentStep >= 5 && <DotsPatternIllustration />}
        </div>
      </div>
    </div>
  );
}

function WorldMapIllustration() {
  return (
    <div className="w-full h-full flex items-center justify-center p-12">
      <svg viewBox="0 0 400 300" className="w-full max-w-md opacity-20">
        {Array.from({ length: 20 }).map((_, row) =>
          Array.from({ length: 30 }).map((_, col) => (
            <circle
              key={`${row}-${col}`}
              cx={col * 14 + 10}
              cy={row * 14 + 20}
              r={Math.random() > 0.6 ? 2 : 0}
              fill="currentColor"
              className="text-foreground"
            />
          ))
        )}
      </svg>
    </div>
  );
}

function GrowthArrowsIllustration() {
  return (
    <div className="w-full h-full flex items-center justify-center p-12">
      <svg viewBox="0 0 300 200" className="w-full max-w-md">
        <polygon points="50,180 80,120 110,180" fill="hsl(var(--muted))" />
        <polygon points="90,180 130,100 170,180" fill="hsl(var(--muted))" />
        <polygon points="140,180 190,80 240,180" fill="hsl(var(--muted))" />
        <path d="M 60 150 Q 150 60 260 40" stroke="hsl(var(--primary))" strokeWidth="8" fill="none" strokeLinecap="round" />
        <polygon points="250,30 270,50 245,55" fill="hsl(var(--primary))" />
      </svg>
    </div>
  );
}

function DotsPatternIllustration() {
  return (
    <div className="w-full h-full flex items-center justify-center p-12 relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-12 gap-4">
          {Array.from({ length: 144 }).map((_, i) => (
            <div key={i} className="h-4 w-4 rounded-full bg-muted-foreground/10" />
          ))}
        </div>
      </div>
      <div className="relative z-10">
        <div className="w-32 h-24 bg-foreground rounded-lg relative overflow-hidden">
          <div className="absolute -top-6 left-4 w-12 h-12 rounded-full gradient-bg" />
          <div className="absolute -top-6 left-12 w-12 h-12 rounded-full gradient-bg" />
        </div>
      </div>
    </div>
  );
}

function AnalyzingScreen({ websiteUrl }: { websiteUrl: string }) {
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState("Connecting...");
  const tasks = ["Connecting...", "Scanning structure...", "Extracting content...", "Identifying opportunities...", "Preparing dashboard..."];

  useEffect(() => {
    let taskIndex = 0;
    const interval = setInterval(() => {
      taskIndex++;
      if (taskIndex < tasks.length) {
        setCurrentTask(tasks[taskIndex]);
        setProgress((taskIndex / tasks.length) * 100);
      }
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-2xl gradient-bg flex items-center justify-center shadow-glow animate-pulse">
            <Rocket className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Analyzing your website</h1>
          <p className="text-muted-foreground text-sm mt-2">{websiteUrl}</p>
        </div>
        <div className="space-y-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full gradient-bg" animate={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />{currentTask}
          </p>
        </div>
      </div>
    </div>
  );
}
