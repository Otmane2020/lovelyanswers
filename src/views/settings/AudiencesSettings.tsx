"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2, Users, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject, useUpdateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

export function AudiencesSettings() {
  const { project, isLoading } = useActiveProject();
  const updateProject = useUpdateProject();
  
  const [audiences, setAudiences] = useState<string[]>([]);
  const [newAudience, setNewAudience] = useState("");
  const [isSuggestingAI, setIsSuggestingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load audiences from project
  useEffect(() => {
    if (project?.audience) {
      // Parse audience string to array (comma-separated)
      const audienceArray = project.audience
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);
      setAudiences(audienceArray);
    }
  }, [project]);

  const addAudience = () => {
    const trimmed = newAudience.trim();
    if (trimmed && !audiences.includes(trimmed)) {
      setAudiences([...audiences, trimmed]);
      setNewAudience("");
    }
  };

  const removeAudience = (audience: string) => {
    setAudiences(audiences.filter((a) => a !== audience));
  };

  const handleSuggestWithAI = async () => {
    if (!project?.website_url) {
      toast.error("Website URL required for AI suggestions");
      return;
    }

    setIsSuggestingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-audiences", {
        body: {
          projectId: project.id,
          websiteUrl: project.website_url,
          existingAudiences: audiences,
        },
      });

      if (error) throw error;

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        // Add new suggestions that don't already exist
        const newSuggestions = data.suggestions.filter(
          (s: string) => !audiences.includes(s)
        );
        if (newSuggestions.length > 0) {
          setAudiences([...audiences, ...newSuggestions]);
          toast.success(`${newSuggestions.length} audiences suggested`);
        } else {
          toast.info("No new audiences to suggest");
        }
      }
    } catch (error) {
      console.error("Error suggesting audiences:", error);
      toast.error("Failed to get AI suggestions");
    } finally {
      setIsSuggestingAI(false);
    }
  };

  const handleSave = async () => {
    if (!project) return;

    setIsSaving(true);
    try {
      // Save to projects.audience as comma-separated string
      await updateProject.mutateAsync({
        projectId: project.id,
        updates: {
          audience: audiences.join(", "),
        },
      });

      // Also sync to generation_settings.target_audiences
      const { error: genError } = await supabase
        .from("generation_settings")
        .update({
          target_audiences: audiences,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", project.id);

      if (genError) {
        console.error("Error syncing to generation_settings:", genError);
      }

      toast.success("Audiences saved successfully");
    } catch (error) {
      console.error("Error saving audiences:", error);
      toast.error("Failed to save audiences");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addAudience();
    }
  };

  if (isLoading) {
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Target Audiences
          </CardTitle>
          <CardDescription>
            Define your target audiences. AI-generated content (AEO & SEO) will be tailored to these audiences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newAudience}
              onChange={(e) => setNewAudience(e.target.value)}
              placeholder="Enter a target audience (e.g., Small business owners)"
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={addAudience} size="icon" disabled={!newAudience.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={handleSuggestWithAI}
            disabled={isSuggestingAI}
            className="w-full gap-2"
          >
            {isSuggestingAI ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing your website...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Suggest with AI
              </>
            )}
          </Button>

          {audiences.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {audiences.length} audience{audiences.length > 1 ? "s" : ""} defined
              </p>
              <div className="flex flex-wrap gap-2">
                {audiences.map((audience) => (
                  <Badge
                    key={audience}
                    variant="secondary"
                    className="gap-1 pr-1 py-1.5"
                  >
                    {audience}
                    <button
                      onClick={() => removeAudience(audience)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {audiences.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No audiences defined yet. Add manually or use AI suggestions based on your website.
            </p>
          )}

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
              "Save audiences"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How audiences affect content</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• <strong>AEO Answers:</strong> Questions and answers tailored to audience pain points</li>
            <li>• <strong>Articles:</strong> Tone and examples adapted to audience expertise level</li>
            <li>• <strong>Keywords:</strong> Suggested keywords relevant to audience search behavior</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
export default AudiencesSettings;
