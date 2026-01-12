import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ChevronLeft, ChevronRight, Plus,
  FileText, Clock, Loader2, Send, ExternalLink, CheckCircle2, X, Calendar, Settings, MessageSquare, RefreshCw, List, LayoutGrid
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addDays } from "date-fns";
import { enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGeneration } from "@/contexts/GenerationContext";
import { usePublishAnswer } from "@/hooks/usePublishAnswer";
import { useActiveProject } from "@/hooks/useProjects";
import { toast } from "sonner";
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
  const { startGeneration, stopGeneration, setGenerationProgress, setGenerationMessage, isGenerating } = useGeneration();
  const publishAnswer = usePublishAnswer();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<"month" | "year">("month");
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [selectedDayItems, setSelectedDayItems] = useState<ScheduledItem[]>([]);
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [monthViewMode, setMonthViewMode] = useState<"calendar" | "list">("calendar");
  const hasRunCleanup = useRef(false);

  const handlePublishNow = async (item: ScheduledItem) => {
    if (item.id.startsWith("placeholder-")) {
      toast.error("Content not yet generated");
      return;
    }
    if (!project || item.type !== "answer") {
      toast.error("Only answers can be published");
      return;
    }
    setPublishingId(item.id);
    try {
      await publishAnswer.mutateAsync({ answerId: item.id, projectId: project.id });
      // Refresh items
      setScheduledItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "published" as const } : i))
      );
    } finally {
      setPublishingId(null);
    }
  };

  // Combined: Auto-cleanup excess items + fill missing days
  useEffect(() => {
    const autoCleanupAndFill = async () => {
      if (!project || isGenerating || hasRunCleanup.current) return;
      hasRunCleanup.current = true;
      
      console.log("[AeoPlanning] Starting auto-cleanup and fill check...");
      startGeneration("🔍 Vérification du planning...");
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let totalDeleted = 0;
      const missingDays: number[] = []; // Store day offsets that need content
      
      // STEP 1: Check each day for the next 30 days - cleanup excess AND identify gaps
      for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        setGenerationProgress(Math.round((dayOffset / 30) * 40)); // 0-40% for cleanup phase
        setGenerationMessage(`🔍 Vérification jour ${dayOffset + 1}/30...`);
        
        const dayDate = new Date(today.getTime() + dayOffset * 86400000);
        const dayStr = dayDate.toISOString().split('T')[0];
        const nextDayStr = new Date(dayDate.getTime() + 86400000).toISOString().split('T')[0];
        
        // Fetch all answers for this day
        const { data: dayAnswers } = await supabase
          .from("answers")
          .select("id, created_at")
          .eq("project_id", project.id)
          .gte("scheduled_date", dayStr)
          .lt("scheduled_date", nextDayStr)
          .order("created_at", { ascending: true });
        
        // Fetch all articles for this day
        const { data: dayArticles } = await supabase
          .from("articles")
          .select("id, created_at")
          .eq("project_id", project.id)
          .gte("scheduled_date", dayStr)
          .lt("scheduled_date", nextDayStr)
          .order("created_at", { ascending: true });
        
        const answersCount = dayAnswers?.length || 0;
        const articlesCount = dayArticles?.length || 0;
        
        // If more than 1 answer, delete extras (keep oldest)
        if (answersCount > 1) {
          const idsToDelete = dayAnswers!.slice(1).map(a => a.id);
          console.log(`[AeoPlanning] Day ${dayStr}: Deleting ${idsToDelete.length} extra answers`);
          
          await supabase
            .from("answers")
            .update({ article_id: null, has_article: false })
            .in("id", idsToDelete);
          
          await supabase
            .from("answers")
            .delete()
            .in("id", idsToDelete);
          
          totalDeleted += idsToDelete.length;
        }
        
        // If more than 1 article, delete extras (keep oldest)
        if (articlesCount > 1) {
          const idsToDelete = dayArticles!.slice(1).map(a => a.id);
          console.log(`[AeoPlanning] Day ${dayStr}: Deleting ${idsToDelete.length} extra articles`);
          
          await supabase
            .from("articles")
            .delete()
            .in("id", idsToDelete);
          
          totalDeleted += idsToDelete.length;
        }
        
        // Track days that are missing content (we want 1 answer + 1 article)
        const remainingAnswers = answersCount > 1 ? 1 : answersCount;
        const remainingArticles = articlesCount > 1 ? 1 : articlesCount;
        if (remainingAnswers === 0 || remainingArticles === 0) {
          missingDays.push(dayOffset);
        }
      }
      
      if (totalDeleted > 0) {
        console.log(`[AeoPlanning] Cleanup completed: ${totalDeleted} excess items deleted`);
        toast.success(`🧹 Nettoyage: ${totalDeleted} items en trop supprimés`);
      }
      
      // STEP 2: Fill missing days
      if (missingDays.length > 0) {
        console.log(`[AeoPlanning] Found ${missingDays.length} days without content:`, missingDays);
        setGenerationMessage(`📝 Génération de ${missingDays.length} jours manquants...`);
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            stopGeneration();
            return;
          }
          
          // Generate content for each missing day individually
          for (let i = 0; i < missingDays.length; i++) {
            const dayOffset = missingDays[i];
            const dayDate = new Date(today.getTime() + dayOffset * 86400000);
            const dayStr = dayDate.toISOString().split('T')[0];
            
            setGenerationProgress(40 + Math.round(((i + 1) / missingDays.length) * 55)); // 40-95%
            setGenerationMessage(`📝 Génération jour ${i + 1}/${missingDays.length} (${dayStr})...`);
            
            console.log(`[AeoPlanning] Generating content for day ${dayStr} (offset ${dayOffset})...`);
            
            await supabase.functions.invoke("generate-30-days-content", {
              body: { 
                projectId: project.id, 
                language: project.language || "fr",
                days: 1, // Just 1 day
                overwrite: false,
                startOffset: dayOffset,
                questionsPerDay: 1 // 1 question = 1 answer + 1 article
              },
            });
            
            // Small delay between generations to avoid rate limits
            await new Promise(r => setTimeout(r, 500));
          }
          
          console.log(`[AeoPlanning] Content generation completed for ${missingDays.length} days`);
          toast.success(`✨ ${missingDays.length} jours de contenu générés!`);
          
        } catch (error) {
          console.error("[AeoPlanning] Generation error:", error);
          toast.error("Erreur lors de la génération du contenu");
        }
      } else {
        console.log("[AeoPlanning] All 30 days have content, nothing to generate");
      }
      
      // Refresh the view
      fetchScheduledItems();
      stopGeneration();
    };
    
    // Run cleanup and fill on mount with a small delay
    const timer = setTimeout(autoCleanupAndFill, 1000);
    return () => clearTimeout(timer);
  }, [project]);

  // Fetch scheduled items from answers/articles tables
  const fetchScheduledItems = async () => {
    if (!user || !project) return;
    
    setIsLoading(true);
    try {
      const projectId = project.id;

      // Fetch answers with scheduled_date - same query structure as useAnswers but filtered
      const { data: answers } = await supabase
        .from("answers")
        .select("id, question, scheduled_date, is_public, answer, published_url, score, high_citation, created_at")
        .eq("project_id", projectId)
        .not("scheduled_date", "is", null)
        .order("scheduled_date", { ascending: true })
        .limit(1000);

      // Fetch articles with scheduled_date - same query structure as useArticles but filtered
      const { data: articles } = await supabase
        .from("articles")
        .select("id, title, scheduled_date, status, aeo_score, word_count, created_at")
        .eq("project_id", projectId)
        .not("scheduled_date", "is", null)
        .order("scheduled_date", { ascending: true })
        .limit(1000);

      // Map items with additional fields for consistency with History page
      const items: ScheduledItem[] = [
        ...(answers || []).map(a => ({
          id: a.id,
          title: a.question,
          type: "answer" as const,
          date: new Date(a.scheduled_date!),
          status: a.published_url ? "published" as const : a.is_public ? "published" as const : "scheduled" as const,
          publishedUrl: a.published_url || undefined,
          answer: a.answer,
          score: a.score,
          highCitation: a.high_citation,
          createdAt: a.created_at
        })),
        ...(articles || []).map(a => ({
          id: a.id,
          title: a.title,
          type: "article" as const,
          date: new Date(a.scheduled_date!),
          status: a.status === "published" ? "published" as const : "scheduled" as const,
          aeoScore: a.aeo_score,
          wordCount: a.word_count,
          createdAt: a.created_at
        }))
      ];
      
      console.log("[AeoPlanning] Loaded", items.length, "real items");
      setScheduledItems(items);
    } catch (error) {
      console.error("Error fetching scheduled items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledItems();
  }, [user, project]);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  const getItemsForDate = (date: Date) => {
    return scheduledItems.filter(
      item => format(item.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
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
    const next30Days = addDays(today, 30);
    return scheduledItems
      .filter(item => item.date >= today && item.date <= next30Days)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentDate.getFullYear(), i, 1);
    const items = scheduledItems.filter(item => 
      item.date.getMonth() === i && item.date.getFullYear() === currentDate.getFullYear()
    );
    return { date, items };
  });

  // Stats calculation
  const totalAnswers = scheduledItems.filter(i => i.type === "answer").length;
  const totalArticles = scheduledItems.filter(i => i.type === "article").length;
  const publishedItems = scheduledItems.filter(i => i.status === "published").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Content Planning</h1>
            <p className="text-muted-foreground mt-1">
              Your AEO content is generated automatically
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {isGenerating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating content...</span>
              </div>
            )}
            <Button 
              variant="outline"
              onClick={() => setShowSettingsModal(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Auto-Publish
            </Button>
          </div>
        </div>

        {/* Legend & Stats */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Legend */}
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium text-muted-foreground">Legend:</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-violet-500" />
                <span className="flex items-center gap-1 text-sm">
                  <MessageSquare className="h-3.5 w-3.5 text-violet-600" />
                  AEO Answers
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="flex items-center gap-1 text-sm">
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                  Blog Articles
                </span>
              </div>
            </div>
            
            {/* Stats */}
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

        {/* View Tabs */}
        <Tabs value={view} onValueChange={(v) => setView(v as "month" | "year")}>
          <TabsList>
            <TabsTrigger value="month">Monthly View</TabsTrigger>
            <TabsTrigger value="year">Annual View</TabsTrigger>
          </TabsList>

          <TabsContent value="month" className="mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Calendar/List View */}
              <Card className="lg:col-span-2 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    {format(currentDate, "MMMM yyyy", { locale: enUS })}
                  </h2>
                  <div className="flex gap-2">
                    {/* View Mode Toggle */}
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
                    <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {monthViewMode === "calendar" ? (
                  <>
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                        <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {/* Empty cells for days before the month starts */}
                      {Array.from({ length: (startOfMonth(currentDate).getDay() + 6) % 7 }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-24 p-1" />
                      ))}
                      
                      {monthDays.map(day => {
                        const items = getItemsForDate(day);
                        const isSelected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                        const hasItems = items.length > 0;
                        
                        return (
                          <button
                            key={day.toISOString()}
                            onClick={() => handleDayClick(day)}
                            className={cn(
                              "h-28 p-2 rounded-lg border transition-all text-left hover:bg-muted/50 flex flex-col",
                              isToday(day) && "border-primary ring-1 ring-primary/20",
                              isSelected && "bg-primary/10 border-primary",
                              !isSameMonth(day, currentDate) && "opacity-50",
                              hasItems && "hover:shadow-md cursor-pointer"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                "text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                                isToday(day) && "bg-primary text-primary-foreground"
                              )}>
                                {format(day, "d")}
                              </span>
                              {hasItems && (
                                <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                  {items.length}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex-1 overflow-hidden space-y-0.5">
                              {items.slice(0, 2).map(item => (
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
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  +{items.length - 2} more
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* List View */
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {monthDays.map(day => {
                      const items = getItemsForDate(day);
                      if (items.length === 0) return null;
                      
                      return (
                        <div key={day.toISOString()} className="border rounded-lg overflow-hidden">
                          <div className={cn(
                            "px-4 py-2 bg-muted/50 flex items-center justify-between",
                            isToday(day) && "bg-primary/10 border-l-4 border-l-primary"
                          )}>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm font-semibold",
                                isToday(day) && "text-primary"
                              )}>
                                {format(day, "EEEE d MMMM", { locale: enUS })}
                              </span>
                              {isToday(day) && (
                                <Badge variant="default" className="text-xs">Today</Badge>
                              )}
                            </div>
                            <Badge variant="secondary">{items.length} item{items.length > 1 ? "s" : ""}</Badge>
                          </div>
                          <div className="divide-y">
                            {items.map(item => (
                              <div
                                key={item.id}
                                className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                              >
                                <div className={cn(
                                  "p-2 rounded-lg shrink-0",
                                  item.type === "answer" 
                                    ? "bg-violet-500/20" 
                                    : "bg-emerald-500/20"
                                )}>
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
                    {monthDays.every(day => getItemsForDate(day).length === 0) && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No content scheduled for this month</p>
                        {isGenerating && (
                          <div className="flex items-center justify-center gap-2 mt-4 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Content is being generated automatically...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Sidebar - Upcoming */}
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
                    {getUpcomingItems().map(item => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            item.type === "answer" 
                              ? "bg-violet-500/20" 
                              : "bg-emerald-500/20"
                          )}>
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
                              {item.type === "answer" ? (
                                <MessageSquare className="h-3 w-3" />
                              ) : (
                                <FileText className="h-3 w-3" />
                              )}
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
                                {publishingId === item.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Send className="h-3 w-3" />
                                )}
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
                        <p className="text-sm text-muted-foreground mb-4">
                          No scheduled content
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.location.href = '/answers'}
                        >
                          Generate 30 Q/A
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="year" className="mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{currentDate.getFullYear()}</h2>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {currentDate.getFullYear() - 1}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1))}
                  >
                    {currentDate.getFullYear() + 1}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {months.map(({ date, items }) => (
                  <button
                    key={date.toISOString()}
                    onClick={() => {
                      setCurrentDate(date);
                      setView("month");
                    }}
                    className={cn(
                      "p-4 rounded-lg border transition-all hover:bg-muted/50 text-left",
                      date.getMonth() === new Date().getMonth() && 
                      date.getFullYear() === new Date().getFullYear() && 
                      "border-primary"
                    )}
                  >
                    <p className="font-medium">{format(date, "MMM", { locale: enUS })}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400">
                        <MessageSquare className="h-3 w-3" />
                        <span>{items.filter(i => i.type === "answer").length} answers</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                        <FileText className="h-3 w-3" />
                        <span>{items.filter(i => i.type === "article").length} articles</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

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
              {selectedDayItems.map(item => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      item.type === "answer" 
                        ? "bg-violet-500/20" 
                        : "bg-emerald-500/20"
                    )}>
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
                          {item.type === "answer" ? (
                            <MessageSquare className="h-3 w-3" />
                          ) : (
                            <FileText className="h-3 w-3" />
                          )}
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
                      {item.answer && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                          {item.answer}
                        </p>
                      )}
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
                            {publishingId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
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
          <AutoPublishSettings
            projectId={project.id}
            open={showSettingsModal}
            onOpenChange={setShowSettingsModal}
          />
        )}
      </div>
    </DashboardLayout>
  );
}