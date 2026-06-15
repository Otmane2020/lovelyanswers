"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminNotification {
  id: string;
  message: string;
  type: string;
  countdown_target: string | null;
  cta_label: string | null;
  cta_url: string | null;
}

const STORAGE_KEY = "dismissed_admin_notifications";

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function useCountdown(target: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return "00:00:00";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AdminNotificationBanner() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(getDismissed());

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("admin_notifications")
        .select("id, message, type, countdown_target, cta_label, cta_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (mounted && data) setNotifications(data as AdminNotification[]);
    })();
    return () => { mounted = false; };
  }, []);

  const visible = notifications.filter((n) => !dismissed.includes(n.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <div className="space-y-2">
      {visible.map((n) => <NotificationCard key={n.id} n={n} onDismiss={() => dismiss(n.id)} />)}
    </div>
  );
}

function NotificationCard({ n, onDismiss }: { n: AdminNotification; onDismiss: () => void }) {
  const countdown = useCountdown(n.countdown_target);
  const styles: Record<string, string> = {
    info: "bg-blue-500/10 border-blue-500/30 text-blue-700",
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-700",
  };
  return (
    <div className={cn("rounded-lg border px-4 py-3 flex items-center gap-3", styles[n.type] || styles.info)}>
      <Megaphone className="h-5 w-5 shrink-0" />
      <div className="flex-1 text-sm font-medium">{n.message}</div>
      {countdown && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/60 font-mono text-sm font-bold tabular-nums">
          <Clock className="h-3.5 w-3.5" />{countdown}
        </div>
      )}
      {n.cta_label && n.cta_url && (
        <Button size="sm" onClick={() => window.open(n.cta_url!, "_blank")}>{n.cta_label}</Button>
      )}
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
