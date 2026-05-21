"use client";
import AdsFlowLayout, { Card } from "./Layout";
import { CreditCard, Download } from "lucide-react";
import { toast } from "sonner";

const invoices = [
  { id: "INV-2026-005", date: "2026-05-01", amount: 99, status: "Paid" },
  { id: "INV-2026-004", date: "2026-04-01", amount: 99, status: "Paid" },
  { id: "INV-2026-003", date: "2026-03-01", amount: 99, status: "Paid" },
  { id: "INV-2026-002", date: "2026-02-01", amount: 99, status: "Paid" },
  { id: "INV-2026-001", date: "2026-01-01", amount: 99, status: "Paid" },
];

export default function AdsFlowBilling() {
  return (
    <AdsFlowLayout title="Billing">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-5 lg:col-span-2 bg-gradient-to-br from-indigo-600/10 to-fuchsia-600/5 border-indigo-500/20">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-[#9ca3af]">Current plan</div>
              <div className="text-2xl font-semibold mt-1">AdsFlow Pro</div>
              <div className="text-xs text-[#9ca3af] mt-1">€99/mo — unlimited campaigns, AI optimizer, priority support</div>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">Active</span>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => toast.info("Open plan picker")} className="h-9 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-sm">Change plan</button>
            <button onClick={() => toast.error("Subscription cancelled")} className="h-9 px-4 rounded-lg border border-white/10 text-sm text-[#9ca3af]">Cancel</button>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-[#9ca3af] mb-2">Payment method</div>
          <div className="rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 p-4 border border-white/10 mb-3">
            <CreditCard className="h-6 w-6 mb-3 text-indigo-300" />
            <div className="font-mono text-sm">•••• •••• •••• 4242</div>
            <div className="text-xs text-[#9ca3af] mt-1">Visa • exp 12/28</div>
          </div>
          <button onClick={() => toast.info("Update card")} className="w-full h-9 rounded-lg border border-white/10 text-sm">Update card</button>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-white/5"><h3 className="text-sm font-semibold">Invoices</h3></div>
        <table className="w-full text-sm">
          <thead className="text-[#9ca3af] text-xs"><tr><th className="text-left p-3">Invoice</th><th className="text-left p-3">Date</th><th className="text-right p-3">Amount</th><th className="text-left p-3">Status</th><th></th></tr></thead>
          <tbody>
            {invoices.map(i => (
              <tr key={i.id} className="border-t border-white/5">
                <td className="p-3 font-mono text-xs">{i.id}</td>
                <td className="p-3 text-[#9ca3af]">{i.date}</td>
                <td className="p-3 text-right">€{i.amount}</td>
                <td className="p-3"><span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">{i.status}</span></td>
                <td className="p-3 text-right"><button onClick={() => toast.success("Downloaded")} className="text-indigo-300 hover:text-indigo-200"><Download className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AdsFlowLayout>
  );
}
