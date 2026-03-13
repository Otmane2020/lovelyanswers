"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Sparkles, 
  Copy, 
  Check,
  RefreshCw,
  Lightbulb
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { toast } from "sonner";

interface BusinessReview {
  text: string;
  rating: number;
}

interface Business {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  types: string[];
  openingHours?: string[];
  location?: { lat: number; lng: number };
  reviews?: BusinessReview[];
}

interface LocalAnswersProps {
  business: Business;
}

interface GeneratedQA {
  question: string;
  answer: string;
}

const SUGGESTED_QUESTIONS = [
  "What are your opening hours?",
  "What services do you offer?",
  "How can I contact you?",
  "Where are you located?",
  "What makes you different from competitors?",
  "Do you offer any special deals?",
];

export function LocalAnswers({ business }: LocalAnswersProps) {
  const { project } = useActiveProject();
  const [customQuestion, setCustomQuestion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAnswers, setGeneratedAnswers] = useState<GeneratedQA[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateAnswer = async (question: string) => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-local-answer", {
        body: {
          projectId: project?.id,
          question,
          businessName: business.name,
          location: business.address,
          businessContext: {
            rating: business.rating,
            reviewCount: business.reviewCount,
            types: business.types,
            phone: business.phone,
            website: business.website,
            openingHours: business.openingHours,
            reviews: business.reviews,
          },
        },
      });

      if (error) throw error;

      if (data?.answer) {
        setGeneratedAnswers((prev) => [
          { question, answer: data.answer },
          ...prev,
        ]);
        setCustomQuestion("");
        toast.success("Answer generated!");
      }
    } catch (error) {
      console.error("Error generating answer:", error);
      toast.error("Failed to generate answer");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Generate Answer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Generate Local Q&A
          </CardTitle>
          <CardDescription>
            Create AI-optimized answers about {business.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Enter a question about your business..."
              rows={3}
            />
          </div>

          <Button
            onClick={() => generateAnswer(customQuestion)}
            disabled={isGenerating || !customQuestion.trim()}
            className="w-full gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Answer
              </>
            )}
          </Button>

          {/* Suggested Questions */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Quick suggestions:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setCustomQuestion(q)}
                >
                  {q}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Answers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Generated Answers
          </CardTitle>
          <CardDescription>
            Copy these answers to publish on your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          {generatedAnswers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No answers generated yet</p>
              <p className="text-sm">Generate your first local Q&A above</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {generatedAnswers.map((qa, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg bg-muted/30 space-y-2"
                >
                  <p className="font-medium text-sm">{qa.question}</p>
                  <p className="text-sm text-muted-foreground">{qa.answer}</p>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(`Q: ${qa.question}\n\nA: ${qa.answer}`, index)}
                      className="gap-1"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="h-3 w-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
