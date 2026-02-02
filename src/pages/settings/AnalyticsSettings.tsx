import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, ExternalLink, Save, Loader2 } from "lucide-react";

export function AnalyticsSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [gaEnabled, setGaEnabled] = useState(false);
  const [measurementId, setMeasurementId] = useState("");

  const handleSave = async () => {
    setIsLoading(true);
    
    // Simulate saving
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Settings saved",
      description: "Google Analytics settings have been updated.",
    });
    
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold">Google Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Connect your Google Analytics to track article performance
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ga-toggle">Enable Google Analytics Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Track page views and engagement for published articles
              </p>
            </div>
            <Switch
              id="ga-toggle"
              checked={gaEnabled}
              onCheckedChange={setGaEnabled}
            />
          </div>

          {gaEnabled && (
            <>
              {/* Measurement ID */}
              <div className="space-y-2">
                <Label htmlFor="measurement-id">Measurement ID</Label>
                <Input
                  id="measurement-id"
                  placeholder="G-XXXXXXXXXX"
                  value={measurementId}
                  onChange={(e) => setMeasurementId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Find this in your Google Analytics property settings under Data Streams
                </p>
              </div>

              {/* Help Link */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Need help finding your Measurement ID?
                </p>
                <a
                  href="https://support.google.com/analytics/answer/9539598"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  View Google Analytics setup guide
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </>
          )}

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">What data is tracked?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Page views for your published articles</li>
          <li>• Time on page and engagement metrics</li>
          <li>• Traffic sources and referrers</li>
          <li>• Geographic data of your readers</li>
        </ul>
      </Card>
    </div>
  );
}
