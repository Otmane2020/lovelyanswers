import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard } from "@/components/ui/glass-card";
import { ScoreRing } from "@/components/ui/score-ring";
import {
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Lightbulb,
  Plus,
  Eye,
  Send,
  Search,
  Loader2,
  ExternalLink,
  Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { toast } from "sonner";

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
  reviews?: { text: string; rating: number }[];
}

interface LocalAnswer {
  id: string;
  question: string;
  answer: string;
  score: number;
  createdAt: string;
  isPublished: boolean;
}

interface LocalAnswersTabProps {
  business: Business;
}

const SUGGESTED_QUESTIONS = [
  "What are your opening hours?",
  "What services do you offer?",
  "How can I contact you?",
  "Where are you located?",
  "What makes you different from competitors?",
  "Do you offer any special deals?",
];

export function LocalAnswersTab({ business }: LocalAnswersTabProps) {
  const { project } = useActiveProject();
  const [searchQuery, setSearchQuery] = useState("");
  const [answers, setAnswers] = useState<LocalAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingAnswer, setViewingAnswer] = useState<LocalAnswer | null>(null);
  const [generating30, setGenerating30] = useState(false);

  // Generate a single answer
  const generateAnswer = async (question: string) => {
    if (!question.trim() || !project) {
      toast.error("Please enter a question");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-local-answer", {
        body: {
          projectId: project.id,
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
        const newAnswer: LocalAnswer = {
          id: crypto.randomUUID(),
          question,
          answer: data.answer,
          score: data.score || 85,
          createdAt: new Date().toISOString(),
          isPublished: false,
        };
        setAnswers((prev) => [newAnswer, ...prev]);
        setNewQuestion("");
        setShowNewModal(false);
        toast.success("Answer generated!");
      }
    } catch (error) {
      console.error("Error generating answer:", error);
      toast.error("Failed to generate answer");
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate 30 local Q&A
  const generate30LocalAnswers = async () => {
    if (!project) return;

    setGenerating30(true);
    try {
      toast.info("Generating 30 local Q&A answers...");

      // Generate answers for multiple suggested questions + AI-generated ones
      const questions = [
        ...SUGGESTED_QUESTIONS,
        `What are the best products/services at ${business.name}?`,
        `Why should I choose ${business.name}?`,
        `What do customers say about ${business.name}?`,
        `Is ${business.name} good value for money?`,
        `What's the atmosphere like at ${business.name}?`,
      ];

      const generatedAnswers: LocalAnswer[] = [];

      for (const question of questions.slice(0, 10)) {
        const { data, error } = await supabase.functions.invoke("generate-local-answer", {
          body: {
            projectId: project.id,
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

        if (!error && data?.answer) {
          generatedAnswers.push({
            id: crypto.randomUUID(),
            question,
            answer: data.answer,
            score: data.score || 85,
            createdAt: new Date().toISOString(),
            isPublished: false,
          });
        }
      }

      setAnswers((prev) => [...generatedAnswers, ...prev]);
      toast.success(`${generatedAnswers.length} local Q&A generated!`);
    } catch (error) {
      console.error("Error generating local answers:", error);
      toast.error("Failed to generate local answers");
    } finally {
      setGenerating30(false);
    }
  };

  const handleCopy = async (answer: LocalAnswer) => {
    await navigator.clipboard.writeText(`Q: ${answer.question}\n\nA: ${answer.answer}`);
    setCopiedId(answer.id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAnswers = answers.filter(
    (a) =>
      a.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Local Q&A</h2>
          <p className="text-muted-foreground">
            AI-optimized answers about {business.name}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setShowNewModal(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Answer
          </Button>
          <Button
            onClick={generate30LocalAnswers}
            disabled={generating30}
            className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            {generating30 ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Generate 30 Q/A
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search answers..."
          className="pl-10"
        />
      </div>

      {/* Answers Grid */}
      {filteredAnswers.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No local answers yet</h3>
          <p className="text-muted-foreground mb-4">
            Generate your first local Q&A to optimize for AI search
          </p>
          <Button onClick={() => setShowNewModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create First Answer
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAnswers.map((answer) => (
            <GlassCard key={answer.id} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h4 className="font-medium line-clamp-2 flex-1">{answer.question}</h4>
                <ScoreRing score={answer.score} size="sm" />
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {answer.answer}
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  Local AEO
                </Badge>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewingAnswer(answer)}
                    className="h-8 w-8"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(answer)}
                    className="h-8 w-8"
                  >
                    {copiedId === answer.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* New Answer Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              Generate Local Answer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter a question about your business..."
              rows={3}
            />
            <div>
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Quick suggestions:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setNewQuestion(q)}
                  >
                    {q}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => generateAnswer(newQuestion)}
              disabled={isGenerating || !newQuestion.trim()}
              className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Answer Modal */}
      <Dialog open={!!viewingAnswer} onOpenChange={() => setViewingAnswer(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewingAnswer && (
            <>
              <DialogHeader>
                <DialogTitle>{viewingAnswer.question}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <div className="flex items-center gap-4 mb-4">
                  <ScoreRing score={viewingAnswer.score} size="md" />
                  <div>
                    <p className="text-sm font-medium">AEO Score</p>
                    <p className="text-xs text-muted-foreground">Local optimization</p>
                  </div>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p>{viewingAnswer.answer}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleCopy(viewingAnswer)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  <Send className="h-4 w-4" />
                  Publish to CMS
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
