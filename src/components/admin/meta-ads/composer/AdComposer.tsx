"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Plus, X, Image as ImageIcon, Video, MoreHorizontal, ThumbsUp, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

const CTA_OPTIONS = [
  "LEARN_MORE","SHOP_NOW","SIGN_UP","SUBSCRIBE","DOWNLOAD","BOOK_TRAVEL",
  "GET_QUOTE","CONTACT_US","APPLY_NOW","ORDER_NOW","GET_OFFER","INSTALL_MOBILE_APP",
];
const PLACEMENTS = [
  { id: "MOBILE_FEED_STANDARD", label: "Facebook Feed", platform: "facebook" },
  { id: "INSTAGRAM_STANDARD", label: "Instagram Feed", platform: "instagram" },
  { id: "FACEBOOK_STORY_MOBILE", label: "FB Story", platform: "facebook", vertical: true },
  { id: "INSTAGRAM_STORY", label: "IG Story", platform: "instagram", vertical: true },
  { id: "INSTAGRAM_REELS", label: "IG Reels", platform: "instagram", vertical: true },
  { id: "DESKTOP_FEED_STANDARD", label: "Desktop Feed", platform: "facebook" },
];

interface Props {
  projectId: string;
  account: any;
  adsets: any[];
  pixels: any[];
  onCreated: () => void;
  onCancel: () => void;
}

