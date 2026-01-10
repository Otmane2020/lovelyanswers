import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Clock, Loader2, Globe } from "lucide-react";
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
  const [publishPeriod, setPublishPeriod] = useState<"AM" | "PM">("AM");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const timezones = [
    { value: "Europe/Paris", label: "Paris (CET/CEST)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "America/New_York", label: "New York (EST/EDT)" },
    { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
    { value: "America/Chicago", label: "Chicago (CST/CDT)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
    { value: "UTC", label: "UTC" },
  ];

  useEffect(() => {
    const loadSettings = async () => {
      if (!projectId) return;
      
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from("project_settings")
          .select("auto_publish_enabled, publish_hour, timezone")
          .eq("project_id", projectId)
          .single();
        
        if (data) {
          setAutoPublishEnabled(data.auto_publish_enabled || false);
          // Convert 24h to 12h format
          const hour24 = parseInt(data.publish_hour || "08");
          const period = hour24 >= 12 ? "PM" : "AM";
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
          setPublishHour(hour12.toString().padStart(2, "0"));
          setPublishPeriod(period);
          setTimezone((data as any).timezone || "Europe/Paris");
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
      // Convert 12h to 24h format
      let hour24 = parseInt(publishHour);
      if (publishPeriod === "PM" && hour24 !== 12) hour24 += 12;
      if (publishPeriod === "AM" && hour24 === 12) hour24 = 0;
      
      const { error } = await supabase
        .from("project_settings")
        .upsert({
          project_id: projectId,
          auto_publish_enabled: autoPublishEnabled,
          publish_hour: hour24.toString().padStart(2, "0"),
          timezone: timezone,
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

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));

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
                Publish Time
              </Label>
              <div className="flex gap-2">
                <Select value={publishHour} onValueChange={setPublishHour}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map((hour) => (
                      <SelectItem key={hour} value={hour}>
                        {hour}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={publishPeriod} onValueChange={(v) => setPublishPeriod(v as "AM" | "PM")}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Timezone
              </Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Content scheduled for today or earlier will be published at this time.
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
