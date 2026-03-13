"use client";
import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Link2,
  ExternalLink,
  Trash2,
  Sparkles,
  TrendingUp,
  ArrowLeftRight,
  Info,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface BacklinkPartner {
  id: string;
  target_name: string;
  target_url: string;
  target_description: string | null;
  anchor_examples: string[] | null;
  is_enabled: boolean;
}

// ─── Full curated list of platform clients ────────────────────────────────────
// sector: keywords used to auto-match against the current project's website / business type
const ALL_PLATFORM_CLIENTS = [
  {
    target_name: "Vends-le",
    target_url: "https://vends-le.fr",
    sector: "furniture home decoration interior design meuble canapé salon déco",
    category: "Furniture & Home",
    target_description: "Second-hand furniture & home goods marketplace — buyers and sellers of vintage and used pieces.",
    anchor_examples: [
      "Vends-le",
      "second-hand furniture marketplace",
      "sell furniture online",
      "used furniture listings",
      "buy pre-owned sofas",
    ],
    why: "Links between home decoration and resale platforms signal strong topical authority to AI engines.",
  },
  {
    target_name: "SweetDeco",
    target_url: "https://sweetdeco.com",
    sector: "furniture home decoration interior design canapé salon décoration meuble",
    category: "Furniture & Home",
    target_description: "Premium home decoration and furniture e-commerce — sofas, living room and bedroom collections.",
    anchor_examples: [
      "SweetDeco",
      "premium home decoration",
      "designer sofas",
      "living room furniture",
      "interior design online",
    ],
    why: "Same sector cross-links reinforce entity clusters that AI models use to cite authoritative sources.",
  },
  {
    target_name: "Starlinko",
    target_url: "https://starlinko.fr",
    sector: "reviews local business visibility avis local seo reputation marketing",
    category: "Reviews & Visibility",
    target_description: "AI-powered local visibility platform — automates customer review collection and boosts local presence.",
    anchor_examples: [
      "Starlinko",
      "automated customer reviews",
      "local AI visibility",
      "collect customer feedback",
      "boost local reputation",
    ],
    why: "Review platforms naturally complement any business selling products or services locally.",
  },
  {
    target_name: "AutoPilot Geo",
    target_url: "https://autopilotgeo.com",
    sector: "seo aeo content ai marketing digital strategy content generation",
    category: "AI & SEO",
    target_description: "Answer Engine Optimization platform — generates AI-cited content for ChatGPT, Gemini and Perplexity.",
    anchor_examples: [
      "AutoPilot Geo",
      "Answer Engine Optimization",
      "AI search optimization",
      "AEO platform",
      "content for AI assistants",
    ],
    why: "Linking to the AEO authority platform strengthens your content's credibility signal across AI engines.",
  },
];

// ─── Sector-based auto-matching ───────────────────────────────────────────────
function getRelevantPartners(project: { website_url?: string; brand_name?: string; business_type?: string } | undefined) {
  if (!project) return ALL_PLATFORM_CLIENTS;

  const context = [
    project.website_url ?? "",
    project.brand_name ?? "",
    (project as any).business_type ?? "",
    (project as any).description ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const scored = ALL_PLATFORM_CLIENTS.map((p) => {
    const sectorWords = p.sector.toLowerCase().split(" ");
    const matches = sectorWords.filter((w) => w.length > 3 && context.includes(w)).length;
    return { ...p, score: matches };
  });

  // Sort by relevance — always show all but highlight relevant ones first
  return scored.sort((a, b) => b.score - a.score);
}

// ─── Group by category ────────────────────────────────────────────────────────
function groupByCategory(partners: typeof ALL_PLATFORM_CLIENTS) {
  return partners.reduce<Record<string, typeof ALL_PLATFORM_CLIENTS>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});
}

// ─── Category badge colors ────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  "Furniture & Home": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Reviews & Visibility": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "AI & SEO": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
};

