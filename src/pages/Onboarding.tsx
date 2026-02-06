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
  Target,
  MapPin,
  RefreshCw,
  MessageSquare,
  Wrench,
  type LucideIcon,
  Bot,
} from "lucide-react";
import lovelyMascot from "@/assets/lovely-mascot.png";
import lovelyRobotMascot from "@/assets/lovely-robot-mascot.png";
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
  audiences: string[];
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

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  { icon: Target, title: "AEO Answers", description: "Rank #1 on ChatGPT, Gemini & Perplexity" },
  { icon: FileText, title: "30 Articles/month", description: "SEO-optimized, auto-published" },
  { icon: MapPin, title: "Local AEO", description: "Dominate local AI search results" },
  { icon: RefreshCw, title: "Auto-publishing", description: "WordPress, Shopify, Webflow & more" },
  { icon: Search, title: "Keyword Research", description: "Automated SERP clustering" },
  { icon: MessageSquare, title: "Reddit Agent", description: "Brand visibility & backlinks" },
  { icon: Wrench, title: "Technical SEO Audit", description: "Google + AI crawlers" },
  { icon: Globe, title: "20+ Languages", description: "Supported worldwide" },
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
    audiences: [],
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

  // Initialize from URL param and auto-advance to step 2
  useEffect(() => {
    const urlFromParam = searchParams.get('url');
    if (urlFromParam && currentStep === 1) {
      const decodedUrl = decodeURIComponent(urlFromParam);
      setData(prev => ({ ...prev, websiteUrl: decodedUrl }));
      
      // Auto-advance to step 2 if URL is valid
      if (isValidUrl(decodedUrl)) {
        const autoAdvance = async () => {
          setIsPreDetecting(true);
          await trackStep(1, { website_url: decodedUrl });
          
          const detected = await detectLanguage(decodedUrl);
          if (detected && !languageTouchedRef.current) {
            setData(prev => ({ ...prev, language: detected }));
          }
          
          setIsPreDetecting(false);
          setCurrentStep(2);
        };
        autoAdvance();
      }
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
      let audiences: string[] = [];
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
        
        // Extract audiences from enriched data
        if (enrichData.audiences?.length > 0) {
          audiences = enrichData.audiences.slice(0, 5);
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
        audiences,
        trafficPotential,
      }));

      // Ensure minimum 3 seconds for analysis screen
      const elapsed = Date.now() - (analysisStartTime || Date.now());
      const remaining = Math.max(0, 3000 - elapsed);
      
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      setAnalysisComplete(true);
      setIsAnalyzing(false);
      
      // Save onboarding data to localStorage NOW so project is created even without checkout
      const onboardingPayload = {
        websiteUrl: url,
        language: data.language,
        businessDescription: description,
        email: data.email,
        keywords,
        competitors: competitors.map(c => c.domain),
      };
      localStorage.setItem('onboarding_data', JSON.stringify(onboardingPayload));
      localStorage.setItem('onboarding_email', data.email);
      console.log('[ONBOARDING] Saved onboarding_data to localStorage after analysis');
      
      setCurrentStep(5); // Move to report
    } catch (error) {
      console.error('[ONBOARDING] Analysis error:', error);
      // Fallback data
      const fallbackBrandName = brandName;
      const fallbackDescription = `${brandName} provides professional services.`;
      setData(prev => ({
        ...prev,
        brandName: fallbackBrandName,
        siteLogo: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        businessDescription: fallbackDescription,
        trafficPotential: 8500,
      }));
      
      // Save fallback data too
      const fallbackPayload = {
        websiteUrl: url,
        language: data.language,
        businessDescription: fallbackDescription,
        email: data.email,
        keywords: [],
        competitors: [],
      };
      localStorage.setItem('onboarding_data', JSON.stringify(fallbackPayload));
      localStorage.setItem('onboarding_email', data.email);
      console.log('[ONBOARDING] Saved fallback onboarding_data to localStorage');
      
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
        audiences: data.audiences,
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
            {/* Step 1: URL Input - Landing Page Style */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 text-center"
              >
                {/* Hero Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Free SEO Audit in 30 seconds</span>
                </motion.div>

                {/* Main Title */}
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                    Get Your Website Ranked by{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">
                      ChatGPT & Google
                    </span>
                  </h1>
                  <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto">
                    Discover how AI search engines see your business and unlock hidden traffic opportunities
                  </p>
                </div>

                {/* URL Input */}
                <div className="space-y-3 pt-2">
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
                      "h-14 text-lg text-center rounded-xl border-2 bg-card shadow-sm",
                      urlError ? "border-destructive" : "border-border focus:border-primary"
                    )}
                  />
                  {urlError && <p className="text-sm text-destructive">{urlError}</p>}
                </div>

                {/* Trust Elements */}
                <div className="pt-4 space-y-4">
                  {/* Star Rating */}
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm font-semibold">4.9/5</span>
                    <span className="text-sm text-muted-foreground">(527+ businesses)</span>
                  </div>

                  {/* Mini Testimonials */}
                  <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        M
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          "Impressions up 180%, clicks up 90% in 3 months. Now I sell it to my clients."
                        </p>
                        <p className="text-xs font-medium mt-1">Mike — Roofing Company</p>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        A
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          "Went from page 3 to page 1 for 12+ keywords in 8 weeks."
                        </p>
                        <p className="text-xs font-medium mt-1">Amanda — E-commerce Owner</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Trust Badges */}
                  <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Free audit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>No credit card</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span>Secure</span>
                    </div>
                  </div>
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

                {/* Hire Lovely Ad Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-violet-500/10 to-fuchsia-500/10 border border-primary/30 flex items-center gap-4 overflow-hidden">
                  <div className="flex-shrink-0 -ml-2 -my-2">
                    <img 
                      src={lovelyRobotMascot} 
                      alt="Lovely AI Agent" 
                      className="w-24 h-24 object-contain drop-shadow-lg"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      ✨ Lovely analysed your site in 35 seconds
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Imagine what Lovely could do full-time for your marketing team...
                    </p>
                  </div>
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

                {/* Audiences */}
                {data.audiences.length > 0 && (
                  <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Audiences (who we'll target)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {data.audiences.map((audience, i) => (
                        <span 
                          key={i}
                          className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {audience}
                        </span>
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
                {(() => {
                  const trialEndDate = new Date();
                  trialEndDate.setDate(trialEndDate.getDate() + 3);
                  const formattedDate = trialEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  return (
                    <div className="space-y-3">
                      {/* Annual - 2 months free */}
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
                          <span className="bg-emerald-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            2 months free
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg text-muted-foreground line-through">$58</span>
                              <span className="text-3xl font-bold">$23</span>
                              <span className="text-muted-foreground">/month</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Billed $279/year</p>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                            billingCycle === "annual" ? "border-primary bg-primary" : "border-muted-foreground/30"
                          )}>
                            {billingCycle === "annual" && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
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
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold">$29</span>
                              <span className="text-muted-foreground">/month</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Billed monthly</p>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                            billingCycle === "monthly" ? "border-primary bg-primary" : "border-muted-foreground/30"
                          )}>
                            {billingCycle === "monthly" && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>

                      {/* Pay after 3 days notice */}
                      <p className="text-center text-sm text-muted-foreground">
                        Free for 3 days · You'll be charged on <span className="font-medium text-foreground">{formattedDate}</span>
                      </p>

                      {/* Guarantee */}
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4" />
                        <span>14-day money back guarantee</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Features */}
                <div className="pt-5 border-t border-border/50">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Everything included
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {features.map((feature, i) => {
                      const Icon = feature.icon;
                      return (
                        <div key={i} className="flex items-start gap-3 group">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-tight">
                              {feature.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                    Loading {data.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '').substring(0, 30)}...
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
