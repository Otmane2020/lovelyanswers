import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, ChevronLeft, ChevronRight, MessageSquare, FileText, Loader2, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addDays, eachDayOfInterval, format, isToday } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useActiveProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";

interface ScheduledAnswer {
  id: string;
  question: string;
  score: number | null;
  scheduled_date: string;
}

interface ScheduledArticle {
  id: string;
  title: string;
  aeo_score: number | null;
  scheduled_date: string;
  status: string | null;
}

export default function Answers() {
  const { project } = useActiveProject();
  const [answers, setAnswers] = useState<ScheduledAnswer[]>([]);
  const [articles, setArticles] = useState<ScheduledArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTab, setActiveTab] = useState("calendar");
  const [searchQuery, setSearchQuery] = useState("");

  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const visibleStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return addDays(d, weekOffset * 7);
  }, [weekOffset]);

  const visibleEnd = useMemo(() => addDays(visibleStart, 27), [visibleStart]);
  const visibleDays = useMemo(() => eachDayOfInterval({ start: visibleStart, end: visibleEnd }), [visibleStart, visibleEnd]);

  useEffect(() => {
    const fetchData = async () => {
      if (!project?.id) return;
      setIsLoading(true);
      try {
        const [{ data: answersData }, { data: articlesData }] = await Promise.all([
          supabase
            .from("answers")
            .select("id, question, score, scheduled_date")
            .eq("project_id", project.id)
            .not("scheduled_date", "is", null)
            .order("scheduled_date", { ascending: true }),
          supabase
            .from("articles")
            .select("id, title, aeo_score, scheduled_date, status")
            .eq("project_id", project.id)
            .not("scheduled_date", "is", null)
            .order("scheduled_date", { ascending: true }),
        ]);
        setAnswers((answersData || []) as ScheduledAnswer[]);
        setArticles((articlesData || []) as ScheduledArticle[]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [project?.id]);

  const getItemsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayAnswers = answers.filter(a => a.scheduled_date?.startsWith(dateStr));
    const dayArticles = articles.filter(a => a.scheduled_date?.startsWith(dateStr));
    return { answers: dayAnswers, articles: dayArticles, total: dayAnswers.length + dayArticles.length };
  };

  const handleDayClick = (date: Date) => {
    const items = getItemsForDate(date);
    if (items.total > 0) {
      setSelectedDay(date);
      setShowDayPopup(true);
    }
  };

  // All items as flat list for list view
  const allItems = useMemo(() => {
    const items: { id: string; title: string; type: "answer" | "article"; date: string; score: number | null }[] = [];
    answers.forEach(a => items.push({ id: a.id, title: a.question, type: "answer", date: a.scheduled_date, score: a.score }));
    articles.forEach(a => items.push({ id: a.id, title: a.title, type: "article", date: a.scheduled_date, score: a.aeo_score }));
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [answers, articles]);

  const filteredItems = allItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedDayItems = selectedDay ? getItemsForDate(selectedDay) : null;

  const totalAnswers = answers.length;
  const totalArticles = articles.length;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">AEO Content Plan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalAnswers} answers · {totalArticles} articles planned
          </p>
        </div>

        {/* Stats badges */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-xs sm:text-sm font-medium text-primary">
            <MessageSquare className="h-3.5 w-3.5" />
            {totalAnswers} Answers
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-xs sm:text-sm font-medium text-emerald-700">
            <FileText className="h-3.5 w-3.5" />
            {totalArticles} Articles
          </div>
        </div>

        {/* Tabs: Calendar / List */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-[250px] grid-cols-2">
            <TabsTrigger value="calendar" className="text-xs sm:text-sm gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="list" className="text-xs sm:text-sm gap-1.5">
              <Search className="h-3.5 w-3.5" /> List
            </TabsTrigger>
          </TabsList>

          {/* Calendar View */}
          <TabsContent value="calendar" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Card className="p-3 sm:p-4">
                {/* Calendar navigation */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {format(visibleStart, "d MMM", { locale: enUS })} – {format(visibleEnd, "d MMM", { locale: enUS })}
                  </p>
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
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                    <div key={i} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1">
                      <span className="hidden sm:inline">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</span>
                      <span className="sm:hidden">{day}</span>
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                  {/* Empty cells for offset */}
                  {Array.from({ length: (visibleStart.getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-14 sm:h-24" />
                  ))}
                  {visibleDays.map((day) => {
                    const items = getItemsForDate(day);
                    const hasItems = items.total > 0;
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => handleDayClick(day)}
                        className={cn(
                          "h-14 sm:h-24 p-1 sm:p-2 rounded-md sm:rounded-lg border transition-all text-left flex flex-col",
                          isToday(day) && "border-primary ring-1 ring-primary/20",
                          hasItems && "hover:shadow-md cursor-pointer hover:bg-muted/50",
                          !hasItems && "opacity-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-[10px] sm:text-sm font-semibold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full",
                            isToday(day) && "bg-primary text-primary-foreground"
                          )}>
                            {format(day, "d")}
                          </span>
                          {hasItems && (
                            <Badge variant="secondary" className="text-[8px] sm:text-[9px] h-3.5 sm:h-4 px-1">
                              {items.total}
                            </Badge>
                          )}
                        </div>
                        {/* Mobile: colored dots / Desktop: mini items */}
                        <div className="mt-0.5 sm:mt-1 flex-1 overflow-hidden">
                          {/* Mobile dots */}
                          <div className="flex gap-0.5 sm:hidden flex-wrap">
                            {items.answers.slice(0, 2).map(a => (
                              <div key={a.id} className="w-2 h-2 rounded-full bg-primary" />
                            ))}
                            {items.articles.slice(0, 2).map(a => (
                              <div key={a.id} className="w-2 h-2 rounded-full bg-emerald-500" />
                            ))}
                          </div>
                          {/* Desktop mini labels */}
                          <div className="hidden sm:flex sm:flex-col gap-0.5">
                            {items.answers.slice(0, 1).map(a => (
                              <div key={a.id} className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium bg-primary/10 text-primary flex items-center gap-1">
                                <MessageSquare className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">{a.question.slice(0, 18)}…</span>
                              </div>
                            ))}
                            {items.articles.slice(0, 1).map(a => (
                              <div key={a.id} className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium bg-emerald-500/20 text-emerald-700 flex items-center gap-1">
                                <FileText className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">{a.title.slice(0, 18)}…</span>
                              </div>
                            ))}
                            {items.total > 2 && (
                              <span className="text-[10px] text-muted-foreground">+{items.total - 2}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="mt-4 space-y-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No planned content found</p>
              </Card>
            ) : (
              <div className="grid gap-2">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        item.type === "answer" ? "bg-primary/10" : "bg-emerald-500/10"
                      )}>
                        {item.type === "answer"
                          ? <MessageSquare className="h-4 w-4 text-primary" />
                          : <FileText className="h-4 w-4 text-emerald-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-2">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.date), "MMM d, yyyy")}
                          </span>
                          <Badge variant="secondary" className="text-[10px] h-4">
                            {item.type === "answer" ? "AEO" : "SEO"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Day detail popup */}
      <Dialog open={showDayPopup} onOpenChange={setShowDayPopup}>
        <DialogContent className="w-[calc(100vw-32px)] max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {selectedDay && format(selectedDay, "EEEE, MMMM d", { locale: enUS })}
            </DialogTitle>
          </DialogHeader>

          {selectedDayItems && (
            <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto">
              {selectedDayItems.answers.map(answer => (
                <Card key={answer.id} className="p-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="text-[10px] h-4 mb-1.5">AEO Answer</Badge>
                      <p className="text-sm font-medium leading-snug">{answer.question}</p>
                      {answer.score !== null && (
                        <p className="text-xs text-muted-foreground mt-1">Score: {answer.score}%</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {selectedDayItems.articles.map(article => (
                <Card key={article.id} className="p-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="text-[10px] h-4 mb-1.5">SEO Article</Badge>
                      <p className="text-sm font-medium leading-snug">{article.title}</p>
                      {article.aeo_score !== null && (
                        <p className="text-xs text-muted-foreground mt-1">AEO Score: {article.aeo_score}%</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
