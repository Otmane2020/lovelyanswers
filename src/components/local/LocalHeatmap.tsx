"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useProjects";
import { toast } from "sonner";

interface HeatmapCell {
  lat: number;
  lng: number;
  position: number;
  trend: "up" | "down" | "stable";
}

interface LocalHeatmapProps {
  businessName: string;
  location?: string;
}

export function LocalHeatmap({ businessName, location: initialLocation }: LocalHeatmapProps) {
  const { project } = useActiveProject();
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState(initialLocation || "");
  const [isScanning, setIsScanning] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [averagePosition, setAveragePosition] = useState<number | null>(null);

  const handleScan = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("gmb-local-visibility", {
        body: {
          projectId: project?.id,
          businessName: businessName || project?.name,
          searchQuery: searchQuery,
          location: location || undefined,
        },
      });

      if (error) throw error;

      if (data?.heatmap) {
        setHeatmapData(data.heatmap);
        setAveragePosition(data.averagePosition);
        toast.success("Visibility scan completed!");
      }
    } catch (error) {
      console.error("Error scanning visibility:", error);
      toast.error("Failed to scan visibility");
    } finally {
      setIsScanning(false);
    }
  };

  const getPositionColor = (position: number) => {
    if (position <= 3) return "bg-emerald-500";
    if (position <= 5) return "bg-emerald-400";
    if (position <= 10) return "bg-yellow-400";
    if (position <= 15) return "bg-orange-400";
    return "bg-red-500";
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-emerald-500" />;
      case "down":
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-orange-500" />
            Visibility Scanner
          </CardTitle>
          <CardDescription>
            Search for your business to see how visible you are in local AI results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Search Query</Label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., best pizza near me"
              />
            </div>
            <div className="space-y-2">
              <Label>Location (optional)</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Paris, France"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleScan}
                disabled={isScanning}
                className="w-full gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" />
                    Scan Visibility
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {averagePosition !== null && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Visibility Results</CardTitle>
              <Badge 
                variant="outline" 
                className={`text-lg px-4 py-2 ${averagePosition <= 5 ? 'border-emerald-500 text-emerald-600' : averagePosition <= 10 ? 'border-yellow-500 text-yellow-600' : 'border-red-500 text-red-600'}`}
              >
                Avg. Position: #{averagePosition.toFixed(1)}
              </Badge>
            </div>
            <CardDescription>
              Your business visibility across different geographic points
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Heatmap Grid */}
            <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
              {heatmapData.length > 0 ? (
                heatmapData.map((cell, index) => (
                  <div
                    key={index}
                    className={`aspect-square rounded-lg ${getPositionColor(cell.position)} flex items-center justify-center text-white font-bold text-sm relative group cursor-pointer transition-transform hover:scale-110`}
                  >
                    #{cell.position}
                    <div className="absolute -top-1 -right-1">
                      {getTrendIcon(cell.trend)}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      Position #{cell.position}
                    </div>
                  </div>
                ))
              ) : (
                // Placeholder grid
                Array.from({ length: 25 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs"
                  >
                    -
                  </div>
                ))
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500" />
                <span className="text-sm text-muted-foreground">Top 3</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-400" />
                <span className="text-sm text-muted-foreground">Top 5</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-400" />
                <span className="text-sm text-muted-foreground">Top 10</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-400" />
                <span className="text-sm text-muted-foreground">Top 15</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-sm text-muted-foreground">15+</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {heatmapData.length === 0 && averagePosition === null && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No visibility data yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter a search query above to scan how visible your business is in local AI search results across different geographic points.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
