import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  ArrowRight,
  Heart,
  Loader2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [urlError, setUrlError] = useState("");
  const analysisStartedRef = useRef<string | null>(null);
  
  // Form data
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  // Analyzed data (stored in sessionStorage for after auth)
  const [analyzedData, setAnalyzedData] = useState({
    language: "en",
    businessDescription: "",
    targetAudiences: [] as string[],
    exampleUrl: "",
  });

  const totalSteps = 2;

  // Check if user already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if user has a project
        const { data: projects } = await supabase
          .from("projects")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        
        if (projects && projects.length > 0) {
          navigate("/dashboard", { replace: true });
        } else {
          // User exists but no project - check if we have URL data saved
          const savedUrl = sessionStorage.getItem("signup_website_url");
          if (savedUrl) {
            // Continue to create project and checkout
            handlePostAuthFlow(user.id, savedUrl);
          } else {
            navigate("/onboarding", { replace: true });
          }
        }
      }
    };
    checkUser();
  }, [navigate]);

  // Validate URL format
  const isValidUrl = (url: string): boolean => {
    if (!url || url.length < 3) return false;
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;
    return urlPattern.test(url.trim());
  };

  // Analyze website
  const analyzeWebsite = useCallback(async (url: string) => {
    if (!url || url.length < 5) return;
    
    setIsAnalyzing(true);
    
    try {
      const { data: fastResult, error } = await supabase.functions.invoke('firecrawl-scrape-fast', {
        body: { url }
      });
      
      if (!error && fastResult?.success) {
        console.log('[SIGNUP] Fast data received:', fastResult.data);
        setAnalyzedData({
          language: fastResult.data.language || "en",
          businessDescription: fastResult.data.description || "",
          targetAudiences: fastResult.data.audiences || [],
          exampleUrl: fastResult.data.sourceUrl || url,
        });
      }
    } catch (err) {
      console.error('[SIGNUP] Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Trigger analysis when URL becomes valid
  useEffect(() => {
    const url = websiteUrl.trim();
    
    const isOwnDomain = url.toLowerCase().includes('lovelyanswers.io') || 
                         url.toLowerCase().includes('lovableproject.com') ||
                         url.toLowerCase().includes('localhost');
    
    if (isValidUrl(url) && !isOwnDomain && analysisStartedRef.current !== url) {
      const timer = setTimeout(() => {
        if (isValidUrl(url) && url === websiteUrl.trim() && analysisStartedRef.current !== url) {
          console.log('[SIGNUP] Auto-triggering analysis for:', url);
          analysisStartedRef.current = url;
          analyzeWebsite(url);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [websiteUrl, analyzeWebsite]);

  const handleUrlChange = (value: string) => {
    setWebsiteUrl(value);
    setUrlError("");
    if (analysisStartedRef.current && !value.includes(analysisStartedRef.current.replace(/^https?:\/\//, '').split('/')[0])) {
      analysisStartedRef.current = null;
    }
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) newErrors.password = passwordResult.error.errors[0].message;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePostAuthFlow = async (userId: string, url: string) => {
    // Create project and go to checkout
    setIsLoading(true);
    
    try {
      // Get saved analyzed data
      const savedData = sessionStorage.getItem("signup_analyzed_data");
      const data = savedData ? JSON.parse(savedData) : analyzedData;
      
      let domain = "";
      try {
        const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
        domain = urlObj.hostname.replace("www.", "");
      } catch { 
        domain = url; 
      }
      
      const brandName = domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      
      // Create project
      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          name: brandName,
          website_url: url,
          domain: domain,
          language: data.language || "en",
          business_description: data.businessDescription || "",
          business_type: "service",
          audience: data.targetAudiences?.join(", ") || "",
          brand_name: brandName,
          is_active: true,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create generation settings
      await supabase.from("generation_settings").insert({
        project_id: newProject.id,
        website_url: url,
        language: data.language || "en",
        business_description: data.businessDescription || "",
      });

      // Create project settings
      await supabase.from("project_settings").insert({
        project_id: newProject.id,
      });
      
      // Auto-generate initial AEO content in background
      supabase.functions.invoke('auto-generate-aeo', {
        body: { projectId: newProject.id, language: data.language || "en" }
      }).catch(console.error);
      
      // Clear session storage
      sessionStorage.removeItem("signup_website_url");
      sessionStorage.removeItem("signup_analyzed_data");
      
      // Redirect to checkout
      navigate("/checkout");
    } catch (error) {
      console.error("Project creation error:", error);
      toast({ 
        title: "Error", 
        description: "Failed to create project. Please try again.", 
        variant: "destructive" 
      });
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    // Save data to sessionStorage before auth
    sessionStorage.setItem("signup_website_url", websiteUrl);
    sessionStorage.setItem("signup_analyzed_data", JSON.stringify(analyzedData));
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    
    if (error) {
      setIsLoading(false);
      let message = error.message;
      if (error.message.includes("already registered")) {
        message = "This email is already registered. Please sign in.";
      }
      toast({ title: "Sign up failed", description: message, variant: "destructive" });
      return;
    }

    if (data.user) {
      // Send welcome email
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            type: "welcome",
            to: email,
            name: fullName || email.split("@")[0],
          },
        });
      } catch (e) {
        console.error("Welcome email error:", e);
      }

      // Continue with project creation and checkout
      await handlePostAuthFlow(data.user.id, websiteUrl);
    }
  };

  const handleGoogleSignUp = async () => {
    // Save data to sessionStorage before OAuth redirect
    sessionStorage.setItem("signup_website_url", websiteUrl);
    sessionStorage.setItem("signup_analyzed_data", JSON.stringify(analyzedData));
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/signup`,
      },
    });
    
    if (error) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!isValidUrl(websiteUrl)) {
        setUrlError("Please enter a valid URL (e.g., example.com)");
        return;
      }
      setCurrentStep(2);
    }
  };

  const canProceedStep1 = isValidUrl(websiteUrl) && !isAnalyzing;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 shadow-lg">
              <Heart className="h-5 w-5 text-white fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">Answers</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  currentStep >= step 
                    ? "bg-primary text-white" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {currentStep > step ? <Check className="h-4 w-4" /> : step}
                </div>
                {step < totalSteps && (
                  <div className={cn(
                    "w-12 h-0.5 transition-colors",
                    currentStep > step ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h1 className="text-3xl font-bold tracking-tight">Enter Your Website</h1>
                  <p className="text-muted-foreground mt-2">
                    We'll analyze your site and create AI-optimized content
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="url"
                      placeholder="example.com"
                      value={websiteUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      className={cn(
                        "h-14 text-lg pl-12 pr-12",
                        urlError && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {isAnalyzing && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary animate-spin" />
                    )}
                    {!isAnalyzing && isValidUrl(websiteUrl) && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                    )}
                  </div>
                  {urlError && <p className="text-sm text-destructive">{urlError}</p>}
                </div>

                <Button
                  onClick={handleNextStep}
                  disabled={!canProceedStep1}
                  className="w-full h-14 gap-2 bg-foreground text-background hover:bg-foreground/90 text-lg font-medium"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h1 className="text-3xl font-bold tracking-tight">Create Your Account</h1>
                  <p className="text-muted-foreground mt-2">
                    Sign up to start your free trial
                  </p>
                </div>

                {/* Google Button */}
                <Button
                  variant="outline"
                  className="w-full h-12 gap-3 text-base font-medium border-primary/20 bg-primary/5 hover:bg-primary/10"
                  onClick={handleGoogleSignUp}
                  disabled={isLoading}
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

                <form onSubmit={handleSignUp} className="space-y-4">
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
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
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
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 gap-2 bg-foreground text-background hover:bg-foreground/90 text-base font-medium"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <button
                  onClick={() => setCurrentStep(1)}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to website URL
                </button>

                <p className="text-center text-xs text-muted-foreground">
                  By creating an account, you agree to our{" "}
                  <Link to="/terms" className="text-primary hover:underline">Terms</Link>
                  {" "}and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
