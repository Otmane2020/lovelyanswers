"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { Loader2, FileText, Sparkles, Calendar, CheckCircle2, AlertCircle } from "lucide-react";

interface ArticleTopic {
  id: string;
  topic: string;
  category: string;
  intent: string;
}

const STRATEGIC_ARTICLES: ArticleTopic[] = [
  // Pillar 1: SEO & AEO for AI-Built Sites
  { id: "1", topic: "How to do SEO on a site built with Lovable", category: "seo-sites-ia", intent: "howto" },
  { id: "2", topic: "SEO for AI-generated sites: what really works in 2026", category: "seo-sites-ia", intent: "criteria" },
  { id: "3", topic: "Why AI sites don't rank on Google (and how to fix it)", category: "seo-sites-ia", intent: "why" },
  { id: "4", topic: "AEO: how to get your AI site cited by ChatGPT", category: "seo-sites-ia", intent: "howto" },
  { id: "5", topic: "SEO vs AEO: which strategy for AI-generated sites", category: "seo-sites-ia", intent: "comparison" },
  { id: "6", topic: "How to structure a Lovable site for Google and ChatGPT", category: "seo-sites-ia", intent: "howto" },
  { id: "7", topic: "Common SEO mistakes on Bolt / Replit sites", category: "seo-sites-ia", intent: "criteria" },
  { id: "8", topic: "How Google analyzes AI-generated sites", category: "seo-sites-ia", intent: "what" },
  { id: "9", topic: "Why ChatGPT ignores most AI sites", category: "seo-sites-ia", intent: "why" },
  { id: "10", topic: "SEO & AEO checklist for auto-generated sites", category: "seo-sites-ia", intent: "criteria" },
  { id: "11", topic: "Technical SEO for Lovable, Bolt, and Replit projects", category: "seo-sites-ia", intent: "howto" },
  { id: "12", topic: "How to add meta tags and Schema to Lovable sites", category: "seo-sites-ia", intent: "howto" },
  { id: "13", topic: "Site speed optimization for AI-built websites", category: "seo-sites-ia", intent: "howto" },
  { id: "14", topic: "Internal linking strategy for AI-generated sites", category: "seo-sites-ia", intent: "howto" },
  { id: "15", topic: "Mobile SEO for Lovable and Bolt projects", category: "seo-sites-ia", intent: "howto" },
  
  // Pillar 2: Platform Comparisons
  { id: "16", topic: "Lovable and SEO: is it enough without an AEO tool?", category: "comparisons", intent: "criteria" },
  { id: "17", topic: "Is Bolt.new good for Google ranking?", category: "comparisons", intent: "criteria" },
  { id: "18", topic: "Is Replit suitable for production SEO?", category: "comparisons", intent: "criteria" },
  { id: "19", topic: "Lovable vs WordPress: which is better for SEO?", category: "comparisons", intent: "comparison" },
  { id: "20", topic: "Lovable + AutoPilot Geo: winning combo for ChatGPT", category: "comparisons", intent: "comparison" },
  { id: "21", topic: "Can you rank on Google with an AI-generated site?", category: "comparisons", intent: "what" },
  { id: "22", topic: "Lovable + AEO: how to appear in AI responses", category: "comparisons", intent: "howto" },
  { id: "23", topic: "Bolt + SEO: technical limitations and solutions", category: "comparisons", intent: "criteria" },
  { id: "24", topic: "Best AI builder for Google ranking in 2026", category: "comparisons", intent: "best" },
  { id: "25", topic: "Why AutoPilot Geo complements Lovable for SEO", category: "comparisons", intent: "why" },
  
  // Pillar 3: Pure AEO
  { id: "26", topic: "What is AEO (Answer Engine Optimization)?", category: "aeo-pure", intent: "what" },
  { id: "27", topic: "How to get recommended by ChatGPT for your business", category: "aeo-pure", intent: "howto" },
  { id: "28", topic: "How to appear in ChatGPT answers", category: "aeo-pure", intent: "howto" },
  { id: "29", topic: "AEO for SaaS: complete methodology", category: "aeo-pure", intent: "howto" },
  { id: "30", topic: "AEO for AI-generated e-commerce sites", category: "aeo-pure", intent: "howto" },
  { id: "31", topic: "How to structure pages for generative AI", category: "aeo-pure", intent: "howto" },
  { id: "32", topic: "Why classic SEO is no longer enough", category: "aeo-pure", intent: "why" },
  { id: "33", topic: "How ChatGPT chooses which sites to recommend", category: "aeo-pure", intent: "what" },
  { id: "34", topic: "How AutoPilot Geo optimizes a site for AEO", category: "aeo-pure", intent: "howto" },
  { id: "35", topic: "AEO checklist for 2026", category: "aeo-pure", intent: "criteria" },
  
  // Pillar 4: Case Studies
  { id: "36", topic: "How a Lovable site went from invisible to ChatGPT-recommended", category: "case-studies", intent: "howto" },
  { id: "37", topic: "Before/after AEO on an AI site", category: "case-studies", intent: "comparison" },
  { id: "38", topic: "How AutoPilot Geo improves AI traffic", category: "case-studies", intent: "howto" },
  { id: "39", topic: "Case study: AI-generated site + AEO optimization", category: "case-studies", intent: "howto" },
  { id: "40", topic: "Why our Lovable clients add AutoPilot Geo", category: "case-studies", intent: "why" },
  { id: "41", topic: "From zero visibility to AI citations: method", category: "case-studies", intent: "howto" },
  { id: "42", topic: "How to capture traffic from ChatGPT", category: "case-studies", intent: "howto" },
  { id: "43", topic: "AI traffic vs Google traffic: real numbers", category: "case-studies", intent: "comparison" },
  { id: "44", topic: "Automatic SEO for AI sites: myth or reality?", category: "case-studies", intent: "what" },
  { id: "45", topic: "Feedback: AEO on a Bolt site", category: "case-studies", intent: "howto" },
  
  // Pillar 5: Business Intent Pages
  { id: "46", topic: "AEO tool for Lovable sites", category: "commercial", intent: "commercial" },
  { id: "47", topic: "Automatic SEO for AI-generated sites", category: "commercial", intent: "commercial" },
  { id: "48", topic: "Solution to appear on ChatGPT", category: "commercial", intent: "commercial" },
  { id: "49", topic: "Best AEO tool for SaaS", category: "commercial", intent: "best" },
  { id: "50", topic: "AEO as a Service: how it works", category: "commercial", intent: "what" },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  "seo-sites-ia": { label: "SEO/AEO AI Sites", color: "bg-blue-500/10 text-blue-500" },
  "comparisons": { label: "Comparisons", color: "bg-purple-500/10 text-purple-500" },
  "aeo-pure": { label: "Pure AEO", color: "bg-green-500/10 text-green-500" },
  "case-studies": { label: "Case Studies", color: "bg-orange-500/10 text-orange-500" },
  "commercial": { label: "Commercial", color: "bg-pink-500/10 text-pink-500" },
};

