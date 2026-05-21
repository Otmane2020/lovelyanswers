"use client";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, ChevronRight, ChevronLeft, Loader2, Target, DollarSign, Users, Image as ImageIcon, Check, Sparkles, Wand2, Instagram, Zap } from "lucide-react";

const OBJECTIVES = [
  { id: "OUTCOME_TRAFFIC", label: "Traffic", desc: "Drive visitors to your site" },
  { id: "OUTCOME_SALES", label: "Sales", desc: "Conversions & purchases" },
  { id: "OUTCOME_LEADS", label: "Leads", desc: "Capture leads & sign-ups" },
  { id: "OUTCOME_ENGAGEMENT", label: "Engagement", desc: "Likes, comments, shares" },
  { id: "OUTCOME_AWARENESS", label: "Awareness", desc: "Reach a wide audience" },
  { id: "OUTCOME_APP_PROMOTION", label: "App Promotion", desc: "App installs & activity" },
];

const COUNTRY_PRESETS = [
  { id: "FR,BE,CH", label: "FR-BE-CH" },
  { id: "US", label: "United States" },
  { id: "GB", label: "United Kingdom" },
  { id: "AU,NZ", label: "AU + NZ" },
  { id: "CA", label: "Canada" },
  { id: "DE,AT", label: "DACH" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  accountCurrency?: string;
  pages?: { id: string; name: string }[];
  pixels?: { pixel_id: string; name: string }[];
  instagramAccount?: { id: string; username?: string } | null;
  onCreated?: () => void;
};

export default function CreateCampaignWizard({ open, onClose, projectId, accountCurrency = "EUR", pages = [], pixels = [], instagramAccount = null, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);

  // Step 1 — campaign
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("OUTCOME_TRAFFIC");

  // Step 2 — budget & schedule
  const [dailyBudget, setDailyBudget] = useState(10);
  const [startDate, setStartDate] = useState("");

  // Step 3 — audience
  const [countries, setCountries] = useState("FR,BE,CH");
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(65);
  const [interests, setInterests] = useState("");

  // Step 4 — creative
  const [pageId, setPageId] = useState(pages[0]?.id || "");
  const [pixelId, setPixelId] = useState(pixels[0]?.pixel_id || "");
  const [adName, setAdName] = useState("");
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");
  const [imageUrl, setImageUrl] = useState("");
  const [cta, setCta] = useState("SIGN_UP");

  const sym = accountCurrency === "USD" ? "$" : accountCurrency === "GBP" ? "£" : "€";
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  async function aiSuggest(field: "interests" | "headline" | "primary_text" | "description", current?: string) {
    if (!projectId) return toast.error("No project selected");
    setAiLoading(field);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-ai-suggest", {
        body: { project_id: projectId, field, objective, countries, current },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      const text = (data?.text || "").trim();
      if (!text) throw new Error("No suggestion returned");
      if (field === "interests") setInterests(text);
      else if (field === "headline") setHeadline(text.slice(0, 40));
      else if (field === "primary_text") setPrimaryText(text);
      else if (field === "description") setDescription(text.slice(0, 30));
      toast.success("AI suggestion applied");
    } catch (e: any) {
      toast.error(`AI: ${e.message}`);
    } finally {
      setAiLoading(null);
    }
  }

  async function aiFullCampaign() {
    if (!projectId) return toast.error("No project selected");
    setAiLoading("full");
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-ai-suggest", {
        body: { project_id: projectId, field: "full_campaign" },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      const p = data?.plan;
      if (!p) throw new Error("No plan returned");
      setName(p.name || ""); setObjective(p.objective || "OUTCOME_TRAFFIC");
      setDailyBudget(Number(p.daily_budget) || 10);
      setCountries(p.countries || "FR,BE,CH"); setAgeMin(p.age_min || 25); setAgeMax(p.age_max || 65);
      setInterests(p.interests || "");
      setHeadline((p.headline || "").slice(0, 40));
      setPrimaryText(p.primary_text || "");
      setDescription((p.description || "").slice(0, 30));
      setCta(p.cta || "SIGN_UP");
      toast.success("Campaign drafted by AI — generating image…");
      // Auto-generate image based on the AI's image prompt
      if (p.image_prompt) {
        const { data: img, error: imgErr } = await supabase.functions.invoke("meta-ads-ai-suggest", {
          body: { project_id: projectId, field: "image", image_prompt: p.image_prompt },
        });
        if (!imgErr && img?.image_url) {
          setImageUrl(img.image_url);
          toast.success("Image generated ✨");
        }
      }
      setStep(4);
    } catch (e: any) {
      toast.error(`AI: ${e.message}`);
    } finally {
      setAiLoading(null);
    }
  }

  async function aiImage() {
    if (!projectId) return toast.error("No project selected");
    setAiLoading("image");
    try {
      const prompt = primaryText || headline || undefined;
      const { data, error } = await supabase.functions.invoke("meta-ads-ai-suggest", {
        body: { project_id: projectId, field: "image", image_prompt: prompt ? `Photorealistic Meta Ads visual, square 1:1, no text overlay. Context: ${prompt}` : undefined },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (data?.image_url) { setImageUrl(data.image_url); toast.success("Image generated"); }
    } catch (e: any) {
      toast.error(`AI image: ${e.message}`);
    } finally {
      setAiLoading(null);
    }
  }

  async function testPixel() {
    if (!projectId || !pixelId) return toast.error("Select a pixel first");
    setAiLoading("pixel");
    try {
      const { data, error } = await supabase.functions.invoke("meta-conversions-api", {
        body: {
          project_id: projectId, pixel_id: pixelId, event_name: "PageView",
          event_id: `wizard_test_${Date.now()}`, test_event_code: "TEST12345",
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Pixel responded ✓ — check Events Manager → Test Events");
    } catch (e: any) {
      toast.error(`Pixel test failed: ${e.message}`);
    } finally {
      setAiLoading(null);
    }
  }

  function reset() {
    setStep(1);
    setName(""); setObjective("OUTCOME_TRAFFIC");
    setDailyBudget(10); setStartDate("");
    setCountries("FR,BE,CH"); setAgeMin(25); setAgeMax(65); setInterests("");
    setAdName(""); setHeadline(""); setPrimaryText(""); setDescription("");
    setLinkUrl("https://"); setImageUrl(""); setCta("SIGN_UP");
  }

  async function publish() {
    if (!projectId) return toast.error("No project selected");
    setCreating(true);
    try {
      // 1. Create campaign
      toast.info("Creating campaign…");
      const { data: c, error: e1 } = await supabase.functions.invoke("meta-ads-create-campaign", {
        body: { name, objective, daily_budget: Math.round(dailyBudget * 100), status: "PAUSED" },
      });
      if (e1 || c?.error) throw new Error(e1?.message || c?.error);
      const campaignFbId = c.campaign?.id;
      if (!campaignFbId) throw new Error("No campaign id returned");

      // 2. Create ad set
      toast.info("Creating ad set…");
      const { data: as, error: e2 } = await supabase.functions.invoke("meta-adset-create", {
        body: {
          campaign_id: campaignFbId,
          name: `${name} — AdSet`,
          daily_budget: Math.round(dailyBudget * 100),
          countries: countries.split(",").map(c => c.trim()).filter(Boolean),
          age_min: ageMin,
          age_max: ageMax,
          // interests left as free-text label only; Meta interest IDs require search

          optimization_goal: objective.includes("SALES") || objective.includes("LEADS") ? "OFFSITE_CONVERSIONS" : "LINK_CLICKS",
          pixel_id: pixelId || undefined,
          status: "PAUSED",
          start_time: startDate || undefined,
        },
      });
      if (e2 || as?.error) throw new Error(e2?.message || as?.error);
      const adsetFbId = as.adset?.id;

      // 3. Create ad
      toast.info("Creating ad…");
      const { data: ad, error: e3 } = await supabase.functions.invoke("meta-ad-create", {
        body: {
          adset_id: adsetFbId,
          name: adName || `${name} — Ad`,
          page_id: pageId,
          instagram_actor_id: instagramAccount?.id,
          link_url: linkUrl,
          message: primaryText,
          headline,
          description,
          image_url: imageUrl,
          cta,
          status: "PAUSED",
        },
      });
      if (e3 || ad?.error) throw new Error(e3?.message || ad?.error);

      toast.success("Campaign created in Meta (paused). Sync to refresh.");
      reset();
      onClose();
      onCreated?.();
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  const steps = [
    { n: 1, label: "Objective", icon: Target },
    { n: 2, label: "Budget", icon: DollarSign },
    { n: 3, label: "Audience", icon: Users },
    { n: 4, label: "Creative", icon: ImageIcon },
  ];

  const canNext =
    step === 1 ? !!name && !!objective :
    step === 2 ? dailyBudget > 0 :
    step === 3 ? !!countries && ageMin >= 13 && ageMax <= 65 :
    !!pageId && !!linkUrl && !!primaryText;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-[640px] h-full bg-[#0f0f0f] border-l border-white/5 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/5 gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Create Campaign</h2>
            <p className="text-xs text-[#9ca3af] mt-0.5">Publishes to Meta as paused — review in Ads Manager.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={aiFullCampaign}
              disabled={aiLoading === "full"}
              className="h-9 px-3 rounded-lg text-xs font-semibold bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:opacity-90 text-white flex items-center gap-1.5 disabled:opacity-50"
              title="Let AI draft the full campaign from your brand"
            >
              {aiLoading === "full" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              {aiLoading === "full" ? "AI drafting…" : "Auto-fill with AI"}
            </button>
            <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white/5 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.n;
            const active = step === s.n;
            return (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${active ? "bg-indigo-600 text-white" : done ? "bg-emerald-600 text-white" : "bg-white/5 text-[#9ca3af]"}`}>
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-xs ${active ? "text-white" : "text-[#9ca3af]"}`}>{s.label}</span>
                {i < steps.length - 1 && <div className="flex-1 h-px bg-white/5" />}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 && (
            <div className="space-y-4">
              <Field label="Campaign name">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. APG | Traffic | FR | Q2" className={inputClass} />
              </Field>
              <Field label="Objective">
                <div className="grid grid-cols-2 gap-2">
                  {OBJECTIVES.map(o => (
                    <button key={o.id} onClick={() => setObjective(o.id)} className={`p-3 rounded-lg border text-left ${objective === o.id ? "border-indigo-500/60 bg-indigo-500/10" : "border-white/5 bg-[#1a1a1a] hover:bg-white/5"}`}>
                      <div className="text-sm font-medium">{o.label}</div>
                      <div className="text-[11px] text-[#9ca3af] mt-0.5">{o.desc}</div>
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Field label={`Daily budget (${sym})`}>
                <input type="number" min={1} value={dailyBudget} onChange={e => setDailyBudget(Number(e.target.value))} className={inputClass} />
                <p className="text-[11px] text-[#9ca3af] mt-1">Meta minimum: {sym}1/day. Recommended start: {sym}5–20/day.</p>
              </Field>
              <Field label="Start date (optional)">
                <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Field label="Countries">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COUNTRY_PRESETS.map(p => (
                    <button key={p.id} onClick={() => setCountries(p.id)} className={`px-2.5 py-1 rounded text-xs border ${countries === p.id ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-200" : "border-white/5 bg-[#1a1a1a] text-[#9ca3af] hover:bg-white/5"}`}>{p.label}</button>
                  ))}
                </div>
                <input value={countries} onChange={e => setCountries(e.target.value)} placeholder="ISO codes comma-separated (e.g. FR,BE,CH)" className={inputClass} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Age min"><input type="number" min={13} max={65} value={ageMin} onChange={e => setAgeMin(Number(e.target.value))} className={inputClass} /></Field>
                <Field label="Age max"><input type="number" min={13} max={65} value={ageMax} onChange={e => setAgeMax(Number(e.target.value))} className={inputClass} /></Field>
              </div>
              <Field label="Interests (optional)">
                <div className="relative">
                  <input value={interests} onChange={e => setInterests(e.target.value)} placeholder="e.g. SaaS, Digital marketing, SEO" className={`${inputClass} pr-28`} />
                  <button type="button" onClick={() => aiSuggest("interests", interests)} disabled={aiLoading === "interests"} className="absolute right-1 top-1 h-8 px-2.5 rounded-md text-[11px] font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 flex items-center gap-1 disabled:opacity-50">
                    {aiLoading === "interests" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI suggest
                  </button>
                </div>
                <p className="text-[11px] text-[#9ca3af] mt-1">Free-text — Meta will match interest IDs server-side. Click <span className="text-indigo-300">AI suggest</span> to generate from your brand.</p>
              </Field>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Facebook Page">
                  <select value={pageId} onChange={e => setPageId(e.target.value)} className={inputClass}>
                    {pages.length === 0 && <option value="">No page connected</option>}
                    {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="Instagram account">
                  {instagramAccount ? (
                    <div className="h-10 px-3 rounded-lg bg-[#1a1a1a] border border-white/5 text-sm flex items-center gap-2">
                      <Instagram className="h-3.5 w-3.5 text-pink-400" />
                      <span className="truncate">@{instagramAccount.username || instagramAccount.id}</span>
                      <span className="ml-auto text-[10px] text-emerald-300">Linked</span>
                    </div>
                  ) : (
                    <div className="h-10 px-3 rounded-lg bg-[#1a1a1a] border border-amber-500/30 text-xs flex items-center gap-2 text-amber-200">
                      <Instagram className="h-3.5 w-3.5" />
                      No IG linked to this Page — link it in Meta Business Suite
                    </div>
                  )}
                </Field>
              </div>
              <Field label="Pixel (conversion tracking)">
                <div className="flex gap-2">
                  <select value={pixelId} onChange={e => setPixelId(e.target.value)} className={`${inputClass} flex-1`}>
                    <option value="">None</option>
                    {pixels.map(p => <option key={p.pixel_id} value={p.pixel_id}>{p.name} ({p.pixel_id})</option>)}
                  </select>
                  <button type="button" onClick={testPixel} disabled={!pixelId || aiLoading === "pixel"} className="shrink-0 h-10 px-3 rounded-lg text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 border border-emerald-500/30 flex items-center gap-1 disabled:opacity-40">
                    {aiLoading === "pixel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />} Test
                  </button>
                </div>
                {pixelId && <p className="text-[11px] text-[#9ca3af] mt-1">Sends a server-side PageView via CAPI with <code className="text-[10px]">test_event_code=TEST12345</code>.</p>}
              </Field>
              <Field label="Ad name"><input value={adName} onChange={e => setAdName(e.target.value)} placeholder="Auto from campaign if empty" className={inputClass} /></Field>
              <Field label="Headline (max 40 chars)">
                <div className="relative">
                  <input maxLength={40} value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Replace your SEO agency for $29/mo" className={`${inputClass} pr-28`} />
                  <button type="button" onClick={() => aiSuggest("headline", headline)} disabled={aiLoading === "headline"} className="absolute right-1 top-1 h-8 px-2.5 rounded-md text-[11px] font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 flex items-center gap-1 disabled:opacity-50">
                    {aiLoading === "headline" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI
                  </button>
                </div>
              </Field>
              <Field label="Primary text">
                <div className="relative">
                  <textarea rows={4} value={primaryText} onChange={e => setPrimaryText(e.target.value)} placeholder="Tell your story…" className={`${inputClass} resize-none pr-20`} style={{ height: "auto", minHeight: 96 }} />
                  <button type="button" onClick={() => aiSuggest("primary_text", primaryText)} disabled={aiLoading === "primary_text"} className="absolute right-1 top-1 h-8 px-2.5 rounded-md text-[11px] font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 flex items-center gap-1 disabled:opacity-50">
                    {aiLoading === "primary_text" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI
                  </button>
                </div>
              </Field>
              <Field label="Description (optional)">
                <div className="relative">
                  <input value={description} onChange={e => setDescription(e.target.value)} className={`${inputClass} pr-20`} />
                  <button type="button" onClick={() => aiSuggest("description", description)} disabled={aiLoading === "description"} className="absolute right-1 top-1 h-8 px-2.5 rounded-md text-[11px] font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 flex items-center gap-1 disabled:opacity-50">
                    {aiLoading === "description" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI
                  </button>
                </div>
              </Field>
              <Field label="Destination URL"><input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://yoursite.com/landing" className={inputClass} /></Field>
              <Field label="Image URL"><input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://… (1:1 1080×1080 recommended)" className={inputClass} /></Field>
              <Field label="Call to action">
                <select value={cta} onChange={e => setCta(e.target.value)} className={inputClass}>
                  {["SIGN_UP", "LEARN_MORE", "SHOP_NOW", "GET_OFFER", "SUBSCRIBE", "DOWNLOAD", "CONTACT_US", "BOOK_TRAVEL"].map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>

              {/* Preview */}
              {(headline || primaryText || imageUrl) && (
                <div className="mt-2 p-3 rounded-lg border border-white/5 bg-[#1a1a1a]">
                  <div className="text-[10px] uppercase tracking-wider text-[#9ca3af] mb-2">Preview</div>
                  <div className="bg-black rounded-lg overflow-hidden border border-white/5">
                    {imageUrl && <img src={imageUrl} alt="" className="w-full aspect-square object-cover" onError={e => (e.currentTarget.style.display = "none")} />}
                    <div className="p-3">
                      <div className="text-xs text-[#9ca3af] whitespace-pre-line">{primaryText || "Primary text appears here."}</div>
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase text-[#9ca3af] truncate">{linkUrl.replace(/^https?:\/\//, "")}</div>
                          <div className="text-sm font-semibold truncate">{headline || "Headline"}</div>
                          {description && <div className="text-xs text-[#9ca3af] truncate">{description}</div>}
                        </div>
                        <button className="shrink-0 h-8 px-3 rounded bg-white/10 text-xs">{cta.replace(/_/g, " ")}</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/5">
          <button onClick={() => (step === 1 ? onClose() : setStep(s => s - 1))} className="h-9 px-4 rounded-lg text-sm bg-white/5 hover:bg-white/10 flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" /> {step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 4 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="h-9 px-4 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={publish} disabled={!canNext || creating} className="h-9 px-4 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 disabled:opacity-50">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              {creating ? "Publishing…" : "Publish to Meta"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputClass = "w-full h-10 px-3 rounded-lg bg-[#1a1a1a] border border-white/5 text-sm outline-none focus:border-indigo-500/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-[#9ca3af] mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
