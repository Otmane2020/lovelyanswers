import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight,
  Loader2,
  X,
  Plus,
  Check,
  Search,
} from "lucide-react";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCreateProject } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "en-uk", name: "English (UK)", flag: "🇬🇧" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "pt-br", name: "Brazilian", flag: "🇧🇷" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" },
  { code: "da", name: "Danish", flag: "🇩🇰" },
  { code: "no", name: "Norwegian", flag: "🇳🇴" },
  { code: "fi", name: "Finnish", flag: "🇫🇮" },
  { code: "el", name: "Greek", flag: "🇬🇷" },
  { code: "cs", name: "Czech", flag: "🇨🇿" },
  { code: "ro", name: "Romanian", flag: "🇷🇴" },
  { code: "hu", name: "Hungarian", flag: "🇭🇺" },
  { code: "uk", name: "Ukrainian", flag: "🇺🇦" },
  { code: "sk", name: "Slovak", flag: "🇸🇰" },
  { code: "bg", name: "Bulgarian", flag: "🇧🇬" },
  { code: "hr", name: "Croatian", flag: "🇭🇷" },
  { code: "sl", name: "Slovenian", flag: "🇸🇮" },
  { code: "sr", name: "Serbian", flag: "🇷🇸" },
  { code: "bs", name: "Bosnian", flag: "🇧🇦" },
  { code: "mk", name: "Macedonian", flag: "🇲🇰" },
  { code: "sq", name: "Albanian", flag: "🇦🇱" },
  { code: "is", name: "Icelandic", flag: "🇮🇸" },
  { code: "ca", name: "Catalan", flag: "🏴󠁥󠁳󠁣󠁴󠁿" },
  { code: "gl", name: "Galician", flag: "🇪🇸" },
  { code: "cy", name: "Welsh", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  { code: "lt", name: "Lithuanian", flag: "🇱🇹" },
  { code: "lv", name: "Latvian", flag: "🇱🇻" },
  { code: "et", name: "Estonian", flag: "🇪🇪" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", flag: "🇧🇩" },
  { code: "ur", name: "Urdu", flag: "🇵🇰" },
  { code: "ne", name: "Nepali", flag: "🇳🇵" },
  { code: "th", name: "Thai", flag: "🇹🇭" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
  { code: "id", name: "Indonesian", flag: "🇮🇩" },
  { code: "ms", name: "Malay", flag: "🇲🇾" },
  { code: "tl", name: "Filipino", flag: "🇵🇭" },
  { code: "my", name: "Burmese", flag: "🇲🇲" },
  { code: "ka", name: "Georgian", flag: "🇬🇪" },
  { code: "hy", name: "Armenian", flag: "🇦🇲" },
  { code: "az", name: "Azerbaijani", flag: "🇦🇿" },
  { code: "kk", name: "Kazakh", flag: "🇰🇿" },
  { code: "mn", name: "Mongolian", flag: "🇲🇳" },
  { code: "he", name: "Hebrew", flag: "🇮🇱" },
  { code: "am", name: "Amharic", flag: "🇪🇹" },
  { code: "sw", name: "Swahili", flag: "🇰🇪" },
  { code: "so", name: "Somali", flag: "🇸🇴" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const createProject = useCreateProject();
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingFast, setIsLoadingFast] = useState(false);
  const [isLoadingEnrich, setIsLoadingEnrich] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [newAudience, setNewAudience] = useState("");
  const [newCompetitor, setNewCompetitor] = useState("");
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [hasInitializedFromUrl, setHasInitializedFromUrl] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const analysisStartedRef = useRef<string | null>(null);
  
  const [data, setData] = useState<OnboardingData>({
    websiteUrl: "",
    language: "en",
    businessDescription: "",
    targetAudiences: [],
    competitors: [],
    brandColor: "#000000",
    exampleUrl: "",
    referralSource: "",
    keywords: [],
  });

  // Force dark theme
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  const isValidUrl = (url: string): boolean => {
    if (!url || url.length < 3) return false;
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;
    return urlPattern.test(url.trim());
  };

  const totalSteps = 5;
  const urlFromParam = searchParams.get('url');
  const forceOnboarding = !!urlFromParam;

  useEffect(() => {
    const checkExistingProject = async () => {
      if (forceOnboarding) {
        setIsCheckingUser(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsCheckingUser(false);
        return;
      }

      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (projects && projects.length > 0) {
        navigate("/dashboard", { replace: true });
      } else {
        setIsCheckingUser(false);
      }
    };

    checkExistingProject();
  }, [navigate, forceOnboarding]);

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const analyzeWebsite = useCallback(async (url: string) => {
    if (!url || url.length < 5) return;

    setData(prev => ({
      ...prev,
      websiteUrl: url,
      businessDescription: "",
      targetAudiences: [],
      competitors: [],
      keywords: [],
      exampleUrl: "",
    }));

    setIsLoadingFast(true);
    setIsLoadingEnrich(true);

    const fastPromise = supabase.functions.invoke('firecrawl-scrape-fast', {
      body: { url }
    }).then(({ data: fastResult, error }) => {
      if (!error && fastResult?.success) {
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

    const enrichPromise = supabase.functions.invoke('firecrawl-scrape', {
      body: { url }
    }).then(({ data: scrapeResult, error }) => {
      if (!error && scrapeResult?.success) {
        const { audiences: scrapedAudiences, competitors: scrapedCompetitors, keywords: scrapedKeywords } = scrapeResult.data;
        setData(prev => ({
          ...prev,
          targetAudiences:
            (scrapedAudiences?.length ?? 0) > (prev.targetAudiences?.length ?? 0)
              ? (scrapedAudiences || [])
              : prev.targetAudiences,
          competitors: prev.competitors.length > 0 ? prev.competitors : (scrapedCompetitors || []),
          keywords: prev.keywords.length > 0 ? prev.keywords : (scrapedKeywords || []),
        }));
      }
      setIsLoadingEnrich(false);
    }).catch(err => {
      console.error('[ONBOARDING] Enrichment error:', err);
      setIsLoadingEnrich(false);
    });

    try {
      await Promise.all([fastPromise, enrichPromise]);
    } catch (err) {
      console.error('[ONBOARDING] Analysis error:', err);
      await fallbackAnalysis(url);
    } finally {
      setHasAnalyzed(true);
    }
  }, []);

  useEffect(() => {
    if (hasInitializedFromUrl) return;
    
    const urlFromParam = searchParams.get('url');
    if (urlFromParam) {
      const decodedUrl = decodeURIComponent(urlFromParam);
      
      if (forceOnboarding) {
        setData({
          websiteUrl: decodedUrl,
          language: "en",
          businessDescription: "",
          targetAudiences: [],
          competitors: [],
          brandColor: "#000000",
          exampleUrl: "",
          referralSource: "",
          keywords: [],
        });
      } else {
        setData(prev => ({ ...prev, websiteUrl: decodedUrl }));
      }
      
      setHasInitializedFromUrl(true);
      analysisStartedRef.current = decodedUrl;
      
      if (isValidUrl(decodedUrl)) {
        analyzeWebsite(decodedUrl);
        setTimeout(() => {
          setCurrentStep(2);
        }, 300);
      }
    } else {
      setHasInitializedFromUrl(true);
    }
  }, [searchParams, hasInitializedFromUrl, analyzeWebsite, forceOnboarding]);

  useEffect(() => {
    const url = data.websiteUrl.trim();
    
    const isOwnDomain = url.toLowerCase().includes('lovelyanswers.io') || 
                         url.toLowerCase().includes('lovableproject.com') ||
                         url.toLowerCase().includes('localhost');
    
    if (!isValidUrl(url) || isOwnDomain) return;
    if (analysisStartedRef.current === url) return;
    
    const timer = setTimeout(() => {
      const currentUrl = data.websiteUrl.trim();
      if (isValidUrl(currentUrl) && currentUrl === url && analysisStartedRef.current !== url) {
        analysisStartedRef.current = url;
        analyzeWebsite(url);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [data.websiteUrl, analyzeWebsite]);

  const handleUrlChange = (value: string) => {
    updateData("websiteUrl", value);
    setUrlError("");
    if (analysisStartedRef.current && !value.includes(analysisStartedRef.current.replace(/^https?:\/\//, '').split('/')[0])) {
      setHasAnalyzed(false);
      analysisStartedRef.current = null;
    }
  };

  const validateAndProceed = () => {
    if (currentStep === 1 && !isValidUrl(data.websiteUrl)) {
      setUrlError("Please enter a valid URL (e.g., example.com)");
      toast({
        title: "Invalid URL",
        description: "Please enter a valid website URL format.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

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
      competitors: [],
      exampleUrl: `https://${domain}`,
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return data.websiteUrl.length > 0 && isValidUrl(data.websiteUrl);
      case 2: return true;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const handleNext = async () => {
    if (!validateAndProceed()) return;
    
    if (currentStep < totalSteps) {
      if (currentStep === 2 && !data.language) {
        updateData("language", "en");
      }
      setCurrentStep(currentStep + 1);
    } else {
      if (!data.language) updateData("language", "en");
      localStorage.setItem('onboarding_data', JSON.stringify(data));
      navigate("/auth?mode=signup");
    }
  };

  const handleComplete = async (savedData: OnboardingData) => {
    setIsAnalyzing(true);
    try {
      let domain = "";
      try {
        const urlObj = new URL(savedData.websiteUrl.startsWith("http") ? savedData.websiteUrl : `https://${savedData.websiteUrl}`);
        domain = urlObj.hostname.replace("www.", "");
      } catch { domain = savedData.websiteUrl; }
      
      const brandName = domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      
      const newProject = await createProject.mutateAsync({
        name: brandName,
        website_url: savedData.websiteUrl,
        domain: domain,
        language: savedData.language,
        business_description: savedData.businessDescription,
        business_type: "service",
        audience: savedData.targetAudiences.join(", "),
        brand_name: brandName,
        example_url: savedData.exampleUrl || undefined,
        competitors: savedData.competitors,
      });
      
      if (savedData.keywords && savedData.keywords.length > 0) {
        const keywordsToInsert = savedData.keywords.map(k => ({
          project_id: newProject.id,
          keyword: k.keyword,
          intent: k.intent || 'informational',
          source_url: savedData.websiteUrl,
          is_used: false,
        }));
        
        await supabase.from('keywords').insert(keywordsToInsert);
      }
      
      supabase.functions.invoke('auto-generate-aeo', {
        body: { 
          projectId: newProject.id,
          language: savedData.language 
        }
      }).catch(err => console.error('[ONBOARDING] AEO generation error:', err));
      
      localStorage.removeItem('onboarding_data');
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

  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(languageSearch.toLowerCase())
  );

  if (isCheckingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAnalyzing) {
    return <AnalyzingScreen websiteUrl={data.websiteUrl} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="flex items-center justify-center gap-2">
          <AnimatedLogo size="md" />
          <span className="text-xl font-bold tracking-tight">
            Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">Answers</span>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Step 1: Website URL */}
              {currentStep === 1 && (
                <div className="space-y-6 text-center">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">What's your website?</h1>
                    <p className="text-muted-foreground mt-2">Enter your URL and we'll analyze your business</p>
                  </div>
                  
                  {/* Robot illustration placeholder */}
                  <div className="flex justify-center py-4">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center">
                      <AnimatedLogo size="lg" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Input
                      type="url"
                      placeholder="yourwebsite.com"
                      value={data.websiteUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      className={cn(
                        "h-14 text-center text-lg bg-muted/50 border-muted",
                        urlError && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {urlError && (
                      <p className="text-sm text-destructive">{urlError}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Language Selection */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold tracking-tight">What language should<br />we write in?</h1>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search language..."
                      value={languageSearch}
                      onChange={(e) => setLanguageSearch(e.target.value)}
                      className="pl-9 h-12 bg-muted/50 border-muted"
                    />
                  </div>

                  {/* Language Grid */}
                  <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
                    {filteredLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => updateData("language", lang.code)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                          data.language === lang.code
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:border-primary/50"
                        )}
                      >
                        <span className="text-2xl">{lang.flag}</span>
                        <span className="text-xs font-medium truncate w-full text-center">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Email/Results placeholder - now business description */}
              {currentStep === 3 && (
                <div className="space-y-6 text-center">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Describe your business</h1>
                    <p className="text-muted-foreground mt-2">Help us understand what you do</p>
                  </div>

                  <div className="space-y-4 text-left">
                    {isLoadingFast && !data.businessDescription ? (
                      <div className="min-h-[120px] rounded-xl border border-border bg-muted/30 p-4 animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                        <div className="h-4 bg-muted rounded w-full mb-2" />
                        <div className="h-4 bg-muted rounded w-5/6" />
                      </div>
                    ) : (
                      <textarea
                        value={data.businessDescription}
                        onChange={(e) => updateData("businessDescription", e.target.value)}
                        className="w-full min-h-[120px] p-4 rounded-xl border border-border bg-muted/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="We are a company that..."
                      />
                    )}

                    <div>
                      <label className="text-sm font-medium mb-2 block">Target Audience</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. small business owners"
                          value={newAudience}
                          onChange={(e) => setNewAudience(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAudience())}
                          className="bg-muted/50 border-muted"
                        />
                        <Button onClick={addAudience} size="icon" className="shrink-0 bg-gradient-to-r from-primary to-violet-500">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {(isLoadingFast || isLoadingEnrich) && data.targetAudiences.length === 0 ? (
                          <>
                            <div className="h-8 w-28 bg-muted rounded-full animate-pulse" />
                            <div className="h-8 w-32 bg-muted rounded-full animate-pulse" />
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
                </div>
              )}

              {/* Step 4: Analyzing/Competitors */}
              {currentStep === 4 && (
                <div className="space-y-6 text-center">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Add competitors</h1>
                    <p className="text-muted-foreground mt-2">Optional - helps us find trending topics</p>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="competitor.com"
                      value={newCompetitor}
                      onChange={(e) => setNewCompetitor(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCompetitor())}
                      className="bg-muted/50 border-muted"
                    />
                    <Button onClick={addCompetitor} size="icon" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center">
                    {data.competitors.map((comp) => (
                      <Badge key={comp} variant="secondary" className="gap-2 py-2 px-3">
                        {comp}
                        <button onClick={() => removeCompetitor(comp)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  {data.competitors.length === 0 && (
                    <p className="text-sm text-muted-foreground">You can skip this step</p>
                  )}
                </div>
              )}

              {/* Step 5: Brand customization */}
              {currentStep === 5 && (
                <div className="space-y-6 text-center">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Customize your brand</h1>
                    <p className="text-muted-foreground mt-2">Optional - personalize your content</p>
                  </div>

                  <div className="space-y-4 text-left">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Brand Color</label>
                      <div className="flex items-center gap-3 p-3 border border-border rounded-xl bg-muted/50">
                        <input
                          type="color"
                          value={data.brandColor}
                          onChange={(e) => updateData("brandColor", e.target.value)}
                          className="h-10 w-10 rounded border-0 cursor-pointer"
                        />
                        <span className="text-sm font-mono text-muted-foreground">{data.brandColor}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Example article URL (for brand voice)</label>
                      <Input
                        type="url"
                        placeholder="https://yoursite.com/blog/article"
                        value={data.exampleUrl}
                        onChange={(e) => updateData("exampleUrl", e.target.value)}
                        className="bg-muted/50 border-muted"
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Continue Button */}
          <div className="mt-8">
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="w-full h-14 text-lg font-medium bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 transition-opacity"
            >
              {currentStep === totalSteps ? "Create Account" : "Continue"}
              {currentStep < totalSteps && <ArrowRight className="h-5 w-5 ml-2" />}
            </Button>
          </div>

          {/* Step indicator dots */}
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i + 1 === currentStep ? "w-8 bg-primary" : "w-2 bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyzingScreen({ websiteUrl }: { websiteUrl: string }) {
  const [currentTask, setCurrentTask] = useState("Calculating traffic potential...");
  const tasks = [
    "Calculating traffic potential...",
    "Analyzing competitors...",
    "Finding content opportunities...",
    "Preparing your dashboard..."
  ];

  useEffect(() => {
    let taskIndex = 0;
    const interval = setInterval(() => {
      taskIndex = (taskIndex + 1) % tasks.length;
      setCurrentTask(tasks[taskIndex]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="absolute top-6 left-0 right-0 flex justify-center">
        <div className="flex items-center gap-2">
          <AnimatedLogo size="md" />
          <span className="text-xl font-bold tracking-tight">
            Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">Answers</span>
          </span>
        </div>
      </div>

      <div className="max-w-sm w-full">
        <div className="bg-card rounded-2xl p-8 text-center space-y-6">
          <div>
            <h1 className="text-2xl font-bold">LovelyAnswers is learning<br />about your website</h1>
          </div>
          
          <p className="text-muted-foreground">{currentTask}</p>

          <div className="flex justify-center py-8">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center">
              <AnimatedLogo size="lg" className="animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