export function BulkArticleGenerator() {
  const { toast } = useToast();
  const { project: activeProject } = useActiveProject();
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [results, setResults] = useState<{ success: string[]; errors: string[] }>({ success: [], errors: [] });

  const toggleArticle = (id: string) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedArticles(newSelected);
  };

  const selectAll = () => {
    setSelectedArticles(new Set(STRATEGIC_ARTICLES.map(a => a.id)));
  };

  const selectNone = () => {
    setSelectedArticles(new Set());
  };

  const selectByCategory = (category: string) => {
    const categoryArticles = STRATEGIC_ARTICLES.filter(a => a.category === category).map(a => a.id);
    setSelectedArticles(new Set(categoryArticles));
  };

  const generateArticles = async () => {
    if (!activeProject) {
      toast({ title: "No project selected", variant: "destructive" });
      return;
    }

    if (selectedArticles.size === 0) {
      toast({ title: "Select at least one article", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedCount(0);
    setResults({ success: [], errors: [] });

    const articlesToGenerate = STRATEGIC_ARTICLES.filter(a => selectedArticles.has(a.id));
    const batchSize = 5;
    let currentIndex = 0;

    try {
      while (currentIndex < articlesToGenerate.length) {
        const batch = articlesToGenerate.slice(currentIndex, currentIndex + batchSize);
        
        const { data, error } = await supabase.functions.invoke("generate-strategic-articles", {
          body: {
            projectId: activeProject.id,
            language: activeProject.language || "en",
            articles: batch.map(a => ({
              topic: a.topic,
              category: a.category,
              intent: a.intent,
            })),
            batchSize: batch.length,
            autoPublish: true,
          },
        });

        if (error) {
          console.error("Generation error:", error);
          setResults(prev => ({
            ...prev,
            errors: [...prev.errors, ...batch.map(b => b.topic)],
          }));
        } else if (data) {
          const successTitles = data.articles?.map((a: { title: string }) => a.title) || [];
          const errorTopics = data.errors?.map((e: { topic: string }) => e.topic) || [];
          
          setResults(prev => ({
            success: [...prev.success, ...successTitles],
            errors: [...prev.errors, ...errorTopics],
          }));
          setGeneratedCount(prev => prev + (data.generated || 0));
        }

        currentIndex += batchSize;
        setProgress(Math.round((currentIndex / articlesToGenerate.length) * 100));

        // Wait between batches to avoid rate limiting
        if (currentIndex < articlesToGenerate.length) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      toast({
        title: "Generation Complete",
        description: `Generated ${generatedCount} articles. Check Planning page for scheduling.`,
      });

    } catch (err) {
      console.error("Generation failed:", err);
      toast({
        title: "Generation Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const categories = Object.keys(CATEGORY_LABELS);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Strategic Article Generator
          </CardTitle>
          <CardDescription>
            Generate 50 SEO/AEO-optimized articles targeting Lovable, Bolt, and Replit users. 
            Articles will be auto-scheduled and published via your connected CMS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Selection */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All ({STRATEGIC_ARTICLES.length})
            </Button>
            <Button variant="outline" size="sm" onClick={selectNone}>
              Clear Selection
            </Button>
            <div className="h-6 w-px bg-border mx-2" />
            {categories.map(cat => (
              <Button 
                key={cat} 
                variant="outline" 
                size="sm" 
                onClick={() => selectByCategory(cat)}
                className="text-xs"
              >
                {CATEGORY_LABELS[cat].label}
              </Button>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {selectedArticles.size} selected
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              ~{Math.ceil(selectedArticles.size / 5) * 2} min estimated
            </span>
          </div>

          {/* Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Generating articles...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {generatedCount} articles created. Please wait...
              </p>
            </div>
          )}

          {/* Results */}
          {!isGenerating && (results.success.length > 0 || results.errors.length > 0) && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              {results.success.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  <span>{results.success.length} articles created successfully</span>
                </div>
              )}
              {results.errors.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>{results.errors.length} articles failed</span>
                </div>
              )}
            </div>
          )}

          {/* Article List */}
          <div className="border rounded-lg divide-y max-h-[500px] overflow-y-auto">
            {STRATEGIC_ARTICLES.map((article) => (
              <div
                key={article.id}
                className={`flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors ${
                  selectedArticles.has(article.id) ? "bg-primary/5" : ""
                }`}
              >
                <Checkbox
                  checked={selectedArticles.has(article.id)}
                  onCheckedChange={() => toggleArticle(article.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{article.topic}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className={`text-xs ${CATEGORY_LABELS[article.category]?.color}`}>
                      {CATEGORY_LABELS[article.category]?.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {article.intent}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateArticles}
            disabled={isGenerating || selectedArticles.size === 0 || !activeProject}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate {selectedArticles.size} Articles
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
export default BulkArticleGenerator;
