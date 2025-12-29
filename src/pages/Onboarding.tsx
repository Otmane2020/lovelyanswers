import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  Languages, 
  Building2, 
  Users, 
  Palette,
  ArrowRight,
  ArrowLeft,
  Check,
  Rocket,
  Loader2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useCreateProject } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";

interface OnboardingData {
  websiteUrl: string;
  language: string;
  businessDescription: string;
  businessType: string;
  audience: string;
  competitors: string[];
  brandName: string;
  exampleUrl: string;
}

const steps = [
  { id: 1, title: "Website", icon: Globe },
  { id: 2, title: "Language", icon: Languages },
  { id: 3, title: "Business", icon: Building2 },
  { id: 4, title: "Competitors", icon: Users },
  { id: 5, title: "Brand", icon: Palette },
];

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
];

const businessTypes = [
  { value: "ecommerce", label: "E-commerce", description: "Online store selling products" },
  { value: "saas", label: "SaaS", description: "Software as a Service" },
  { value: "blog", label: "Blog / Media", description: "Content-focused website" },
  { value: "service", label: "Service", description: "Professional services" },
  { value: "local", label: "Local Business", description: "Physical location business" },
];

const audienceTypes = [
  { value: "b2c", label: "B2C", description: "Consumers" },
  { value: "b2b", label: "B2B", description: "Businesses" },
  { value: "both", label: "Both", description: "Mixed audience" },
];

