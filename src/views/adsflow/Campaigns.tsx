"use client";
import { useState } from "react";
import AdsFlowLayout, { Card, StatusBadge } from "./Layout";
import { mockCampaigns } from "./mockData";
import { Plus, Search, Pause, Play, Copy, Trash2, BarChart3, MoreHorizontal, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const OBJECTIVES = [
  { id: "awareness", label: "Awareness", icon: "🎯" },
  { id: "traffic", label: "Traffic", icon: "🔗" },
  { id: "engagement", label: "Engagement", icon: "💬" },
  { id: "leads", label: "Leads", icon: "📋" },
  { id: "sales", label: "Sales", icon: "🛒" },
  { id: "app_installs", label: "App Installs", icon: "📱" },
];

export default function AdsFlowCampaigns() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = mockCampaigns.filter(c =>
    (statusFilter === "all" || c.status === statusFilter) &&
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(c => c.id));
  const toggleOne = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  return (
    <AdsFlowLayout title="Campaigns">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#9ca3af]">Manage all your ad campaigns.</p>
        <button
          onClick={() => setDrawerOpen(true)}
          className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Create Campaign
        </button>
      </div>

      {/* Filters */}
      <Card className="p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-[#0f0f0f] border border-white/5 text-sm flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-[#9ca3af]" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent outline-none flex-1" placeholder="Search by name…" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 px-3 rounded-lg bg-[#0f0f0f] border border-white/5 text-sm">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="draft">Draft</option>
          <option value="ended">Ended</option>
        </select>
        <select className="h-9 px-3 rounded-lg bg-[#0f0f0f] border border-white/5 text-sm">
          <option>All objectives</option>
          {OBJECTIVES.map(o => <option key={o.id}>{o.label}</option>)}
        </select>
        {selected.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-[#9ca3af]">{selected.length} selected</span>
            <button onClick={() => toast.success(`${selected.length} campaign(s) paused`)} className="h-8 px-3 rounded-md bg-amber-500/15 border border-amber-500/20 text-amber-300 text-xs">Pause</button>
            <button onClick={() => toast.success(`${selected.length} campaign(s) duplicated`)} className="h-8 px-3 rounded-md bg-white/5 border border-white/10 text-xs">Duplicate</button>
            <button onClick={() => { toast.success(`${selected.length} deleted`); setSelected([]); }} className="h-8 px-3 rounded-md bg-rose-500/15 border border-rose-500/20 text-rose-300 text-xs">Delete</button>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0f0f0f]/50">
              <tr className="text-[#9ca3af] text-xs">
                <th className="w-10 p-3"><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
                <th className="text-left p-3 font-medium">Campaign</th>
                <th className="text-left p-3 font-medium">Objective</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Budget</th>
                <th className="text-right p-3 font-medium">Spent</th>
                <th className="text-right p-3 font-medium">Impressions</th>
                <th className="text-right p-3 font-medium">CTR</th>
                <th className="text-right p-3 font-medium">ROAS</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3"><input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleOne(c.id)} /></td>
                  <td className="p-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-[11px] text-[#9ca3af]">{c.start_date || "—"} → {c.end_date || "ongoing"}</div>
                  </td>
                  <td className="p-3 text-[#9ca3af]">{c.objective}</td>
                  <td className="p-3"><StatusBadge status={c.status} /></td>
                  <td className="p-3 text-right">€{c.budget_amount} <span className="text-[10px] text-[#9ca3af]">/{c.budget_type === "daily" ? "d" : "lt"}</span></td>
                  <td className="p-3 text-right">€{c.spent.toLocaleString()}</td>
                  <td className="p-3 text-right">{c.impressions.toLocaleString()}</td>
                  <td className="p-3 text-right">{c.ctr}%</td>
                  <td className="p-3 text-right font-medium text-emerald-400">{c.roas}x</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => toast.success(c.status === "active" ? "Paused" : "Resumed")} className="h-7 w-7 rounded hover:bg-white/5 flex items-center justify-center text-[#9ca3af]" title={c.status === "active" ? "Pause" : "Resume"}>
                        {c.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => toast.success("Duplicated")} className="h-7 w-7 rounded hover:bg-white/5 flex items-center justify-center text-[#9ca3af]"><Copy className="h-3.5 w-3.5" /></button>
                      <button onClick={() => toast.info("Analytics view")} className="h-7 w-7 rounded hover:bg-white/5 flex items-center justify-center text-[#9ca3af]"><BarChart3 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => toast.success("Deleted")} className="h-7 w-7 rounded hover:bg-white/5 flex items-center justify-center text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>
                      <button className="h-7 w-7 rounded hover:bg-white/5 flex items-center justify-center text-[#9ca3af]"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="p-12 text-center text-[#9ca3af]">No campaigns match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Drawer */}
      {drawerOpen && <CreateCampaignDrawer onClose={() => setDrawerOpen(false)} />}
    </AdsFlowLayout>
  );
}

