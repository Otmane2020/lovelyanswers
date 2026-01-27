import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  Plus, 
  Sparkles, 
  MapPin, 
  Clock, 
  CheckCircle2,
  RefreshCw,
  Send
} from "lucide-react";
import { useActiveProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LocalAnswer {
  id: string;
  question: string;
  answer: string;
  location?: string;
  status: "draft" | "published";
  createdAt: string;
}

export function LocalAnswers() {
  const { project } = useActiveProject();
  const [question, setQuestion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [answers, setAnswers] = useState<LocalAnswer[]>([]);

  const handleGenerateAnswer = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-local-answer", {
        body: {
          projectId: project?.id,
          question: question,
          businessName: project?.name,
          location: project?.domain,
        },
      });

      if (error) throw error;

      if (data?.answer) {
        const newAnswer: LocalAnswer = {
          id: crypto.randomUUID(),
          question: question,
          answer: data.answer,
          location: data.location,
          status: "draft",
          createdAt: new Date().toISOString(),
        };
        setAnswers([newAnswer, ...answers]);
        setQuestion("");
        toast.success("Local answer generated!");
      }
    } catch (error) {
      console.error("Error generating answer:", error);
      toast.error("Failed to generate answer");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishToGMB = async (answer: LocalAnswer) => {
    try {
      const { error } = await supabase.functions.invoke("gmb-publish-post", {
        body: {
          projectId: project?.id,
          content: `❓ ${answer.question}\n\n✅ ${answer.answer}`,
          type: "UPDATE",
        },
      });

      if (error) throw error;

      setAnswers(answers.map(a => 
        a.id === answer.id ? { ...a, status: "published" } : a
      ));
      toast.success("Published to Google Business Profile!");
    } catch (error) {
      console.error("Error publishing:", error);
      toast.error("Failed to publish to GMB");
    }
  };

  return (
    <div className="space-y-6">
      {/* Generate Local Answer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Generate Local Q&A
          </CardTitle>
          <CardDescription>
            Create locally-optimized answers for your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What are your opening hours? / Do you offer delivery?"
              className="flex-1"
            />
            <Button
              onClick={handleGenerateAnswer}
              disabled={isGenerating}
              className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Try:</span>
            {[
              "What makes you different?",
              "Do you offer free parking?",
              "What's your best seller?",
              "Do you accept reservations?",
            ].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => setQuestion(suggestion)}
                className="text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Answers List */}
      <div className="space-y-4">
        {answers.length > 0 ? (
          answers.map((answer) => (
            <Card key={answer.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-orange-500" />
                      <h4 className="font-medium">{answer.question}</h4>
                    </div>
                    <p className="text-muted-foreground">{answer.answer}</p>
                    <div className="flex items-center gap-4 text-sm">
                      {answer.location && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {answer.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(answer.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={answer.status === "published" ? "default" : "secondary"}
                      className={answer.status === "published" ? "bg-emerald-500" : ""}
                    >
                      {answer.status === "published" ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Published
                        </>
                      ) : (
                        "Draft"
                      )}
                    </Badge>
                    {answer.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => handlePublishToGMB(answer)}
                        className="gap-1"
                      >
                        <Send className="h-3 w-3" />
                        Publish to GMB
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No local Q&A yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Generate locally-optimized answers to common questions about your business. These can be published to your Google Business Profile.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
