import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, Plus, Clock, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

interface SupportTicket {
  id: string;
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

const AeoSupport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

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
    } finally {
      setIsLoading(false);
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
      setMessages(data || []);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleCreateTicket = async () => {
    if (!user || !newTicketSubject.trim() || !newTicketMessage.trim()) return;

    setIsSending(true);
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          user_email: user.email || "",
          subject: newTicketSubject,
          message: newTicketMessage,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Add the first message
      await supabase.from("support_messages").insert({
        ticket_id: ticketData.id,
        sender_type: "user",
        message: newTicketMessage,
      });

      toast({
        title: "Ticket created",
        description: "Your support request has been sent.",
      });

      setNewTicketSubject("");
      setNewTicketMessage("");
      setIsCreatingTicket(false);
      loadTickets();
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({
        title: "Error",
        description: "Unable to create ticket.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        ticket_id: selectedTicket.id,
        sender_type: "user",
        message: replyMessage,
      });

      if (error) throw error;

      setReplyMessage("");
      loadMessages(selectedTicket.id);
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: "Unable to send message.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Support</h1>
            <p className="text-muted-foreground">Contact our support team</p>
          </div>
        </div>
        <Button onClick={() => setIsCreatingTicket(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {isCreatingTicket && (
        <Card>
          <CardHeader>
            <CardTitle>New Support Ticket</CardTitle>
            <CardDescription>Describe your issue or question</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                placeholder="Subject of your request"
                value={newTicketSubject}
                onChange={(e) => setNewTicketSubject(e.target.value)}
              />
            </div>
            <div>
              <Textarea
                placeholder="Describe your issue in detail..."
                value={newTicketMessage}
                onChange={(e) => setNewTicketMessage(e.target.value)}
                rows={5}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateTicket} disabled={isSending}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
              <Button variant="outline" onClick={() => setIsCreatingTicket(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              My Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <p className="text-muted-foreground text-center py-4">Loading...</p>
              ) : tickets.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No tickets</p>
              ) : (
                <div className="space-y-2">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTicket?.id === ticket.id
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm line-clamp-1">{ticket.subject}</p>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(ticket.created_at), "MMM d, yyyy", { locale: enUS })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedTicket ? selectedTicket.subject : "Select a ticket"}
            </CardTitle>
            {selectedTicket && (
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedTicket.status)}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {selectedTicket ? (
              <div className="space-y-4">
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.sender_type === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-xs mt-1 ${msg.sender_type === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {format(new Date(msg.created_at), "MMM d, yyyy HH:mm", { locale: enUS })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Separator />
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Your message..."
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
                Select a ticket to view the conversation
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AeoSupport;
