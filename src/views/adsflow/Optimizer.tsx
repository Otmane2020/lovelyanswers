"use client";
import { useState } from "react";
import AdsFlowLayout, { Card } from "./Layout";
import { mockCampaigns } from "./mockData";
import { Sparkles, Copy, CheckCircle2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function AdsFlowOptimizer() {
  const active = mockCampaigns.filter(c => c.status === "active");
  const [selected, setSelected] = useState<string[]>(active.map(c => c.id));
  const [budget, setBudget] = useState(500);
  const [goal, setGoal] = useState("max_roas");
  const [recommendations, setRecommendations] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    const recs = active.filter(c => selected.includes(c.id)).map(c => {
      const factor = c.roas > 4 ? 1.4 : c.roas > 2 ? 1.0 : 0.6;
      const newBudget = Math.round(c.budget_amount * factor);
      return {
        id: c.id, name: c.name, current: c.budget_amount, recommended: newBudget,
        delta: newBudget - c.budget_amount,
        rationale: c.roas > 4 ? `High ROAS (${c.roas}x) — scale aggressively to capture more conversions.` : c.roas > 2 ? `Solid performer — keep current allocation.` : `Underperforming (${c.roas}x ROAS) — reduce spend to free budget for top performers.`,
      };
    });
    setRecommendations(recs);
    setLoading(false);
  };

  return (
    <AdsFlowLayout title="Budget Optimizer">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Active Campaigns</h3>
          <div className="space-y-2 mb-4">
            {active.map(c => (
              <label key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#0f0f0f] border border-white/5 cursor-pointer">
                <input type="checkbox" checked={selected.includes(c.id)} onChange={() => setSelected(s => s.includes(c.id) ? s.filter(x => x !== c.id) : [...s, c.id])} className="accent-indigo-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-[11px] text-[#9ca3af]">Budget €{c.budget_amount} • ROAS {c.roas}x • CTR {c.ctr}%</div>
                </div>
              </label>
            ))}
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#9ca3af]">Total available budget (€)</label>
              <input type="number" value={budget} onChange={e => setBudget(+e.target.value)} className="w-full mt-1 h-10 px-3 rounded-lg bg-[#0f0f0f] border border-white/5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#9ca3af]">Optimization Goal</label>
              <select value={goal} onChange={e => setGoal(e.target.value)} className="w-full mt-1 h-10 px-3 rounded-lg bg-[#0f0f0f] border border-white/5 text-sm">
                <option value="max_roas">Max ROAS</option>
                <option value="max_conversions">Max Conversions</option>
                <option value="max_reach">Max Reach</option>
                <option value="min_cpa">Min CPA</option>
              </select>
            </div>
            <button onClick={generate} disabled={loading} className="w-full h-11 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:opacity-90 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-60">
              <Sparkles className="h-4 w-4" /> {loading ? "Analyzing…" : "Generate AI Recommendations"}
            </button>
          </div>
        </Card>

        {/* Right */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-400" /> AI Recommendations</h3>
          {!recommendations && !loading && <div className="text-sm text-[#9ca3af] py-12 text-center">Select campaigns and click Generate to see AI-powered budget reallocation suggestions.</div>}
          {loading && <div className="text-sm text-[#9ca3af] py-12 text-center animate-pulse">AI analyzing your campaign performance…</div>}
          {recommendations && (
            <div className="space-y-3">
              <Card className="p-3 bg-gradient-to-r from-emerald-600/10 to-indigo-600/10 border-emerald-500/20 flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#9ca3af]">Projected Improvement</div>
                  <div className="text-xl font-semibold text-emerald-400">+12% ROAS</div>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-400" />
              </Card>
              {recommendations.map(r => (
                <div key={r.id} className="p-3 rounded-lg bg-[#0f0f0f] border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className={`text-xs font-medium ${r.delta > 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.delta > 0 ? "+" : ""}€{r.delta}</div>
                  </div>
                  <div className="text-[11px] text-[#9ca3af] mb-2">€{r.current} → <span className="text-[#f1f1f1] font-medium">€{r.recommended}</span></div>
                  <div className="text-[11px] text-[#9ca3af] mb-2">{r.rationale}</div>
                  <button onClick={() => toast.success("Applied")} className="text-[11px] h-7 px-2 rounded-md bg-indigo-600/15 border border-indigo-500/30 text-indigo-300">Apply</button>
                </div>
              ))}
              <button onClick={() => toast.success("All recommendations applied")} className="w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> Apply All</button>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <AdCopyGenerator />
        <AudienceInsights />
      </div>
    </AdsFlowLayout>
  );
}

function AdCopyGenerator() {
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("professional");
  const [platform, setPlatform] = useState("instagram");
  const [objective, setObjective] = useState("sales");
  const [variations, setVariations] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setVariations([
      { primary: `Transform your routine with ${product || "our product"}. Loved by ${audience || "professionals"} worldwide. Try it risk-free today.`, headline: `Discover the difference`, description: `Premium quality, fast shipping.` },
      { primary: `Why settle? ${audience || "Smart buyers"} choose ${product || "us"} — and never look back. Limited launch offer inside.`, headline: `Get yours now`, description: `Free returns. 4.9★ reviews.` },
      { primary: `${product || "Our solution"} changed everything for ${audience || "our customers"}. Here's why you'll love it too 👇`, headline: `Join 10,000+ happy users`, description: `Order today, ship tomorrow.` },
    ]);
    setLoading(false);
  };

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-fuchsia-400" /> AI Ad Copy Generator</h3>
      <div className="space-y-2 text-sm">
        <input value={product} onChange={e => setProduct(e.target.value)} placeholder="Product name" className="w-full h-9 px-3 rounded-lg bg-[#0f0f0f] border border-white/5" />
        <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Target audience" className="w-full h-9 px-3 rounded-lg bg-[#0f0f0f] border border-white/5" />
        <div className="grid grid-cols-3 gap-2">
          <select value={tone} onChange={e => setTone(e.target.value)} className="h-9 px-2 rounded-lg bg-[#0f0f0f] border border-white/5 text-xs">
            <option value="professional">Professional</option><option value="playful">Playful</option><option value="urgent">Urgent</option><option value="emotional">Emotional</option>
          </select>
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="h-9 px-2 rounded-lg bg-[#0f0f0f] border border-white/5 text-xs">
            <option value="instagram">Instagram</option><option value="facebook">Facebook</option>
          </select>
          <select value={objective} onChange={e => setObjective(e.target.value)} className="h-9 px-2 rounded-lg bg-[#0f0f0f] border border-white/5 text-xs">
            <option value="sales">Sales</option><option value="leads">Leads</option><option value="awareness">Awareness</option>
          </select>
        </div>
        <button onClick={generate} disabled={loading} className="w-full h-10 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium">{loading ? "Generating…" : "Generate 3 Variations"}</button>
      </div>
      {variations && (
        <div className="space-y-2 mt-3">
          {variations.map((v, i) => (
            <div key={i} className="p-3 rounded-lg bg-[#0f0f0f] border border-white/5 text-xs space-y-1">
              <div className="text-[#9ca3af] text-[10px] flex justify-between"><span>Variation {i + 1}</span><button onClick={() => { navigator.clipboard.writeText(`${v.primary}\n${v.headline}\n${v.description}`); toast.success("Copied"); }} className="hover:text-indigo-300"><Copy className="h-3 w-3" /></button></div>
              <div><strong>Primary:</strong> {v.primary}</div>
              <div><strong>Headline:</strong> {v.headline}</div>
              <div><strong>Description:</strong> {v.description}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AudienceInsights() {
  const [desc, setDesc] = useState("");
  const [out, setOut] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true); await new Promise(r => setTimeout(r, 900));
    setOut({
      interests: ["Fashion & style", "Online shopping", "Sustainability", "Wellness", "Fitness apparel"],
      ageGender: "Women 25-44 (62%) • Men 25-44 (38%)",
      cpmRange: "€3.20 – €6.80",
      placements: ["Instagram Reels", "Facebook Feed", "Instagram Stories"],
    });
    setLoading(false);
  };

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-400" /> AI Audience Insights</h3>
      <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe your product (e.g. sustainable activewear for women)" className="w-full h-20 p-3 rounded-lg bg-[#0f0f0f] border border-white/5 text-sm resize-none" />
      <button onClick={generate} disabled={loading} className="w-full h-10 mt-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">{loading ? "Analyzing…" : "Get Insights"}</button>
      {out && (
        <div className="mt-3 space-y-2 text-sm">
          <div><div className="text-[10px] text-[#9ca3af] uppercase">Suggested Interests</div><div className="flex flex-wrap gap-1 mt-1">{out.interests.map((i: string) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">{i}</span>)}</div></div>
          <div><div className="text-[10px] text-[#9ca3af] uppercase">Age & Gender Split</div><div className="text-xs">{out.ageGender}</div></div>
          <div><div className="text-[10px] text-[#9ca3af] uppercase">Estimated CPM</div><div className="text-xs font-medium">{out.cpmRange}</div></div>
          <div><div className="text-[10px] text-[#9ca3af] uppercase">Top Placements</div><div className="text-xs">{out.placements.join(" • ")}</div></div>
        </div>
      )}
    </Card>
  );
}
