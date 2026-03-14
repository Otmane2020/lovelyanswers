"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Globe, Mail, Users, TrendingUp, Smartphone, Monitor, Tablet, ExternalLink, Search, CalendarDays, List, ChevronDown, ChevronRight } from "lucide-react";
import { format, startOfDay, subDays, isToday, isYesterday } from "date-fns";
import { enUS } from "date-fns/locale";

interface OnboardingSession {
  id: string;
  session_id: string;
  visitor_id: string | null;
  current_step: number | null;
  website_url: string | null;
  language: string | null;
  email: string | null;
  brand_name: string | null;
  business_description: string | null;
  cms: string | null;
  competitors: string[] | null;
  keywords: any;
  audiences: string[] | null;
  traffic_potential: number | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  device_type: string | null;
  completed_at: string | null;
  converted_at: string | null;
  checkout_started_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DayGroup {
  date: Date;
  dateKey: string;
  sessions: OnboardingSession[];
  stats: {
    total: number;
    withEmail: number;
    checkoutStarted: number;
    converted: number;
    avgStep: number;
  };
}

const getDeviceIcon = (deviceType: string | null) => {
  switch (deviceType) {
    case 'mobile':
      return <Smartphone className="h-4 w-4 text-muted-foreground" />;
    case 'tablet':
      return <Tablet className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Monitor className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStepLabel = (step: number | null) => {
  switch (step) {
    case 1: return "URL";
    case 2: return "Language";
    case 3: return "Email";
    case 4: return "Analysis";
    case 5: return "Report";
    case 6: return "Pricing";
    default: return "Started";
  }
};

const getStepColor = (step: number | null) => {
  if (!step) return "bg-gray-500/10 text-gray-500";
  if (step >= 6) return "bg-green-500/10 text-green-500";
  if (step >= 4) return "bg-blue-500/10 text-blue-500";
  if (step >= 2) return "bg-yellow-500/10 text-yellow-500";
  return "bg-gray-500/10 text-gray-500";
};

const getDayLabel = (date: Date) => {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d", { locale: enUS });
};

export function OnboardingTracking() {
  const [sessions, setSessions] = useState<OnboardingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<OnboardingSession | null>(null);
  const [emailFilter, setEmailFilter] = useState("");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"agenda" | "list">("agenda");

  // Filter sessions by email
  const filteredSessions = useMemo(() => {
    if (!emailFilter.trim()) return sessions;
    return sessions.filter(s => 
      s.email?.toLowerCase().includes(emailFilter.toLowerCase())
    );
  }, [sessions, emailFilter]);

  // Group sessions by day
  const dayGroups = useMemo(() => {
    const groups = new Map<string, OnboardingSession[]>();
    
    filteredSessions.forEach(session => {
      const dayKey = format(new Date(session.created_at), "yyyy-MM-dd");
      if (!groups.has(dayKey)) {
        groups.set(dayKey, []);
      }
      groups.get(dayKey)!.push(session);
    });

    const result: DayGroup[] = Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, daySessions]) => {
        const total = daySessions.length;
        const withEmail = daySessions.filter(s => s.email).length;
        const checkoutStarted = daySessions.filter(s => s.checkout_started_at).length;
        const converted = daySessions.filter(s => s.converted_at).length;
        const avgStep = total > 0
          ? daySessions.reduce((acc, s) => acc + (s.current_step || 0), 0) / total
          : 0;

        return {
          date: new Date(dateKey + "T00:00:00"),
          dateKey,
          sessions: daySessions.sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          ),
          stats: { total, withEmail, checkoutStarted, converted, avgStep },
        };
      });

    return result;
  }, [filteredSessions]);

  // Auto-expand today
  useEffect(() => {
    const todayKey = format(new Date(), "yyyy-MM-dd");
    setExpandedDays(new Set([todayKey]));
  }, []);

  const toggleDay = (dateKey: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("onboarding_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error loading onboarding sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const stats = {
    total: sessions.length,
    withEmail: sessions.filter(s => s.email).length,
    checkoutStarted: sessions.filter(s => s.checkout_started_at).length,
    converted: sessions.filter(s => s.converted_at).length,
    avgStep: sessions.length > 0 
      ? (sessions.reduce((acc, s) => acc + (s.current_step || 0), 0) / sessions.length).toFixed(1)
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{stats.withEmail}</p>
            <p className="text-xs text-muted-foreground">With Email</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{stats.checkoutStarted}</p>
            <p className="text-xs text-muted-foreground">Checkout Started</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-500">{stats.converted}</p>
            <p className="text-xs text-muted-foreground">Converted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{stats.avgStep}</p>
            <p className="text-xs text-muted-foreground">Avg Step</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by email..."
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "agenda" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("agenda")}
              className="rounded-none gap-1.5"
            >
              <CalendarDays className="h-4 w-4" />
              Agenda
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-none gap-1.5"
            >
              <List className="h-4 w-4" />
              List
            </Button>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadSessions} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions - Agenda or List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{viewMode === "agenda" ? "Daily Agenda" : "All Sessions"}</CardTitle>
            <CardDescription>
              {viewMode === "agenda"
                ? `${dayGroups.length} days · ${filteredSessions.length} sessions`
                : "Track user progress through the onboarding funnel"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[560px]">
              {viewMode === "agenda" ? (
                <div className="space-y-3">
                  {dayGroups.map((group) => {
                    const isExpanded = expandedDays.has(group.dateKey);
                    const conversionRate = group.stats.total > 0
                      ? Math.round((group.stats.converted / group.stats.total) * 100)
                      : 0;

                    return (
                      <div key={group.dateKey} className="border rounded-xl overflow-hidden">
                        {/* Day Header */}
                        <button
                          onClick={() => toggleDay(group.dateKey)}
                          className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">
                                {getDayLabel(group.date)}
                              </span>
                              {isToday(group.date) && (
                                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                  LIVE
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(group.date, "MMMM d, yyyy", { locale: enUS })}
                            </p>
                          </div>
                          {/* Mini Stats */}
                          <div className="flex items-center gap-4 text-xs shrink-0">
                            <div className="text-center">
                              <p className="font-bold text-sm">{group.stats.total}</p>
                              <p className="text-muted-foreground">sessions</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-sm">{group.stats.withEmail}</p>
                              <p className="text-muted-foreground">emails</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-sm text-green-600">{group.stats.converted}</p>
                              <p className="text-muted-foreground">converted</p>
                            </div>
                            <div className="w-16">
                              <Progress value={conversionRate} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground text-center mt-0.5">{conversionRate}%</p>
                            </div>
                          </div>
                        </button>

                        {/* Day Sessions */}
                        {isExpanded && (
                          <div className="border-t">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Website</TableHead>
                                  <TableHead className="text-xs">Email</TableHead>
                                  <TableHead className="text-xs">Step</TableHead>
                                  <TableHead className="text-xs">Source</TableHead>
                                  <TableHead className="text-xs">Time</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.sessions.map((session) => (
                                  <SessionRow
                                    key={session.id}
                                    session={session}
                                    isSelected={selectedSession?.id === session.id}
                                    onSelect={setSelectedSession}
                                    showTime
                                  />
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {dayGroups.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No sessions found</p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Website</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        isSelected={selectedSession?.id === session.id}
                        onSelect={setSelectedSession}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Session Details */}
        <SessionDetails session={selectedSession} />
      </div>
    </div>
  );
}

function SessionRow({ 
  session, 
  isSelected, 
  onSelect, 
  showTime 
}: { 
  session: OnboardingSession; 
  isSelected: boolean; 
  onSelect: (s: OnboardingSession) => void; 
  showTime?: boolean;
}) {
  return (
    <TableRow 
      className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted' : ''}`}
      onClick={() => onSelect(session)}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          {getDeviceIcon(session.device_type)}
          <div className="truncate max-w-[150px]">
            {session.website_url ? (
              <span className="text-sm">{session.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
            ) : (
              <span className="text-muted-foreground text-sm">No URL</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {session.email ? (
          <span className="text-sm truncate max-w-[120px] block">{session.email}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={getStepColor(session.current_step)}>
          {getStepLabel(session.current_step)}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {session.utm_source || session.referrer?.replace(/^https?:\/\//, '').split('/')[0] || 'Direct'}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {showTime
            ? format(new Date(session.created_at), "HH:mm", { locale: enUS })
            : format(new Date(session.updated_at), "MMM d, HH:mm", { locale: enUS })
          }
        </span>
      </TableCell>
    </TableRow>
  );
}

function SessionDetails({ session }: { session: OnboardingSession | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Details</CardTitle>
        <CardDescription>
          {session ? 'Selected session info' : 'Click a session to view details'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {session ? (
          <div className="space-y-4">
            {session.website_url && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Website
                </p>
                <a 
                  href={session.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {session.website_url.replace(/^https?:\/\//, '')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {session.brand_name && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Brand</p>
                <p className="text-sm font-medium">{session.brand_name}</p>
              </div>
            )}

            {session.email && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </p>
                <p className="text-sm">{session.email}</p>
              </div>
            )}

            <div className="flex gap-4">
              {session.language && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Language</p>
                  <p className="text-sm">{session.language}</p>
                </div>
              )}
              {session.cms && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">CMS</p>
                  <p className="text-sm">{session.cms}</p>
                </div>
              )}
            </div>

            {session.traffic_potential && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Traffic Potential
                </p>
                <p className="text-sm font-medium text-primary">+{session.traffic_potential.toLocaleString()}/mo</p>
              </div>
            )}

            {session.audiences && session.audiences.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Audiences
                </p>
                <div className="flex flex-wrap gap-1">
                  {session.audiences.map((audience, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {audience}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {session.competitors && session.competitors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Competitors</p>
                <div className="flex flex-wrap gap-1">
                  {session.competitors.map((comp, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {session.business_description && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-xs text-muted-foreground line-clamp-3">{session.business_description}</p>
              </div>
            )}

            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium">Acquisition</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p>{session.utm_source || 'Direct'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Medium</p>
                  <p>{session.utm_medium || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Campaign</p>
                  <p>{session.utm_campaign || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Device</p>
                  <p className="capitalize">{session.device_type || 'Desktop'}</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium">Timeline</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started</span>
                  <span>{format(new Date(session.created_at), "MMM d, HH:mm")}</span>
                </div>
                {session.checkout_started_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Checkout</span>
                    <span className="text-blue-500">{format(new Date(session.checkout_started_at), "MMM d, HH:mm")}</span>
                  </div>
                )}
                {session.converted_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Converted</span>
                    <span className="text-green-500">{format(new Date(session.converted_at), "MMM d, HH:mm")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Select a session from the table to view details
          </p>
        )}
      </CardContent>
    </Card>
  );
}
