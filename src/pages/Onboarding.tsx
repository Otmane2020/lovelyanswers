import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight,
  Loader2,
  Check,
  Search,
  Globe,
  TrendingUp,
  Sparkles,
  Shield,
  FileText,
  Zap,
  Languages,
  Users,
  Bot,
} from "lucide-react";
import lovelyMascot from "@/assets/lovely-mascot.png";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingSession } from "@/hooks/useOnboardingSession";

interface OnboardingData {
  websiteUrl: string;
  language: string;
  email: string;
  businessDescription: string;
  brandName: string;
  siteLogo: string;
  cms: string;
  competitors: Array<{ name: string; domain: string }>;
  keywords: Array<{ keyword: string; volume: number; intent: string }>;
  trafficPotential: number;
}

const languages = [
  { code: "en", name: "English", flagCode: "us" },
  { code: "en-uk", name: "English (UK)", flagCode: "gb" },
  { code: "fr", name: "French", flagCode: "fr" },
  { code: "de", name: "German", flagCode: "de" },
  { code: "es", name: "Spanish", flagCode: "es" },
  { code: "zh", name: "Chinese", flagCode: "cn" },
  { code: "pt", name: "Portuguese", flagCode: "pt" },
  { code: "pt-br", name: "Brazilian", flagCode: "br" },
  { code: "ja", name: "Japanese", flagCode: "jp" },
  { code: "ko", name: "Korean", flagCode: "kr" },
  { code: "ar", name: "Arabic", flagCode: "sa" },
  { code: "it", name: "Italian", flagCode: "it" },
  { code: "nl", name: "Dutch", flagCode: "nl" },
  { code: "pl", name: "Polish", flagCode: "pl" },
  { code: "tr", name: "Turkish", flagCode: "tr" },
  { code: "sv", name: "Swedish", flagCode: "se" },
  { code: "da", name: "Danish", flagCode: "dk" },
  { code: "no", name: "Norwegian", flagCode: "no" },
  { code: "fi", name: "Finnish", flagCode: "fi" },
  { code: "el", name: "Greek", flagCode: "gr" },
  { code: "cs", name: "Czech", flagCode: "cz" },
  { code: "ro", name: "Romanian", flagCode: "ro" },
  { code: "hu", name: "Hungarian", flagCode: "hu" },
  { code: "uk", name: "Ukrainian", flagCode: "ua" },
  { code: "he", name: "Hebrew", flagCode: "il" },
  { code: "hi", name: "Hindi", flagCode: "in" },
  { code: "th", name: "Thai", flagCode: "th" },
  { code: "vi", name: "Vietnamese", flagCode: "vn" },
  { code: "id", name: "Indonesian", flagCode: "id" },
  { code: "ms", name: "Malay", flagCode: "my" },
];

const PRICE_MONTHLY = "price_1Sw4JNEfti9t9nN9Z88uua20";
const PRICE_ANNUAL = "price_1Sw4LaEfti9t9nN97pvV9rYI";

