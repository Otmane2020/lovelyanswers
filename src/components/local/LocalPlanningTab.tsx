import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  LayoutGrid,
  List,
} from "lucide-react";
import { addDays, eachDayOfInterval, format, isToday } from "date-fns";
import { enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LocalAnswer {
  id: string;
  question: string;
  answer: string;
  score: number;
  createdAt: string;
  scheduledDate?: string;
  isPublished: boolean;
}

interface LocalPlanningTabProps {
  businessName: string;
  answers: LocalAnswer[];
}

export function LocalPlanningTab({ businessName, answers }: LocalPlanningTabProps) {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Calculate visible range (28 days = 4 weeks)
  const visibleStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return addDays(d, weekOffset * 7);
  }, [weekOffset]);

  const visibleEnd = useMemo(() => addDays(visibleStart, 27), [visibleStart]);

  const visibleDays = useMemo(
    () => eachDayOfInterval({ start: visibleStart, end: visibleEnd }),
    [visibleStart, visibleEnd]
  );

  // Get answers scheduled for a specific date
  const getItemsForDate = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return answers.filter((a) => a.scheduledDate && format(new Date(a.scheduledDate), "yyyy-MM-dd") === key);
  };

  const handleDayClick = (date: Date) => {
    const items = getItemsForDate(date);
    if (items.length > 0) {
      setSelectedDate(date);
      setShowDayPopup(true);
    }
  };

  const handlePublish = async (answer: LocalAnswer) => {
    setPublishingId(answer.id);
    try {
      // Simulate publish
      await new Promise((r) => setTimeout(r, 1000));
      toast.success("Published to CMS!");
    } finally {
      setPublishingId(null);
    }
  };

  const totalScheduled = answers.filter((a) => a.scheduledDate).length;
  const totalPublished = answers.filter((a) => a.isPublished).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Local Content Planning</h2>
          <p className="text-muted-foreground">
            Rolling window (today + 30 days) for {businessName}
          </p>
        </div>
      </div>

      {/* Stats */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-muted-foreground">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span className="flex items-center gap-1 text-sm">
                <MessageSquare className="h-3.5 w-3.5 text-orange-600" /> Local Q&A
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10">
              <MessageSquare className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-700 dark:text-orange-400">
                {totalScheduled} Scheduled
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">{totalPublished} Published</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Calendar */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold">Local Content Calendar</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {format(visibleStart, "d MMM yyyy", { locale: enUS })} –{" "}
              {format(visibleEnd, "d MMM yyyy", { locale: enUS })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset((p) => p - 1)}
              disabled={weekOffset <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset((p) => p + 1)}
              disabled={weekOffset >= 12}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="flex border rounded-lg ml-2">
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("calendar")}
                className="rounded-r-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {viewMode === "calendar" ? (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {visibleDays.map((day, idx) => {
                const dayItems = getItemsForDate(day);
                const hasContent = dayItems.length > 0;
                const allPublished = hasContent && dayItems.every((i) => i.isPublished);

                return (
                  <button
                    key={idx}
                    onClick={() => handleDayClick(day)}
                    disabled={!hasContent}
                    className={cn(
                      "min-h-[80px] p-2 rounded-lg border transition-all text-left",
                      "disabled:cursor-default disabled:opacity-60",
                      isToday(day) && "ring-2 ring-primary",
                      hasContent && "hover:border-orange-500 cursor-pointer",
                      allPublished ? "bg-primary/5" : hasContent ? "bg-orange-50 dark:bg-orange-950/20" : ""
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isToday(day) && "text-primary font-bold"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {hasContent && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            allPublished
                              ? "bg-primary/20 text-primary"
                              : "bg-orange-500/20 text-orange-600"
                          )}
                        >
                          {dayItems.length}
                        </Badge>
                      )}
                    </div>
                    {hasContent && (
                      <div className="space-y-1">
                        {dayItems.slice(0, 2).map((item, i) => (
                          <div
                            key={i}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded truncate",
                              item.isPublished
                                ? "bg-primary/20 text-primary"
                                : "bg-orange-500/20 text-orange-700 dark:text-orange-400"
                            )}
                          >
                            {item.question.slice(0, 25)}...
                          </div>
                        ))}
                        {dayItems.length > 2 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{dayItems.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          /* List View */
          <div className="space-y-2">
            {answers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No scheduled local content yet
              </div>
            ) : (
              answers.map((answer) => (
                <div
                  key={answer.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        answer.isPublished ? "bg-primary" : "bg-orange-500"
                      )}
                    />
                    <div>
                      <p className="font-medium text-sm">{answer.question}</p>
                      <p className="text-xs text-muted-foreground">
                        {answer.scheduledDate
                          ? format(new Date(answer.scheduledDate), "d MMM yyyy")
                          : "Not scheduled"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={answer.isPublished ? "default" : "secondary"}>
                    {answer.isPublished ? "Published" : "Scheduled"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      {/* Day Detail Popup */}
      <Dialog open={showDayPopup} onOpenChange={setShowDayPopup}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              {selectedDate && format(selectedDate, "EEEE, d MMMM yyyy", { locale: enUS })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {selectedDate &&
              getItemsForDate(selectedDate).map((item) => (
                <div key={item.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-orange-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{item.question}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                    <Badge variant={item.isPublished ? "default" : "secondary"}>
                      {item.isPublished ? "Published" : "Scheduled"}
                    </Badge>
                  </div>
                  {!item.isPublished && (
                    <Button
                      size="sm"
                      onClick={() => handlePublish(item)}
                      disabled={publishingId === item.id}
                      className="w-full gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      {publishingId === item.id ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="h-3 w-3" />
                          Publish Now
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
