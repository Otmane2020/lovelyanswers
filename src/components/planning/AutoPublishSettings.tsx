"use client";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Loader2, Globe, Calendar, Save, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface AutoPublishSettingsProps {
  projectId: string;
}

export function AutoPublishSettings({ projectId }: AutoPublishSettingsProps) {
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(true);
  const [humanReviewEnabled, setHumanReviewEnabled] = useState(false);
  const [publishHour, setPublishHour] = useState("08");
  const [publishPeriod, setPublishPeriod] = useState<"AM" | "PM">("AM");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [frequency, setFrequency] = useState("3x_week");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const timezones = [
    { value: "Europe/Paris", label: "Paris" },
    { value: "Europe/London", label: "London" },
    { value: "America/New_York", label: "New York" },
    { value: "America/Los_Angeles", label: "Los Angeles" },
    { value: "America/Chicago", label: "Chicago" },
    { value: "Asia/Tokyo", label: "Tokyo" },
    { value: "Asia/Dubai", label: "Dubai" },
    { value: "Australia/Sydney", label: "Sydney" },
    { value: "UTC", label: "UTC" },
  ];

  // Recommended: 3x/week (Mon/Wed/Fri) — best balance of quality vs volume
  const frequencies = [
    { value: "3x_week", label: "3x/week ✓" },
    { value: "2x_week", label: "2x/week" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  useEffect(() => {
    const loadSettings = async () => {
      if (!projectId) return;

      setIsLoading(true);
      try {
        const { data } = await supabase
          .from("project_settings")
          .select("auto_publish_enabled, publish_hour, timezone, publish_frequency")
          .eq("project_id", projectId)
          .single();

        if (data) {
          setAutoPublishEnabled((data as any).auto_publish_enabled !== false);
          setHumanReviewEnabled((data as any).human_review_enabled === true);
          // Convert 24h to 12h format for display
          const hour24 = parseInt(data.publish_hour || "08");
          const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
          let hour12: number;
          if (hour24 === 0) {
            hour12 = 12;
          } else if (hour24 > 12) {
            hour12 = hour24 - 12;
          } else if (hour24 === 12) {
            hour12 = 12;
          } else {
            hour12 = hour24;
          }
          setPublishHour(hour12.toString().padStart(2, "0"));
          setPublishPeriod(period);
          setTimezone((data as any).timezone || "Europe/Paris");
          setFrequency((data as any).publish_frequency || "3x_week");
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [projectId]);

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
          human_review_enabled: humanReviewEnabled,
          publish_hour: hour24.toString().padStart(2, "0"),
          timezone: timezone,
          publish_frequency: frequency,
          updated_at: new Date().toISOString()
        }, { onConflict: "project_id" });

      if (error) throw error;

      toast.success("Settings saved");
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (setter: (v: any) => void) => (value: any) => {
    setter(value);
    setHasChanges(true);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Auto-Publish Toggle */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background">
        <Switch
          checked={autoPublishEnabled}
          onCheckedChange={handleChange(setAutoPublishEnabled)}
          className="data-[state=checked]:bg-primary"
        />
        <Label className="text-sm font-medium cursor-pointer">
          Auto-Publish
        </Label>
      </div>

      {/* Human Review Queue Toggle */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background">
        <Switch
          checked={humanReviewEnabled}
          onCheckedChange={handleChange(setHumanReviewEnabled)}
          className="data-[state=checked]:bg-amber-500"
        />
        <Eye className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium cursor-pointer">
          Human Review
        </Label>
      </div>

      {/* Frequency — default 3x/week (Mon/Wed/Fri) recommended by Google HCU */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={frequency} onValueChange={handleChange(setFrequency)}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {frequencies.map((freq) => (
              <SelectItem key={freq.value} value={freq.value}>
                {freq.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Time */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <Select value={publishHour} onValueChange={handleChange(setPublishHour)}>
          <SelectTrigger className="w-[70px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {hours.map((hour) => (
              <SelectItem key={hour} value={hour}>
                {hour}:00
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={publishPeriod} onValueChange={handleChange(setPublishPeriod)}>
          <SelectTrigger className="w-[65px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timezone */}
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <Select value={timezone} onValueChange={handleChange(setTimezone)}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timezones.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="h-9"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-1" />
              Save
            </>
          )}
        </Button>
      )}
    </div>
  );
}