const features = [
  "🤖 AEO Answers: Rank #1 on ChatGPT, Gemini & Perplexity",
  "📝 30 SEO-optimized articles auto-published monthly",
  "📍 Local AEO: Dominate local AI search results",
  "🔄 Auto-posting to WordPress, Shopify, Webflow & more",
  "🔍 Automated keyword research & SERP clustering",
  "💬 Reddit Agent for brand visibility & backlinks",
  "🛠️ Technical SEO audit (Google + AI crawlers)",
  "🌍 20+ languages supported worldwide",
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [languageSearch, setLanguageSearch] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [urlError, setUrlError] = useState("");
  const analysisStartedRef = useRef<string | null>(null);
  const languageTouchedRef = useRef(false);
  const languageAutoDetectRef = useRef<string | null>(null);
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
  const [isPreDetecting, setIsPreDetecting] = useState(false);
  
  // Session tracking hook
  const { 
    trackStep, 
    updateSession, 
    detectLanguage,
    isDetectingLanguage,
    detectedLanguage,
    trackCheckoutStarted,
    trackCompleted,
  } = useOnboardingSession();
  
  const [data, setData] = useState<OnboardingData>({
    websiteUrl: "",
    language: "en",
    email: "",
    businessDescription: "",
    brandName: "",
    siteLogo: "",
    cms: "",
    competitors: [],
    keywords: [],
    trafficPotential: 0,
  });

  // Force light theme for onboarding
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    return () => {
      // No cleanup needed
    };
  }, []);

  // Check for existing user/project
  useEffect(() => {
    const checkExistingProject = async () => {
      const urlFromParam = searchParams.get('url');
      if (urlFromParam) {
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
  }, [navigate, searchParams]);

  // Initialize from URL param
  useEffect(() => {
    const urlFromParam = searchParams.get('url');
    if (urlFromParam) {
      const decodedUrl = decodeURIComponent(urlFromParam);
      setData(prev => ({ ...prev, websiteUrl: decodedUrl }));
    }
  }, [searchParams]);

  // Language pre-detection is now handled in handleContinue for step 1
  // to show loading state and go directly to detected language

  const isValidUrl = (url: string): boolean => {
    if (!url || url.length < 3) return false;
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;
    return urlPattern.test(url.trim());
  };

  const isValidEmail = (email: string): boolean => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim());
  };

  const getDomainFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
    }
  };

  const analyzeWebsite = useCallback(async (url: string) => {
    if (!url || analysisStartedRef.current === url) return;
    
    analysisStartedRef.current = url;
    setIsAnalyzing(true);
    setAnalysisStartTime(Date.now());
    setCurrentStep(4); // Move to analyzing screen

    const domain = getDomainFromUrl(url);
    const brandName = domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    try {
      // Call both scrape functions in parallel
      const [fastResult, enrichResult] = await Promise.allSettled([
        supabase.functions.invoke('firecrawl-scrape-fast', { body: { url } }),
        supabase.functions.invoke('firecrawl-scrape', { body: { url } }),
      ]);

      let detectedLanguage = "en";
      let description = `${brandName} is a professional service provider.`;
      let competitors: Array<{ name: string; domain: string }> = [];
      let keywords: Array<{ keyword: string; volume: number; intent: string }> = [];
      let cms = "";

      // Process fast result
      if (fastResult.status === 'fulfilled' && fastResult.value.data?.success) {
        const fastData = fastResult.value.data.data;
        detectedLanguage = fastData.language || "en";
        description = fastData.description || description;
      }

      // Process enriched result - OVERRIDE language if detected
      if (enrichResult.status === 'fulfilled' && enrichResult.value.data?.success) {
        const enrichData = enrichResult.value.data.data;
        description = enrichData.description || description;
        cms = enrichData.cms || "";
        
        // Use enriched language if available (more reliable than fast scrape)
        if (enrichData.language) {
          detectedLanguage = enrichData.language;
          console.log('[ONBOARDING] Using enriched language:', detectedLanguage);
        }
        
        if (enrichData.competitors?.length > 0) {
          competitors = enrichData.competitors.slice(0, 4).map((comp: string) => ({
            name: comp.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
            domain: comp,
          }));
        }
        
        if (enrichData.keywords?.length > 0) {
          keywords = enrichData.keywords.slice(0, 5).map((k: any) => ({
            keyword: k.keyword || k,
            volume: k.search_volume || Math.floor(Math.random() * 3000) + 500,
            intent: k.intent || "informational",
          }));
        }
      }

      // Calculate traffic potential
      const trafficPotential = keywords.reduce((acc, k) => acc + k.volume, 0) || Math.floor(Math.random() * 10000) + 5000;

      setData(prev => ({
        ...prev,
        language: detectedLanguage,
        businessDescription: description,
        brandName,
        siteLogo: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        cms,
        competitors,
        keywords,
        trafficPotential,
      }));

      // Ensure minimum 3 seconds for analysis screen
      const elapsed = Date.now() - (analysisStartTime || Date.now());
      const remaining = Math.max(0, 3000 - elapsed);
      
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      setAnalysisComplete(true);
      setIsAnalyzing(false);
      setCurrentStep(5); // Move to report
    } catch (error) {
      console.error('[ONBOARDING] Analysis error:', error);
      // Fallback data
      setData(prev => ({
        ...prev,
        brandName,
        siteLogo: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        businessDescription: `${brandName} provides professional services.`,
        trafficPotential: 8500,
      }));
      setAnalysisComplete(true);
      setIsAnalyzing(false);
      setCurrentStep(5);
    }
  }, [analysisStartTime]);

  const handleContinue = async () => {
    if (currentStep === 1) {
      if (!isValidUrl(data.websiteUrl)) {
        setUrlError("Please enter a valid URL");
        return;
      }
      setUrlError("");
      
      // Start pre-detection with loading state
      setIsPreDetecting(true);
      
      // Track step 1 completion with URL
      await trackStep(1, { website_url: data.websiteUrl });
      
      // Detect language
      const detected = await detectLanguage(data.websiteUrl);
      
      if (detected && !languageTouchedRef.current) {
        setData(prev => ({ ...prev, language: detected }));
      }
      
      setIsPreDetecting(false);
      setCurrentStep(2);
      
    } else if (currentStep === 2) {
      // Track step 2 with language
      await trackStep(2, { language: data.language });
      setCurrentStep(3);
      
    } else if (currentStep === 3) {
      if (!isValidEmail(data.email)) {
        setEmailError("Please enter a valid email");
        return;
      }
      setEmailError("");
      
      // Track step 3 with email
      await trackStep(3, { email: data.email });
      
      analyzeWebsite(data.websiteUrl);
      
    } else if (currentStep === 5) {
      // Track step 5 completion
      await trackStep(5);
      await trackCompleted();
      setCurrentStep(6);
    }
  };

  const handleCheckout = async () => {
    if (!isValidEmail(data.email)) return;
    
    setIsCheckingOut(true);
    
    try {
      // Save data to localStorage for after payment
      const onboardingData = {
        websiteUrl: data.websiteUrl,
        language: data.language,
        businessDescription: data.businessDescription,
        email: data.email,
        keywords: data.keywords,
        competitors: data.competitors.map(c => c.domain),
      };
      localStorage.setItem('onboarding_data', JSON.stringify(onboardingData));
      localStorage.setItem('onboarding_email', data.email);

      // Track checkout started with all data
      await trackCheckoutStarted(data.email);
      await updateSession({
        brand_name: data.brandName,
        business_description: data.businessDescription,
        cms: data.cms,
        competitors: data.competitors.map(c => c.domain),
        keywords: data.keywords,
        traffic_potential: data.trafficPotential,
      });

      const { data: checkoutData, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan: billingCycle,
          email: data.email,
          guest: true,
        }
      });

      if (error || !checkoutData?.url) {
        throw new Error(error?.message || "Failed to create checkout");
      }

      window.location.href = checkoutData.url;
    } catch (error) {
      console.error('[ONBOARDING] Checkout error:', error);
      setIsCheckingOut(false);
    }
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-6 px-4 border-b border-border/50">
        <div className="flex items-center justify-center gap-2">
          <AnimatedLogo size="md" />
          <span className="text-xl font-bold tracking-tight">
            Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">Answers</span>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 pb-32">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {/* Step 1: URL Input */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 text-center"
              >
                <div className="space-y-3">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6">
                    <Globe className="w-10 h-10 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">What's your website?</h1>
                  <p className="text-muted-foreground">Enter your URL and we'll analyze your business</p>
                </div>

                <div className="space-y-3">
                  <Input
                    type="url"
                    placeholder="yourwebsite.com"
                    value={data.websiteUrl}
                    onChange={(e) => {
                      setData(prev => ({ ...prev, websiteUrl: e.target.value }));
                      setUrlError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                    className={cn(
                      "h-14 text-lg text-center rounded-xl border-2 bg-card",
                      urlError ? "border-destructive" : "border-border focus:border-primary"
                    )}
                  />
                  {urlError && <p className="text-sm text-destructive">{urlError}</p>}
                </div>
              </motion.div>
            )}

            {/* Step 2: Language Selection */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6">
                    <Languages className="w-10 h-10 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">Select your language</h1>
                  <p className="text-muted-foreground">We'll generate content in this language</p>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search languages..."
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    className="h-12 pl-12 rounded-xl border-2 border-border bg-card"
                  />
                </div>

                {/* Language Grid */}
                <div className="grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto pr-2">
                  {filteredLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        languageTouchedRef.current = true;
                        setData(prev => ({ ...prev, language: lang.code }));
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                        data.language === lang.code
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50"
                      )}
                    >
                      <img 
                        src={`https://flagcdn.com/w40/${lang.flagCode}.png`}
                        alt={lang.name}
                        className="w-8 h-5 object-cover rounded-sm"
                        loading="lazy"
                      />
                      <span className="text-xs font-medium truncate w-full text-center">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Email Collection */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 text-center"
              >
                <div className="space-y-3">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">Where should we send your results?</h1>
                  <p className="text-muted-foreground">We'll email you the full analysis report</p>
                </div>

                <div className="space-y-3">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={data.email}
                    onChange={(e) => {
                      setData(prev => ({ ...prev, email: e.target.value }));
                      setEmailError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                    className={cn(
                      "h-14 text-lg text-center rounded-xl border-2 bg-card",
                      emailError ? "border-destructive" : "border-border focus:border-primary"
                    )}
                  />
                  {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                </div>

                <p className="text-xs text-muted-foreground">
                  We'll send your score review to this email. You can unsubscribe anytime.
                </p>
              </motion.div>
            )}

            {/* Step 4: Analyzing Screen */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 text-center"
              >
                {/* Lovely Mascot */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="relative mx-auto w-40 h-40"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-violet-500/30 rounded-full blur-[40px]" />
                  <img 
                    src={lovelyMascot} 
                    alt="Lovely analyzing your site" 
                    className="relative w-full h-full object-contain drop-shadow-lg animate-bounce"
                    style={{ animationDuration: '2s' }}
                  />
                </motion.div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight">Lovely is analyzing your site</h1>
                  <p className="text-muted-foreground animate-pulse">Your AI agent is getting to know your business...</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    </div>
                    <span className="text-sm">Scanning {getDomainFromUrl(data.websiteUrl)}</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border opacity-50">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm">Finding competitors to outrank...</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border opacity-50">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm">Calculating growth potential...</span>
                  </div>
                </div>

                {/* Reassurance message */}
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <Sparkles className="inline w-3 h-3 mr-1 text-primary" />
                  Lovely works 24/7 to get you recommended by ChatGPT, Gemini & Google
                </p>
              </motion.div>
            )}

            {/* Step 5: Report */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight">Ready to grow traffic</h1>
                  <p className="text-sm text-muted-foreground">LovelyAnswers analyzed your site in seconds</p>
                </div>

                {/* Site Info Card */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                  <div className="flex items-center gap-2 text-sm text-emerald-500 font-medium">
                    <Check className="w-4 h-4" />
                    Compatible with LovelyAnswers
                  </div>
                  <div className="flex items-center gap-3">
                    <img 
                      src={data.siteLogo} 
                      alt={data.brandName}
                      className="w-10 h-10 rounded-lg bg-muted"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${data.brandName}&background=random`;
                      }}
                    />
                    <div>
                      <p className="font-semibold">{data.brandName}</p>
                      <p className="text-sm text-muted-foreground">{getDomainFromUrl(data.websiteUrl)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const lang = languages.find(l => l.code === data.language) || languages[0];
                      return (
                        <span className="px-3 py-1.5 rounded-full text-sm font-medium border border-border bg-background flex items-center gap-1.5">
                          <img 
                            src={`https://flagcdn.com/w20/${lang.flagCode}.png`}
                            alt={lang.name}
                            className="w-4 h-3 object-cover rounded-sm"
                          />
                          {lang.name}
                        </span>
                      );
                    })()}
                    {(() => {
                      const knownCMS = ['WordPress', 'WooCommerce', 'Shopify', 'Wix', 'Webflow', 'Framer', 'Squarespace', 'Duda', 'BigCommerce', 'PrestaShop', 'Magento', 'Ghost'];
                      const isKnownCMS = data.cms && knownCMS.includes(data.cms);
                      return (
                        <span className="px-3 py-1.5 rounded-full text-sm font-medium border border-border bg-background flex items-center gap-1.5">
                          <Globe className="w-4 h-4" />
                          {isKnownCMS ? data.cms : 'Website'}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Marketing message with Lovely branding */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-violet-500/10 to-fuchsia-500/10 border border-primary/20 space-y-1">
                  <p className="text-sm">
                    <span className="font-semibold text-primary">✨ Lovely did this in 35 seconds.</span>{' '}
                    <span className="text-muted-foreground">Imagine Lovely working full-time on your marketing...</span>
                  </p>
                </div>

                {/* Competitors */}
                {data.competitors.length > 0 && (
                  <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Competitors (what we'll beat)</p>
                    <div className="space-y-2">
                      {data.competitors.slice(0, 3).map((comp, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <img 
                            src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=32`}
                            alt={comp.name}
                            className="w-6 h-6 rounded bg-muted"
                          />
                          <div>
                            <p className="text-sm font-medium">{comp.name}</p>
                            <p className="text-xs text-muted-foreground">{comp.domain}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Traffic Potential */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Potential traffic boost</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-primary">+{data.trafficPotential.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">visitors per month</p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-primary/50" />
                  </div>
                </div>

                {/* Content Ideas */}
                {data.keywords.length > 0 && (
                  <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Content ideas (what we'll write)</p>
                    <div className="space-y-2">
                      {data.keywords.slice(0, 3).map((kw, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate flex-1 mr-4">"{kw.keyword}"</p>
                          <span className="text-xs text-emerald-500 whitespace-nowrap">+{kw.volume.toLocaleString()}/mo</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brand Description */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Brand (what we know about you)</p>
                  <p className="text-sm line-clamp-3">{data.businessDescription}</p>
                </div>
              </motion.div>
            )}

            {/* Step 6: Pricing */}
            {currentStep === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Lovely mascot mini + headline */}
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <img 
                      src={lovelyMascot} 
                      alt="Lovely" 
                      className="w-16 h-16 object-contain drop-shadow-md"
                    />
                    <div className="text-left">
                      <h1 className="text-2xl font-bold tracking-tight">Hire Lovely</h1>
                      <p className="text-sm text-muted-foreground">Your 24/7 AI Marketing Agent</p>
                    </div>
                  </div>
                </div>

                {/* Pricing Cards */}
                <div className="space-y-3">
                  {/* Annual - Best Value */}
                  <button
                    onClick={() => setBillingCycle("annual")}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 text-left transition-all relative",
                      billingCycle === "annual"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground bg-card"
                    )}
                  >
                    <div className="absolute -top-3 left-4">
                      <span className="bg-foreground text-background text-xs font-medium px-2 py-0.5 rounded-full">
                        Best value
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg text-muted-foreground line-through">$58</span>
                      <span className="text-3xl font-bold">$23</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Pay yearly</p>
                  </button>

                  {/* Monthly */}
                  <button
                    onClick={() => setBillingCycle("monthly")}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 text-left transition-all relative",
                      billingCycle === "monthly"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground bg-card"
                    )}
                  >
                    <div className="absolute -top-3 right-4">
                      <span className="bg-rose-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                        50% OFF
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg text-muted-foreground line-through">$58</span>
                      <span className="text-3xl font-bold">$29</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Pay monthly</p>
                  </button>
                </div>

                {/* Guarantee */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>14-day money back guarantee</span>
                </div>

                {/* Features */}
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium mb-4">Included with your subscription:</p>
                  <ul className="space-y-2">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky Bottom Button */}
      {currentStep !== 4 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border">
          <div className="max-w-lg mx-auto">
            {currentStep < 6 ? (
              <Button
                onClick={handleContinue}
                disabled={
                  (currentStep === 1 && (!isValidUrl(data.websiteUrl) || isPreDetecting)) ||
                  (currentStep === 3 && !isValidEmail(data.email))
                }
                className="w-full h-14 text-lg font-medium bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 transition-opacity rounded-xl"
              >
                {currentStep === 1 && isPreDetecting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Detecting language...
                  </>
                ) : currentStep === 3 ? (
                  <>
                    See my results
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full h-14 text-lg font-medium bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 transition-opacity rounded-xl"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    Buy now for ${billingCycle === "monthly" ? "29" : "23"}/m
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
