import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  Search,
  TrendingUp, 
  MessageSquare, 
  Star,
  Phone,
  Globe,
  Clock,
  X,
  Loader2
} from "lucide-react";
import { useActiveProject } from "@/hooks/useProjects";
import { useLocalBusiness } from "@/hooks/useLocalBusiness";
import { LocalHeatmap } from "@/components/local/LocalHeatmap";
import { LocalAnswers } from "@/components/local/LocalAnswers";

export default function AeoLocal() {
  const { project } = useActiveProject();
  const { 
    business, 
    searchResults,
    isLoading, 
    isSearching,
    searchBusinesses,
    selectBusiness,
    clearBusiness
  } = useLocalBusiness();
  
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchBusinesses(searchQuery);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Local AEO</h1>
                <p className="text-muted-foreground">
                  Optimize your local AI visibility with Google Places data
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Business Search / Selection */}
        {!business ? (
          <Card className="border-orange-200/50 dark:border-orange-800/30 bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-orange-500" />
                Find Your Business
              </CardTitle>
              <CardDescription>
                Search for your business on Google to get started with Local AEO
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="e.g., Café de Paris, 75001"
                  className="flex-1"
                />
                <Button 
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Select your business:</p>
                  <div className="grid gap-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => selectBusiness(result.id)}
                        disabled={isLoading}
                        className="w-full p-4 border rounded-lg text-left hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{result.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {result.address}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-sm shrink-0">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span>{result.rating}</span>
                            <span className="text-muted-foreground">({result.reviewCount})</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Business Overview Card */}
            <Card className="border-orange-200/50 dark:border-orange-800/30 bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-semibold">{business.name}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearBusiness}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4" />
                      {business.address}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{business.rating}</span>
                        <span className="text-muted-foreground">({business.reviewCount} reviews)</span>
                      </div>
                      {business.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{business.phone}</span>
                        </div>
                      )}
                      {business.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={business.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate max-w-[200px]"
                          >
                            {business.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                    </div>
                    {business.openingHours && business.openingHours.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Clock className="h-4 w-4" />
                          Opening Hours
                        </div>
                        <div className="text-sm space-y-0.5">
                          {business.openingHours.slice(0, 3).map((hours, i) => (
                            <p key={i}>{hours}</p>
                          ))}
                          {business.openingHours.length > 3 && (
                            <p className="text-muted-foreground">+{business.openingHours.length - 3} more...</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-1 md:w-48">
                    <div className="text-center p-4 bg-white/60 dark:bg-white/5 rounded-xl">
                      <p className="text-2xl font-bold text-orange-600">{business.rating}</p>
                      <p className="text-xs text-muted-foreground">Average Rating</p>
                    </div>
                    <div className="text-center p-4 bg-white/60 dark:bg-white/5 rounded-xl">
                      <p className="text-2xl font-bold text-red-600">{business.reviewCount}</p>
                      <p className="text-xs text-muted-foreground">Total Reviews</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Tabs */}
            <Tabs defaultValue="answers" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
                <TabsTrigger value="answers" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Local Q&A</span>
                  <span className="sm:hidden">Q&A</span>
                </TabsTrigger>
                <TabsTrigger value="heatmap" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Visibility Heatmap</span>
                  <span className="sm:hidden">Heatmap</span>
                </TabsTrigger>
              </TabsList>

              {/* Local Q&A Tab */}
              <TabsContent value="answers" className="space-y-6">
                <LocalAnswers business={business} />
              </TabsContent>

              {/* Heatmap Tab */}
              <TabsContent value="heatmap" className="space-y-6">
                <LocalHeatmap businessName={business.name} location={business.address} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
