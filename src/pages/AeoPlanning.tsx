import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Play,
  MessageSquare,
  Send,
  Settings,
} from "lucide-react";
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
  answer?: string;
  score?: number | null;
  highCitation?: boolean | null;
  aeoScore?: number | null;
  wordCount?: number | null;
  createdAt?: string | null;
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
  const [isPublishingAll, setIsPublishingAll] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedDayItems, setSelectedDayItems] = useState<ScheduledItem[]>([]);
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Calendar navigation - offset in weeks from today
  const [weekOffset, setWeekOffset] = useState(0);

  const hasRunFill = useRef(false);

  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const rangeEnd = useMemo(() => addDays(rangeStart, 30), [rangeStart]);

  // Visible range for calendar display (with navigation)
  const visibleStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return addDays(d, weekOffset * 7);
  }, [weekOffset]);

  const visibleEnd = useMemo(() => addDays(visibleStart, 27), [visibleStart]); // 4 weeks = 28 days

  const visibleDays = useMemo(
    () =>
      eachDayOfInterval({
        start: visibleStart,
        end: visibleEnd,
      }),
    [visibleStart, visibleEnd]
  );

  const rangeDays = useMemo(
    () =>
      eachDayOfInterval({
        start: rangeStart,
        end: rangeEnd,
      }),
    [rangeStart, rangeEnd]
  );

  const handlePublishNow = async (item: ScheduledItem) => {
    if (!project || item.type !== "answer") {
      toast.error("Only answers can be published");
      return;
    }

    setPublishingId(item.id);
    try {
      await publishAnswer.mutateAsync({ answerId: item.id, projectId: project.id });
      setScheduledItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "published" } : i)));
    } finally {
      setPublishingId(null);
    }
  };

  // Manual trigger for publishing all scheduled content for today
  const handlePublishAllToday = async () => {
    if (!project) return;
    
    setIsPublishingAll(true);
    try {
      toast.info("🚀 Déclenchement de la publication automatique...");
      
      const { data, error } = await supabase.functions.invoke("publish-scheduled-answers", {
        body: { projectId: project.id, forceToday: true }
      });
      
      if (error) throw error;
      
      console.log("[AeoPlanning] publish-scheduled-answers result:", data);
      
      const successCount = data?.results?.filter((r: any) => r.success).length || 0;
      const failedCount = data?.results?.filter((r: any) => !r.success).length || 0;
      
      if (successCount > 0) {
        toast.success(`✅ ${successCount} élément(s) publié(s) avec succès`);
        await fetchScheduledItems();
      } else if (failedCount > 0) {
        toast.error(`❌ ${failedCount} échec(s) de publication`);
      } else {
        toast.info("ℹ️ Aucun contenu à publier pour aujourd'hui");
      }
    } catch (err) {
      console.error("[AeoPlanning] handlePublishAllToday error:", err);
      toast.error("Erreur lors de la publication");
    } finally {
      setIsPublishingAll(false);
    }
  };

  const getItemsForDate = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return scheduledItems.filter((item) => format(item.date, "yyyy-MM-dd") === key);
  };

  const handleDayClick = (date: Date) => {
    const items = getItemsForDate(date);
    setSelectedDate(date);
    if (items.length > 0) {
      setSelectedDayItems(items);
      setShowDayPopup(true);
    }
  };

  const getUpcomingItems = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = addDays(today, 30);
    end.setHours(23, 59, 59, 999);

    return scheduledItems
      .filter((item) => item.date >= today && item.date <= end)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const fetchScheduledItems = async () => {
    if (!user || !project) return;

    setIsLoading(true);
    try {
      // Fetch a wider range to support navigation (today + 120 days)
      const fetchStart = new Date();
      fetchStart.setHours(0, 0, 0, 0);
      const fetchEnd = addDays(fetchStart, 120);
      
      const startStr = format(fetchStart, "yyyy-MM-dd");
      const endStr = format(fetchEnd, "yyyy-MM-dd");

      // 1) Read canonical planning table (guarantees NOT NULL answer_id + article_id)
      const { data: planningRows, error } = await supabase
        .from("planning_days")
        .select("scheduled_date, answer_id, article_id")
        .eq("project_id", project.id)
        .gte("scheduled_date", startStr)
        .lte("scheduled_date", endStr)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;

      const answerIds = (planningRows || []).map((r: any) => r.answer_id).filter(Boolean);
      const articleIds = (planningRows || []).map((r: any) => r.article_id).filter(Boolean);

      // 2) Fetch details for those ids
      const [{ data: answers, error: answersError }, { data: articles, error: articlesError }] = await Promise.all([
        supabase
          .from("answers")
          .select("id, question, scheduled_date, is_public, answer, published_url, score, high_citation, created_at")
          .in("id", answerIds),
        supabase
          .from("articles")
          .select("id, title, scheduled_date, status, aeo_score, word_count, created_at")
          .in("id", articleIds),
      ]);

      if (answersError) throw answersError;
      if (articlesError) throw articlesError;

      const answerById = new Map((answers || []).map((a: any) => [a.id, a]));
      const articleById = new Map((articles || []).map((a: any) => [a.id, a]));

      const items: ScheduledItem[] = [];
      for (const row of (planningRows || []) as any[]) {
        const dayDate = new Date(`${row.scheduled_date}T00:00:00`);

        const a = answerById.get(row.answer_id);
        const art = articleById.get(row.article_id);

        // IMPORTANT: Always use the planning_days scheduled_date (dayDate), NOT the answer/article scheduled_date
        // This keeps the calendar fixed even if the answer's scheduled_date was modified
        if (a) {
          items.push({
            id: a.id,
            title: a.question,
            type: "answer",
            date: dayDate, // Use planning_days date, not answer.scheduled_date
            status: a.published_url ? "published" : a.is_public ? "published" : "scheduled",
            publishedUrl: a.published_url || undefined,
            answer: a.answer,
            score: a.score,
            highCitation: a.high_citation,
            createdAt: a.created_at,
          });
        }

        if (art) {
          items.push({
            id: art.id,
            title: art.title,
            type: "article",
            date: dayDate, // Use planning_days date, not article.scheduled_date
            status: art.status === "published" ? "published" : "scheduled",
            aeoScore: art.aeo_score,
            wordCount: art.word_count,
            createdAt: art.created_at,
          });
        }
      }

      setScheduledItems(items);
    } catch (e) {
      console.error("[AeoPlanning] fetchScheduledItems error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fill missing days in the rolling window (today..today+30)
  useEffect(() => {
    const runFill = async () => {
      if (!project || isGenerating || hasRunFill.current) return;
      hasRunFill.current = true;

      startGeneration("🔍 Checking planning...");

      try {
        const startStr = format(rangeStart, "yyyy-MM-dd");
        const endStr = format(rangeEnd, "yyyy-MM-dd");

        const { data: existingRows } = await supabase
          .from("planning_days")
          .select("scheduled_date")
          .eq("project_id", project.id)
          .gte("scheduled_date", startStr)
          .lte("scheduled_date", endStr);

        const existingSet = new Set((existingRows || []).map((r: any) => r.scheduled_date));

        const missingOffsets: number[] = [];
        rangeDays.forEach((d, idx) => {
          const ds = format(d, "yyyy-MM-dd");
          if (!existingSet.has(ds)) missingOffsets.push(idx);
        });

        if (missingOffsets.length > 0) {
          setGenerationMessage(`📝 Fixing ${missingOffsets.length} missing days...`);

          for (let i = 0; i < missingOffsets.length; i++) {
            const offset = missingOffsets[i];
            const ds = format(addDays(rangeStart, offset), "yyyy-MM-dd");
            const nextDs = format(addDays(rangeStart, offset + 1), "yyyy-MM-dd");

            setGenerationProgress(10 + Math.round(((i + 1) / missingOffsets.length) * 85));
            setGenerationMessage(`📝 Syncing day ${i + 1}/${missingOffsets.length} (${ds})...`);

            // First try: if content already exists (answer + article), just upsert planning_days (no AI call)
            const [{ data: dayAnswers }, { data: dayArticles }] = await Promise.all([
              supabase
                .from("answers")
                .select("id, created_at, article_id")
                .eq("project_id", project.id)
                .gte("scheduled_date", ds)
                .lt("scheduled_date", nextDs)
                .order("created_at", { ascending: true }),
              supabase
                .from("articles")
                .select("id, created_at, linked_answer_id")
                .eq("project_id", project.id)
                .gte("scheduled_date", ds)
                .lt("scheduled_date", nextDs)
                .order("created_at", { ascending: true }),
            ]);

            const answersCount = dayAnswers?.length || 0;
            const articlesCount = dayArticles?.length || 0;

            if (answersCount >= 1 && articlesCount >= 1) {
              const answer = (dayAnswers || [])[0];
              const article =
                (dayArticles || []).find((a: any) => a.linked_answer_id === answer.id) || (dayArticles || [])[0];

              if (answer?.id && article?.id) {
                // Make sure the answer is linked
                if (!answer.article_id || answer.article_id !== article.id) {
                  await supabase
                    .from("answers")
                    .update({ article_id: article.id, has_article: true })
                    .eq("id", answer.id);
                }

                // Upsert into planning_days (NOT NULL guarantees)
                await supabase.from("planning_days").upsert(
                  {
                    project_id: project.id,
                    scheduled_date: ds,
                    answer_id: answer.id,
                    article_id: article.id,
                  },
                  { onConflict: "project_id,scheduled_date" }
                );

                // Done for this day
                continue;
              }
            }

            // Otherwise: generate missing content (will also write planning_days)
            await supabase.functions.invoke("generate-30-days-content", {
              body: {
                projectId: project.id,
                language: project.language || "fr",
                days: 1,
                overwrite: false,
                startOffset: offset,
                questionsPerDay: 1,
              },
            });

            await new Promise((r) => setTimeout(r, 400));
          }

          toast.success(`✨ Planning fixed for ${missingOffsets.length} days`);
        }
      } catch (e) {
        console.error("[AeoPlanning] fill error:", e);
        toast.error("Error generating content");
      } finally {
        await fetchScheduledItems();
        stopGeneration();
      }
    };

    const t = setTimeout(runFill, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  useEffect(() => {
    fetchScheduledItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, project]);

  const totalAnswers = scheduledItems.filter((i) => i.type === "answer").length;
  const totalArticles = scheduledItems.filter((i) => i.type === "article").length;
  const publishedItems = scheduledItems.filter((i) => i.status === "published").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Content Planning</h1>
            <p className="text-muted-foreground mt-1">Rolling window (today + 30 days)</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {isGenerating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating content...</span>
              </div>
            )}
            <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Auto-Publish
            </Button>
          </div>
        </div>

        {/* Legend & Stats */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium text-muted-foreground">Legend:</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-violet-500" />
                <span className="flex items-center gap-1 text-sm">
                  <MessageSquare className="h-3.5 w-3.5 text-violet-600" /> AEO Answers
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="flex items-center gap-1 text-sm">
                  <FileText className="h-3.5 w-3.5 text-emerald-600" /> Blog Articles
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10">
                <MessageSquare className="h-4 w-4 text-violet-600" />
                <span className="font-medium text-violet-700 dark:text-violet-400">{totalAnswers} Answers</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10">
                <FileText className="h-4 w-4 text-emerald-600" />
                <span className="font-medium text-emerald-700 dark:text-emerald-400">{totalArticles} Articles</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">{publishedItems} Published</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Rolling window */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Content Calendar</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(visibleStart, "d MMM yyyy", { locale: enUS })} – {format(visibleEnd, "d MMM yyyy", { locale: enUS })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Navigation buttons */}
                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWeekOffset(Math.max(0, weekOffset - 4))}
                    disabled={weekOffset === 0}
                    className="rounded-none"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWeekOffset(0)}
                    disabled={weekOffset === 0}
                    className="rounded-none text-xs px-2"
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWeekOffset(weekOffset + 4)}
                    className="rounded-none"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {/* View mode toggle */}
                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant={monthViewMode === "calendar" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMonthViewMode("calendar")}
                    className="rounded-none"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={monthViewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMonthViewMode("list")}
                    className="rounded-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {monthViewMode === "calendar" ? (
              <>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: (visibleStart.getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-24 p-1" />
                  ))}

                  {visibleDays.map((day) => {
                    const items = getItemsForDate(day);
                    const hasItems = items.length > 0;
                    const isSelected =
                      selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => handleDayClick(day)}
                        className={cn(
                          "h-28 p-2 rounded-lg border transition-all text-left hover:bg-muted/50 flex flex-col",
                          isToday(day) && "border-primary ring-1 ring-primary/20",
                          isSelected && "bg-primary/10 border-primary",
                          hasItems && "hover:shadow-md cursor-pointer"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                              isToday(day) && "bg-primary text-primary-foreground"
                            )}
                          >
                            {format(day, "d")}
                          </span>
                          {hasItems && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1">
                              {items.length}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex-1 overflow-hidden space-y-0.5">
                          {items.slice(0, 2).map((item) => (
                            <div
                              key={item.id}
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1",
                                item.type === "answer"
                                  ? "bg-violet-500/20 text-violet-700 dark:text-violet-400"
                                  : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              )}
                            >
                              {item.type === "answer" ? (
                                <MessageSquare className="h-2.5 w-2.5 shrink-0" />
                              ) : (
                                <FileText className="h-2.5 w-2.5 shrink-0" />
                              )}
                              <span className="truncate">{item.title.slice(0, 20)}...</span>
                            </div>
                          ))}
                          {items.length > 2 && (
                            <span className="text-[10px] text-muted-foreground font-medium">+{items.length - 2} more</span>
                          )}
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
                    <div key={day.toISOString()} className="border rounded-lg overflow-hidden">
                      <div
                        className={cn(
                          "px-4 py-2 bg-muted/50 flex items-center justify-between",
                          isToday(day) && "bg-primary/10 border-l-4 border-l-primary"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-semibold", isToday(day) && "text-primary")}>
                            {format(day, "EEEE d MMMM", { locale: enUS })}
                          </span>
                          {isToday(day) && (
                            <Badge variant="default" className="text-xs">
                              Today
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary">
                          {items.length} item{items.length > 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="divide-y">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                          >
                            <div
                              className={cn(
                                "p-2 rounded-lg shrink-0",
                                item.type === "answer" ? "bg-violet-500/20" : "bg-emerald-500/20"
                              )}
                            >
                              {item.type === "answer" ? (
                                <MessageSquare className="h-4 w-4 text-violet-600" />
                              ) : (
                                <FileText className="h-4 w-4 text-emerald-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.type === "answer" ? "AEO Answer" : "Blog Article"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.status === "published" ? (
                                <Badge className="bg-emerald-500/20 text-emerald-600 border-0 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Published
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Scheduled
                                </Badge>
                              )}
                              {item.type === "answer" && item.status !== "published" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePublishNow(item)}
                                  disabled={publishingId === item.id}
                                  className="h-7 text-xs"
                                >
                                  {publishingId === item.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Send className="h-3 w-3 mr-1" />
                                      Publish
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {rangeDays.every((day) => getItemsForDate(day).length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No content scheduled in the next 30 days</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Sidebar */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Next 30 Days ({getUpcomingItems().length})
            </h3>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {getUpcomingItems().map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", item.type === "answer" ? "bg-violet-500/20" : "bg-emerald-500/20")}>
                        {item.type === "answer" ? (
                          <MessageSquare className={cn("h-4 w-4 text-violet-600")} />
                        ) : (
                          <FileText className={cn("h-4 w-4 text-emerald-600")} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(item.date, "d MMM yyyy", { locale: enUS })}
                        </p>
                        {item.status === "published" && (
                          <Badge className="mt-1 bg-emerald-500/20 text-emerald-600 border-0 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Published
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs gap-1",
                            item.type === "answer"
                              ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                              : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {item.type === "answer" ? <MessageSquare className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                          {item.type === "answer" ? "Answer" : "Article"}
                        </Badge>

                        {item.type === "answer" && item.status !== "published" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1 text-primary"
                            onClick={() => handlePublishNow(item)}
                            disabled={publishingId === item.id}
                          >
                            {publishingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            Publish
                          </Button>
                        )}

                        {item.status === "published" && item.publishedUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1"
                            onClick={() => window.open(item.publishedUrl, "_blank")}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {getUpcomingItems().length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">No scheduled content</p>
                    <Button variant="outline" size="sm" onClick={() => (window.location.href = "/answers")}>
                      Generate 30 Q/A
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Day Detail Popup */}
        <Dialog open={showDayPopup} onOpenChange={setShowDayPopup}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {selectedDate && format(selectedDate, "EEEE d MMMM yyyy", { locale: enUS })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedDayItems.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg shrink-0", item.type === "answer" ? "bg-violet-500/20" : "bg-emerald-500/20")}>
                      {item.type === "answer" ? (
                        <MessageSquare className="h-4 w-4 text-violet-600" />
                      ) : (
                        <FileText className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs gap-1",
                            item.type === "answer"
                              ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                              : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {item.type === "answer" ? <MessageSquare className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                          {item.type === "answer" ? "Answer" : "Article"}
                        </Badge>
                        {item.status === "published" ? (
                          <Badge className="bg-emerald-500/20 text-emerald-600 border-0 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Published
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/20 text-amber-600 border-0 text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Scheduled
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      {item.answer && <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{item.answer}</p>}

                      <div className="flex gap-2 mt-3">
                        {item.type === "answer" && item.status !== "published" && (
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              handlePublishNow(item);
                              setShowDayPopup(false);
                            }}
                            disabled={publishingId === item.id}
                          >
                            {publishingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            Publish Now
                          </Button>
                        )}
                        {item.publishedUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => window.open(item.publishedUrl, "_blank")}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Auto-Publish Settings Modal */}
        {project && (
          <AutoPublishSettings projectId={project.id} open={showSettingsModal} onOpenChange={setShowSettingsModal} />
        )}
      </div>
    </DashboardLayout>
  );
}
