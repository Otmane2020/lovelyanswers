import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CalendarDays, ChevronLeft, ChevronRight, Plus,
  FileText, Clock
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ScheduledItem {
  id: string;
  title: string;
  type: "answer" | "article";
  date: Date;
  status: "scheduled" | "published" | "draft";
}

// Mock data for scheduled items
const mockScheduledItems: ScheduledItem[] = [
  { id: "1", title: "What is AEO?", type: "answer", date: addDays(new Date(), 2), status: "scheduled" },
  { id: "2", title: "SEO vs AEO comparison", type: "article", date: addDays(new Date(), 5), status: "scheduled" },
  { id: "3", title: "How to optimize for AI?", type: "answer", date: addDays(new Date(), 7), status: "scheduled" },
  { id: "4", title: "Best practices for citations", type: "article", date: addDays(new Date(), 12), status: "scheduled" },
  { id: "5", title: "AI assistants ranking factors", type: "answer", date: addDays(new Date(), 15), status: "scheduled" },
];

export default function AeoPlanning() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<"month" | "year">("month");

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  const getItemsForDate = (date: Date) => {
    return mockScheduledItems.filter(
      item => format(item.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  const getUpcomingItems = () => {
    const today = new Date();
    const next30Days = addDays(today, 30);
    return mockScheduledItems
      .filter(item => item.date >= today && item.date <= next30Days)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentDate.getFullYear(), i, 1);
    const items = mockScheduledItems.filter(item => 
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
          <Button className="bg-gradient-to-r from-primary to-blue-500 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Content
          </Button>
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
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "h-24 p-1 rounded-lg border transition-all text-left hover:bg-muted/50",
                          isToday(day) && "border-primary",
                          isSelected && "bg-primary/10 border-primary",
                          !isSameMonth(day, currentDate) && "opacity-50"
                        )}
                      >
                        <span className={cn(
                          "text-sm font-medium",
                          isToday(day) && "text-primary"
                        )}>
                          {format(day, "d")}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {items.slice(0, 2).map(item => (
                            <div
                              key={item.id}
                              className={cn(
                                "text-[10px] px-1 py-0.5 rounded truncate",
                                item.type === "answer" 
                                  ? "bg-blue-500/20 text-blue-600" 
                                  : "bg-emerald-500/20 text-emerald-600"
                              )}
                            >
                              {item.title}
                            </div>
                          ))}
                          {items.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">
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
                  Next 30 Days
                </h3>
                <div className="space-y-3">
                  {getUpcomingItems().map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          item.type === "answer" 
                            ? "bg-blue-500/20" 
                            : "bg-emerald-500/20"
                        )}>
                          <FileText className={cn(
                            "h-4 w-4",
                            item.type === "answer" ? "text-blue-600" : "text-emerald-600"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(item.date, "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {item.type === "answer" ? "Answer" : "Article"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {getUpcomingItems().length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No scheduled content
                    </p>
                  )}
                </div>
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
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
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
      </div>
    </DashboardLayout>
  );
}