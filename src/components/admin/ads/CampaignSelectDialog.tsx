import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Megaphone, Layers } from "lucide-react";

interface Campaign {
  id: string;
  google_campaign_id: string;
  name: string;
  status: string | null;
  advertising_channel_type: string | null;
  spend_7d: number | null;
  clicks_7d: number | null;
  conversions_7d: number | null;
}

interface CampaignSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (campaignId: string | null, campaignName: string) => void;
  title?: string;
  googleCustomerId?: string;
}

export function CampaignSelectDialog({ open, onOpenChange, onSelect, title = "Sélectionner une campagne", googleCustomerId }: CampaignSelectDialogProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) loadCampaigns();
  }, [open]);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      let query = supabase
        .from("campaigns_sync")
        .select("id, google_campaign_id, name, status, advertising_channel_type, spend_7d, clicks_7d, conversions_7d")
        .eq("user_id", session.user.id)
        .order("spend_7d", { ascending: false });
      if (googleCustomerId) {
        query = query.eq("google_customer_id", googleCustomerId);
      }
      const { data } = await query;
      setCampaigns((data as Campaign[]) || []);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Choisissez la campagne à analyser ou lancez une analyse globale
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Chargement...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* All campaigns option */}
            <div
              className="border-2 border-primary/30 rounded-lg p-4 hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
              onClick={() => { onSelect(null, "Toutes les campagnes"); onOpenChange(false); }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Toutes les campagnes</p>
                  <p className="text-xs text-muted-foreground">Analyse globale du compte</p>
                </div>
              </div>
            </div>

            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="border rounded-lg p-3 hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => { onSelect(c.google_campaign_id, c.name); onOpenChange(false); }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Megaphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px]">{c.advertising_channel_type}</Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {(c.spend_7d || 0).toFixed(0)}€ · {c.clicks_7d || 0} clics · {(c.conversions_7d || 0).toFixed(0)} conv.
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={c.status === "ENABLED" ? "default" : "outline"} className="text-[10px] shrink-0">
                        {c.status === "ENABLED" ? "Actif" : "Pause"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {campaigns.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune campagne synchronisée. Lancez une synchronisation d'abord.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
