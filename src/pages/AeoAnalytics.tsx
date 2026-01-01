import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, TrendingUp, Eye, Quote, ExternalLink,
  Search, ShoppingBag, LineChart
} from "lucide-react";

const ANALYTICS_INTEGRATIONS = [
  { 
    id: "gsc", 
    name: "Google Search Console", 
    icon: Search, 
    description: "Track search performance & impressions",
    color: "bg-blue-500"
  },
  { 
    id: "ga4", 
    name: "Google Analytics 4", 
    icon: LineChart, 
    description: "Website traffic & user behavior",
    color: "bg-orange-500"
  },
  { 
    id: "merchant", 
    name: "Google Merchant Center", 
    icon: ShoppingBag, 
    description: "Product listings & shopping data",
    color: "bg-green-500"
  },
];

export default function AeoAnalytics() {
  const [connectedIntegrations] = useState<string[]>([]);

  // Mock data for AEO metrics
  const aeoMetrics = {
    totalCitations: 1284,
    citationGrowth: 23,
    avgScore: 78,
    scoreGrowth: 5,
    aiReach: "45.2K",
    reachGrowth: 18,
    publishedAnswers: 42,
  };

  const platformCitations = [
    { name: "ChatGPT", citations: 523, color: "bg-emerald-500" },
    { name: "Gemini", citations: 312, color: "bg-blue-500" },
    { name: "Claude", citations: 245, color: "bg-orange-500" },
    { name: "Perplexity", citations: 128, color: "bg-cyan-500" },
    { name: "Copilot", citations: 76, color: "bg-purple-500" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your AEO performance and AI citations
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Citations</p>
                <p className="text-3xl font-bold mt-1">{aeoMetrics.totalCitations}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-emerald-500">+{aeoMetrics.citationGrowth}%</span>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Quote className="w-5 h-5 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg AEO Score</p>
                <p className="text-3xl font-bold mt-1">{aeoMetrics.avgScore}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-emerald-500">+{aeoMetrics.scoreGrowth}%</span>
                  <span className="text-xs text-muted-foreground">improvement</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Reach</p>
                <p className="text-3xl font-bold mt-1">{aeoMetrics.aiReach}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-emerald-500">+{aeoMetrics.reachGrowth}%</span>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published Answers</p>
                <p className="text-3xl font-bold mt-1">{aeoMetrics.publishedAnswers}</p>
                <p className="text-xs text-muted-foreground mt-2">Ready for AI citation</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Citations by Platform */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Citations by AI Platform</h3>
          <div className="space-y-4">
            {platformCitations.map((platform) => (
              <div key={platform.name} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium">{platform.name}</div>
                <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                  <div 
                    className={`h-full ${platform.color} flex items-center justify-end pr-3`}
                    style={{ width: `${(platform.citations / 523) * 100}%` }}
                  >
                    <span className="text-xs text-white font-medium">{platform.citations}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Google Integrations */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Connect Analytics</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {ANALYTICS_INTEGRATIONS.map((integration) => {
              const isConnected = connectedIntegrations.includes(integration.id);
              const Icon = integration.icon;
              
              return (
                <Card key={integration.id} className="p-5 hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${integration.color} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{integration.name}</h3>
                        {isConnected && (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                            Connected
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {integration.description}
                      </p>
                      <Button 
                        variant={isConnected ? "outline" : "default"} 
                        size="sm" 
                        className="mt-3 gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {isConnected ? "Manage" : "Connect"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
