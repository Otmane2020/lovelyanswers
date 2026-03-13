"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Play, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ArticleVisuals() {
  const { project, isLoading: projectLoading } = useActiveProject();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Settings state
  const [imageStyle, setImageStyle] = useState<"photo" | "sketch">("photo");
  const [textOverlay, setTextOverlay] = useState(true);
  const [visualInstructions, setVisualInstructions] = useState("");
  const [includeYoutube, setIncludeYoutube] = useState(false);
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [productImages, setProductImages] = useState<string[]>([]);

  // Load settings from project_settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!project) return;
      
      try {
        const { data, error } = await supabase
          .from("project_settings")
          .select("*")
          .eq("project_id", project.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setImageStyle((data.image_style as "photo" | "sketch") || "photo");
          setTextOverlay(data.text_overlay ?? true);
          setVisualInstructions(data.visual_instructions || "");
          setIncludeYoutube(data.include_youtube ?? false);
          setIncludeScreenshot(data.include_screenshot ?? true);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [project]);

  const handleSave = async () => {
    if (!project) return;

    setIsSaving(true);
    try {
      const settings = {
        project_id: project.id,
        image_style: imageStyle,
        text_overlay: textOverlay,
        visual_instructions: visualInstructions,
        include_youtube: includeYoutube,
        include_screenshot: includeScreenshot,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("project_settings")
        .upsert(settings, { onConflict: "project_id" });

      if (error) throw error;

      toast.success("Visual settings saved");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (projectLoading || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No project found. Please create a project first.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Image Style</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setImageStyle("photo")}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-center",
                  imageStyle === "photo"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="w-full h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg mb-3" />
                <span className="font-medium">Photo Realistic</span>
              </button>
              <button
                onClick={() => setImageStyle("sketch")}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-center",
                  imageStyle === "sketch"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="w-full h-24 bg-muted rounded-lg mb-3 flex items-center justify-center">
                  <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/50 rounded-lg" />
                </div>
                <span className="font-medium">Sketch</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Text Overlay</Label>
              <p className="text-xs text-muted-foreground">Add text overlay on images</p>
            </div>
            <Switch checked={textOverlay} onCheckedChange={setTextOverlay} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visualInstructions">Special Instructions</Label>
            <Textarea
              id="visualInstructions"
              value={visualInstructions}
              onChange={(e) => setVisualInstructions(e.target.value)}
              placeholder="Add any special instructions for image generation..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-3">
            <Label>Include</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="youtube"
                  checked={includeYoutube}
                  onCheckedChange={(checked) => setIncludeYoutube(checked as boolean)}
                />
                <label htmlFor="youtube" className="text-sm">YouTube Video</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="screenshot"
                  checked={includeScreenshot}
                  onCheckedChange={(checked) => setIncludeScreenshot(checked as boolean)}
                />
                <label htmlFor="screenshot" className="text-sm">Website Screenshot</label>
              </div>
            </div>
          </div>

          {includeScreenshot && (
            <div className="space-y-2">
              <Label>Website Screenshot</Label>
              <Button variant="outline" className="w-full gap-2">
                <Upload className="w-4 h-4" />
                Upload Screenshot
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Your Product Images</Label>
              <span className="text-xs text-muted-foreground">{productImages.length}/10</span>
            </div>
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop images or click to upload
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Choose files
                </Button>
              </div>
            </div>
          </div>

          <Button variant="outline" className="w-full gap-2">
            <Play className="w-4 h-4" />
            Video Tutorial
          </Button>

          <Button 
            className="w-full" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save settings"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
export default ArticleVisuals;
