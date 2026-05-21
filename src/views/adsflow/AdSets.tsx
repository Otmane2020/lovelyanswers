"use client";
import AdsFlowLayout, { Card, StatusBadge } from "./Layout";
import { mockAdSets } from "./mockData";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function AdsFlowAdSets() {
  return (
    <AdsFlowLayout title="Ad Sets">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#9ca3af]">Targeting, placements & budgets per ad set.</p>
        <button onClick={() => toast.info("Open Ad Set composer")} className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4" /> Create Ad Set</button>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0f0f0f]/50 text-[#9ca3af] text-xs">
              <tr>
                <th className="text-left p-3 font-medium">Ad Set</th>
                <th className="text-left p-3 font-medium">Campaign</th>
                <th className="text-left p-3 font-medium">Audience</th>
                <th className="text-left p-3 font-medium">Placement</th>
                <th className="text-right p-3 font-medium">Budget</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Reach</th>
                <th className="text-right p-3 font-medium">Freq.</th>
                <th className="text-right p-3 font-medium">CPM</th>
                <th className="text-right p-3 font-medium">CTR</th>
              </tr>
            </thead>
            <tbody>
              {mockAdSets.map(a => (
                <tr key={a.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 font-medium">{a.name}</td>
                  <td className="p-3 text-[#9ca3af]">{a.campaign}</td>
                  <td className="p-3 text-[#9ca3af]">{a.audience}</td>
                  <td className="p-3 text-[#9ca3af]">{a.placement}</td>
                  <td className="p-3 text-right">€{a.budget}</td>
                  <td className="p-3"><StatusBadge status={a.status} /></td>
                  <td className="p-3 text-right">{a.reach.toLocaleString()}</td>
                  <td className="p-3 text-right">{a.frequency}</td>
                  <td className="p-3 text-right">€{a.cpm}</td>
                  <td className="p-3 text-right">{a.ctr}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdsFlowLayout>
  );
}
