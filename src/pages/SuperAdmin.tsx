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
  LogOut, Clock, CheckCircle, AlertCircle, Mail
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

const ADMIN_EMAIL = "oben.rockman@gmail.com";

const SuperAdmin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Support state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Users state
  const [subscribers, setSubscribers] = useState<SubscriptionInfo[]>([]);
  const [prospects, setProspects] = useState<UserProfile[]>([]);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email === ADMIN_EMAIL) {
        setIsAuthenticated(true);
        loadAllData();
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth check error:", error);
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
        title: "Réponse envoyée",
        description: "Votre réponse a été envoyée à l'utilisateur.",
      });

      setReplyMessage("");
      loadMessages(selectedTicket.id);
      loadTickets();
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse.",
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
        title: "Statut mis à jour",
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
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertCircle className="h-3 w-3 mr-1" />Ouvert</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="h-3 w-3 mr-1" />En cours</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Résolu</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
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
              Accès Super Admin
            </CardTitle>
            <CardDescription>
              Vous devez être connecté avec le compte administrateur.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connectez-vous avec le compte administrateur pour accéder à cette page.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Se connecter
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
            Déconnexion
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-500/10">
                  <MessageCircle className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tickets.filter(t => t.status === "open").length}</p>
                  <p className="text-sm text-muted-foreground">Tickets ouverts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tickets.filter(t => t.status === "in_progress").length}</p>
                  <p className="text-sm text-muted-foreground">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <CreditCard className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{subscribers.length}</p>
                  <p className="text-sm text-muted-foreground">Abonnés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-500/10">
                  <UserX className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{prospects.length}</p>
                  <p className="text-sm text-muted-foreground">Prospects</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="support" className="space-y-6">
          <TabsList>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Support
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Abonnés
            </TabsTrigger>
            <TabsTrigger value="prospects" className="flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Prospects
            </TabsTrigger>
          </TabsList>

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
                            {format(new Date(ticket.created_at), "d MMM yyyy HH:mm", { locale: fr })}
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
                                  {format(new Date(msg.created_at), "d MMM yyyy HH:mm", { locale: fr })}
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
          <TabsContent value="prospects">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5" />
                  Prospects ({prospects.length})
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
                            ? format(new Date(prospect.created_at), "d MMM yyyy", { locale: fr })
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Mail className="h-4 w-4 mr-2" />
                            Relancer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {prospects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Aucun prospect pour le moment
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdmin;
