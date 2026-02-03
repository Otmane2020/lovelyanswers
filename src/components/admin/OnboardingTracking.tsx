import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RefreshCw, Globe, Mail, Users, TrendingUp, Smartphone, Monitor, Tablet, ExternalLink } from "lucide-react";
import { format } from "date-fns";
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

export function OnboardingTracking() {
  const [sessions, setSessions] = useState<OnboardingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<OnboardingSession | null>(null);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("onboarding_sessions")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(100);

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

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadSessions} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Onboarding Sessions</CardTitle>
            <CardDescription>Track user progress through the onboarding funnel</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
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
                  {sessions.map((session) => (
                    <TableRow 
                      key={session.id}
                      className={`cursor-pointer hover:bg-muted/50 ${selectedSession?.id === session.id ? 'bg-muted' : ''}`}
                      onClick={() => setSelectedSession(session)}
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
                          {format(new Date(session.updated_at), "MMM d, HH:mm", { locale: enUS })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Session Details */}
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>
              {selectedSession ? 'Selected session info' : 'Click a session to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedSession ? (
              <div className="space-y-4">
                {/* Website */}
                {selectedSession.website_url && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Website
                    </p>
                    <a 
                      href={selectedSession.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {selectedSession.website_url.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Brand Name */}
                {selectedSession.brand_name && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Brand</p>
                    <p className="text-sm font-medium">{selectedSession.brand_name}</p>
                  </div>
                )}

                {/* Email */}
                {selectedSession.email && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </p>
                    <p className="text-sm">{selectedSession.email}</p>
                  </div>
                )}

                {/* Language & CMS */}
                <div className="flex gap-4">
                  {selectedSession.language && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Language</p>
                      <p className="text-sm">{selectedSession.language}</p>
                    </div>
                  )}
                  {selectedSession.cms && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">CMS</p>
                      <p className="text-sm">{selectedSession.cms}</p>
                    </div>
                  )}
                </div>

                {/* Traffic Potential */}
                {selectedSession.traffic_potential && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Traffic Potential
                    </p>
                    <p className="text-sm font-medium text-primary">+{selectedSession.traffic_potential.toLocaleString()}/mo</p>
                  </div>
                )}

                {/* Audiences */}
                {selectedSession.audiences && selectedSession.audiences.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> Audiences
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedSession.audiences.map((audience, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {audience}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competitors */}
                {selectedSession.competitors && selectedSession.competitors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Competitors</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedSession.competitors.map((comp, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {comp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Business Description */}
                {selectedSession.business_description && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{selectedSession.business_description}</p>
                  </div>
                )}

                {/* UTM & Source */}
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs font-medium">Acquisition</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Source</p>
                      <p>{selectedSession.utm_source || 'Direct'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Medium</p>
                      <p>{selectedSession.utm_medium || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Campaign</p>
                      <p>{selectedSession.utm_campaign || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Device</p>
                      <p className="capitalize">{selectedSession.device_type || 'Desktop'}</p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs font-medium">Timeline</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Started</span>
                      <span>{format(new Date(selectedSession.created_at), "MMM d, HH:mm")}</span>
                    </div>
                    {selectedSession.checkout_started_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Checkout</span>
                        <span className="text-blue-500">{format(new Date(selectedSession.checkout_started_at), "MMM d, HH:mm")}</span>
                      </div>
                    )}
                    {selectedSession.converted_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Converted</span>
                        <span className="text-green-500">{format(new Date(selectedSession.converted_at), "MMM d, HH:mm")}</span>
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
      </div>
    </div>
  );
}
