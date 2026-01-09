import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AutoPublishSettingsProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutoPublishSettings({ projectId, open, onOpenChange }: AutoPublishSettingsProps) {
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);
  const [publishHour, setPublishHour] = useState("08");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!projectId) return;
      
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from("project_settings")
          .select("auto_publish_enabled, publish_hour")
          .eq("project_id", projectId)
          .single();
        
        if (data) {
          setAutoPublishEnabled(data.auto_publish_enabled || false);
          setPublishHour(data.publish_hour || "08");
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      loadSettings();
    }
  }, [projectId, open]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("project_settings")
        .upsert({
          project_id: projectId,
          auto_publish_enabled: autoPublishEnabled,
          publish_hour: publishHour,
          updated_at: new Date().toISOString()
        }, { onConflict: "project_id" });
      
      if (error) throw error;
      
      toast.success("Settings saved");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Auto-Publish Settings
          </DialogTitle>
          <DialogDescription>
            Configure automatic publishing of scheduled content to your connected CMS.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <Label className="font-medium">Auto-Publish</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically publish scheduled answers daily
                </p>
              </div>
              <Switch
                checked={autoPublishEnabled}
                onCheckedChange={setAutoPublishEnabled}
              />
            </div>

            {/* Publish Hour */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Publish Hour (UTC)
              </Label>
              <Select value={publishHour} onValueChange={setPublishHour}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select hour" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Content scheduled for today or earlier will be published at this hour.
              </p>
            </div>

            {/* Save Button */}
            <Button 
              className="w-full" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
