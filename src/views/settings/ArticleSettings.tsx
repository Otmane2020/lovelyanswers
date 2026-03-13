"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function ArticleSettings() {
  const { project, isLoading: projectLoading } = useActiveProject();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Settings state
  const [englishType, setEnglishType] = useState("American");
  const [includeCitations, setIncludeCitations] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeInternalLinks, setIncludeInternalLinks] = useState(true);
  const [includeSchema, setIncludeSchema] = useState(false);
  const [citationsRegion, setCitationsRegion] = useState("Worldwide");
  const [articleTypes, setArticleTypes] = useState("All allowed");
  const [articleLength, setArticleLength] = useState(2000);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [wwwPrefix, setWwwPrefix] = useState(false);
  const [trailingSlash, setTrailingSlash] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(WEEKDAYS);
  const [ctaLink, setCtaLink] = useState("");

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
          setEnglishType(data.english_type || "American");
          setIncludeCitations(data.include_citations ?? true);
          setIncludeToc(data.include_toc ?? true);
          setIncludeSummary(data.include_summary ?? true);
          setIncludeInternalLinks(data.include_internal_links ?? true);
          setIncludeSchema(data.include_schema ?? false);
          setCitationsRegion(data.citations_region || "Worldwide");
          setArticleTypes(data.article_types || "All allowed");
          setArticleLength(data.article_length || 2000);
          setSpecialInstructions(data.special_instructions || "");
          setWwwPrefix(data.www_prefix ?? false);
          setTrailingSlash(data.trailing_slash ?? false);
          setSelectedDays(data.article_schedule || WEEKDAYS);
          setCtaLink(data.cta_link || "");
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [project]);

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSave = async () => {
    if (!project) return;

    setIsSaving(true);
    try {
      const settings = {
        project_id: project.id,
        english_type: englishType,
        include_citations: includeCitations,
        include_toc: includeToc,
        include_summary: includeSummary,
        include_internal_links: includeInternalLinks,
        include_schema: includeSchema,
        citations_region: citationsRegion,
        article_types: articleTypes,
        article_length: articleLength,
        special_instructions: specialInstructions,
        www_prefix: wwwPrefix,
        trailing_slash: trailingSlash,
        article_schedule: selectedDays,
        cta_link: ctaLink,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("project_settings")
        .upsert(settings, { onConflict: "project_id" });

      if (error) throw error;

      toast.success("Article settings saved");
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
          <div className="space-y-2">
            <Label>English Type</Label>
            <Select value={englishType} onValueChange={setEnglishType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="American">American English</SelectItem>
                <SelectItem value="British">British English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Include</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="citations"
                  checked={includeCitations}
                  onCheckedChange={(checked) => setIncludeCitations(checked as boolean)}
                />
                <label htmlFor="citations" className="text-sm">Citations</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="toc"
                  checked={includeToc}
                  onCheckedChange={(checked) => setIncludeToc(checked as boolean)}
                />
                <label htmlFor="toc" className="text-sm">Table of Content</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="summary"
                  checked={includeSummary}
                  onCheckedChange={(checked) => setIncludeSummary(checked as boolean)}
                />
                <label htmlFor="summary" className="text-sm">Summary Section</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="internalLinks"
                  checked={includeInternalLinks}
                  onCheckedChange={(checked) => setIncludeInternalLinks(checked as boolean)}
                />
                <label htmlFor="internalLinks" className="text-sm">Internal Links</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="schema"
                  checked={includeSchema}
                  onCheckedChange={(checked) => setIncludeSchema(checked as boolean)}
                />
                <label htmlFor="schema" className="text-sm">Schema Markup</label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Citations Region</Label>
            <Select value={citationsRegion} onValueChange={setCitationsRegion}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Worldwide">Worldwide</SelectItem>
                <SelectItem value="USA">USA</SelectItem>
                <SelectItem value="Europe">Europe</SelectItem>
                <SelectItem value="Asia">Asia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Allowed Article Types</Label>
            <Select value={articleTypes} onValueChange={setArticleTypes}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All allowed">All allowed</SelectItem>
                <SelectItem value="How-to guides">How-to guides</SelectItem>
                <SelectItem value="Listicles">Listicles</SelectItem>
                <SelectItem value="Comparisons">Comparisons</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Article Length (words)</Label>
            <Select value={String(articleLength)} onValueChange={(v) => setArticleLength(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1000">1000 words</SelectItem>
                <SelectItem value="1500">1500 words</SelectItem>
                <SelectItem value="2000">2000 words</SelectItem>
                <SelectItem value="2500">2500 words</SelectItem>
                <SelectItem value="3000">3000 words</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Special Instructions</Label>
            <Textarea
              id="instructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Add any special instructions for article generation..."
              className="min-h-[80px]"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {specialInstructions.length}/1000
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Add 'www' Prefix</Label>
              <p className="text-xs text-muted-foreground">Add www to all URLs</p>
            </div>
            <Switch checked={wwwPrefix} onCheckedChange={setWwwPrefix} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Add '/' trailing slash</Label>
              <p className="text-xs text-muted-foreground">Add trailing slash to URLs</p>
            </div>
            <Switch checked={trailingSlash} onCheckedChange={setTrailingSlash} />
          </div>

          <div className="space-y-2">
            <Label>Article Schedule</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <Button
                  key={day}
                  variant={selectedDays.includes(day) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDay(day)}
                  className="text-xs"
                >
                  {day.slice(0, 3)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cta">CTA Link</Label>
            <Input
              id="cta"
              value={ctaLink}
              onChange={(e) => setCtaLink(e.target.value)}
              placeholder="https://example.com/get-started"
            />
          </div>

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
export default ArticleSettings;
