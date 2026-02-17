import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const GoogleTagManager = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Google Tag Manager</h1>
            <p className="text-muted-foreground mt-1">
              Diagnostic technique — tags, triggers, erreurs
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <Tag className="h-3.5 w-3.5 mr-1.5" /> 0 tags actifs
          </Badge>
          <Badge variant="destructive" className="text-sm px-3 py-1">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> 0 erreurs
          </Badge>
        </div>

        {/* Tags Table */}
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

        {/* Conversion Tags */}
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

        {/* GA4 Tags */}
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
    </DashboardLayout>
  );
};

export default GoogleTagManager;
