import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, FileText } from "lucide-react";

export default function AeoSettings() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your AEO project</p>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Domain configuration</h2>
              <p className="text-sm text-muted-foreground">Configure your domain for AEO</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input placeholder="https://example.com" />
            </div>
            <div className="space-y-2">
              <Label>Brand name</Label>
              <Input placeholder="My Brand" />
            </div>
            <Button>Save</Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-semibold">LLMs.txt</h2>
              <p className="text-sm text-muted-foreground">Instructions file for LLMs</p>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            The llms.txt file helps AI answer engines understand your content.
          </p>
          
          <Button variant="outline">Generate llms.txt</Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}