import { forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, AlertTriangle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const GoogleTagManagerPanel = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Google Tag Manager</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Diagnostic technique — tags, triggers, erreurs
        </p>
      </div>

      <div className="flex gap-3">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Tag className="h-3.5 w-3.5 mr-1.5" /> 0 tags actifs
        </Badge>
        <Badge variant="destructive" className="text-sm px-3 py-1">
          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> 0 erreurs
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Issue Detected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Connectez Google Tag Manager pour diagnostiquer vos tags
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Ads Conversion Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">
            Aucun tag de conversion détecté
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GA4 Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">
            Aucun tag GA4 détecté
          </p>
        </CardContent>
      </Card>
    </div>
  );
});
GoogleTagManagerPanel.displayName = "GoogleTagManagerPanel";