function CreateCampaignDrawer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    name: "", objective: "traffic", specialCategory: "none", abTest: false, cbo: false,
    budgetType: "daily", budgetAmount: 50, runContinuously: true, startDate: "", endDate: "",
    bidStrategy: "lowest_cost", costCap: 0, bidCap: 0, optimizationGoal: "link_clicks",
  });

  const next = () => setStep(s => Math.min(4, s + 1));
  const prev = () => setStep(s => Math.max(1, s - 1));
  const launch = () => { toast.success(`Campaign "${data.name || "Untitled"}" launched 🚀`); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className="w-full max-w-2xl bg-[#1a1a1a] border-l border-white/5 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-5">
          <div>
            <div className="text-xs text-[#9ca3af]">Step {step} of 4</div>
            <h2 className="text-base font-semibold">Create Campaign</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-white/5 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        {/* Stepper */}
        <div className="flex border-b border-white/5">
          {["Setup", "Budget & Schedule", "Bidding", "Review"].map((label, i) => (
            <div key={label} className={`flex-1 px-3 py-2 text-xs text-center border-r border-white/5 last:border-0 ${step === i + 1 ? "bg-indigo-600/15 text-indigo-200" : "text-[#9ca3af]"}`}>
              {i + 1}. {label}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {step === 1 && (
            <>
              <Field label="Campaign Name">
                <input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} placeholder="e.g. Summer Sale 2026" className="input" />
              </Field>
              <Field label="Campaign Objective">
                <div className="grid grid-cols-3 gap-2">
                  {OBJECTIVES.map(o => (
                    <button key={o.id} onClick={() => setData({ ...data, objective: o.id })} className={`p-3 rounded-xl border text-left transition-all ${data.objective === o.id ? "bg-indigo-600/15 border-indigo-500/30" : "bg-[#0f0f0f] border-white/5 hover:border-white/15"}`}>
                      <div className="text-xl">{o.icon}</div>
                      <div className="text-sm font-medium mt-1">{o.label}</div>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Special Ad Category">
                <select value={data.specialCategory} onChange={e => setData({ ...data, specialCategory: e.target.value })} className="input">
                  <option value="none">None</option>
                  <option value="credit">Credit</option>
                  <option value="employment">Employment</option>
                  <option value="housing">Housing</option>
                </select>
              </Field>
              <div className="flex gap-3">
                <Toggle label="A/B Test" value={data.abTest} onChange={v => setData({ ...data, abTest: v })} />
                <Toggle label="Campaign Budget Optimization (CBO)" value={data.cbo} onChange={v => setData({ ...data, cbo: v })} />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <Field label="Budget Type">
                <div className="flex gap-2">
                  {["daily", "lifetime"].map(t => (
                    <button key={t} onClick={() => setData({ ...data, budgetType: t })} className={`flex-1 p-3 rounded-xl border capitalize ${data.budgetType === t ? "bg-indigo-600/15 border-indigo-500/30 text-indigo-200" : "bg-[#0f0f0f] border-white/5"}`}>{t} budget</button>
                  ))}
                </div>
              </Field>
              <Field label={`Budget: €${data.budgetAmount}`}>
                <input type="range" min={5} max={1000} value={data.budgetAmount} onChange={e => setData({ ...data, budgetAmount: +e.target.value })} className="w-full accent-indigo-500" />
                <input type="number" value={data.budgetAmount} onChange={e => setData({ ...data, budgetAmount: +e.target.value })} className="input mt-2" />
              </Field>
              <Toggle label="Run continuously" value={data.runContinuously} onChange={v => setData({ ...data, runContinuously: v })} />
              {!data.runContinuously && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start"><input type="datetime-local" value={data.startDate} onChange={e => setData({ ...data, startDate: e.target.value })} className="input" /></Field>
                  <Field label="End"><input type="datetime-local" value={data.endDate} onChange={e => setData({ ...data, endDate: e.target.value })} className="input" /></Field>
                </div>
              )}
              <Field label="Ad Scheduling (run on specific hours)">
                <div className="text-[11px] text-[#9ca3af] mb-2">Click cells to toggle. Default: all hours.</div>
                <ScheduleGrid />
              </Field>
            </>
          )}
          {step === 3 && (
            <>
              <Field label="Bid Strategy">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "lowest_cost", label: "Lowest Cost", desc: "Automatic bidding" },
                    { id: "cost_cap", label: "Cost Cap", desc: "Target cost per result" },
                    { id: "bid_cap", label: "Bid Cap", desc: "Max bid amount" },
                    { id: "value", label: "Value Optimization", desc: "ROAS target" },
                  ].map(b => (
                    <button key={b.id} onClick={() => setData({ ...data, bidStrategy: b.id })} className={`p-3 rounded-xl border text-left ${data.bidStrategy === b.id ? "bg-indigo-600/15 border-indigo-500/30" : "bg-[#0f0f0f] border-white/5"}`}>
                      <div className="font-medium text-sm">{b.label}</div>
                      <div className="text-[11px] text-[#9ca3af]">{b.desc}</div>
                    </button>
                  ))}
                </div>
              </Field>
              {data.bidStrategy === "cost_cap" && <Field label="Target cost per result (€)"><input type="number" value={data.costCap} onChange={e => setData({ ...data, costCap: +e.target.value })} className="input" /></Field>}
              {data.bidStrategy === "bid_cap" && <Field label="Max bid (€)"><input type="number" value={data.bidCap} onChange={e => setData({ ...data, bidCap: +e.target.value })} className="input" /></Field>}
              <Field label="Optimization Goal">
                <select value={data.optimizationGoal} onChange={e => setData({ ...data, optimizationGoal: e.target.value })} className="input">
                  <option value="impressions">Impressions</option>
                  <option value="reach">Reach</option>
                  <option value="link_clicks">Link Clicks</option>
                  <option value="landing_page_views">Landing Page Views</option>
                  <option value="conversions">Conversions</option>
                  <option value="purchase_value">Purchase Value</option>
                  <option value="app_events">App Events</option>
                </select>
              </Field>
            </>
          )}
          {step === 4 && (
            <>
              <Card className="p-4 space-y-2">
                <Row k="Name" v={data.name || "Untitled"} />
                <Row k="Objective" v={data.objective} />
                <Row k="Special Category" v={data.specialCategory} />
                <Row k="A/B Test" v={data.abTest ? "Yes" : "No"} />
                <Row k="CBO" v={data.cbo ? "Yes" : "No"} />
                <Row k="Budget" v={`€${data.budgetAmount} (${data.budgetType})`} />
                <Row k="Schedule" v={data.runContinuously ? "Continuous" : `${data.startDate} → ${data.endDate}`} />
                <Row k="Bid Strategy" v={data.bidStrategy} />
                <Row k="Optimization" v={data.optimizationGoal} />
              </Card>
              <Card className="p-4 bg-gradient-to-br from-indigo-600/10 to-fuchsia-600/5 border-indigo-500/20">
                <div className="text-xs text-[#9ca3af]">Estimated Daily Reach</div>
                <div className="text-2xl font-semibold mt-1">{(data.budgetAmount * 240).toLocaleString()} – {(data.budgetAmount * 420).toLocaleString()}</div>
                <div className="text-[11px] text-[#9ca3af] mt-1">people per day, based on your settings</div>
              </Card>
            </>
          )}
        </div>

        <div className="h-16 border-t border-white/5 flex items-center justify-between px-5">
          <button onClick={prev} disabled={step === 1} className="h-9 px-4 rounded-lg border border-white/10 text-sm disabled:opacity-30">Back</button>
          <div className="flex gap-2">
            {step === 4 ? (
              <>
                <button onClick={() => { toast.success("Saved as draft"); onClose(); }} className="h-9 px-4 rounded-lg border border-white/10 text-sm">Save as Draft</button>
                <button onClick={launch} className="h-9 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium">Launch Campaign</button>
              </>
            ) : (
              <button onClick={next} className="h-9 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium flex items-center gap-1">Next <ChevronRight className="h-4 w-4" /></button>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .input { width: 100%; height: 38px; padding: 0 12px; background: #0f0f0f; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: #f1f1f1; font-size: 14px; outline: none; }
        .input:focus { border-color: rgba(79,70,229,0.5); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-[#9ca3af] mb-1.5">{label}</label>{children}</div>;
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex items-center gap-2 text-sm">
      <span className={`h-5 w-9 rounded-full transition-colors relative ${value ? "bg-indigo-600" : "bg-white/10"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? "left-4" : "left-0.5"}`} />
      </span>
      <span>{label}</span>
    </button>
  );
}
function Row({ k, v }: { k: string; v: any }) {
  return <div className="flex justify-between text-sm"><span className="text-[#9ca3af]">{k}</span><span className="font-medium">{String(v)}</span></div>;
}
function ScheduleGrid() {
  const [grid, setGrid] = useState(() => Array(7).fill(null).map(() => Array(24).fill(true)));
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const toggle = (d: number, h: number) => {
    const g = grid.map(r => [...r]); g[d][h] = !g[d][h]; setGrid(g);
  };
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-[20px_repeat(24,1fr)] gap-0.5 text-[9px] text-[#9ca3af] min-w-[480px]">
        <div></div>
        {Array.from({ length: 24 }).map((_, h) => <div key={h} className="text-center">{h}</div>)}
        {days.map((d, di) => (
          <>
            <div key={`d${di}`} className="flex items-center">{d}</div>
            {Array.from({ length: 24 }).map((_, h) => (
              <button key={`${di}-${h}`} onClick={() => toggle(di, h)} className={`h-4 rounded-sm transition-colors ${grid[di][h] ? "bg-indigo-600/70 hover:bg-indigo-500" : "bg-white/5 hover:bg-white/10"}`} />
            ))}
          </>
        ))}
      </div>
    </div>
  );
}
