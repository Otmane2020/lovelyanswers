import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  ChevronDown,
  ChevronUp,
  ArrowRight,
  TrendingUp,
  Eye,
  Plus,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProject } from "@/hooks/useProjects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// Mock data for the reach chart
const reachData = [
  { month: "Jan", current: 0, projected: 5 },
  { month: "Feb", current: 8, projected: 15 },
  { month: "Mar", current: 22, projected: 30 },
  { month: "Apr", current: 35, projected: 42 },
  { month: "May", current: 42, projected: 55 },
  { month: "Jun", current: 48, projected: 65 },
  { month: "Jul", current: 52, projected: 72 },
  { month: "Aug", current: 55, projected: 80 },
  { month: "Sep", current: 58, projected: 88 },
  { month: "Oct", current: 60, projected: 95 },
  { month: "Nov", current: 62, projected: 102 },
  { month: "Dec", current: 65, projected: 110 },
];

// Languages data
const languages = [
  { code: "ES", name: "Spanish", reach: "800M", flag: "🇪🇸" },
  { code: "FR", name: "French", reach: "430M", flag: "🇫🇷" },
  { code: "DE", name: "German", reach: "230M", flag: "🇩🇪" },
  { code: "CZ", name: "Czech", reach: "11M", flag: "🇨🇿" },
  { code: "RO", name: "Romanian", reach: "28M", flag: "🇷🇴" },
  { code: "NL", name: "Dutch", reach: "30M", flag: "🇳🇱" },
  { code: "PT", name: "Portuguese", reach: "280M", flag: "🇵🇹" },
];

// GEO Score issues
const geoIssues = [
  { id: "1", title: "Missing llms.txt", severity: "High" },
  { id: "2", title: "Missing JSON-LD schema", severity: "High" },
  { id: "3", title: "Duplicated H1s", severity: "Medium" },
];

// Mock Reddit post
const redditPost = {
  title: "What is a good SEO tool for beginners?",
  subreddit: "r/seo",
  views: "11K",
};

export default function Dashboard() {
  const { user } = useAuth();
  const { project } = useActiveProject();
  const [languageCount, setLanguageCount] = useState([1]);
  const [showAutopilotModal, setShowAutopilotModal] = useState(false);
  const [geoExpanded, setGeoExpanded] = useState(false);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const domainRating = 1;
  const redditOpportunities = 10;
  const geoScore = 83;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {userName}!
          </h1>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Potential Reach Chart */}
          <div className="lg:col-span-2">
            <Card className="p-6 border border-border/50">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Potential Reach</h2>
                  <p className="text-sm text-muted-foreground">
                    Estimated audience reach based on language expansion
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                  <Plus className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    Add 3 languages and increase your reach by 1.5B
                  </span>
                </div>
              </div>

              {/* Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reachData}>
                    <defs>
                      <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="projected"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="transparent"
                    />
                    <Area
                      type="monotone"
                      dataKey="current"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorCurrent)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-primary rounded" />
                  <span className="text-sm text-muted-foreground">Current Reach</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-muted-foreground rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, hsl(var(--muted-foreground)) 2px, hsl(var(--muted-foreground)) 4px)' }} />
                  <span className="text-sm text-muted-foreground">Projected Reach</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Languages Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 border border-border/50">
              <h3 className="text-lg font-semibold text-foreground mb-4">Languages</h3>
              
              {/* Slider */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Number of languages</span>
                  <span className="text-sm font-medium text-foreground">{languageCount[0]}</span>
                </div>
                <Slider
                  value={languageCount}
                  onValueChange={setLanguageCount}
                  max={25}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Languages List */}
              <div className="space-y-3">
                {languages.slice(0, languageCount[0]).map((lang) => (
                  <div key={lang.code} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-sm text-foreground">{lang.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{lang.reach}</span>
                  </div>
                ))}
              </div>

              {/* Add Languages Button */}
              <Button 
                className="w-full mt-4 bg-foreground hover:bg-foreground/90 text-background"
                onClick={() => setLanguageCount([Math.min(languageCount[0] + 3, 25)])}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add 3 languages
              </Button>
            </Card>
          </div>
        </div>

        {/* Your Overview Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Your Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Domain Rating Card */}
            <Card className="p-5 border border-border/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Domain Rating</p>
                  <p className="text-3xl font-bold text-foreground">{domainRating}</p>
                </div>
                <div className="w-16 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[{ v: 0 }, { v: 1 }, { v: 1 }]}>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="hsl(var(--primary))"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>

            {/* Reddit Opportunities Card */}
            <Card className="p-5 border border-border/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reddit Opportunities</p>
                  <p className="text-3xl font-bold text-foreground">{redditOpportunities}</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">r/</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{redditPost.subreddit}</span>
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                </div>
                <p className="text-sm text-foreground line-clamp-1">{redditPost.title}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Eye className="w-3 h-3" />
                  <span>{redditPost.views} views</span>
                </div>
              </div>
            </Card>

            {/* GEO Score Card */}
            <Card className="p-5 border border-border/50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">GEO Score</p>
                  <p className="text-3xl font-bold text-foreground">{geoScore}<span className="text-lg text-muted-foreground">/100</span></p>
                </div>
                <button 
                  onClick={() => setGeoExpanded(!geoExpanded)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {geoExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-sm text-destructive mb-2">{geoIssues.length} Issues found</p>
              
              {geoExpanded && (
                <div className="space-y-2 mt-3 pt-3 border-t border-border/50">
                  {geoIssues.map((issue) => (
                    <div key={issue.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{issue.title}</span>
                      <span className={issue.severity === "High" ? "text-destructive" : "text-amber-500"}>
                        {issue.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Autopilot Modal Trigger */}
        <Card 
          className="p-6 border border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={() => setShowAutopilotModal(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Publish Article on Autopilot</h3>
              <p className="text-sm text-muted-foreground">Connect your CMS to automatically publish articles</p>
            </div>
            <ArrowRight className="w-5 h-5 text-primary" />
          </div>
        </Card>
      </div>

      {/* Autopilot Modal */}
      <Dialog open={showAutopilotModal} onOpenChange={setShowAutopilotModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Publish Article on Autopilot</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="text-center text-muted-foreground mb-6">
              Connect your CMS to automatically publish AI-generated articles
            </p>
            
            {/* CMS Icons Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { name: "Wix", icon: "W" },
                { name: "WordPress", icon: "W" },
                { name: "Shopify", icon: "S" },
                { name: "Webflow", icon: "W" },
              ].map((cms) => (
                <div 
                  key={cms.name}
                  className="aspect-square rounded-xl border border-border flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                >
                  <span className="text-2xl font-bold text-muted-foreground">{cms.icon}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <Button className="w-full bg-foreground hover:bg-foreground/90 text-background">
                Connect Website
              </Button>
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => setShowAutopilotModal(false)}
              >
                No Thanks
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