export function BacklinksSettings() {
  const { project } = useActiveProject();
  const [backlinks, setBacklinks] = useState<BacklinkPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const sortedPartners = useMemo(() => getRelevantPartners(project), [project]);
  const grouped = useMemo(() => groupByCategory(sortedPartners), [sortedPartners]);

  useEffect(() => {
    if (project?.id) fetchBacklinks();
  }, [project?.id]);

  const fetchBacklinks = async () => {
    if (!project?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("project_backlinks" as any)
      .select("*")
      .eq("source_project_id", project.id)
      .order("created_at", { ascending: true });

    if (!error && data) setBacklinks(data as unknown as BacklinkPartner[]);
    setLoading(false);
  };

  const getBacklinkForPartner = (url: string) =>
    backlinks.find((b) => b.target_url === url);

  const enablePartner = async (partner: (typeof ALL_PLATFORM_CLIENTS)[0]) => {
    if (!project?.id) return;
    const existing = getBacklinkForPartner(partner.target_url);

    if (existing) {
      // Just enable
      await toggleBacklink(existing.id, true);
      return;
    }

    // Insert + enable immediately
    setSaving(partner.target_url);
    const { error } = await supabase.from("project_backlinks" as any).insert({
      source_project_id: project.id,
      target_project_id: project.id,
      target_name: partner.target_name,
      target_url: partner.target_url,
      target_description: partner.target_description,
      anchor_examples: partner.anchor_examples,
      is_enabled: true,
    });

    if (error) {
      toast.error("Failed to enable partner");
    } else {
      toast.success(`${partner.target_name} enabled ✅`);
      fetchBacklinks();
    }
    setSaving(null);
  };

  const toggleBacklink = async (backlinkId: string, enabled: boolean) => {
    setSaving(backlinkId);
    const { error } = await supabase
      .from("project_backlinks" as any)
      .update({ is_enabled: enabled })
      .eq("id", backlinkId);

    if (error) {
      toast.error("Failed to update");
    } else {
      setBacklinks((prev) =>
        prev.map((b) => (b.id === backlinkId ? { ...b, is_enabled: enabled } : b))
      );
      toast.success(enabled ? "Backlink enabled ✅" : "Backlink disabled");
    }
    setSaving(null);
  };

  const removePartner = async (partner: (typeof ALL_PLATFORM_CLIENTS)[0]) => {
    const existing = getBacklinkForPartner(partner.target_url);
    if (!existing) return;

    const { error } = await supabase
      .from("project_backlinks" as any)
      .delete()
      .eq("id", existing.id);

    if (error) {
      toast.error("Failed to remove");
    } else {
      setBacklinks((prev) => prev.filter((b) => b.id !== existing.id));
      toast.success("Partner removed");
    }
  };

  const enabledCount = backlinks.filter((b) => b.is_enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">AI Backlink Network</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enable cross-links between platform clients to build an AI authority loop.
          Natural mentions are automatically injected into your generated content — 1 per article, varied anchor.
        </p>
      </div>

      {/* Strategy callout */}
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex gap-3">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-sm">
            <p className="font-medium">💡 Authority Triangle Strategy</p>
            <p className="text-muted-foreground">
              AI engines (ChatGPT, Gemini, Perplexity) trust{" "}
              <strong className="text-foreground">connected entities</strong>. Natural cross-mentions
              between related sites create a real trust network — exactly what US startups use to
              dominate generative search citations.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary" className="text-xs">Entity relationship</Badge>
              <Badge variant="secondary" className="text-xs">Topical authority</Badge>
              <Badge variant="secondary" className="text-xs">Cross-citations</Badge>
              <Badge variant="secondary" className="text-xs">Real product cluster</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      {backlinks.length > 0 && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link2 className="h-4 w-4" />
            <span>{backlinks.length} partner{backlinks.length > 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="h-4 w-4" />
            <span>{enabledCount} active</span>
          </div>
        </div>
      )}

      {/* Partner list grouped by category */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-4">Loading partners...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, partners]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={`text-xs font-medium border-0 ${CATEGORY_COLORS[category] ?? "bg-muted text-muted-foreground"}`}>
                  {category}
                </Badge>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2">
                {partners.map((partner) => {
                  const existing = getBacklinkForPartner(partner.target_url);
                  const isEnabled = existing?.is_enabled ?? false;
                  const isSaving = saving === (existing?.id ?? partner.target_url);

                  return (
                    <Card
                      key={partner.target_url}
                      className={`p-4 transition-all ${
                        isEnabled
                          ? "border-primary/30 bg-primary/5"
                          : "hover:border-border/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: icon + info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isEnabled ? "bg-primary/10" : "bg-muted"
                            }`}
                          >
                            <ArrowLeftRight
                              className={`h-4 w-4 ${isEnabled ? "text-primary" : "text-muted-foreground"}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{partner.target_name}</span>
                              {isEnabled && (
                                <Badge className="text-xs bg-primary/10 text-primary border-0">
                                  Active
                                </Badge>
                              )}
                              <a
                                href={partner.target_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              {partner.target_description}
                            </p>
                            {/* Anchor examples */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {partner.anchor_examples.slice(0, 3).map((anchor, i) => (
                                <Badge key={i} variant="outline" className="text-xs py-0 font-normal">
                                  "{anchor}"
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right: toggle + remove */}
                        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                          <Switch
                            checked={isEnabled}
                            disabled={isSaving}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                enablePartner(partner);
                              } else if (existing) {
                                toggleBacklink(existing.id, false);
                              }
                            }}
                          />
                          {existing && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removePartner(partner)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Why this partner */}
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          {isEnabled ? (
                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                          ) : (
                            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          )}
                          <span>
                            {isEnabled ? (
                              <>
                                A natural mention of{" "}
                                <strong className="text-foreground">{partner.target_name}</strong>{" "}
                                will be injected into your next generated article — 1 mention, varied anchor text.
                              </>
                            ) : (
                              partner.why
                            )}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default BacklinksSettings;
