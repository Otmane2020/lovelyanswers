import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight, Globe, FileText, Loader2, Check, Rocket, Search, Users, Swords, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

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
      const urlToAnalyze = data.websiteUrl.startsWith("http") 
        ? data.websiteUrl 
        : `https://${data.websiteUrl}`;

      const { data: result, error } = await supabase.functions.invoke("analyze-website", {
        body: { url: urlToAnalyze },
      });

      if (error) throw error;

      if (result?.description) {
        setData(prev => ({
          ...prev,
          businessDescription: result.description,
          language: result.language || "en",
        }));
      }
      
      if (result?.keywords && Array.isArray(result.keywords)) {
        setAnalyzedKeywords(result.keywords.map((k: any) => 
          typeof k === "string" ? { keyword: k, intent: "informational" } : k
        ));
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
      const urlToSave = data.websiteUrl.startsWith("http") 
        ? data.websiteUrl 
        : `https://${data.websiteUrl}`;
      
      const domain = new URL(urlToSave).hostname.replace("www.", "");

      const project = await createProject.mutateAsync({
        name: domain,
        website_url: urlToSave,
        language: data.language,
        business_description: data.businessDescription,
        competitors: analyzedCompetitors.length > 0 ? analyzedCompetitors : undefined,
        audience: analyzedAudiences.length > 0 ? analyzedAudiences.join(", ") : undefined,
      });

      // Auto-insert keywords extracted from website analysis
      if (analyzedKeywords.length > 0 && project?.id) {
        const keywordRows = analyzedKeywords.map((k) => ({
          project_id: project.id,
          keyword: k.keyword,
          intent: k.intent || "informational",
          is_used: false,
        }));
        
        await supabase.from("keywords").insert(keywordRows);
      }

      // Generate 30 days of TITLES ONLY (no content) - fast, no AI content generation
      if (project?.id) {
        supabase.functions.invoke('generate-30-days-content', {
          body: { 
            projectId: project.id,
            language: data.language,
            days: 30,
            questionsPerDay: 1,
            titlesOnly: true,
          }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            LovelyAnswers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Set up your project</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-3 h-3 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`w-16 h-1 rounded ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          <div className={`w-3 h-3 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>

        <Card className="p-8 border-primary/20 shadow-xl">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-7 h-7 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">What's your website?</h2>
                <p className="text-muted-foreground text-sm">
                  We'll analyze it to detect keywords, audiences & competitors
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  placeholder="example.com"
                  value={data.websiteUrl}
                  onChange={(e) => setData({ ...data, websiteUrl: e.target.value })}
                  className="text-center text-lg h-12"
                  onKeyDown={(e) => e.key === "Enter" && canProceedStep1 && analyzeWebsite()}
                />

                <Button
                  onClick={analyzeWebsite}
                  disabled={!canProceedStep1 || isAnalyzing}
                  className="w-full h-12 bg-gradient-to-r from-primary to-blue-500"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing your site...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-7 h-7 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Confirm your business</h2>
                <p className="text-muted-foreground text-sm">
                  We'll generate 30 days of content titles for you
                </p>
              </div>

              {/* Show detected data */}
              {(analyzedKeywords.length > 0 || analyzedCompetitors.length > 0 || analyzedAudiences.length > 0) && (
                <div className="space-y-4">
                  {/* Keywords */}
                  {analyzedKeywords.length > 0 && (
                    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Search className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{analyzedKeywords.length} keywords detected</p>
                          <p className="text-xs text-muted-foreground">Ready for content generation</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {analyzedKeywords.slice(0, 8).map((kw, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background border border-border text-xs text-foreground">
                            <TrendingUp className="w-3 h-3 text-primary" />
                            {kw.keyword}
                          </span>
                        ))}
                        {analyzedKeywords.length > 8 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-xs text-primary font-medium">
                            +{analyzedKeywords.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Competitors & Audiences row */}
                  <div className="grid grid-cols-2 gap-3">
                    {analyzedCompetitors.length > 0 && (
                      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <Swords className="w-4 h-4 text-orange-600" />
                          </div>
                          <p className="text-sm font-medium">{analyzedCompetitors.length} competitors</p>
                        </div>
                        <div className="space-y-1">
                          {analyzedCompetitors.slice(0, 3).map((comp, i) => (
                            <p key={i} className="text-xs text-muted-foreground truncate">• {comp}</p>
                          ))}
                          {analyzedCompetitors.length > 3 && (
                            <p className="text-xs text-primary">+{analyzedCompetitors.length - 3} more</p>
                          )}
                        </div>
                      </div>
                    )}

                    {analyzedAudiences.length > 0 && (
                      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-emerald-600" />
                          </div>
                          <p className="text-sm font-medium">{analyzedAudiences.length} audiences</p>
                        </div>
                        <div className="space-y-1">
                          {analyzedAudiences.slice(0, 3).map((aud, i) => (
                            <p key={i} className="text-xs text-muted-foreground truncate">• {aud}</p>
                          ))}
                          {analyzedAudiences.length > 3 && (
                            <p className="text-xs text-primary">+{analyzedAudiences.length - 3} more</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Textarea
                  placeholder="We help businesses grow their online presence through..."
                  value={data.businessDescription}
                  onChange={(e) => setData({ ...data, businessDescription: e.target.value })}
                  className="min-h-[120px] resize-none"
                />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={!canProceedStep2 || isCreating}
                    className="flex-1 bg-gradient-to-r from-primary to-blue-500"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-5 h-5 mr-2" />
                        Launch my project
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-8 text-muted-foreground text-sm">
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-green-500" />
            <span>Free to start</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-green-500" />
            <span>No credit card required</span>
          </div>
        </div>
      </div>
    </div>
  );
}
