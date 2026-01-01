import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, ExternalLink } from "lucide-react";

export function BusinessSettings() {
  const [description, setDescription] = useState("");
  const [audienceTags, setAudienceTags] = useState<string[]>(["Entrepreneurs", "Small businesses"]);
  const [newTag, setNewTag] = useState("");
  const [brandColor, setBrandColor] = useState("#FF6B2C");
  const [brandVoice, setBrandVoice] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");

  const addTag = () => {
    if (newTag && !audienceTags.includes(newTag)) {
      setAudienceTags([...audienceTags, newTag]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setAudienceTags(audienceTags.filter(t => t !== tag));
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <div className="relative">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your business..."
                className="min-h-[100px] pr-32"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 gap-1.5"
              >
                <Sparkles className="w-3 h-3" />
                Generate with AI
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Audience</Label>
            <p className="text-xs text-muted-foreground">Minimum 2 required</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {audienceTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add audience segment"
                onKeyPress={(e) => e.key === "Enter" && addTag()}
              />
              <Button variant="outline" onClick={addTag}>Add</Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandColor">Brand Color</Label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                id="brandColor"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-10 h-10 rounded-lg border cursor-pointer"
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="flex-1 font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandVoice">Brand Voice Article</Label>
            <Input
              id="brandVoice"
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              placeholder="https://example.com/about-us"
            />
            <p className="text-xs text-muted-foreground">
              URL to an article that represents your brand voice
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sitemap">Sitemap URL</Label>
            <div className="flex gap-2">
              <Input
                id="sitemap"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder="https://example.com/sitemap.xml"
                className="flex-1"
              />
              <Button variant="outline" className="gap-1.5 shrink-0">
                <ExternalLink className="w-4 h-4" />
                View detected links
              </Button>
            </div>
          </div>

          <Button className="w-full">Save</Button>
        </div>
      </Card>
    </div>
  );
}
