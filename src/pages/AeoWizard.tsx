import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, ArrowRight, Globe, FileText, Loader2, Check, Rocket, Search, Users, Swords, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { AnimatedLogo } from "@/components/AnimatedLogo";

interface AnalyzedKeyword {
  keyword: string;
  intent: string;
}

export default function AeoWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createProject = useCreateProject();
  
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [analyzedKeywords, setAnalyzedKeywords] = useState<AnalyzedKeyword[]>([]);
  const [analyzedCompetitors, setAnalyzedCompetitors] = useState<string[]>([]);
  const [analyzedAudiences, setAnalyzedAudiences] = useState<string[]>([]);
  const [data, setData] = useState({
    websiteUrl: "",
    language: "en",
    businessDescription: "",
  });

  // Force light theme
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // Check if user already has a project - redirect to dashboard
  useEffect(() => {
    const checkExistingProject = async () => {
      if (!user) return;
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (projects && projects.length > 0) {
        navigate("/dashboard", { replace: true });
      }
    };
    checkExistingProject();
  }, [user, navigate]);

  const isValidUrl = (url: string) => {
    try {
      const urlToTest = url.startsWith("http") ? url : `https://${url}`;
      new URL(urlToTest);
      return true;
    } catch {
      return false;
    }
  };

  const analyzeWebsite = async () => {
    if (!isValidUrl(data.websiteUrl)) {
      toast.error("Please enter a valid URL");
      return;
    }
    setIsAnalyzing(true);
    try {
      const urlToAnalyze = data.websiteUrl.startsWith("http") ? data.websiteUrl : `https://${data.websiteUrl}`;
      const { data: result, error } = await supabase.functions.invoke("analyze-website", {
        body: { url: urlToAnalyze },
      });
      if (error) throw error;
      if (result?.description) {
        setData(prev => ({ ...prev, businessDescription: result.description, language: result.language || "en" }));
      }
      if (result?.keywords && Array.isArray(result.keywords)) {
        setAnalyzedKeywords(result.keywords.map((k: any) => typeof k === "string" ? { keyword: k, intent: "informational" } : k));
      }
      if (result?.competitors) setAnalyzedCompetitors(result.competitors);
      if (result?.targetAudiences) setAnalyzedAudiences(result.targetAudiences);
      setStep(2);
    } catch (error) {
      console.error("Analysis error:", error);
      setStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setIsCreating(true);
    try {
      const urlToSave = data.websiteUrl.startsWith("http") ? data.websiteUrl : `https://${data.websiteUrl}`;
      const domain = new URL(urlToSave).hostname.replace("www.", "");
      const project = await createProject.mutateAsync({
        name: domain,
        website_url: urlToSave,
        language: data.language,
        business_description: data.businessDescription,
        competitors: analyzedCompetitors.length > 0 ? analyzedCompetitors : undefined,
        audience: analyzedAudiences.length > 0 ? analyzedAudiences.join(", ") : undefined,
      });
      if (analyzedKeywords.length > 0 && project?.id) {
        const keywordRows = analyzedKeywords.map((k) => ({
          project_id: project.id,
          keyword: k.keyword,
          intent: k.intent || "informational",
          is_used: false,
        }));
        await supabase.from("keywords").insert(keywordRows);
      }
      if (project?.id) {
        supabase.functions.invoke('generate-30-days-content', {
          body: { projectId: project.id, language: data.language, days: 30, questionsPerDay: 1, titlesOnly: true }
        }).catch(err => console.error('[WIZARD] Title generation error:', err));
      }
      toast.success("Project created! Your 30-day content plan is generating 💜");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const canProceedStep1 = data.websiteUrl.length > 0 && isValidUrl(data.websiteUrl);
  const canProceedStep2 = data.businessDescription.length > 10;
  const hasDetectedData = analyzedKeywords.length > 0 || analyzedCompetitors.length > 0 || analyzedAudiences.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 pt-6 pb-2 px-4">
        <AnimatedLogo size="sm" />
        <span className="text-lg font-bold tracking-tight text-foreground">
          Lovely<span className="text-primary">Answers</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-primary" />
          <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Step {step} of 2
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-5 sm:px-8 pb-6 max-w-lg mx-auto w-full">
        {step === 1 && (
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">What's your website?</h2>
              <p className="text-sm text-muted-foreground">
                We'll analyze it to detect keywords, audiences & competitors
              </p>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="example.com"
                value={data.websiteUrl}
                onChange={(e) => setData({ ...data, websiteUrl: e.target.value })}
                className="text-center text-base h-12 rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && canProceedStep1 && analyzeWebsite()}
              />

              <Button
                onClick={analyzeWebsite}
                disabled={!canProceedStep1 || isAnalyzing}
                className="w-full h-12 rounded-xl text-base"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span>Free to start</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span>No card required</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col space-y-5 pt-2">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Confirm your business</h2>
              <p className="text-sm text-muted-foreground">
                We'll generate 30 days of content for you
              </p>
            </div>

            {/* Detected data */}
            {hasDetectedData && (
              <div className="space-y-3">
                {/* Keywords */}
                {analyzedKeywords.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Search className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{analyzedKeywords.length} keywords</p>
                        <p className="text-[11px] text-muted-foreground">Ready for content generation</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {analyzedKeywords.slice(0, 6).map((kw, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border text-[11px] text-foreground">
                          <TrendingUp className="w-2.5 h-2.5 text-primary flex-shrink-0" />
                          <span className="truncate max-w-[120px]">{kw.keyword}</span>
                        </span>
                      ))}
                      {analyzedKeywords.length > 6 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-[11px] text-primary font-medium">
                          +{analyzedKeywords.length - 6}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Competitors & Audiences */}
                <div className="grid grid-cols-2 gap-2.5">
                  {analyzedCompetitors.length > 0 && (
                    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                          <Swords className="w-3.5 h-3.5 text-orange-600" />
                        </div>
                        <p className="text-sm font-medium text-foreground">{analyzedCompetitors.length}</p>
                      </div>
                      <div className="space-y-0.5">
                        {analyzedCompetitors.slice(0, 3).map((comp, i) => (
                          <p key={i} className="text-[11px] text-muted-foreground truncate">• {comp}</p>
                        ))}
                        {analyzedCompetitors.length > 3 && (
                          <p className="text-[11px] text-primary font-medium">+{analyzedCompetitors.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  )}
                  {analyzedAudiences.length > 0 && (
                    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                          <Users className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <p className="text-sm font-medium text-foreground">{analyzedAudiences.length}</p>
                      </div>
                      <div className="space-y-0.5">
                        {analyzedAudiences.slice(0, 3).map((aud, i) => (
                          <p key={i} className="text-[11px] text-muted-foreground truncate">• {aud}</p>
                        ))}
                        {analyzedAudiences.length > 3 && (
                          <p className="text-[11px] text-primary font-medium">+{analyzedAudiences.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Business description */}
            <Textarea
              placeholder="We help businesses grow their online presence through..."
              value={data.businessDescription}
              onChange={(e) => setData({ ...data, businessDescription: e.target.value })}
              className="min-h-[100px] resize-none rounded-xl text-sm"
            />

            {/* Actions - sticky bottom on mobile */}
            <div className="flex gap-2.5 mt-auto pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 h-12 rounded-xl"
              >
                Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!canProceedStep2 || isCreating}
                className="flex-1 h-12 rounded-xl"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Launch
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
