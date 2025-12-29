import { useState } from "react";
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
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

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

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.websiteUrl.length > 0;
      case 2:
        return data.language.length > 0;
      case 3:
        return data.businessDescription.length > 0 && data.businessType.length > 0;
      case 4:
        return true; // Optional step
      case 5:
        return true; // Optional step
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
    // Simulate analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    navigate("/dashboard");
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WebsiteStep data={data} updateData={updateData} />;
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
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {index === 3 || index === 4 ? "Optional" : "Required"}
                  </p>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto">
          <p className="text-xs text-muted-foreground">
            Step {currentStep} of {steps.length}
          </p>
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full gradient-bg transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-bg">
            <Rocket className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Aeoreply</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {currentStep}/{steps.length}
          </span>
        </div>

        {/* Step Content */}
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

        {/* Footer Navigation */}
        <div className="border-t border-border p-6">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2 gradient-bg text-primary-foreground hover:opacity-90"
            >
              {currentStep === 5 ? "Complete Setup" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step Components
function WebsiteStep({ data, updateData }: { data: OnboardingData; updateData: (field: keyof OnboardingData, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">What's your website?</h1>
        <p className="text-muted-foreground">
          Enter your website URL to analyze how AI assistants understand your content.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="website">Website URL</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://example.com"
            value={data.websiteUrl}
            onChange={(e) => updateData("websiteUrl", e.target.value)}
            className="h-12 text-lg"
          />
        </div>

        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">
            <span className="text-primary font-medium">What we'll analyze:</span>
            <br />
            • Your existing content structure
            <br />
            • Topics AI assistants can cite
            <br />
            • Missing answer opportunities
          </p>
        </div>
      </div>
    </div>
  );
}

function LanguageStep({ data, updateData }: { data: OnboardingData; updateData: (field: keyof OnboardingData, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Content language</h1>
        <p className="text-muted-foreground">
          Select the primary language for your AI-optimized answers.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => updateData("language", lang.code)}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border transition-all duration-200",
              data.language === lang.code
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-accent"
            )}
          >
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
        <h1 className="text-3xl font-bold">Describe your business</h1>
        <p className="text-muted-foreground">
          Help AI assistants understand what you do and for whom.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">Short description</Label>
          <Textarea
            id="description"
            placeholder="We sell premium organic skincare products for sensitive skin..."
            value={data.businessDescription}
            onChange={(e) => updateData("businessDescription", e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label>Business type</Label>
          <div className="grid grid-cols-1 gap-2">
            {businessTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => updateData("businessType", type.value)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all duration-200 text-left",
                  data.businessType === type.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div>
                  <p className="font-medium">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
                {data.businessType === type.value && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Target audience</Label>
          <RadioGroup
            value={data.audience}
            onValueChange={(value) => updateData("audience", value)}
            className="flex gap-4"
          >
            {audienceTypes.map((type) => (
              <label
                key={type.value}
                className={cn(
                  "flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                  data.audience === type.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={type.value} />
                <div>
                  <p className="font-medium text-sm">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
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
          <h1 className="text-3xl font-bold">Competitors</h1>
          <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">Optional</span>
        </div>
        <p className="text-muted-foreground">
          Identify missing answers compared to your competitors.
        </p>
      </div>

      <div className="space-y-3">
        {data.competitors.map((competitor, index) => (
          <div key={index} className="space-y-1">
            <Label htmlFor={`competitor-${index}`}>Competitor {index + 1}</Label>
            <Input
              id={`competitor-${index}`}
              type="url"
              placeholder="https://competitor.com"
              value={competitor}
              onChange={(e) => updateCompetitor(index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-accent/50 border border-border">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Why add competitors?</span>
          <br />
          We'll analyze which questions they answer that you don't, helping you find untapped AI citation opportunities.
        </p>
      </div>
    </div>
  );
}

function BrandStep({ data, updateData }: { data: OnboardingData; updateData: (field: keyof OnboardingData, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Brand identity</h1>
          <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">Optional</span>
        </div>
        <p className="text-muted-foreground">
          Help us match your brand's voice in generated answers.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="brand">Brand name</Label>
          <Input
            id="brand"
            placeholder="Acme Inc."
            value={data.brandName}
            onChange={(e) => updateData("brandName", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="example">Example content URL (optional)</Label>
          <Input
            id="example"
            type="url"
            placeholder="https://example.com/blog/sample-article"
            value={data.exampleUrl}
            onChange={(e) => updateData("exampleUrl", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Share an article that represents your brand's tone and style.
          </p>
        </div>
      </div>
    </div>
  );
}

function AnalyzingScreen({ websiteUrl }: { websiteUrl: string }) {
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState("Connecting to website...");

  const tasks = [
    "Connecting to website...",
    "Scanning page structure...",
    "Extracting topics and entities...",
    "Identifying AI answer opportunities...",
    "Generating initial answers...",
    "Preparing your dashboard...",
  ];

  useState(() => {
    let taskIndex = 0;
    const interval = setInterval(() => {
      taskIndex++;
      if (taskIndex < tasks.length) {
        setCurrentTask(tasks[taskIndex]);
        setProgress((taskIndex / tasks.length) * 100);
      }
    }, 500);

    return () => clearInterval(interval);
  });

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
          <h1 className="text-2xl font-bold">Analyzing your website</h1>
          <p className="text-muted-foreground text-sm">
            {websiteUrl}
          </p>
        </div>

        <div className="space-y-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-bg"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {currentTask}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">
            We're identifying how AI assistants like ChatGPT, Gemini, and Claude can cite your content.
          </p>
        </div>
      </div>
    </div>
  );
}
