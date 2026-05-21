"use client";
import AdsFlowLayout from "./Layout";
import { useAdsflowData, GuardGate } from "./useAdsflowData";
import ReportsTab from "@/components/admin/meta-ads/ReportsTab";

export default function AdsFlowReports() {
  const data = useAdsflowData();
  return (
    <AdsFlowLayout title="Reports" accountName={data.account?.name} onSync={data.sync} syncing={data.syncing}>
      <GuardGate data={data}>
        <div className="rounded-2xl border border-white/5 bg-[#1a1a1a] p-5">
          <ReportsTab projectId={data.projectId} refreshKey={0} />
        </div>
      </GuardGate>
    </AdsFlowLayout>
  );
}
