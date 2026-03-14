import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
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
        <PageHeader
          icon={Tag}
          title="Google Tag Manager"
          description="Diagnostic technique — tags, triggers, erreurs"
          gradientFrom="from-blue-500/10"
          gradientVia="via-cyan-500/10"
          gradientTo="to-teal-500/10"
          iconFrom="from-blue-500"
          iconTo="to-cyan-600"
        />

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
