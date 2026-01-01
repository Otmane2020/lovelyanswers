import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function ArticleSettings() {
  const [englishType, setEnglishType] = useState("American");
  const [includeCitations, setIncludeCitations] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeInternalLinks, setIncludeInternalLinks] = useState(true);
  const [includeSchema, setIncludeSchema] = useState(false);
  const [citationsRegion, setCitationsRegion] = useState("Worldwide");
  const [articleTypes, setArticleTypes] = useState("All allowed");
  const [articleLength, setArticleLength] = useState("2000");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [wwwPrefix, setWwwPrefix] = useState(false);
  const [trailingSlash, setTrailingSlash] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(WEEKDAYS);
  const [ctaLink, setCtaLink] = useState("");

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

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
            <Label>Citations</Label>
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
            <Label>Article Length</Label>
            <Select value={articleLength} onValueChange={setArticleLength}>
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

          <Button className="w-full">Save settings</Button>
        </div>
      </Card>
    </div>
  );
}
