"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Trash2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Notification {
  id: string;
  message: string;
  type: string;
  is_active: boolean;
  countdown_target: string | null;
  cta_label: string | null;
  cta_url: string | null;
  created_at: string;
}

export function AdminNotificationsManager() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [countdown, setCountdown] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load notifications");
    else setItems((data as Notification[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!message.trim()) { toast.error("Message required"); return; }
    setSaving(true);
    const { error } = await supabase.from("admin_notifications").insert({
      message: message.trim(),
      type,
      countdown_target: countdown ? new Date(countdown).toISOString() : null,
      cta_label: ctaLabel.trim() || null,
      cta_url: ctaUrl.trim() || null,
      is_active: true,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Notification published");
    setMessage(""); setCountdown(""); setCtaLabel(""); setCtaUrl(""); setType("info");
    load();
  };

  const toggle = async (n: Notification) => {
    const { error } = await supabase
      .from("admin_notifications")
      .update({ is_active: !n.is_active })
      .eq("id", n.id);
    if (error) toast.error(error.message); else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this notification?")) return;
    const { error } = await supabase.from("admin_notifications").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> Broadcast a Notification
          </CardTitle>
          <CardDescription>
            Sent to every user's dashboard. Add a countdown timer for limited-time offers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="🔥 Black Friday — 50% off Pro plan" rows={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info (blue)</SelectItem>
                  <SelectItem value="success">Success (green)</SelectItem>
                  <SelectItem value="warning">Warning (amber)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Countdown ends at (optional)</Label>
              <Input type="datetime-local" value={countdown} onChange={(e) => setCountdown(e.target.value)} />
            </div>
            <div>
              <Label>CTA Label (optional)</Label>
              <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Upgrade now" />
            </div>
            <div>
              <Label>CTA URL (optional)</Label>
              <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="/pricing" />
            </div>
          </div>
          <Button onClick={create} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Publish
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {items.map((n) => (
                <div key={n.id} className="flex items-center gap-3 border rounded-lg p-3">
                  <Badge variant={n.is_active ? "default" : "outline"}>{n.type}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{n.message}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(n.created_at), "PP p")}
                      {n.countdown_target && ` · ends ${format(new Date(n.countdown_target), "PP p")}`}
                    </div>
                  </div>
                  <Switch checked={n.is_active} onCheckedChange={() => toggle(n)} />
                  <Button variant="ghost" size="icon" onClick={() => remove(n.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
