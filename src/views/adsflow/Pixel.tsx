"use client";
import AdsFlowLayout from "./Layout";
import { useAdsflowData, GuardGate } from "./useAdsflowData";
import PixelTab from "@/components/admin/meta-ads/PixelTab";
import { Card } from "./Layout";
import { ShieldCheck, Lock, Webhook } from "lucide-react";

export default function AdsFlowPixel() {
  const data = useAdsflowData();
  return (
    <AdsFlowLayout title="Pixel & Tracking" accountName={data.account?.name} onSync={data.sync} syncing={data.syncing}>
      <GuardGate data={data}>
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium"><ShieldCheck className="h-4 w-4" />Server-side CAPI</div>
              <p className="text-xs text-[#9ca3af] mt-2">Events are sent server-side via Conversions API. Tokens stay in Lovable Cloud secrets — never exposed in the browser.</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-indigo-300 text-sm font-medium"><Lock className="h-4 w-4" />PII hashing</div>
              <p className="text-xs text-[#9ca3af] mt-2">Email, phone & user_data are SHA-256 hashed before being sent to Meta, per their Advanced Matching policy.</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-amber-300 text-sm font-medium"><Webhook className="h-4 w-4" />Deduplication</div>
              <p className="text-xs text-[#9ca3af] mt-2">Each event carries an <code className="text-[10px]">event_id</code> so browser pixel and CAPI events are deduplicated automatically.</p>
            </Card>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#1a1a1a] p-5">
            <PixelTab projectId={data.projectId} refreshKey={0} onChange={data.refresh} />
          </div>
        </div>
      </GuardGate>
    </AdsFlowLayout>
  );
}
