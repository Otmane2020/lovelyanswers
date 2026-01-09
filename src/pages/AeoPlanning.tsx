import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ChevronLeft, ChevronRight, Plus,
  FileText, Clock, Loader2, Send, ExternalLink, CheckCircle2, X, Calendar, Settings, MessageSquare
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
}

export default function AeoPlanning() {
  const { user } = useAuth();
  const { project } = useActiveProject();
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

  const handlePublishNow = async (item: ScheduledItem) => {
    if (!project || item.type !== "answer") {
      toast.error("Only answers can be published");
      return;
    }
    setPublishingId(item.id);
    try {
      await publishAnswer.mutateAsync({ answerId: item.id, projectId: project.id });
      // Refresh items
      setScheduledItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: "published" as const } : i
      ));
    } finally {
      setPublishingId(null);
    }
  };

  // Fetch scheduled answers and articles from database
  useEffect(() => {
    const fetchScheduledItems = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Get active project
        const { data: projects } = await supabase
          .from("projects")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1);
        
        if (!projects || projects.length === 0) {
          setIsLoading(false);
          return;
        }

        const projectId = projects[0].id;

        // Fetch answers with scheduled_date
        const { data: answers } = await supabase
          .from("answers")
          .select("id, question, scheduled_date, is_public, answer")
          .eq("project_id", projectId)
          .not("scheduled_date", "is", null);

        // Fetch articles with scheduled_date  
        const { data: articles } = await supabase
          .from("articles")
          .select("id, title, scheduled_date, status")
          .eq("project_id", projectId)
          .not("scheduled_date", "is", null);

        const items: ScheduledItem[] = [
          ...(answers || []).map(a => ({
            id: a.id,
            title: a.question,
            type: "answer" as const,
            date: new Date(a.scheduled_date!),
            status: a.is_public ? "published" as const : "scheduled" as const,
            answer: a.answer
          })),
          ...(articles || []).map(a => ({
            id: a.id,
            title: a.title,
            type: "article" as const,
            date: new Date(a.scheduled_date!),
            status: a.status === "published" ? "published" as const : "scheduled" as const
          }))
        ];

        setScheduledItems(items);
      } catch (error) {
        console.error("Error fetching scheduled items:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScheduledItems();
  }, [user]);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Planning AEO</h1>
            <p className="text-muted-foreground mt-1">
              Schedule and manage your AEO content for the next 30 days
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowSettingsModal(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Auto-Publish
            </Button>
            <Button className="bg-gradient-to-r from-primary to-blue-500 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Content
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <Tabs value={view} onValueChange={(v) => setView(v as "month" | "year")}>
          <TabsList>
            <TabsTrigger value="month">Monthly View</TabsTrigger>
            <TabsTrigger value="year">Annual View</TabsTrigger>
          </TabsList>

          <TabsContent value="month" className="mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <Card className="lg:col-span-2 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    {format(currentDate, "MMMM yyyy", { locale: fr })}
                  </h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => (
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
                              {format(item.date, "d MMM yyyy", { locale: fr })}
                            </p>
                            {item.status === "published" && (
                              <Badge className="mt-1 bg-emerald-500/20 text-emerald-600 border-0 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Published
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <Badge variant="secondary" className="text-xs">
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
                    <p className="font-medium">{format(date, "MMM", { locale: fr })}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                        {items.filter(i => i.type === "answer").length} answers
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {items.filter(i => i.type === "article").length} articles
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
                {selectedDate && format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
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
                        <Badge variant="secondary" className="text-xs">
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