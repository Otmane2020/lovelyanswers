import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MapPin, 
  Building2, 
  TrendingUp, 
  MessageSquare, 
  Calendar,
  Image,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Star,
  Phone,
  Globe
} from "lucide-react";
import { useActiveProject } from "@/hooks/useProjects";
import { useGoogleBusiness } from "@/hooks/useGoogleBusiness";
import { LocalHeatmap } from "@/components/local/LocalHeatmap";
import { LocalAnswers } from "@/components/local/LocalAnswers";
import { toast } from "sonner";

export default function AeoLocal() {
  const { project } = useActiveProject();
  const { 
    business, 
    isLoading, 
    isConnected, 
    connectGMB, 
    publishPost,
    fetchInsights 
  } = useGoogleBusiness();
  
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState<"UPDATE" | "OFFER" | "EVENT">("UPDATE");
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublishPost = async () => {
    if (!postContent.trim()) {
      toast.error("Please enter post content");
      return;
    }
    
    setIsPublishing(true);
    try {
      await publishPost({
        content: postContent,
        type: postType,
      });
      toast.success("Post published to Google My Business!");
      setPostContent("");
    } catch (error) {
      toast.error("Failed to publish post");
    } finally {
      setIsPublishing(false);
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
                  Optimize your local AI visibility & manage Google Business Profile
                </p>
              </div>
            </div>
          </div>
          
          {!isConnected ? (
            <Button 
              onClick={connectGMB}
              className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              <Building2 className="h-4 w-4" />
              Connect Google Business
            </Button>
          ) : (
            <Badge variant="outline" className="gap-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 px-4 py-2">
              <CheckCircle2 className="h-4 w-4" />
              Business Connected
            </Badge>
          )}
        </div>

        {/* Business Overview Card */}
        {isConnected && business && (
          <Card className="border-orange-200/50 bg-gradient-to-br from-orange-50/50 to-red-50/50">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{business.name}</h3>
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
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{business.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span>{business.website}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white/60 rounded-xl">
                    <p className="text-2xl font-bold text-orange-600">{business.insights?.views || 0}</p>
                    <p className="text-xs text-muted-foreground">Profile Views</p>
                  </div>
                  <div className="text-center p-4 bg-white/60 rounded-xl">
                    <p className="text-2xl font-bold text-red-600">{business.insights?.clicks || 0}</p>
                    <p className="text-xs text-muted-foreground">Website Clicks</p>
                  </div>
                  <div className="text-center p-4 bg-white/60 rounded-xl">
                    <p className="text-2xl font-bold text-emerald-600">{business.insights?.calls || 0}</p>
                    <p className="text-xs text-muted-foreground">Phone Calls</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="heatmap" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="heatmap" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Visibility Heatmap</span>
              <span className="sm:hidden">Heatmap</span>
            </TabsTrigger>
            <TabsTrigger value="answers" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Local Q&A</span>
              <span className="sm:hidden">Q&A</span>
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">GMB Posts</span>
              <span className="sm:hidden">Posts</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>

          {/* Heatmap Tab */}
          <TabsContent value="heatmap" className="space-y-6">
            <LocalHeatmap businessName={business?.name || project?.name || ""} />
          </TabsContent>

          {/* Local Q&A Tab */}
          <TabsContent value="answers" className="space-y-6">
            <LocalAnswers />
          </TabsContent>

          {/* GMB Posts Tab */}
          <TabsContent value="posts" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Create Post */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-orange-500" />
                    Create GMB Post
                  </CardTitle>
                  <CardDescription>
                    Publish updates, offers, or events to your Google Business Profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Post Type</Label>
                    <Select value={postType} onValueChange={(v) => setPostType(v as typeof postType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPDATE">Update</SelectItem>
                        <SelectItem value="OFFER">Offer / Promotion</SelectItem>
                        <SelectItem value="EVENT">Event</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="Write your post content..."
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      {postContent.length}/1500 characters
                    </p>
                  </div>

                  <Button 
                    onClick={handlePublishPost}
                    disabled={isPublishing || !isConnected}
                    className="w-full gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    {isPublishing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Publish to GMB
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Posts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-500" />
                    Recent Posts
                  </CardTitle>
                  <CardDescription>
                    Your latest Google Business Profile posts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!isConnected ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Connect your Google Business Profile to see posts</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Placeholder for recent posts */}
                      <div className="p-4 border rounded-lg bg-muted/30">
                        <p className="text-sm text-muted-foreground">No posts yet</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <Eye className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                  <p className="text-3xl font-bold">{business?.insights?.views || 0}</p>
                  <p className="text-sm text-muted-foreground">Profile Views</p>
                  <Badge variant="secondary" className="mt-2">Last 30 days</Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Globe className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                  <p className="text-3xl font-bold">{business?.insights?.clicks || 0}</p>
                  <p className="text-sm text-muted-foreground">Website Clicks</p>
                  <Badge variant="secondary" className="mt-2">Last 30 days</Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Phone className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-3xl font-bold">{business?.insights?.calls || 0}</p>
                  <p className="text-sm text-muted-foreground">Phone Calls</p>
                  <Badge variant="secondary" className="mt-2">Last 30 days</Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <MapPin className="h-8 w-8 mx-auto text-red-500 mb-2" />
                  <p className="text-3xl font-bold">{business?.insights?.directions || 0}</p>
                  <p className="text-sm text-muted-foreground">Direction Requests</p>
                  <Badge variant="secondary" className="mt-2">Last 30 days</Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
