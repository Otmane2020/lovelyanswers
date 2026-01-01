import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, CreditCard } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { format } from "date-fns";

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: "paid" | "pending" | "failed";
  pdfUrl?: string;
}

export default function AeoBilling() {
  const { subscribed, trial, subscriptionEnd, openCustomerPortal } = useSubscription();

  // Mock invoices for display
  const invoices: Invoice[] = [
    {
      id: "INV-001",
      date: "2025-12-04",
      amount: "$49.00",
      status: "paid",
    },
    {
      id: "INV-002",
      date: "2025-11-04",
      amount: "$49.00",
      status: "paid",
    },
  ];

  const getStatusBadge = (status: Invoice["status"]) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Paid</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Failed</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription and payment history</p>
        </div>

        {/* Subscription Card */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Your Subscription</h2>
                <p className="text-muted-foreground">Manage your plan and billing</p>
              </div>
            </div>
            {trial ? (
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                Trial Period
              </Badge>
            ) : subscribed ? (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="text-lg font-semibold mt-1">All-in-One</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Next Billing Date</p>
              <p className="text-lg font-semibold mt-1">
                {subscriptionEnd 
                  ? format(new Date(subscriptionEnd), "MMM d, yyyy")
                  : "—"
                }
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-semibold mt-1">
                {trial ? "Trial" : subscribed ? "Active" : "Inactive"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button onClick={openCustomerPortal}>
              Manage Subscription
            </Button>
            <Button variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10">
              Cancel Subscription
            </Button>
          </div>
        </Card>

        {/* Payment History */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Payment History</h3>
          
          {invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Billing Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Invoice PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{invoice.amount}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No payment history yet</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
