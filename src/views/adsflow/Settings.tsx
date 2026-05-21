"use client";
import { useState } from "react";
import AdsFlowLayout, { Card } from "./Layout";
import { Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

const tabs = ["Account", "Ad Accounts", "Facebook Pixel", "Team", "Notifications"] as const;

export default function AdsFlowSettings() {
  const [tab, setTab] = useState<typeof tabs[number]>("Account");

  return (
    <AdsFlowLayout title="Settings">
      <div className="flex gap-1 mb-4 border-b border-white/5">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm border-b-2 ${tab === t ? "border-indigo-500 text-indigo-300" : "border-transparent text-[#9ca3af]"}`}>{t}</button>
        ))}
      </div>

      {tab === "Account" && (
        <Card className="p-5 max-w-2xl space-y-4">
          <Field label="Business name"><input defaultValue="Acme Brand" className="input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Timezone"><select className="input"><option>Europe/Paris</option><option>America/New_York</option><option>UTC</option></select></Field>
            <Field label="Currency"><select className="input"><option>EUR (€)</option><option>USD ($)</option><option>GBP (£)</option></select></Field>
          </div>
          <button onClick={() => toast.success("Saved")} className="h-10 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium text-sm">Save changes</button>
        </Card>
      )}

      {tab === "Ad Accounts" && (
        <Card className="p-5 max-w-2xl">
          <h3 className="text-sm font-semibold mb-3">Connect Meta Ads Account</h3>
          <div className="space-y-3">
            <Field label="Ad Account ID"><input placeholder="act_1234567890" className="input" /></Field>
            <Field label="Access Token"><input type="password" placeholder="EAAxxxxx…" className="input" /></Field>
            <button onClick={() => toast.success("Account connected")} className="h-10 px-5 rounded-lg bg-indigo-600 font-medium text-sm">Connect</button>
          </div>
          <div className="mt-6 pt-4 border-t border-white/5">
            <h4 className="text-xs font-semibold text-[#9ca3af] mb-2">Connected accounts</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f0f0f] border border-white/5">
                <div>
                  <div className="text-sm font-medium">act_1078917280383546</div>
                  <div className="text-[11px] text-[#9ca3af]">Acme Brand — connected May 18, 2026</div>
                </div>
                <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="h-3 w-3" /> Active</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === "Facebook Pixel" && (
        <Card className="p-5 max-w-2xl">
          <Field label="Pixel ID"><input placeholder="123456789012345" className="input" /></Field>
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-[#9ca3af] mb-2">Events tracked</h4>
            <div className="grid grid-cols-2 gap-2">
              {["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase", "Lead"].map(e => (
                <div key={e} className="flex items-center justify-between p-2 rounded-md bg-[#0f0f0f] border border-white/5 text-sm">
                  <span>{e}</span><span className="text-[10px] text-emerald-400">●</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-[#0f0f0f] border border-white/5 font-mono text-[11px] text-[#9ca3af]">
            &gt; Test event console<br />
            [2026-05-21 18:12] PageView — homepage ✓<br />
            [2026-05-21 18:13] AddToCart — Sneakers SKU-001 ✓<br />
            [2026-05-21 18:14] Purchase — €124.00 ✓
          </div>
        </Card>
      )}

      {tab === "Team" && (
        <Card className="p-5 max-w-3xl">
          <div className="flex gap-2 mb-4">
            <input placeholder="teammate@email.com" className="input flex-1" />
            <select className="input w-32"><option>Admin</option><option>Editor</option><option>Viewer</option></select>
            <button onClick={() => toast.success("Invite sent")} className="h-10 px-4 rounded-lg bg-indigo-600 font-medium text-sm flex items-center gap-1"><Plus className="h-4 w-4" /> Invite</button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-[#9ca3af] text-xs"><tr><th className="text-left p-2">Member</th><th className="text-left p-2">Role</th><th className="text-left p-2">Status</th><th></th></tr></thead>
            <tbody>
              {[
                { name: "Oben Rockman", role: "Admin", status: "Active" },
                { name: "Sarah Chen", role: "Editor", status: "Active" },
                { name: "Marc Dubois", role: "Viewer", status: "Pending" },
              ].map(m => (
                <tr key={m.name} className="border-t border-white/5"><td className="p-2 font-medium">{m.name}</td><td className="p-2 text-[#9ca3af]">{m.role}</td><td className="p-2"><span className={`text-[10px] px-2 py-0.5 rounded-md ${m.status === "Active" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{m.status}</span></td><td className="p-2 text-right"><button onClick={() => toast.success("Revoked")} className="text-rose-400 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button></td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "Notifications" && (
        <Card className="p-5 max-w-2xl space-y-3">
          {["Campaign paused", "Budget 90% spent", "Low ROAS alert", "Weekly performance report"].map(n => (
            <label key={n} className="flex items-center justify-between p-3 rounded-lg bg-[#0f0f0f] border border-white/5">
              <span className="text-sm">{n}</span>
              <input type="checkbox" defaultChecked className="accent-indigo-500 h-4 w-4" />
            </label>
          ))}
        </Card>
      )}
      <style>{`.input { width: 100%; height: 40px; padding: 0 12px; background: #0f0f0f; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: #f1f1f1; font-size: 14px; outline: none; } .input:focus { border-color: rgba(79,70,229,0.5); }`}</style>
    </AdsFlowLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-[#9ca3af] mb-1.5">{label}</label>{children}</div>;
}