// Competitor suggestions based on business type
const competitorSuggestions: Record<string, string[]> = {
  ecommerce: ["amazon.com", "shopify.com", "etsy.com"],
  saas: ["hubspot.com", "salesforce.com", "zendesk.com"],
  blog: ["medium.com", "substack.com", "wordpress.com"],
  service: ["fiverr.com", "upwork.com", "thumbtack.com"],
  local: ["yelp.com", "tripadvisor.com", "google.com/maps"],
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createProject = useCreateProject();
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    websiteUrl: "",
    language: "",
    businessDescription: "",
    businessType: "",
    audience: "",
    competitors: ["", "", ""],
    brandName: "",
    exampleUrl: "",
  });

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updateCompetitor = (index: number, value: string) => {
    const newCompetitors = [...data.competitors];
    newCompetitors[index] = value;
    updateData("competitors", newCompetitors);
  };

  // Auto-analyze website when URL changes (debounced)
  const analyzeWebsite = useCallback(async (url: string) => {
    if (!url || url.length < 5) return;
    
    setIsAutoFilling(true);
    
    // Simulate fast API call (1 second)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Extract domain from URL for brand name
    let domain = "";
    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      domain = urlObj.hostname.replace("www.", "");
    } catch {
      domain = url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
    }
    
    // Generate brand name from domain
    const brandName = domain
      .split(".")[0]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    
    // Auto-detect language (simulate based on TLD)
    let detectedLanguage = "en";
    if (domain.endsWith(".fr")) detectedLanguage = "fr";
    else if (domain.endsWith(".de")) detectedLanguage = "de";
    else if (domain.endsWith(".es")) detectedLanguage = "es";
    else if (domain.endsWith(".it")) detectedLanguage = "it";
    else if (domain.endsWith(".pt") || domain.endsWith(".br")) detectedLanguage = "pt";
    
    // Detect business type from keywords in domain
    let detectedType = "saas";
    const lowerDomain = domain.toLowerCase();
    if (lowerDomain.includes("shop") || lowerDomain.includes("store") || lowerDomain.includes("boutique") || lowerDomain.includes("buy")) {
      detectedType = "ecommerce";
    } else if (lowerDomain.includes("blog") || lowerDomain.includes("news") || lowerDomain.includes("media") || lowerDomain.includes("magazine")) {
      detectedType = "blog";
    } else if (lowerDomain.includes("app") || lowerDomain.includes("cloud") || lowerDomain.includes("io") || lowerDomain.includes("webify")) {
      detectedType = "saas";
    } else if (lowerDomain.includes("agency") || lowerDomain.includes("consulting") || lowerDomain.includes("studio")) {
      detectedType = "service";
    }
    
    // Generate description based on brand and type
    const descriptions: Record<string, string> = {
      ecommerce: `${brandName} is a premium e-commerce platform offering high-quality products with fast delivery and excellent customer service.`,
      saas: `${brandName} is an innovative SaaS solution that helps businesses streamline their workflows and boost productivity.`,
      blog: `${brandName} is a leading content platform providing valuable insights, news, and expert articles for its audience.`,
      service: `${brandName} offers professional services with a focus on quality, reliability, and customer satisfaction.`,
      local: `${brandName} is a trusted local business serving the community with dedication and expertise.`,
    };
    
    // Get suggested competitors
    const suggestedCompetitors = competitorSuggestions[detectedType] || ["competitor1.com", "competitor2.com", "competitor3.com"];
    
    // Auto-fill all the data
    setData(prev => ({
      ...prev,
      language: detectedLanguage,
      brandName: brandName,
      businessType: detectedType,
      businessDescription: descriptions[detectedType],
      audience: detectedType === "saas" || detectedType === "service" ? "b2b" : "b2c",
      competitors: suggestedCompetitors,
      exampleUrl: `https://${domain}/about`,
    }));
    
    setIsAutoFilling(false);
    setHasAnalyzed(true);
    
    toast({
      title: "Site analysé !",
      description: "Tous les champs ont été pré-remplis. Vous pouvez les modifier.",
    });
  }, [toast]);

  // Debounced auto-analyze when URL changes
  useEffect(() => {
    if (data.websiteUrl.length < 5 || hasAnalyzed) return;
    
    const timer = setTimeout(() => {
      analyzeWebsite(data.websiteUrl);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [data.websiteUrl, analyzeWebsite, hasAnalyzed]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.websiteUrl.length > 0 && !isAutoFilling;
      case 2:
        return data.language.length > 0;
      case 3:
        return data.businessDescription.length > 0 && data.businessType.length > 0;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsAnalyzing(true);
    
    try {
      let domain = "";
      try {
        const urlObj = new URL(data.websiteUrl.startsWith("http") ? data.websiteUrl : `https://${data.websiteUrl}`);
        domain = urlObj.hostname.replace("www.", "");
      } catch {
        domain = data.websiteUrl;
      }
      
      await createProject.mutateAsync({
        name: data.brandName || domain,
        website_url: data.websiteUrl,
        domain: domain,
        language: data.language,
        business_description: data.businessDescription,
        business_type: data.businessType,
        audience: data.audience,
        brand_name: data.brandName,
        example_url: data.exampleUrl || undefined,
        competitors: data.competitors.filter(c => c.length > 0),
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Erreur",
        description: "Échec de la création du projet. Veuillez réessayer.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WebsiteStep data={data} updateData={updateData} isAutoFilling={isAutoFilling} />;
      case 2:
        return <LanguageStep data={data} updateData={updateData} />;
      case 3:
        return <BusinessStep data={data} updateData={updateData} />;
      case 4:
        return <CompetitorsStep data={data} updateCompetitor={updateCompetitor} />;
      case 5:
        return <BrandStep data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  if (isAnalyzing) {
    return <AnalyzingScreen websiteUrl={data.websiteUrl} />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Progress */}
      <div className="hidden lg:flex w-80 border-r border-border bg-card/50 flex-col p-8">
        <div className="flex items-center gap-2 mb-12">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-bg shadow-glow-sm">
            <Rocket className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Aeo<span className="gradient-text">reply</span>
          </span>
        </div>

        <nav className="space-y-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/10 text-primary",
                  isCompleted && "text-muted-foreground",
                  !isActive && !isCompleted && "text-muted-foreground/50"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-primary/20 text-primary",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {index === 3 || index === 4 ? "Optionnel" : "Requis"}
                  </p>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto">
          <p className="text-xs text-muted-foreground">Étape {currentStep} sur {steps.length}</p>
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full gradient-bg transition-all duration-300" style={{ width: `${(currentStep / steps.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="flex-1 flex flex-col">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-bg">
              <Rocket className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Aeoreply</span>
          </div>
          <span className="text-sm text-muted-foreground">{currentStep}/{steps.length}</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="border-t border-border p-6">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <Button variant="ghost" onClick={handleBack} disabled={currentStep === 1} className="gap-2">
              <ArrowLeft className="h-4 w-4" />Retour
            </Button>
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2 gradient-bg text-primary-foreground hover:opacity-90">
              {currentStep === 5 ? "Terminer" : "Continuer"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebsiteStep({ data, updateData, isAutoFilling }: { data: OnboardingData; updateData: (field: keyof OnboardingData, value: any) => void; isAutoFilling: boolean }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Quel est votre site web ?</h1>
        <p className="text-muted-foreground">Entrez l'URL de votre site pour une analyse automatique.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="website">URL du site</Label>
          <div className="relative">
            <Input
              id="website"
              type="url"
              placeholder="https://example.com"
              value={data.websiteUrl}
              onChange={(e) => updateData("websiteUrl", e.target.value)}
              className="h-12 text-lg pr-12"
            />
            {isAutoFilling && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>
        </div>

        {isAutoFilling && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-primary/5 border border-primary/20"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <div>
                <p className="font-medium text-primary">Analyse en cours...</p>
                <p className="text-sm text-muted-foreground">Détection automatique de la langue, du type de business et des concurrents.</p>
              </div>
            </div>
          </motion.div>
        )}

        {!isAutoFilling && data.websiteUrl && (
          <div className="p-4 rounded-xl bg-accent/50 border border-border">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Analyse automatique :</span> L'URL sera analysée automatiquement pour pré-remplir tous les champs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LanguageStep({ data, updateData }: { data: OnboardingData; updateData: (field: keyof OnboardingData, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Langue du contenu</h1>
        <p className="text-muted-foreground">Langue principale pour vos réponses optimisées IA.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {languages.map((lang) => (
          <button key={lang.code} onClick={() => updateData("language", lang.code)}
            className={cn("flex items-center gap-3 p-4 rounded-xl border transition-all duration-200",
              data.language === lang.code ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-accent")}>
            <span className="text-2xl">{lang.flag}</span>
            <span className="font-medium">{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BusinessStep({ data, updateData }: { data: OnboardingData; updateData: (field: keyof OnboardingData, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Décrivez votre business</h1>
        <p className="text-muted-foreground">Aidez les IA à comprendre votre activité.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">Description courte</Label>
          <Textarea id="description" placeholder="Nous vendons des produits cosmétiques bio..." value={data.businessDescription} onChange={(e) => updateData("businessDescription", e.target.value)} className="min-h-[100px] resize-none" />
        </div>
        <div className="space-y-2">
          <Label>Type de business</Label>
          <div className="grid grid-cols-1 gap-2">
            {businessTypes.map((type) => (
              <button key={type.value} onClick={() => updateData("businessType", type.value)}
                className={cn("flex items-center justify-between p-3 rounded-xl border transition-all duration-200 text-left",
                  data.businessType === type.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50")}>
                <div><p className="font-medium">{type.label}</p><p className="text-xs text-muted-foreground">{type.description}</p></div>
                {data.businessType === type.value && <Check className="h-5 w-5 text-primary" />}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Audience cible</Label>
          <RadioGroup value={data.audience} onValueChange={(value) => updateData("audience", value)} className="flex gap-4">
            {audienceTypes.map((type) => (
              <label key={type.value} className={cn("flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                data.audience === type.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50")}>
                <RadioGroupItem value={type.value} />
                <div><p className="font-medium text-sm">{type.label}</p><p className="text-xs text-muted-foreground">{type.description}</p></div>
              </label>
            ))}
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}

function CompetitorsStep({ data, updateCompetitor }: { data: OnboardingData; updateCompetitor: (index: number, value: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Concurrents</h1>
          <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">Optionnel</span>
        </div>
        <p className="text-muted-foreground">Identifiez les réponses manquantes par rapport à vos concurrents.</p>
      </div>
      <div className="space-y-3">
        {data.competitors.map((competitor, index) => (
          <div key={index} className="space-y-1">
            <Label htmlFor={`competitor-${index}`}>Concurrent {index + 1}</Label>
            <Input id={`competitor-${index}`} type="url" placeholder="https://concurrent.com" value={competitor} onChange={(e) => updateCompetitor(index, e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BrandStep({ data, updateData }: { data: OnboardingData; updateData: (field: keyof OnboardingData, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Identité de marque</h1>
          <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">Optionnel</span>
        </div>
        <p className="text-muted-foreground">Personnalisez le ton de vos réponses générées.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="brand">Nom de marque</Label>
          <Input id="brand" placeholder="Acme Inc." value={data.brandName} onChange={(e) => updateData("brandName", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="example">URL d'exemple de contenu</Label>
          <Input id="example" type="url" placeholder="https://example.com/blog/article" value={data.exampleUrl} onChange={(e) => updateData("exampleUrl", e.target.value)} />
          <p className="text-xs text-muted-foreground">Partagez un article qui représente le ton de votre marque.</p>
        </div>
      </div>
    </div>
  );
}

function AnalyzingScreen({ websiteUrl }: { websiteUrl: string }) {
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState("Connexion au site...");
  const tasks = ["Connexion au site...", "Scan de la structure...", "Extraction des topics...", "Identification des opportunités...", "Génération des réponses...", "Préparation du dashboard..."];

  useEffect(() => {
    let taskIndex = 0;
    const interval = setInterval(() => {
      taskIndex++;
      if (taskIndex < tasks.length) {
        setCurrentTask(tasks[taskIndex]);
        setProgress((taskIndex / tasks.length) * 100);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl gradient-bg flex items-center justify-center shadow-glow animate-pulse">
              <Rocket className="h-10 w-10 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border-2 border-primary flex items-center justify-center">
              <Loader2 className="h-3 w-3 text-primary animate-spin" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Analyse de votre site</h1>
          <p className="text-muted-foreground text-sm">{websiteUrl}</p>
        </div>
        <div className="space-y-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full gradient-bg" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />{currentTask}
          </p>
        </div>
      </div>
    </div>
  );
}
