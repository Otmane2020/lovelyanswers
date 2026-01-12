import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  ArrowRight,
  Heart,
  Loader2,
  X,
  Plus,
  Check,
  ChevronDown,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff
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
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { z } from "zod";

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

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp } = useAuth();
  const createProject = useCreateProject();
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isLoadingFast, setIsLoadingFast] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [newAudience, setNewAudience] = useState("");
  const [newCompetitor, setNewCompetitor] = useState("");
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const analysisStartedRef = useRef<string | null>(null);
  
  // Auth step state
  const [showAuthStep, setShowAuthStep] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authErrors, setAuthErrors] = useState<{ email?: string; password?: string }>({});
  
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

  const totalSteps = 7; // Added auth step

  // Check for pending onboarding data (after OAuth redirect)
  useEffect(() => {
    const checkPendingOnboarding = async () => {
      const stored = localStorage.getItem('pendingOnboarding');
      
      if (stored && user) {
        // User just authenticated via OAuth, continue with stored data
        console.log('[ONBOARDING] Resuming after OAuth with stored data');
        const savedData = JSON.parse(stored) as OnboardingData;
        setData(savedData);
        localStorage.removeItem('pendingOnboarding');
        
        // Auto-continue to create project
        setIsAnalyzing(true);
        try {
          await createProjectWithData(savedData);
        } catch (error) {
          console.error('[ONBOARDING] Error creating project after OAuth:', error);
          toast({ title: "Error", description: "Failed to create project.", variant: "destructive" });
          setIsAnalyzing(false);
        }
        return;
      }
      
      // Check if user already has projects
      if (user) {
        const { data: projects } = await supabase
          .from("projects")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (projects && projects.length > 0) {
          navigate("/dashboard", { replace: true });
          return;
        }
      }
      
      setIsCheckingUser(false);
    };

    checkPendingOnboarding();
  }, [user, navigate]);

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const isValidUrl = (url: string): boolean => {
    if (!url || url.length < 3) return false;
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;
    return urlPattern.test(url.trim());
  };

  const analyzeWebsite = useCallback(async (url: string) => {
    if (!url || url.length < 5) return;
    
    setIsLoadingFast(true);
    
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

    const enrichPromise = supabase.functions.invoke('firecrawl-scrape', {
      body: { url }
    }).then(({ data: scrapeResult, error }) => {
      if (!error && scrapeResult?.success) {
        const { audiences: scrapedAudiences, competitors: scrapedCompetitors, keywords: scrapedKeywords } = scrapeResult.data;
        
        console.log('[ONBOARDING] Enrichment data received:', {
          audiences: scrapedAudiences?.length,
          competitors: scrapedCompetitors?.length,
          keywords: scrapedKeywords?.length
        });
        
        setData(prev => ({
          ...prev,
          competitors: prev.competitors.length > 0 ? prev.competitors : (scrapedCompetitors || []),
          keywords: prev.keywords.length > 0 ? prev.keywords : (scrapedKeywords || []),
        }));
      }
    }).catch(err => {
      console.error('[ONBOARDING] Enrichment error:', err);
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
    const url = data.websiteUrl.trim();
    
    const isOwnDomain = url.toLowerCase().includes('lovelyanswers.io') || 
                         url.toLowerCase().includes('lovableproject.com') ||
                         url.toLowerCase().includes('localhost');
    
    if (isValidUrl(url) && !isOwnDomain && analysisStartedRef.current !== url) {
      const timer = setTimeout(() => {
        const currentUrl = data.websiteUrl.trim();
        if (isValidUrl(currentUrl) && currentUrl === url && analysisStartedRef.current !== url) {
          console.log('[ONBOARDING] Auto-triggering analysis for:', url);
          analysisStartedRef.current = url;
          analyzeWebsite(url);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
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
    
    toast({
      title: "Basic analysis complete",
      description: "Please review and refine the auto-filled information.",
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return data.websiteUrl.length > 0 && isValidUrl(data.websiteUrl);
      case 2: return true;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      case 7: return true; // Auth step - handled separately
      default: return false;
    }
  };

  const handleNext = () => {
    if (!validateAndProceed()) return;
    
    if (currentStep < totalSteps) {
      if (currentStep === 2 && !data.language) {
        updateData("language", "en");
      }
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - trigger auth or complete
      if (!data.language) updateData("language", "en");
      handleComplete();
    }
  };

  const createProjectWithData = async (projectData: OnboardingData) => {
    let domain = "";
    try {
      const urlObj = new URL(projectData.websiteUrl.startsWith("http") ? projectData.websiteUrl : `https://${projectData.websiteUrl}`);
      domain = urlObj.hostname.replace("www.", "");
    } catch { domain = projectData.websiteUrl; }
    
    const brandName = domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    
    const newProject = await createProject.mutateAsync({
      name: brandName,
      website_url: projectData.websiteUrl,
      domain: domain,
      language: projectData.language,
      business_description: projectData.businessDescription,
      business_type: "service",
      audience: projectData.targetAudiences.join(", "),
      brand_name: brandName,
      example_url: projectData.exampleUrl || undefined,
      competitors: projectData.competitors,
    });
    
    if (projectData.keywords && projectData.keywords.length > 0) {
      console.log('[ONBOARDING] Saving', projectData.keywords.length, 'keywords to database');
      const keywordsToInsert = projectData.keywords.map(k => ({
        project_id: newProject.id,
        keyword: k.keyword,
        intent: k.intent || 'informational',
        source_url: projectData.websiteUrl,
        is_used: false,
      }));
      
      const { error: keywordsError } = await supabase
        .from('keywords')
        .insert(keywordsToInsert);
      
      if (keywordsError) {
        console.error('Keywords save error:', keywordsError);
      }
    }
    
    try {
      await supabase.functions.invoke('auto-generate-aeo', {
        body: { 
          projectId: newProject.id,
          language: projectData.language 
        }
      });
    } catch (aeoError) {
      console.error('AEO generation error:', aeoError);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    navigate("/checkout");
  };

  const handleComplete = async () => {
    // If not authenticated, show auth step
    if (!user) {
      setShowAuthStep(true);
      return;
    }
    
    // User is authenticated, create project
    setIsAnalyzing(true);
    try {
      await createProjectWithData(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create project.", variant: "destructive" });
      setIsAnalyzing(false);
    }
  };

  const validateAuthForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) newErrors.password = passwordResult.error.errors[0].message;
    setAuthErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAuthForm()) return;
    
    setAuthLoading(true);
    
    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        setAuthLoading(false);
        toast({
          title: "Sign in failed",
          description: error.message === "Invalid login credentials" ? "Invalid email or password." : error.message,
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        setAuthLoading(false);
        let message = error.message;
        if (error.message.includes("already registered")) message = "This email is already registered. Please sign in.";
        toast({ title: "Sign up failed", description: message, variant: "destructive" });
        return;
      }
    }
    
    // Auth successful, create project
    setIsAnalyzing(true);
    setAuthLoading(false);
    
    // Wait a bit for auth state to propagate
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      await createProjectWithData(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create project.", variant: "destructive" });
      setIsAnalyzing(false);
    }
  };

  const handleGoogleAuth = async () => {
    // Store onboarding data before OAuth redirect
    localStorage.setItem('pendingOnboarding', JSON.stringify(data));
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
      },
    });
    
    if (error) {
      localStorage.removeItem('pendingOnboarding');
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      });
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

  // Auth step modal/overlay
  if (showAuthStep) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="container flex h-16 items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
                <Heart className="h-5 w-5 text-white fill-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">Answers</span>
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight">Last step: Create your account</h1>
              <p className="text-muted-foreground mt-2">
                {isLogin ? "Sign in to continue" : "Create an account to start your free trial"}
              </p>
            </div>

            {/* Google OAuth Button */}
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-base font-medium border-primary/20 bg-primary/5 hover:bg-primary/10"
              onClick={handleGoogleAuth}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-muted-foreground">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 h-12 bg-muted/50 border-border"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-muted/50 border-border"
                    required
                  />
                </div>
                {authErrors.email && <p className="text-sm text-destructive">{authErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-muted-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-muted/50 border-border"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {authErrors.password && <p className="text-sm text-destructive">{authErrors.password}</p>}
              </div>

              <Button
                type="submit"
                className="w-full h-12 gap-2 bg-foreground text-background hover:bg-foreground/90 text-base font-medium"
                disabled={authLoading}
              >
                {authLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Sign in" : "Create account"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-medium hover:underline"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>

            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowAuthStep(false)}
            >
              ← Back to onboarding
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
              <Heart className="h-5 w-5 text-white fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">Answers</span>
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
                  {currentStep === 7 && "Final Step"}
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
                      <h1 className="text-3xl font-bold tracking-tight">How did you hear about LovelyAnswers?</h1>
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

                {currentStep === 7 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight">Ready to start!</h1>
                      <p className="text-muted-foreground mt-2">Review your setup and continue to create your account.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Website</span>
                        <span className="font-medium">{data.websiteUrl}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Language</span>
                        <span className="font-medium">{languages.find(l => l.code === data.language)?.name}</span>
                      </div>
                      {data.targetAudiences.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Audiences</span>
                          <span className="font-medium">{data.targetAudiences.length} defined</span>
                        </div>
                      )}
                      {data.competitors.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Competitors</span>
                          <span className="font-medium">{data.competitors.length} added</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <p className="text-sm text-center">
                        🎉 You'll get a <strong>3-day free trial</strong> with full access to all features!
                      </p>
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
              {currentStep === totalSteps ? "Create Account & Continue" : "Continue"}
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
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg animate-pulse">
            <Heart className="h-10 w-10 text-white fill-white" />
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