export default function AdComposer({ projectId, account, adsets, pixels, onCreated, onCancel }: Props) {
  const [form, setForm] = useState<any>({
    name: "",
    adset_id: "",
    format: "single", // single | carousel
    media_url: "",
    media_type: "image",
    primary_text: "",
    primary_text_variants: [""],
    headline: "",
    headline_variants: [""],
    description: "",
    link_url: "",
    cta_type: "LEARN_MORE",
    pixel_id: pixels[0]?.pixel_id || "",
    utm_source: "facebook",
    utm_medium: "cpc",
    utm_campaign: "",
    utm_content: "",
    cards: [
      { media_url: "", headline: "", description: "", link_url: "" },
      { media_url: "", headline: "", description: "", link_url: "" },
    ],
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [placement, setPlacement] = useState(PLACEMENTS[0]);
  const [livePreview, setLivePreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewTimer = useRef<number | null>(null);

  const pageId = account?.page_id;
  const pageName = account?.page_name || "Your Page";
  const igActor = account?.instagram_actor_id;

  const urlTags = useMemo(() => {
    const t: string[] = [];
    if (form.utm_source) t.push(`utm_source=${encodeURIComponent(form.utm_source)}`);
    if (form.utm_medium) t.push(`utm_medium=${encodeURIComponent(form.utm_medium)}`);
    if (form.utm_campaign) t.push(`utm_campaign=${encodeURIComponent(form.utm_campaign)}`);
    if (form.utm_content) t.push(`utm_content=${encodeURIComponent(form.utm_content)}`);
    return t.join("&");
  }, [form.utm_source, form.utm_medium, form.utm_campaign, form.utm_content]);

  // Live preview from Meta API (debounced)
  useEffect(() => {
    if (!pageId) return;
    if (form.format === "single" && !form.media_url) return;
    if (form.format === "carousel" && !form.cards.every((c: any) => c.media_url)) return;
    if (!form.link_url) return;

    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const { data } = await supabase.functions.invoke("meta-ad-preview", {
          body: {
            page_id: pageId,
            instagram_actor_id: placement.platform === "instagram" ? igActor : undefined,
            format: form.format,
            media: form.format === "single" ? { image_url: form.media_url } : undefined,
            cards: form.format === "carousel" ? form.cards.map((c: any) => ({
              image_hash: undefined, image_url: c.media_url, link: c.link_url || form.link_url,
              name: c.headline, description: c.description,
            })) : undefined,
            primary_text: form.primary_text,
            headline: form.headline,
            description: form.description,
            link_url: form.link_url,
            cta_type: form.cta_type,
            ad_format: placement.id,
          },
        });
        if (data?.html) setLivePreview(data.html);
      } catch (_) {
        // Fallback to internal preview render
        setLivePreview(null);
      } finally { setPreviewLoading(false); }
    }, 600);
    return () => { if (previewTimer.current) window.clearTimeout(previewTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, placement, pageId]);

  async function uploadFile(file: File, onUrl: (u: string, t: "image" | "video") => void) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const { error } = await supabase.storage.from("meta-creatives").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("meta-creatives").getPublicUrl(path);
      onUrl(data.publicUrl, file.type.startsWith("video") ? "video" : "image");
      toast.success("Media uploaded");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  }

  async function publish() {
    if (!form.name || !form.adset_id) return toast.error("Name + Ad set required");
    if (!pageId) return toast.error("No Facebook Page linked. Sync account first.");
    setSubmitting(true);
    try {
      const body: any = {
        project_id: projectId,
        adset_id: form.adset_id,
        name: form.name,
        page_id: pageId,
        instagram_actor_id: igActor,
        pixel_id: form.pixel_id || undefined,
        format: form.format,
        primary_text: form.primary_text,
        headline: form.headline,
        description: form.description,
        link_url: form.link_url,
        cta_type: form.cta_type,
        url_tags: urlTags || undefined,
        primary_text_variants: form.primary_text_variants.filter(Boolean),
        headline_variants: form.headline_variants.filter(Boolean),
      };
      if (form.format === "single") {
        body.media_url = form.media_url; body.media_type = form.media_type;
      } else {
        body.cards = form.cards;
      }
      const { data, error } = await supabase.functions.invoke("meta-ad-create", { body });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Ad created (paused) — review in Meta Ads Manager");
      onCreated();
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  }

  // ---- Render

  return (
    <div className="grid lg:grid-cols-2 gap-4 h-[80vh]">
      {/* LEFT — Edit panel */}
      <div className="overflow-y-auto pr-2 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">New Ad</h3>
            <p className="text-xs text-muted-foreground">{pageName} {igActor && "• IG linked"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={publish} disabled={submitting}>{submitting ? "Publishing…" : "Publish"}</Button>
          </div>
        </div>

        {/* Identity / Ad set */}
        <Section title="Ad name & destination">
          <div className="space-y-2">
            <div><Label className="text-xs">Ad name (internal)</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Q2 Summer Sale - Carousel" />
            </div>
            <div><Label className="text-xs">Ad set</Label>
              <Select value={form.adset_id} onValueChange={v => setForm({ ...form, adset_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select ad set" /></SelectTrigger>
                <SelectContent>{adsets.map((s: any) => <SelectItem key={s.adset_id} value={s.adset_id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        {/* Format */}
        <Section title="Format">
          <Tabs value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="single"><ImageIcon className="h-4 w-4 mr-1" />Single</TabsTrigger>
              <TabsTrigger value="carousel"><MoreHorizontal className="h-4 w-4 mr-1" />Carousel (2-10)</TabsTrigger>
            </TabsList>
          </Tabs>
        </Section>

        {/* Media */}
        {form.format === "single" ? (
          <Section title="Media">
            <MediaDrop
              uploading={uploading}
              mediaUrl={form.media_url}
              mediaType={form.media_type}
              onFile={(f) => uploadFile(f, (u, t) => setForm({ ...form, media_url: u, media_type: t }))}
              onClear={() => setForm({ ...form, media_url: "" })}
            />
          </Section>
        ) : (
          <Section title={`Carousel cards (${form.cards.length}/10)`}>
            <div className="space-y-3">
              {form.cards.map((c: any, i: number) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Card {i + 1}</span>
                    {form.cards.length > 2 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                        const cards = [...form.cards]; cards.splice(i, 1); setForm({ ...form, cards });
                      }}><X className="h-3 w-3" /></Button>
                    )}
                  </div>
                  <MediaDrop
                    uploading={uploading}
                    mediaUrl={c.media_url}
                    mediaType="image"
                    onFile={(f) => uploadFile(f, (u) => {
                      const cards = [...form.cards]; cards[i] = { ...cards[i], media_url: u }; setForm({ ...form, cards });
                    })}
                    onClear={() => {
                      const cards = [...form.cards]; cards[i] = { ...cards[i], media_url: "" }; setForm({ ...form, cards });
                    }}
                    compact
                  />
                  <Input placeholder="Headline" value={c.headline} onChange={e => {
                    const cards = [...form.cards]; cards[i].headline = e.target.value; setForm({ ...form, cards });
                  }} />
                  <Input placeholder="Description" value={c.description} onChange={e => {
                    const cards = [...form.cards]; cards[i].description = e.target.value; setForm({ ...form, cards });
                  }} />
                  <Input placeholder="Card link URL (optional, falls back to main)" value={c.link_url} onChange={e => {
                    const cards = [...form.cards]; cards[i].link_url = e.target.value; setForm({ ...form, cards });
                  }} />
                </div>
              ))}
              {form.cards.length < 10 && (
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, cards: [...form.cards, { media_url: "", headline: "", description: "", link_url: "" }] })}>
                  <Plus className="h-3 w-3 mr-1" />Add card
                </Button>
              )}
            </div>
          </Section>
        )}

        {/* Primary text */}
        <Section title="Primary text" badge={`${form.primary_text.length}/125 reco`}>
          <Textarea rows={3} value={form.primary_text} onChange={e => setForm({ ...form, primary_text: e.target.value })} placeholder="Tell people what your ad is about…" />
          <VariantList
            label="Variations (Dynamic Creative)"
            items={form.primary_text_variants}
            onChange={(items) => setForm({ ...form, primary_text_variants: items })}
            placeholder="Another version of primary text"
            rows={2}
          />
        </Section>

        {/* Headline */}
        <Section title="Headline" badge={`${form.headline.length}/40 reco`}>
          <Input value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} placeholder="Your offer in one short line" />
          <VariantList
            label="Variations"
            items={form.headline_variants}
            onChange={(items) => setForm({ ...form, headline_variants: items })}
            placeholder="Another headline"
          />
        </Section>

        {/* Description */}
        <Section title="Description (optional)" badge={`${form.description.length}/30 reco`}>
          <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="A few words under the headline" />
        </Section>

        {/* Destination */}
        <Section title="Website URL + UTM">
          <Input type="url" value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} placeholder="https://yourbrand.com/landing" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Input value={form.utm_source} onChange={e => setForm({ ...form, utm_source: e.target.value })} placeholder="utm_source" />
            <Input value={form.utm_medium} onChange={e => setForm({ ...form, utm_medium: e.target.value })} placeholder="utm_medium" />
            <Input value={form.utm_campaign} onChange={e => setForm({ ...form, utm_campaign: e.target.value })} placeholder="utm_campaign" />
            <Input value={form.utm_content} onChange={e => setForm({ ...form, utm_content: e.target.value })} placeholder="utm_content" />
          </div>
          {urlTags && <p className="text-[10px] text-muted-foreground mt-1 font-mono break-all">?{urlTags}</p>}
        </Section>

        {/* CTA */}
        <Section title="Call to action">
          <Select value={form.cta_type} onValueChange={v => setForm({ ...form, cta_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CTA_OPTIONS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
          </Select>
        </Section>

        {/* Tracking */}
        <Section title="Tracking">
          <Label className="text-xs">Pixel</Label>
          <Select value={form.pixel_id || "none"} onValueChange={v => setForm({ ...form, pixel_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="No pixel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No pixel</SelectItem>
              {pixels.map((p: any) => <SelectItem key={p.pixel_id} value={p.pixel_id}>{p.name} ({p.pixel_id})</SelectItem>)}
            </SelectContent>
          </Select>
        </Section>
      </div>

      {/* RIGHT — Live preview */}
      <div className="bg-muted/30 rounded-lg p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ad preview</p>
          {previewLoading && <span className="text-xs text-muted-foreground">Rendering…</span>}
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {PLACEMENTS.map(p => (
            <Button key={p.id} size="sm" variant={placement.id === p.id ? "default" : "outline"} className="h-7 text-xs"
              onClick={() => setPlacement(p)}>{p.label}</Button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto flex items-start justify-center">
          {livePreview ? (
            <iframe srcDoc={livePreview} className={placement.vertical ? "w-[320px] h-[640px] border-0 bg-white rounded-xl shadow" : "w-full max-w-md h-[600px] border-0 bg-white rounded-xl shadow"} title="Ad preview" />
          ) : (
            <InternalPreview form={form} placement={placement} pageName={pageName} urlTags={urlTags} />
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge?: string; children: any }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</Label>
        {badge && <Badge variant="outline" className="text-[10px] font-mono">{badge}</Badge>}
      </div>
      {children}
    </div>
  );
}

function MediaDrop({ uploading, mediaUrl, mediaType, onFile, onClear, compact }: any) {
  return (
    <div>
      {mediaUrl ? (
        <div className="relative group rounded-lg overflow-hidden border bg-muted">
          {mediaType === "video"
            ? <video src={mediaUrl} controls className={compact ? "w-full h-32 object-cover" : "w-full h-48 object-cover"} />
            : <img src={mediaUrl} alt="" className={compact ? "w-full h-32 object-cover" : "w-full h-48 object-cover"} />}
          <Button size="icon" variant="secondary" className="absolute top-2 right-2 h-7 w-7" onClick={onClear}><X className="h-3.5 w-3.5" /></Button>
        </div>
      ) : (
        <label className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{uploading ? "Uploading…" : "Drop image or video, or click"}</span>
          <span className="text-[10px] text-muted-foreground">JPG/PNG/MP4 • 1:1, 4:5, 9:16, 16:9</span>
          <input type="file" className="hidden" accept="image/*,video/*"
            onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      )}
    </div>
  );
}

function VariantList({ label, items, onChange, placeholder, rows = 1 }: any) {
  return (
    <div className="mt-2 space-y-1">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {items.map((v: string, i: number) => (
        <div key={i} className="flex gap-1">
          {rows > 1
            ? <Textarea rows={rows} value={v} onChange={e => { const n = [...items]; n[i] = e.target.value; onChange(n); }} placeholder={placeholder} />
            : <Input value={v} onChange={e => { const n = [...items]; n[i] = e.target.value; onChange(n); }} placeholder={placeholder} />}
          {items.length > 1 && <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => { const n = [...items]; n.splice(i, 1); onChange(n); }}><X className="h-3.5 w-3.5" /></Button>}
        </div>
      ))}
      {items.length < 5 && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange([...items, ""])}><Plus className="h-3 w-3 mr-1" />Add variation</Button>}
    </div>
  );
}

function InternalPreview({ form, placement, pageName, urlTags }: any) {
  const isVertical = placement.vertical;
  const isInstagram = placement.platform === "instagram";
  const domain = (() => { try { return new URL(form.link_url).hostname.replace("www.", "").toUpperCase(); } catch { return "YOURSITE.COM"; } })();
  const finalUrl = urlTags && form.link_url ? `${form.link_url}${form.link_url.includes("?") ? "&" : "?"}${urlTags}` : form.link_url;
  const cta = form.cta_type.replace(/_/g, " ");

  const cards = form.format === "carousel" ? form.cards.filter((c: any) => c.media_url) : [];

  if (isVertical) {
    // Story / Reels
    return (
      <div className="w-[320px] h-[640px] bg-black rounded-2xl overflow-hidden relative shadow-xl">
        {form.media_url && (form.media_type === "video"
          ? <video src={form.media_url} autoPlay muted loop className="w-full h-full object-cover" />
          : <img src={form.media_url} alt="" className="w-full h-full object-cover" />)}
        <div className="absolute top-3 left-3 right-3 flex items-center gap-2 text-white">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600" />
          <div className="flex-1">
            <p className="text-xs font-semibold">{pageName}</p>
            <p className="text-[10px] opacity-80">Sponsored</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
          <p className="text-xs mb-2 line-clamp-3">{form.primary_text || "Your primary text appears here."}</p>
          <button className="w-full bg-white text-black text-sm font-semibold py-2 rounded-lg">{cta} →</button>
        </div>
      </div>
    );
  }

  // Feed (FB/IG)
  return (
    <Card className="w-full max-w-md bg-white border shadow-sm">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-2 p-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{pageName}</p>
            <p className="text-[11px] text-muted-foreground">{isInstagram ? "Sponsored" : "Sponsored · 🌐"}</p>
          </div>
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
        </div>
        {/* Primary text */}
        {form.primary_text && <p className="px-3 pb-2 text-sm whitespace-pre-wrap">{form.primary_text}</p>}
        {/* Media */}
        {form.format === "carousel" && cards.length ? (
          <div className="flex gap-1 overflow-x-auto snap-x snap-mandatory bg-muted">
            {cards.map((c: any, i: number) => (
              <div key={i} className="snap-center shrink-0 w-[85%] bg-white">
                <img src={c.media_url} alt="" className="w-full aspect-square object-cover" />
                <div className="p-2 border-t">
                  <p className="text-xs font-semibold truncate">{c.headline || "Headline"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : form.media_url ? (
          form.media_type === "video"
            ? <video src={form.media_url} controls className="w-full max-h-[400px] object-cover bg-black" />
            : <img src={form.media_url} alt="" className="w-full max-h-[400px] object-cover" />
        ) : (
          <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground"><ImageIcon className="h-12 w-12 opacity-30" /></div>
        )}
        {/* CTA bar (FB style) */}
        {!isInstagram && (
          <div className="flex items-center justify-between p-3 bg-muted/40 border-t">
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase">{domain}</p>
              <p className="text-sm font-semibold truncate">{form.headline || "Your headline"}</p>
              {form.description && <p className="text-xs text-muted-foreground truncate">{form.description}</p>}
            </div>
            <button className="bg-muted hover:bg-muted/70 text-xs font-semibold px-3 py-1.5 rounded shrink-0 ml-2">{cta}</button>
          </div>
        )}
        {/* Bottom actions */}
        <div className="flex items-center justify-around p-2 border-t text-muted-foreground">
          <button className="flex items-center gap-1 text-xs"><ThumbsUp className="h-4 w-4" />Like</button>
          <button className="flex items-center gap-1 text-xs"><MessageCircle className="h-4 w-4" />Comment</button>
          <button className="flex items-center gap-1 text-xs"><Share2 className="h-4 w-4" />Share</button>
        </div>
        {isInstagram && (
          <div className="px-3 py-2 border-t">
            <p className="text-xs"><span className="font-semibold">{pageName}</span> {form.headline}</p>
            <button className="mt-1 text-xs font-semibold text-blue-600">{cta} →</button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
