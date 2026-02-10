import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye, Clock, MousePointer, Globe, Monitor, Smartphone, Tablet,
  Facebook, Search, Share2, TrendingUp, Users, ArrowRight, RefreshCw,
  Bot, Sparkles, MessageSquare, Brain
} from "lucide-react";
import { format, subDays, subHours, startOfDay, endOfDay, isToday, isYesterday } from "date-fns";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

interface VisitorSession {
  id: string;
  visitor_id: string;
  session_id: string;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  landing_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  fb_campaign_id: string | null;
  fb_adset_id: string | null;
  fb_ad_id: string | null;
  gclid: string | null;
  page_views: number | null;
  session_duration_seconds: number | null;
  last_page: string | null;
  is_bounce: boolean | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  screen_resolution: string | null;
  language: string | null;
  timezone: string | null;
  converted: boolean | null;
  converted_at: string | null;
  user_id: string | null;
  created_at: string;
}

interface PageView {
  id: string;
  session_id: string;
  visitor_id: string;
  page_path: string;
  page_title: string | null;
  time_on_page_seconds: number | null;
  created_at: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const VisitorAnalytics = () => {
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7d");
  const [selectedSession, setSelectedSession] = useState<VisitorSession | null>(null);

  // Filter out internal traffic (onboarding clients, lovable.dev, and admin pages)
  const isInternalTraffic = (session: VisitorSession): boolean => {
    const referrer = session.referrer?.toLowerCase() || "";
    const landingPage = session.landing_page?.toLowerCase() || "";
    const lastPage = session.last_page?.toLowerCase() || "";
    
    // Filter out lovable.dev and lovableproject.com internal traffic
    if (referrer.includes("lovable.dev") || referrer.includes("lovableproject.com")) {
      return true;
    }
    
    // Filter out onboarding page visits that are internal dev/testing
    if (landingPage === "/onboarding" && referrer.includes("localhost")) {
      return true;
    }
    
    // Filter out superadmin pages
    if (landingPage.includes("/superadmin") || lastPage.includes("/superadmin")) {
      return true;
    }
    
    return false;
  };

  // Group sessions by landing page
  const sessionsByPage = useMemo(() => {
    const grouped: Record<string, VisitorSession[]> = {};
    sessions.forEach(session => {
      const page = session.landing_page || "/";
      if (!grouped[page]) {
        grouped[page] = [];
      }
      grouped[page].push(session);
    });
    // Sort by number of sessions descending
    return Object.entries(grouped)
      .sort((a, b) => b[1].length - a[1].length);
  }, [sessions]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const startDate = dateRange === "24h" 
        ? subHours(new Date(), 24) 
        : dateRange === "7d" 
          ? subDays(new Date(), 7) 
          : subDays(new Date(), 30);

      const [sessionsResult, pageViewsResult] = await Promise.all([
        supabase
          .from("visitor_sessions")
          .select("*")
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("page_views")
          .select("*")
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

      // Filter out internal traffic
      const filteredSessions = (sessionsResult.data || []).filter(s => !isInternalTraffic(s));
      if (filteredSessions) setSessions(filteredSessions);
      if (pageViewsResult.data) setPageViews(pageViewsResult.data);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  // Calculate metrics
  const totalSessions = sessions.length;
  const uniqueVisitors = new Set(sessions.map(s => s.visitor_id)).size;
  const totalPageViews = pageViews.length;
  const avgSessionDuration = sessions.length 
    ? Math.round(sessions.reduce((acc, s) => acc + (s.session_duration_seconds || 0), 0) / sessions.length)
    : 0;
  const bounceRate = sessions.length 
    ? Math.round((sessions.filter(s => s.is_bounce).length / sessions.length) * 100)
    : 0;
  const conversionRate = sessions.length 
    ? Math.round((sessions.filter(s => s.converted).length / sessions.length) * 100)
    : 0;

  // Facebook traffic
  const facebookSessions = sessions.filter(s => s.fbclid || s.utm_source?.toLowerCase() === "facebook");
  const facebookConversions = facebookSessions.filter(s => s.converted).length;

  // Google traffic
  const googleSessions = sessions.filter(s => s.gclid || s.utm_source?.toLowerCase() === "google");

  // AI Sources detection helper
  const getAISource = (session: VisitorSession): string | null => {
    const referrer = session.referrer?.toLowerCase() || "";
    const utmSource = session.utm_source?.toLowerCase() || "";
    
    // ChatGPT / OpenAI
    if (referrer.includes("chat.openai.com") || referrer.includes("chatgpt.com") || utmSource.includes("chatgpt") || utmSource.includes("openai")) {
      return "ChatGPT";
    }
    // Gemini / Google AI
    if (referrer.includes("gemini.google.com") || referrer.includes("bard.google.com") || utmSource.includes("gemini") || utmSource.includes("bard")) {
      return "Gemini";
    }
    // Microsoft Copilot / Bing Chat
    if (referrer.includes("copilot.microsoft.com") || referrer.includes("bing.com/chat") || utmSource.includes("copilot") || utmSource.includes("bing_chat")) {
      return "Copilot";
    }
    // Perplexity AI
    if (referrer.includes("perplexity.ai") || utmSource.includes("perplexity")) {
      return "Perplexity";
    }
    // Claude / Anthropic
    if (referrer.includes("claude.ai") || referrer.includes("anthropic.com") || utmSource.includes("claude")) {
      return "Claude";
    }
    // Lovable Projects (AI-generated sites)
    if (referrer.includes("lovableproject.com") || utmSource.includes("lovable")) {
      return "Lovable";
    }
    return null;
  };

  // AI traffic breakdown
  const aiSessions = sessions.filter(s => getAISource(s) !== null);
  const aiSourcesBreakdown = sessions.reduce((acc, s) => {
    const aiSource = getAISource(s);
    if (aiSource) {
      acc[aiSource] = (acc[aiSource] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const aiSourceData = Object.entries(aiSourcesBreakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const aiConversions = aiSessions.filter(s => s.converted).length;

  // Traffic sources breakdown (with AI sources)
  const trafficSources = sessions.reduce((acc, s) => {
    let source = "Direct";
    const aiSource = getAISource(s);
    if (aiSource) source = aiSource;
    else if (s.fbclid || s.utm_source?.toLowerCase() === "facebook") source = "Facebook";
    else if (s.gclid || s.utm_source?.toLowerCase() === "google") source = "Google";
    else if (s.utm_source) source = s.utm_source;
    else if (s.referrer) {
      try {
        source = new URL(s.referrer).hostname.replace("www.", "");
      } catch {
        source = s.referrer;
      }
    }
    
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const trafficSourceData = Object.entries(trafficSources)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Device breakdown
  const deviceData = sessions.reduce((acc, s) => {
    const device = s.device_type || "unknown";
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deviceChartData = Object.entries(deviceData).map(([name, value]) => ({ name, value }));

  // Top pages
  const topPages = pageViews.reduce((acc, pv) => {
    acc[pv.page_path] = (acc[pv.page_path] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topPagesData = Object.entries(topPages)
    .map(([page, views]) => ({ page, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Sessions over time
  const sessionsOverTime = sessions.reduce((acc, s) => {
    const date = format(new Date(s.created_at), "MMM dd");
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const timelineData = Object.entries(sessionsOverTime)
    .map(([date, count]) => ({ date, sessions: count }))
    .reverse();

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case "mobile": return <Smartphone className="h-4 w-4" />;
      case "tablet": return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getSourceIcon = (session: VisitorSession) => {
    const aiSource = getAISource(session);
    if (aiSource === "ChatGPT") {
      return <MessageSquare className="h-4 w-4 text-emerald-500" />;
    }
    if (aiSource === "Gemini") {
      return <Sparkles className="h-4 w-4 text-blue-400" />;
    }
    if (aiSource === "Copilot") {
      return <Bot className="h-4 w-4 text-cyan-500" />;
    }
    if (aiSource === "Perplexity") {
      return <Brain className="h-4 w-4 text-violet-500" />;
    }
    if (aiSource === "Claude") {
      return <Bot className="h-4 w-4 text-orange-500" />;
    }
    if (aiSource === "Lovable") {
      return <Sparkles className="h-4 w-4 text-pink-500" />;
    }
    if (session.fbclid || session.utm_source?.toLowerCase() === "facebook") {
      return <Facebook className="h-4 w-4 text-blue-500" />;
    }
    if (session.gclid || session.utm_source?.toLowerCase() === "google") {
      return <Search className="h-4 w-4 text-green-500" />;
    }
    if (session.referrer) {
      return <Share2 className="h-4 w-4 text-purple-500" />;
    }
    return <Globe className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><RefreshCw className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Visitors</span>
            </div>
            <p className="text-2xl font-bold mt-1">{uniqueVisitors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Sessions</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalSessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Page Views</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalPageViews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Avg Duration</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatDuration(avgSessionDuration)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Bounce Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">{bounceRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Conversions</span>
            </div>
            <p className="text-2xl font-bold mt-1">{conversionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Traffic Sources */}
      <Card className="border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-cyan-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple-500" />
            AI Traffic Sources (ChatGPT, Gemini, Copilot, etc.)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-3xl font-bold text-purple-500">{aiSessions.length}</p>
              <p className="text-xs text-muted-foreground">AI Sessions</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-500">{aiConversions}</p>
              <p className="text-xs text-muted-foreground">Conversions</p>
            </div>
            <div>
              <p className="text-3xl font-bold">
                {aiSessions.length ? Math.round((aiConversions / aiSessions.length) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Conv. Rate</p>
            </div>
            <div>
              <p className="text-3xl font-bold">
                {totalSessions ? Math.round((aiSessions.length / totalSessions) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">% of Traffic</p>
            </div>
          </div>
          
          {/* AI Sources Breakdown */}
          {aiSourceData.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t">
              {["ChatGPT", "Gemini", "Copilot", "Perplexity", "Claude", "Lovable"].map((source) => {
                const count = aiSourcesBreakdown[source] || 0;
                const icon = source === "ChatGPT" ? <MessageSquare className="h-5 w-5 text-emerald-500" /> :
                             source === "Gemini" ? <Sparkles className="h-5 w-5 text-blue-400" /> :
                             source === "Copilot" ? <Bot className="h-5 w-5 text-cyan-500" /> :
                             source === "Perplexity" ? <Brain className="h-5 w-5 text-violet-500" /> :
                             source === "Claude" ? <Bot className="h-5 w-5 text-orange-500" /> :
                             <Sparkles className="h-5 w-5 text-pink-500" />;
                return (
                  <div key={source} className={`p-3 rounded-lg border ${count > 0 ? 'bg-card' : 'bg-muted/30 opacity-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {icon}
                      <span className="text-sm font-medium">{source}</span>
                    </div>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground pt-4 border-t">
              No AI traffic detected yet. Traffic from ChatGPT, Gemini, Copilot, Perplexity, and Claude will appear here.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Facebook & Google Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Facebook className="h-4 w-4 text-blue-500" />
              Facebook Traffic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold">{facebookSessions.length}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{facebookConversions}</p>
                <p className="text-xs text-muted-foreground">Conversions</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {facebookSessions.length ? Math.round((facebookConversions / facebookSessions.length) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Conv. Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="h-4 w-4 text-green-500" />
              Google Traffic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold">{googleSessions.length}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{googleSessions.filter(s => s.converted).length}</p>
                <p className="text-xs text-muted-foreground">Conversions</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {googleSessions.length ? Math.round((googleSessions.filter(s => s.converted).length / googleSessions.length) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Conv. Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sessions Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Sessions Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trafficSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {trafficSourceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPagesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis dataKey="page" type="category" width={150} className="text-xs" />
                <Tooltip />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Page Views Detail by Period */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Page Views Detail by Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="today">
            <TabsList className="mb-4">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
            </TabsList>
            {["today", "yesterday", "7d", "30d"].map((period) => {
              const now = new Date();
              const filteredPVs = pageViews.filter((pv) => {
                const pvDate = new Date(pv.created_at);
                if (period === "today") return isToday(pvDate);
                if (period === "yesterday") return isYesterday(pvDate);
                if (period === "7d") return pvDate >= subDays(now, 7);
                return pvDate >= subDays(now, 30);
              });

              const pageCounts = filteredPVs.reduce((acc, pv) => {
                acc[pv.page_path] = (acc[pv.page_path] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              const sorted = Object.entries(pageCounts)
                .map(([page, views]) => ({ page, views }))
                .sort((a, b) => b.views - a.views);

              const totalViews = filteredPVs.length;

              return (
                <TabsContent key={period} value={period}>
                  <div className="mb-3 flex items-center gap-3">
                    <Badge variant="outline" className="text-base px-3 py-1">
                      {totalViews} page views
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {sorted.length} unique pages
                    </span>
                  </div>
                  {sorted.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No page views for this period.</p>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Page</TableHead>
                            <TableHead className="text-right w-24">Views</TableHead>
                            <TableHead className="text-right w-24">% Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sorted.map((item, index) => (
                            <TableRow key={item.page}>
                              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                              <TableCell className="font-mono text-sm">{item.page}</TableCell>
                              <TableCell className="text-right font-bold">{item.views}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {totalViews ? Math.round((item.views / totalViews) * 100) : 0}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Sessions Grouped by Page */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Sessions by Page</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {sessionsByPage.map(([page, pageSessions]) => (
                <div key={page} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{page}</span>
                    </div>
                    <Badge variant="outline">{pageSessions.length} sessions</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Visitor ID</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Pages</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>UTM Campaign</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageSessions.slice(0, 10).map((session) => (
                        <TableRow 
                          key={session.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedSession(selectedSession?.id === session.id ? null : session)}
                        >
                          <TableCell>{getSourceIcon(session)}</TableCell>
                          <TableCell className="font-mono text-xs">{session.visitor_id.slice(0, 12)}...</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(session.device_type)}
                              <span className="text-xs">{session.browser}</span>
                            </div>
                          </TableCell>
                          <TableCell>{session.page_views || 1}</TableCell>
                          <TableCell>{formatDuration(session.session_duration_seconds || 0)}</TableCell>
                          <TableCell className="max-w-[100px] truncate">{session.utm_campaign || "-"}</TableCell>
                          <TableCell>
                            {session.converted ? (
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Converted</Badge>
                            ) : session.is_bounce ? (
                              <Badge variant="outline" className="text-muted-foreground">Bounce</Badge>
                            ) : (
                              <Badge variant="outline">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(session.created_at), "MMM dd HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {pageSessions.length > 10 && (
                    <div className="px-4 py-2 text-xs text-muted-foreground text-center border-t">
                      +{pageSessions.length - 10} more sessions
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Session Details Modal */}
      {selectedSession && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              Session Details
              <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>×</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Visitor ID</p>
                <p className="font-mono text-xs">{selectedSession.visitor_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Session ID</p>
                <p className="font-mono text-xs">{selectedSession.session_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Device</p>
                <p>{selectedSession.device_type} / {selectedSession.os}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Browser</p>
                <p>{selectedSession.browser}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Screen</p>
                <p>{selectedSession.screen_resolution}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Language</p>
                <p>{selectedSession.language}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Timezone</p>
                <p>{selectedSession.timezone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Referrer</p>
                <p className="truncate">{selectedSession.referrer || "Direct"}</p>
              </div>
              {selectedSession.utm_source && (
                <div>
                  <p className="text-muted-foreground">UTM Source</p>
                  <p>{selectedSession.utm_source}</p>
                </div>
              )}
              {selectedSession.utm_medium && (
                <div>
                  <p className="text-muted-foreground">UTM Medium</p>
                  <p>{selectedSession.utm_medium}</p>
                </div>
              )}
              {selectedSession.utm_campaign && (
                <div>
                  <p className="text-muted-foreground">UTM Campaign</p>
                  <p>{selectedSession.utm_campaign}</p>
                </div>
              )}
              {selectedSession.fbclid && (
                <div>
                  <p className="text-muted-foreground">Facebook Click ID</p>
                  <p className="font-mono text-xs truncate">{selectedSession.fbclid}</p>
                </div>
              )}
              {selectedSession.fb_campaign_id && (
                <div>
                  <p className="text-muted-foreground">FB Campaign ID</p>
                  <p className="font-mono text-xs">{selectedSession.fb_campaign_id}</p>
                </div>
              )}
              {selectedSession.gclid && (
                <div>
                  <p className="text-muted-foreground">Google Click ID</p>
                  <p className="font-mono text-xs truncate">{selectedSession.gclid}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
