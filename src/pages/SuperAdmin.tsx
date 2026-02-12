import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageCircle, Send, Users, CreditCard, UserX, Shield, 
  LogOut, Clock, CheckCircle, AlertCircle, Mail, BarChart3,
  Plus, Trash2, Globe, Building, Phone, RefreshCw, Rocket, Megaphone
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { VisitorAnalytics } from "@/components/admin/VisitorAnalytics";
import { OnboardingTracking } from "@/components/admin/OnboardingTracking";
import { AdminUsersList } from "@/components/admin/AdminUsersList";
import { ActiveArticleUsers } from "@/components/admin/ActiveArticleUsers";
import { GoogleAdsManager } from "@/components/admin/GoogleAdsManager";

interface SupportTicket {
  id: string;
  user_id: string;
  user_email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
}

interface SubscriptionInfo {
  user_id: string;
  email: string;
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
}

interface AdminProspect {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  website: string | null;
  phone: string | null;
  source: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const ADMIN_EMAIL = "oben.rockman@gmail.com";

const SuperAdmin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAdminProspects, setIsLoadingAdminProspects] = useState(false);
  
  // Support state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Users state
  const [subscribers, setSubscribers] = useState<SubscriptionInfo[]>([]);
  const [prospects, setProspects] = useState<UserProfile[]>([]);
  const [adminProspects, setAdminProspects] = useState<AdminProspect[]>([]);
  
  // Add prospect form state
  const [isAddProspectOpen, setIsAddProspectOpen] = useState(false);
  const [newProspect, setNewProspect] = useState({
    email: "",
    full_name: "",
    company: "",
    website: "",
    phone: "",
    source: "",
    notes: "",
    status: "new"
  });

  // Force light theme
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      // Use getSession to ensure the session is fully ready for RLS
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log("[SuperAdmin] No active session");
        setIsAuthenticated(false);
        return;
      }
      
      const user = session.user;
      console.log("[SuperAdmin] User authenticated:", user?.email);
      
      if (user?.email === ADMIN_EMAIL) {
        setIsAuthenticated(true);
        // Small delay to ensure token is propagated for RLS
        await new Promise(resolve => setTimeout(resolve, 250));
        loadAllData();
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("[SuperAdmin] Auth check error:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      loadTickets(),
      loadSubscribers(),
      loadProspects(),
      loadAdminProspects(),
    ]);
  };

  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error loading tickets:", error);
    }
  };

  const loadMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Get the ticket to include the initial message
      const ticket = tickets.find(t => t.id === ticketId);
      const messagesData = data || [];
      
      // Always include the initial ticket message as the first message in the history
      if (ticket?.message) {
        const initialMessage: SupportMessage = {
          id: 'initial-' + ticketId,
          ticket_id: ticketId,
          sender_type: 'user',
          message: ticket.message,
          created_at: ticket.created_at,
        };
        
        // Check if we already have this message (to avoid duplicates)
        const firstMessage = messagesData[0];
        const isDuplicate = firstMessage && 
          firstMessage.message === ticket.message && 
          firstMessage.sender_type === 'user';
        
        if (isDuplicate) {
          setMessages(messagesData);
        } else {
          setMessages([initialMessage, ...messagesData]);
        }
      } else {
        setMessages(messagesData);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const loadSubscribers = async () => {
    try {
      // Get all profiles and check their subscription via credits table
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at");

      if (error) throw error;

      // Get credits info
      const { data: credits } = await supabase
        .from("credits")
        .select("user_id, credits_total");

      const creditsMap = new Map(credits?.map(c => [c.user_id, c.credits_total]) || []);
      
      // Filter subscribed users (those with credits > 0)
      const subscribedUsers: SubscriptionInfo[] = (profiles || [])
        .filter(p => (creditsMap.get(p.id) || 0) > 0)
        .map(p => ({
          user_id: p.id,
          email: p.email || "",
          subscribed: true,
          product_id: null,
          subscription_end: null,
        }));

      setSubscribers(subscribedUsers);
    } catch (error) {
      console.error("Error loading subscribers:", error);
    }
  };

  const loadProspects = async () => {
    try {
      // Get all profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at");

      if (error) throw error;

      // Get credits info
      const { data: credits } = await supabase
        .from("credits")
        .select("user_id, credits_total");

      const creditsMap = new Map(credits?.map(c => [c.user_id, c.credits_total]) || []);
      
      // Filter prospects (those without credits or credits = 0)
      const prospectUsers = (profiles || []).filter(p => !creditsMap.has(p.id) || creditsMap.get(p.id) === 0);

      setProspects(prospectUsers);
    } catch (error) {
      console.error("Error loading prospects:", error);
    }
  };

  const loadAdminProspects = async () => {
    const maxAttempts = 3;
    const baseDelayMs = 250;

    setIsLoadingAdminProspects(true);
    try {
      console.log("[SuperAdmin] Loading admin prospects...");

      // Verify session is active before querying
      const { data: { session } } = await supabase.auth.getSession();
      console.log("[SuperAdmin] Current session:", {
        hasSession: !!session,
        userEmail: session?.user?.email,
      });

      if (!session) {
        console.warn("[SuperAdmin] No session available while loading prospects; skipping");
        setAdminProspects([]);
        return;
      }

      let lastData: AdminProspect[] = [];
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const { data, error } = await supabase
          .from("admin_prospects")
          .select("*")
          .order("created_at", { ascending: false });

        console.log("[SuperAdmin] Admin prospects response:", {
          attempt,
          data,
          error,
          count: data?.length,
          firstItem: data?.[0],
        });

        if (error) {
          lastError = error;
          // No point retrying if we already have an explicit error
          break;
        }

        lastData = (data || []) as AdminProspect[];

        // Heuristic: if we get empty result immediately after login, it can be an auth/RLS propagation race.
        if (lastData.length > 0) break;
        if (attempt < maxAttempts) {
          const delay = baseDelayMs * attempt;
          console.warn(`[SuperAdmin] Prospects empty (attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      if (lastError) {
        console.error("[SuperAdmin] Query error:", lastError);
        toast({
          title: "Erreur",
          description: "Impossible de charger les prospects (droits d'accès).",
          variant: "destructive",
        });
        setAdminProspects([]);
        return;
      }

      setAdminProspects(lastData);
    } catch (error) {
      console.error("[SuperAdmin] Error loading admin prospects:", error);
      toast({
        title: "Erreur",
        description: "Erreur inattendue lors du chargement des prospects.",
        variant: "destructive",
      });
      setAdminProspects([]);
    } finally {
      setIsLoadingAdminProspects(false);
    }
  };

  const handleAddProspect = async () => {
    if (!newProspect.email.trim()) {
      toast({
        title: "Erreur",
        description: "L'email est obligatoire",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("admin_prospects")
        .insert({
          email: newProspect.email.trim(),
          full_name: newProspect.full_name.trim() || null,
          company: newProspect.company.trim() || null,
          website: newProspect.website.trim() || null,
          phone: newProspect.phone.trim() || null,
          source: newProspect.source.trim() || null,
          notes: newProspect.notes.trim() || null,
          status: newProspect.status,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Erreur",
            description: "Ce prospect existe déjà",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Prospect ajouté",
        description: `${newProspect.email} a été ajouté à la liste`,
      });

      setNewProspect({
        email: "",
        full_name: "",
        company: "",
        website: "",
        phone: "",
        source: "",
        notes: "",
        status: "new"
      });
      setIsAddProspectOpen(false);
      loadAdminProspects();
    } catch (error) {
      console.error("Error adding prospect:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le prospect",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProspect = async (id: string) => {
    try {
      const { error } = await supabase
        .from("admin_prospects")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Prospect supprimé",
      });
      loadAdminProspects();
    } catch (error) {
      console.error("Error deleting prospect:", error);
    }
  };

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    loadMessages(ticket.id);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        ticket_id: selectedTicket.id,
        sender_type: "admin",
        message: replyMessage,
      });

      if (error) throw error;

      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === "open") {
        await supabase
          .from("support_tickets")
          .update({ status: "in_progress" })
          .eq("id", selectedTicket.id);
      }

      toast({
        title: "Reply sent",
        description: "Your reply has been sent to the user.",
      });

      setReplyMessage("");
      loadMessages(selectedTicket.id);
      loadTickets();
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: "Unable to send the reply.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status })
        .eq("id", ticketId);

      if (error) throw error;

      toast({
        title: "Status updated",
      });
      loadTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertCircle className="h-3 w-3 mr-1" />Open</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Super Admin Access
            </CardTitle>
            <CardDescription>
              You must be logged in with the administrator account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Log in with the administrator account to access this page.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Super Admin</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main layout with sidebar */}
      <Tabs defaultValue="onboarding" className="flex min-h-[calc(100vh-65px)]">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 border-r bg-card flex flex-col">
          {/* Stats summary */}
          <div className="p-4 space-y-3 border-b">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-yellow-500/10 text-center">
                <p className="text-lg font-bold text-yellow-600">{tickets.filter(t => t.status === "open").length}</p>
                <p className="text-[10px] text-muted-foreground">Open</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 text-center">
                <p className="text-lg font-bold text-blue-600">{tickets.filter(t => t.status === "in_progress").length}</p>
                <p className="text-[10px] text-muted-foreground">In Progress</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10 text-center">
                <p className="text-lg font-bold text-green-600">{subscribers.length}</p>
                <p className="text-[10px] text-muted-foreground">Subscribers</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10 text-center">
                <p className="text-lg font-bold text-orange-600">{prospects.length}</p>
                <p className="text-[10px] text-muted-foreground">Prospects</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <TabsList className="flex flex-col items-stretch h-auto bg-transparent p-2 gap-1">
            <TabsTrigger value="onboarding" className="justify-start gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Rocket className="h-4 w-4" />
              Onboarding
            </TabsTrigger>
            <TabsTrigger value="users" className="justify-start gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="analytics" className="justify-start gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="support" className="justify-start gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <MessageCircle className="h-4 w-4" />
              Support
              {tickets.filter(t => t.status === "open").length > 0 && (
                <Badge variant="destructive" className="ml-auto text-[10px] h-5 min-w-5 px-1.5">
                  {tickets.filter(t => t.status === "open").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="justify-start gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <CreditCard className="h-4 w-4" />
              Subscribers
            </TabsTrigger>
            <TabsTrigger value="prospects" className="justify-start gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <UserX className="h-4 w-4" />
              Prospects
            </TabsTrigger>
            <TabsTrigger value="active-articles" className="justify-start gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Globe className="h-4 w-4" />
              Articles Actifs
            </TabsTrigger>
            <TabsTrigger value="google-ads" className="justify-start gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Megaphone className="h-4 w-4" />
              Google Ads
            </TabsTrigger>
          </TabsList>
        </aside>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-6">

          {/* Onboarding Tracking Tab */}
          <TabsContent value="onboarding">
            <OnboardingTracking />
          </TabsContent>

          {/* Active Articles Tab */}
          <TabsContent value="active-articles">
            <ActiveArticleUsers />
          </TabsContent>

          {/* Google Ads Tab */}
          <TabsContent value="google-ads">
            <GoogleAdsManager />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <AdminUsersList />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <VisitorAnalytics />
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tickets list */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Tous les tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedTicket?.id === ticket.id
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => handleSelectTicket(ticket)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm line-clamp-1">{ticket.subject}</p>
                              <p className="text-xs text-muted-foreground">{ticket.user_email}</p>
                            </div>
                            {getStatusBadge(ticket.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(ticket.created_at), "d MMM yyyy HH:mm", { locale: enUS })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Conversation */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {selectedTicket ? selectedTicket.subject : "Sélectionnez un ticket"}
                      </CardTitle>
                      {selectedTicket && (
                        <p className="text-sm text-muted-foreground">{selectedTicket.user_email}</p>
                      )}
                    </div>
                    {selectedTicket && (
                      <Select
                        value={selectedTicket.status}
                        onValueChange={(value) => handleUpdateTicketStatus(selectedTicket.id, value)}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Ouvert</SelectItem>
                          <SelectItem value="in_progress">En cours</SelectItem>
                          <SelectItem value="resolved">Résolu</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedTicket ? (
                    <div className="space-y-4">
                      <ScrollArea className="h-[350px] pr-4">
                        <div className="space-y-4">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender_type === "admin" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] p-3 rounded-lg ${
                                  msg.sender_type === "admin"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <p className="text-xs font-medium mb-1">
                                  {msg.sender_type === "admin" ? "Admin" : "Utilisateur"}
                                </p>
                                <p className="text-sm">{msg.message}</p>
                                <p className={`text-xs mt-1 ${msg.sender_type === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                  {format(new Date(msg.created_at), "d MMM yyyy HH:mm", { locale: enUS })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <Separator />
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Votre réponse..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          rows={2}
                          className="flex-1"
                        />
                        <Button onClick={handleSendReply} disabled={isSending || !replyMessage.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-20">
                      Sélectionnez un ticket pour voir la conversation
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Subscribers Tab */}
          <TabsContent value="subscribers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Abonnés ({subscribers.length})
                </CardTitle>
                <CardDescription>Liste des utilisateurs avec un abonnement actif</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers.map((sub) => (
                      <TableRow key={sub.user_id}>
                        <TableCell>{sub.email}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Actif
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Mail className="h-4 w-4 mr-2" />
                            Contacter
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {subscribers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Aucun abonné pour le moment
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prospects Tab */}
          <TabsContent value="prospects" className="space-y-6">
            {/* Manual Prospects Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Prospects Manuels ({adminProspects.length})
                    </CardTitle>
                    <CardDescription>Prospects ajoutés manuellement par l'admin</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => loadAdminProspects()}
                       disabled={isLoadingAdminProspects}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                       {isLoadingAdminProspects ? "Chargement..." : "Rafraîchir"}
                    </Button>
                    <Dialog open={isAddProspectOpen} onOpenChange={setIsAddProspectOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un prospect
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Ajouter un prospect</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="email@example.com"
                            value={newProspect.email}
                            onChange={(e) => setNewProspect({ ...newProspect, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Nom complet</Label>
                          <Input
                            id="full_name"
                            placeholder="John Doe"
                            value={newProspect.full_name}
                            onChange={(e) => setNewProspect({ ...newProspect, full_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company">Entreprise</Label>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <Input
                              id="company"
                              placeholder="Nom de l'entreprise"
                              value={newProspect.company}
                              onChange={(e) => setNewProspect({ ...newProspect, company: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website">Site web</Label>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <Input
                              id="website"
                              placeholder="https://example.com"
                              value={newProspect.website}
                              onChange={(e) => setNewProspect({ ...newProspect, website: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Téléphone</Label>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <Input
                              id="phone"
                              placeholder="+33 1 23 45 67 89"
                              value={newProspect.phone}
                              onChange={(e) => setNewProspect({ ...newProspect, phone: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="source">Source</Label>
                          <Select
                            value={newProspect.source}
                            onValueChange={(value) => setNewProspect({ ...newProspect, source: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="D'où vient ce prospect?" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="linkedin">LinkedIn</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="referral">Recommandation</SelectItem>
                              <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                              <SelectItem value="event">Événement</SelectItem>
                              <SelectItem value="other">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="status">Statut</Label>
                          <Select
                            value={newProspect.status}
                            onValueChange={(value) => setNewProspect({ ...newProspect, status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Nouveau</SelectItem>
                              <SelectItem value="contacted">Contacté</SelectItem>
                              <SelectItem value="interested">Intéressé</SelectItem>
                              <SelectItem value="demo_scheduled">Demo planifiée</SelectItem>
                              <SelectItem value="negotiation">Négociation</SelectItem>
                              <SelectItem value="lost">Perdu</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            placeholder="Notes sur ce prospect..."
                            value={newProspect.notes}
                            onChange={(e) => setNewProspect({ ...newProspect, notes: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <Button onClick={handleAddProspect} className="w-full">
                          Ajouter le prospect
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminProspects.map((prospect) => (
                      <TableRow key={prospect.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{prospect.email}</p>
                            {prospect.website && (
                              <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {prospect.website.replace(/^https?:\/\//, '').slice(0, 30)}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{prospect.full_name || "-"}</TableCell>
                        <TableCell>{prospect.company || "-"}</TableCell>
                        <TableCell>
                          {prospect.source ? (
                            <Badge variant="outline" className="capitalize">
                              {prospect.source.replace("_", " ")}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={
                              prospect.status === "interested" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                              prospect.status === "contacted" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                              prospect.status === "demo_scheduled" ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                              prospect.status === "negotiation" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                              prospect.status === "lost" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                              ""
                            }
                          >
                            {prospect.status === "new" ? "Nouveau" :
                             prospect.status === "contacted" ? "Contacté" :
                             prospect.status === "interested" ? "Intéressé" :
                             prospect.status === "demo_scheduled" ? "Demo" :
                             prospect.status === "negotiation" ? "Négo" :
                             prospect.status === "lost" ? "Perdu" :
                             prospect.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(prospect.created_at), "d MMM yyyy", { locale: enUS })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={`mailto:${prospect.email}`}>
                                <Mail className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteProspect(prospect.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {adminProspects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Aucun prospect manuel ajouté. Cliquez sur "Ajouter un prospect" pour commencer.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Auto-detected Prospects Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5" />
                  Prospects Inscrits ({prospects.length})
                </CardTitle>
                <CardDescription>Utilisateurs inscrits mais n'ayant pas souscrit d'abonnement</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Inscription</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prospects.map((prospect) => (
                      <TableRow key={prospect.id}>
                        <TableCell>{prospect.email}</TableCell>
                        <TableCell>{prospect.full_name || "-"}</TableCell>
                        <TableCell>
                          {prospect.created_at 
                            ? format(new Date(prospect.created_at), "d MMM yyyy", { locale: enUS })
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" asChild>
                            <a href={`mailto:${prospect.email}`}>
                              <Mail className="h-4 w-4 mr-2" />
                              Follow Up
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {prospects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No prospects at the moment
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default SuperAdmin;
