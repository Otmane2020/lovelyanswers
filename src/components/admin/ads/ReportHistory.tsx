import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Clock, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Report {
  id: string;
  report_type: string;
  content: string;
  summary: string | null;
  created_at: string;
}

interface ReportHistoryProps {
  reports: Report[];
  isLoading: boolean;
  onLoad: (report: Report) => void;
  focusType: string;
  onRefresh: (focus: string) => void;
}

export function ReportHistory({ reports, isLoading, onLoad, focusType, onRefresh }: ReportHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Chargement...</span>
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Historique des analyses ({reports.length})
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onRefresh(focusType)}>
            <History className="h-3 w-3 mr-1" /> Rafraîchir
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onLoad(report)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate max-w-[400px]">
                      {report.summary || "Analyse complète"}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(report.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs shrink-0">
                  Charger
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
