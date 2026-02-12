import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, ExternalLink, FileText, LayoutGrid, List, Loader2, Play, MessageSquare, Send, Settings } from "lucide-react";
import { addDays, eachDayOfInterval, format, isToday } from "date-fns";
import { enUS } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProject } from "@/hooks/useProjects";
import { useGeneration } from "@/contexts/GenerationContext";
import { usePublishAnswer } from "@/hooks/usePublishAnswer";
import { AutoPublishSettings } from "@/components/planning/AutoPublishSettings";

interface ScheduledItem {
  id: string;
  title: string;
  type: "answer" | "article";
  date: Date;
  status: "scheduled" | "published" | "draft";
  publishedUrl?: string;
  publishedAt?: string | null;
  answer?: string;
  score?: number | null;
  highCitation?: boolean | null;
  aeoScore?: number | null;
  wordCount?: number | null;
  createdAt?: string | null;
}

function getPublishStatus(input: { published_url?: string | null; published_at?: string | null }) {
  return input.published_url || input.published_at ? "published" : "scheduled";
}

export default function AeoPlanning() {
  const { user } = useAuth();
  const { project } = useActiveProject();
  const publishAnswer = usePublishAnswer();
  const { startGeneration, stopGeneration, setGenerationProgress, setGenerationMessage, isGenerating } = useGeneration();
  const [monthViewMode, setMonthViewMode] = useState<"calendar" | "list">("calendar");
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedDayItems, setSelectedDayItems] = useState<ScheduledItem[]>([]);
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const hasRunFill = useRef(false);

  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const rangeEnd = useMemo(() => addDays(rangeStart, 30), [rangeStart]);

  const visibleStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return addDays(d, weekOffset * 7);
  }, [weekOffset]);

  const visibleEnd = useMemo(() => addDays(visibleStart, 27), [visibleStart]);

  const visibleDays = useMemo(() => eachDayOfInterval({ start: visibleStart, end: visibleEnd }), [visibleStart, visibleEnd]);

  const rangeDays = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd]);

  const getItemsForDate = (date: Date) => {
    return scheduledItems.filter((item) => format(item.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"));
  };

  const getUpcomingItems = () => {
    return scheduledItems.filter((item) => item.date >= new Date()).sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const fetchScheduledItems = async () => {
    if (!project?.id) return;
    setIsLoading(true);
    try {
      const { data: answers } = await supabase.from("answers").select("id, question, scheduled_date, published_url, published_at, answer, score, high_citation, created_at").eq("project_id", project.id).not("scheduled_date", "is", null);
      const { data: articles } = await supabase.from("articles").select("id, title, scheduled_date, aeo_score, word_count, created_at").eq("project_id", project.id).not("scheduled_date", "is", null);
      const items: ScheduledItem[] = [];
      if (answers) {
        answers.forEach((a) => {
          if (a.scheduled_date) {
            items.push({ id: a.id, title: a.question, type: "answer", date: new Date(a.scheduled_date), status: getPublishStatus(a), publishedUrl: a.published_url || undefined, publishedAt: a.published_at, answer: a.answer || undefined, score: a.score, highCitation: a.high_citation, createdAt: a.created_at });
          }
        });
      }
      if (articles) {
        articles.forEach((art) => {
          if (art.scheduled_date) {
            items.push({ id: art.id, title: art.title, type: "article", date: new Date(art.scheduled_date), status: "scheduled", aeoScore: art.aeo_score, wordCount: art.word_count, createdAt: art.created_at });
          }
        });
      }
      setScheduledItems(items);
    } catch (error) {
      console.error("Error fetching scheduled items:", error);
      toast.error("Failed to load scheduled items");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledItems();
  }, [project?.id]);

  const handlePublishNow = async (item: ScheduledItem) => {
    if (!project) return;
    setPublishingId(item.id);
    try {
      if (item.type === "answer") {
        await publishAnswer.mutateAsync({ answerId: item.id, projectId: project.id });
        toast.success("Answer published!");
      } else {
        toast.info("Article publishing coming soon");
      }
      await fetchScheduledItems();
    } catch (error) {
      console.error("Error publishing:", error);
      toast.error("Failed to publish");
    } finally {
      setPublishingId(null);
    }
  };

  const handleDayClick = (date: Date) => {
    const items = getItemsForDate(date);
    setSelectedDate(date);
    if (items.length > 0) {
      setSelectedDayItems(items);
      setShowDayPopup(true);
    }
  };

  const totalAnswers = scheduledItems.filter((i) => i.type === "answer").length;
  const totalArticles = scheduledItems.filter((i) => i.type === "article").length;
  const publishedItems = scheduledItems.filter((i) => i.status === "published").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Content Planning</h1>
            <p className="text-sm text-muted-foreground mt-1">Today + 30 days</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {isGenerating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating content...</span>
              </div>
            )}
            {project && <AutoPublishSettings projectId={project.id} />}
          </div>
        </div>

        <Card className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">{totalAnswers} Answers</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10">
              <FileText className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs sm:text-sm font-medium text-emerald-700">{totalArticles} Articles</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">{publishedItems} Published</span>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="lg:col-span-2 p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <div>
                <h2 className="text-base sm:text-xl font-semibold">Content Calendar</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(visibleStart, "d MMM", { locale: enUS })} – {format(visibleEnd, "d MMM yyyy", { locale: enUS })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex border rounded-lg overflow-hidden">
                  <Button variant="ghost" size="sm" onClick={() => setWeekOffset(Math.max(0, weekOffset - 4))} disabled={weekOffset === 0} className="rounded-none h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0} className="rounded-none text-xs px-2 h-8">
                    Today
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setWeekOffset(weekOffset + 4)} className="rounded-none h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex border rounded-lg overflow-hidden">
                  <Button variant={monthViewMode === "calendar" ? "default" : "ghost"} size="sm" onClick={() => setMonthViewMode("calendar")} className="rounded-none h-8 w-8 p-0">
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button variant={monthViewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setMonthViewMode("list")} className="rounded-none h-8 w-8 p-0">
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {monthViewMode === "calendar" ? (
              <>
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                    <div key={i} className="text-center text-[10px] sm:text-sm font-medium text-muted-foreground py-1 sm:py-2">
                      <span className="hidden sm:inline">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</span>
                      <span className="sm:hidden">{day}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                  {Array.from({ length: (visibleStart.getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-16 sm:h-24 p-0.5" />
                  ))}
                  {visibleDays.map((day) => {
                    const items = getItemsForDate(day);
                    const hasItems = items.length > 0;
                    const isSelected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => handleDayClick(day)}
                        className={cn(
                          "h-16 sm:h-28 p-1 sm:p-2 rounded-md sm:rounded-lg border transition-all text-left hover:bg-muted/50 flex flex-col",
                          isToday(day) && "border-primary ring-1 ring-primary/20",
                          isSelected && "bg-primary/10 border-primary",
                          hasItems && "hover:shadow-md cursor-pointer"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn("text-[10px] sm:text-sm font-semibold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full", isToday(day) && "bg-primary text-primary-foreground")}>
                            {format(day, "d")}
                          </span>
                          {hasItems && (
                            <Badge variant="secondary" className="text-[8px] sm:text-[9px] h-3.5 sm:h-4 px-1">
                              {items.length}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1 flex-1 overflow-hidden space-y-0.5">
                          {items.slice(0, window.innerWidth < 640 ? 1 : 2).map((item) => (
                            <div
                              key={item.id}
                              className={cn(
                                "text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-0.5 sm:gap-1",
                                item.type === "answer" ? "bg-[hsl(222,47%,11%)]/10 text-[hsl(222,47%,30%)]" : "bg-emerald-500/20 text-emerald-700"
                              )}
                            >
                              {item.type === "answer" ? <MessageSquare className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0" /> : <FileText className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0" />}
                              <span className="truncate hidden sm:inline">{item.title.slice(0, 20)}...</span>
                            </div>
                          ))}
                          {items.length > 2 && <span className="text-[8px] sm:text-[10px] text-muted-foreground font-medium hidden sm:block">+{items.length - 2}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {rangeDays.map((day) => {
                  const items = getItemsForDate(day);
                  if (items.length === 0) return null;
                  return (
                    <div key={day.toISOString()} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">{format(day, "EEEE, MMMM d, yyyy", { locale: enUS })}</span>
                        <Badge variant="secondary" className="text-xs">
                          {items.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted transition-colors">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {item.type === "answer" ? <MessageSquare className="h-4 w-4 text-[hsl(222,47%,30%)] shrink-0" /> : <FileText className="h-4 w-4 text-emerald-600 shrink-0" />}
                              <span className="text-sm truncate">{item.title}</span>
                              {item.status === "published" && (
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Published
                                </Badge>
                              )}
                            </div>
                            {item.status !== "published" && (
                              <Button variant="ghost" size="sm" onClick={() => handlePublishNow(item)} disabled={publishingId === item.id}>
                                {publishingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Next 30 Days ({getUpcomingItems().length})
            </h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {getUpcomingItems().slice(0, 20).map((item) => (
                <div key={item.id} className="p-3 rounded-lg border hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {item.type === "answer" ? <MessageSquare className="h-4 w-4 text-[hsl(222,47%,30%)] shrink-0" /> : <FileText className="h-4 w-4 text-emerald-600 shrink-0" />}
                      <span className="text-sm font-medium truncate">{item.title}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{format(item.date, "MMM d, yyyy")}</span>
                    {item.status === "published" ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Published
                      </Badge>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handlePublishNow(item)} disabled={publishingId === item.id}>
                        {publishingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={showDayPopup} onOpenChange={setShowDayPopup}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy", { locale: enUS })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {selectedDayItems.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {item.type === "answer" ? <MessageSquare className="h-4 w-4 text-[hsl(222,47%,30%)]" /> : <FileText className="h-4 w-4 text-emerald-600" />}
                      <h4 className="font-semibold text-sm">{item.title}</h4>
                    </div>
                    {item.answer && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.answer}</p>}
                    <div className="flex flex-wrap gap-2">
                      {item.score !== null && item.score !== undefined && (
                        <Badge variant="outline" className={item.score >= 80 ? "border-[hsl(222,47%,30%)] text-[hsl(222,47%,30%)]" : item.score >= 60 ? "border-amber-500 text-amber-600" : ""}>
                          {item.score}%
                        </Badge>
                      )}
                      {item.highCitation && <Badge className="bg-emerald-500/20 text-emerald-500 border-0">High Citation</Badge>}
                      {item.status === "published" && (
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Published
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {item.status !== "published" && (
                      <Button size="sm" onClick={() => handlePublishNow(item)} disabled={publishingId === item.id} className="bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,15%)] text-white">
                        {publishingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                        Publish
                      </Button>
                    )}
                    {item.publishedUrl && (
                      <Button variant="outline" size="sm" onClick={() => window.open(item.publishedUrl, "_blank")}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
