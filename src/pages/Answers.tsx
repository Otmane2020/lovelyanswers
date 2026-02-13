import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScoreRing } from "@/components/ui/score-ring";
import {
  MessageSquare,
  Search,
  Loader2,
  Copy,
  Check,
  Eye,
  Send,
  Globe,
  Calendar,
  Sparkles,
  Filter,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAnswers, Answer } from "@/hooks/useAnswers";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import chatGptLogo from "@/assets/chatgpt-logo.png";
import chatGptIcon from "@/assets/chatgpt-icon.png";

export default function Answers() {
  const { data: answers = [], isLoading } = useAnswers();
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingAnswer, setViewingAnswer] = useState<Answer | null>(null);
  const [filter, setFilter] = useState<"all" | "published" | "scheduled" | "draft">("all");

  const handleCopy = async (answer: Answer) => {
    await navigator.clipboard.writeText(`Q: ${answer.question}\n\nA: ${answer.answer}`);
    setCopiedId(answer.id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isPublished = (a: Answer) => Boolean(a.published_url) || Boolean(a.published_at);

  const filteredAnswers = useMemo(() => {
    let result = answers;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.question.toLowerCase().includes(q) ||
          a.answer.toLowerCase().includes(q)
      );
    }

    if (filter === "published") {
      result = result.filter((a) => isPublished(a));
    } else if (filter === "scheduled") {
      result = result.filter((a) => a.scheduled_date && !isPublished(a));
    } else if (filter === "draft") {
      result = result.filter((a) => !a.scheduled_date && !isPublished(a));
    }

    return result;
  }, [answers, searchQuery, filter]);

  const publishedCount = answers.filter((a) => isPublished(a)).length;
  const scheduledCount = answers.filter((a) => a.scheduled_date && !isPublished(a)).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ChatGPT Logo + Badge */}
        <div className="flex items-center gap-3">
          <img src={chatGptLogo} alt="ChatGPT" className="h-16 w-auto" />
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 font-bold text-sm px-3 py-1">
            Rank First in AI!
          </Badge>
        </div>

        {/* Hero Header */}
        <div className="rounded-xl bg-gradient-to-r from-orange-500/10 via-red-500/10 to-amber-500/10 p-6 border border-border/50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <img src={chatGptIcon} alt="ChatGPT" className="h-10 w-10 rounded-lg" />
                <h1 className="text-3xl font-bold tracking-tight">AEO Answers</h1>
              </div>
              <p className="text-muted-foreground mt-1">
                {answers.length} AI-optimized answers for search engines
              </p>
            </div>
          </div>
        </div>

        {/* Stats + Search Bar */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search answers..."
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                className="text-xs"
              >
                All ({answers.length})
              </Button>
              <Button
                variant={filter === "published" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("published")}
                className="text-xs gap-1"
              >
                <Globe className="h-3 w-3" />
                Published ({publishedCount})
              </Button>
              <Button
                variant={filter === "scheduled" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("scheduled")}
                className="text-xs gap-1"
              >
                <Calendar className="h-3 w-3" />
                Scheduled ({scheduledCount})
              </Button>
              <Button
                variant={filter === "draft" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("draft")}
                className="text-xs gap-1"
              >
                Draft ({answers.length - publishedCount - scheduledCount})
              </Button>
            </div>
          </div>
        </Card>

        {/* Answers List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAnswers.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No answers found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try a different search term" : "Generate your first AEO answers from the dashboard"}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAnswers.map((answer) => (
              <Card
                key={answer.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setViewingAnswer(answer)}
              >
                <div className="flex items-start gap-4">
                  <ScoreRing score={answer.score ?? 0} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-medium text-sm sm:text-base leading-snug">
                        {answer.question}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(answer);
                          }}
                        >
                          {copiedId === answer.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {answer.answer}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={cn(
                          isPublished(answer)
                            ? "bg-emerald-500/20 text-emerald-600"
                            : answer.scheduled_date
                              ? "bg-orange-500/20 text-orange-600"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isPublished(answer)
                          ? "Published"
                          : answer.scheduled_date
                            ? `Scheduled ${format(new Date(answer.scheduled_date), "MMM d")}`
                            : "Draft"}
                      </Badge>
                      {answer.platforms && answer.platforms.length > 0 && (
                        <div className="flex gap-1">
                          {answer.platforms.slice(0, 3).map((p) => (
                            <Badge key={p} variant="outline" className="text-[10px] h-5">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {answer.has_article && (
                        <Badge variant="outline" className="text-[10px] h-5 gap-1">
                          <Sparkles className="h-3 w-3" />
                          Article
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

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
                  <ScoreRing score={viewingAnswer.score ?? 0} size="md" />
                  <div>
                    <p className="text-sm font-medium">AEO Score</p>
                    <p className="text-xs text-muted-foreground">AI optimization</p>
                  </div>
                  {viewingAnswer.scheduled_date && (
                    <Badge variant="outline" className="ml-auto">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(viewingAnswer.scheduled_date), "MMM d, yyyy")}
                    </Badge>
                  )}
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{viewingAnswer.answer}</p>
                </div>
                {viewingAnswer.platforms && viewingAnswer.platforms.length > 0 && (
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {viewingAnswer.platforms.map((p) => (
                      <Badge key={p} variant="secondary">{p}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleCopy(viewingAnswer)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                {viewingAnswer.published_url && (
                  <Button variant="outline" asChild>
                    <a href={viewingAnswer.published_url} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      View Published
                    </a>
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
