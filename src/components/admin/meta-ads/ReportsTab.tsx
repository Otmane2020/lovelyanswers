"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";

export default function ReportsTab({ projectId, account, refreshKey }: any) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  useEffect(() => {
    if (!projectId) return;
    supabase.from("meta_campaigns").select("*").eq("project_id", projectId).order("spend", { ascending: false })
      .then(({ data }) => setCampaigns(data || []));
  }, [projectId, refreshKey]);

  function exportCsv() {
    const headers = ["name", "objective", "status", "spend", "revenue", "roas", "conversions", "cpa", "ctr", "cpc", "impressions", "clicks"];
    const rows = campaigns.map(c => headers.map(h => c[h] ?? "").join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `meta-ads-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const cur = account?.currency || "";
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={exportCsv} disabled={!campaigns.length}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Campaign</TableHead><TableHead className="text-right">Spend ({cur})</TableHead>
            <TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">ROAS</TableHead>
            <TableHead className="text-right">Conv.</TableHead><TableHead className="text-right">CPA</TableHead>
            <TableHead className="text-right">CTR</TableHead><TableHead className="text-right">CPC</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {campaigns.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
              : campaigns.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right">{Number(c.spend).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(c.revenue || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(c.roas || 0).toFixed(2)}x</TableCell>
                  <TableCell className="text-right">{c.conversions || 0}</TableCell>
                  <TableCell className="text-right">{c.cpa ? Number(c.cpa).toFixed(2) : "—"}</TableCell>
                  <TableCell className="text-right">{Number(c.ctr).toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{Number(c.cpc).toFixed(2)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
