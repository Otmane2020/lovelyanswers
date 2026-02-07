import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight, Globe, FileText, Loader2, Check } from "lucide-react";
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

      // Use analyze-website which extracts keywords, competitors, audiences
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
      
      // Store extracted keywords, competitors, audiences for later
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
      // Continue to step 2 even if analysis fails
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
        
        const { error: kwError } = await supabase
          .from("keywords")
          .insert(keywordRows);
        
        if (kwError) {
          console.error("Failed to insert keywords:", kwError);
        } else {
          console.log(`Auto-inserted ${keywordRows.length} keywords`);
        }
      }

      toast.success("Project created! Welcome to LovelyAnswers 💜");
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
                  We'll analyze it to personalize your AEO strategy
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
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-7 h-7 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Describe your business</h2>
                <p className="text-muted-foreground text-sm">
                  This helps us generate relevant AI answers
                </p>
              </div>

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
                        <Sparkles className="w-5 h-5 mr-2" />
                        Launch AEO
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
            <span>3-day free trial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-green-500" />
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
