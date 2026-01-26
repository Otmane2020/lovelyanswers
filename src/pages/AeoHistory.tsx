import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  History, 
  MessageSquare, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ExternalLink,
  Eye,
  Pencil,
  Send,
  Globe,
  Loader2,
  Copy
} from "lucide-react";
import { useAnswers } from "@/hooks/useAnswers";
import { useArticles } from "@/hooks/useArticles";
import { useActiveProject } from "@/hooks/useProjects";
import { usePublishAnswer } from "@/hooks/usePublishAnswer";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import wordpressLogo from "@/assets/wordpress-logo.png";
import shopifyLogo from "@/assets/shopify-logo.png";
import wixLogo from "@/assets/wix-logo.png";

const platformLogos: Record<string, string> = {
  wordpress: wordpressLogo,
  shopify: shopifyLogo,
  wix: wixLogo,
};

export default function AeoHistory() {
  const navigate = useNavigate();
  const { project } = useActiveProject();
  const { data: rawAnswers = [], isLoading: answersLoading } = useAnswers();
  const { data: rawArticles = [], isLoading: articlesLoading } = useArticles();
  
  // Filter only published answers (is_public=true) and sort by published_at desc
  const answers = [...rawAnswers]
    .filter((a) => a.is_public)
    .sort((a, b) => {
      // Sort by published_at desc if available, otherwise by created_at desc
      const dateA = a.published_at ? new Date(a.published_at).getTime() : new Date(a.created_at).getTime();
      const dateB = b.published_at ? new Date(b.published_at).getTime() : new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  
  // Filter only published articles and sort by created_at desc
  const articles = [...rawArticles]
    .filter((a) => a.status === "published")
    .sort((a, b) => {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  const publishAnswer = usePublishAnswer();
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const handlePublish = async (answerId: string) => {
    if (!project) return;
    setPublishingId(answerId);
    try {
      await publishAnswer.mutateAsync({ answerId, projectId: project.id });
    } finally {
      setPublishingId(null);
    }
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/answers/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  const getStatusBadge = (item: { is_public?: boolean; published_at?: string | null; published_url?: string | null }) => {
    if (item.published_url) {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 gap-1">
          <CheckCircle className="h-3 w-3" />
          Published
        </Badge>
      );
    }
    if (item.is_public) {
      return (
        <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 gap-1">
          <Globe className="h-3 w-3" />
          Public
        </Badge>
      );
    }
    return (
      <Badge className="bg-muted text-muted-foreground border-muted-foreground/30 gap-1">
        <Clock className="h-3 w-3" />
        Draft
      </Badge>
    );
  };

  const getArticleStatusBadge = (status: string | null) => {
    switch (status) {
      case "published":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 gap-1">
            <CheckCircle className="h-3 w-3" />
            Published
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 gap-1">
            <Clock className="h-3 w-3" />
            Scheduled
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground border-muted-foreground/30 gap-1">
            <AlertCircle className="h-3 w-3" />
            Draft
          </Badge>
        );
    }
  };

  // Extract domain from project URL (from onboarding)
  const getProjectDomain = (): string => {
    if (!project?.website_url) return "";
    try {
      const urlObj = new URL(project.website_url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return project.website_url;
    }
  };

  const getPlatformInfo = (url: string | null): { icon: React.ReactNode; label: string } | null => {
    // Use project domain as fallback if no published_url
    const projectDomain = getProjectDomain();
    
    if (!url) {
      // Return project domain with globe icon when no published_url
      if (projectDomain) {
        return { icon: <Globe className="h-4 w-4 text-muted-foreground" />, label: projectDomain };
      }
      return null;
    }
    
    const urlLower = url.toLowerCase();
    
    // Extract domain from URL
    let domain = "";
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname.replace("www.", "");
    } catch {
      domain = url;
    }
    
    if (urlLower.includes("wordpress") || urlLower.includes("wp-")) {
      return { icon: <img src={platformLogos.wordpress} alt="WordPress" className="h-5 w-5" />, label: domain };
    }
    if (urlLower.includes("shopify") || urlLower.includes("myshopify")) {
      return { icon: <img src={platformLogos.shopify} alt="Shopify" className="h-5 w-5" />, label: domain };
    }
    if (urlLower.includes("wix")) {
      return { icon: <img src={platformLogos.wix} alt="Wix" className="h-5 w-5" />, label: domain };
    }
    return { icon: <Globe className="h-4 w-4 text-muted-foreground" />, label: domain };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <History className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">History</h1>
            <p className="text-muted-foreground">Track all your AEO answers and blog articles</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="aeo" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="aeo" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              AEO Answers
              <Badge variant="secondary" className="ml-1">{answers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="blog" className="gap-2">
              <FileText className="h-4 w-4" />
              Blog Articles
              <Badge variant="secondary" className="ml-1">{articles.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* AEO Answers Tab */}
          <TabsContent value="aeo" className="mt-6">
            <Card>
              {answersLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : answers.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">No AEO answers yet</h3>
                  <p className="text-muted-foreground mb-4">Generate your first answers to see them here</p>
                  <Button onClick={() => navigate("/answers")}>Go to Answers</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Question</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Integration</TableHead>
                      <TableHead>Published</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {answers.map((answer) => (
                      <TableRow key={answer.id}>
                        <TableCell className="font-medium">
                          <div className="line-clamp-2">{answer.question}</div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={answer.score >= 80 ? "border-emerald-500 text-emerald-600" : answer.score >= 60 ? "border-amber-500 text-amber-600" : ""}
                          >
                            {answer.score}%
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(answer)}</TableCell>
                        <TableCell>
                          {(() => {
                            const platformInfo = getPlatformInfo(answer.published_url || null);
                            if (!platformInfo) return <span className="text-muted-foreground">—</span>;
                            
                            return answer.published_url ? (
                              <a 
                                href={answer.published_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 hover:text-primary text-sm"
                              >
                                {platformInfo.icon}
                                <span className="truncate max-w-[120px]">{platformInfo.label}</span>
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              </a>
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {platformInfo.icon}
                                <span className="truncate max-w-[120px]">{platformInfo.label}</span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {answer.published_at 
                            ? format(new Date(answer.published_at), "MMM d, yyyy")
                            : format(new Date(answer.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => navigate(`/answers/${answer.id}/edit`)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {answer.published_url && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => window.open(answer.published_url!, "_blank")}
                                title="View on Client Site"
                              >
                                <ExternalLink className="h-4 w-4 text-emerald-600" />
                              </Button>
                            )}
                            {answer.is_public && !answer.published_url && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => window.open(`/answers/${answer.slug}`, "_blank")}
                                title="View Public Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleCopyLink(answer.slug)}
                              title="Copy Link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Blog Articles Tab */}
          <TabsContent value="blog" className="mt-6">
            <Card>
              {articlesLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : articles.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">No blog articles yet</h3>
                  <p className="text-muted-foreground mb-4">Generate articles from your AEO answers</p>
                  <Button onClick={() => navigate("/articles")}>Go to Articles</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Title</TableHead>
                      <TableHead>AEO Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Words</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.map((article) => (
                      <TableRow key={article.id}>
                        <TableCell className="font-medium">
                          <div className="line-clamp-2">{article.title}</div>
                        </TableCell>
                        <TableCell>
                          {article.aeo_score ? (
                            <Badge 
                              variant="outline" 
                              className={article.aeo_score >= 80 ? "border-emerald-500 text-emerald-600" : article.aeo_score >= 60 ? "border-amber-500 text-amber-600" : ""}
                            >
                              {article.aeo_score}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getArticleStatusBadge(article.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {article.word_count || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(article.created_at || new Date()), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {article.published_url && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => window.open(article.published_url!, "_blank")}
                                title="View on Client Site"
                              >
                                <ExternalLink className="h-4 w-4 text-emerald-600" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => navigate(`/articles/${article.id}/edit`)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
