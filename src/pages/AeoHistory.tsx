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
  Globe,
  Loader2,
  Copy,
  MapPin,
  Sparkles,
  Search
} from "lucide-react";
import { useAnswers } from "@/hooks/useAnswers";
import { useArticles } from "@/hooks/useArticles";
import { useLocalAnswers } from "@/hooks/useLocalAnswers";
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

type SourceType = "aeo" | "local" | "seo";

interface UnifiedHistoryItem {
  id: string;
  title: string;
  source: SourceType;
  score: number | null;
  is_public: boolean;
  published_at: string | null;
  published_url: string | null;
  created_at: string;
  slug?: string;
  word_count?: number;
  status?: string;
}

const getSourceBadge = (source: SourceType) => {
  switch (source) {
    case "aeo":
      return (
        <Badge className="bg-violet-500/20 text-violet-600 border-violet-500/30 gap-1">
          <Sparkles className="h-3 w-3" />
          AEO
        </Badge>
      );
    case "local":
      return (
       <Badge className="bg-violet-400/20 text-violet-500 border-violet-400/30 gap-1">
           <MapPin className="h-3 w-3" />
           Local AEO
         </Badge>
      );
    case "seo":
      return (
       <Badge className="bg-violet-500/20 text-violet-600 border-violet-500/30 gap-1">
           <Search className="h-3 w-3" />
           SEO
         </Badge>
      );
  }
};

export default function AeoHistory() {
  const navigate = useNavigate();
  const { project } = useActiveProject();
  const { data: rawAnswers = [], isLoading: answersLoading } = useAnswers();
  const { data: rawArticles = [], isLoading: articlesLoading } = useArticles();
  const { data: rawLocalAnswers = [], isLoading: localLoading } = useLocalAnswers();
  
  const publishAnswer = usePublishAnswer();
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Filter only published answers (is_public=true) and sort by published_at desc
  const answers = [...rawAnswers]
    .filter((a) => a.is_public)
    .sort((a, b) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : new Date(a.created_at).getTime();
      const dateB = b.published_at ? new Date(b.published_at).getTime() : new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  
  // Filter only published local answers
  const localAnswers = [...rawLocalAnswers]
    .filter((a) => a.is_public)
    .sort((a, b) => {
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

  // Create unified history combining all sources
  const unifiedHistory: UnifiedHistoryItem[] = [
    ...answers.map((a) => ({
      id: a.id,
      title: a.question,
      source: "aeo" as SourceType,
      score: a.score,
      is_public: a.is_public,
      published_at: a.published_at,
      published_url: a.published_url,
      created_at: a.created_at,
      slug: a.slug,
    })),
    ...localAnswers.map((a) => ({
      id: a.id,
      title: a.question,
      source: "local" as SourceType,
      score: a.score,
      is_public: a.is_public,
      published_at: a.published_at,
      published_url: a.published_url,
      created_at: a.created_at,
      slug: a.slug,
    })),
    ...articles.map((a) => ({
      id: a.id,
      title: a.title,
      source: "seo" as SourceType,
      score: a.aeo_score,
      is_public: true,
      published_at: a.created_at,
      published_url: a.published_url || null,
      created_at: a.created_at || new Date().toISOString(),
      word_count: a.word_count,
      status: a.status,
    })),
  ].sort((a, b) => {
    const dateA = a.published_at ? new Date(a.published_at).getTime() : new Date(a.created_at).getTime();
    const dateB = b.published_at ? new Date(b.published_at).getTime() : new Date(b.created_at).getTime();
    return dateB - dateA;
  });

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
       <Badge className="bg-violet-500/20 text-violet-600 border-violet-500/30 gap-1">
           <CheckCircle className="h-3 w-3" />
           Published
         </Badge>
      );
    }
    if (item.is_public) {
      return (
       <Badge className="bg-violet-400/20 text-violet-500 border-violet-400/30 gap-1">
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

  // Extract domain from project URL
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
    const projectDomain = getProjectDomain();
    
    if (!url) {
      if (projectDomain) {
        return { icon: <Globe className="h-4 w-4 text-muted-foreground" />, label: projectDomain };
      }
      return null;
    }
    
    const urlLower = url.toLowerCase();
    
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

  const isLoading = answersLoading || articlesLoading || localLoading;

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
            <p className="text-muted-foreground">Track all your published content: AEO, Local AEO & SEO</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="all" className="gap-2">
              <History className="h-4 w-4" />
              All
              <Badge variant="secondary" className="ml-1">{unifiedHistory.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="aeo" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AEO
              <Badge variant="secondary" className="ml-1">{answers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="local" className="gap-2">
              <MapPin className="h-4 w-4" />
              Local
              <Badge variant="secondary" className="ml-1">{localAnswers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="seo" className="gap-2">
              <FileText className="h-4 w-4" />
              SEO
              <Badge variant="secondary" className="ml-1">{articles.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* All History Tab */}
          <TabsContent value="all" className="mt-6">
            <Card>
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : unifiedHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">No published content yet</h3>
                  <p className="text-muted-foreground mb-4">Generate and publish content to see it here</p>
                  <Button onClick={() => navigate("/answers")}>Go to Answers</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Title</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Integration</TableHead>
                      <TableHead>Published</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unifiedHistory.map((item) => (
                      <TableRow key={`${item.source}-${item.id}`}>
                        <TableCell className="font-medium">
                          <div className="line-clamp-2">{item.title}</div>
                        </TableCell>
                        <TableCell>{getSourceBadge(item.source)}</TableCell>
                        <TableCell>
                          {item.score !== null ? (
                            <Badge 
                              variant="outline" 
                              className={item.score >= 80 ? "border-violet-500 text-violet-600" : item.score >= 60 ? "border-amber-500 text-amber-600" : ""}
                            >
                              {item.score}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(item)}</TableCell>
                        <TableCell>
                          {(() => {
                            const platformInfo = getPlatformInfo(item.published_url);
                            if (!platformInfo) return <span className="text-muted-foreground">—</span>;
                            
                            return item.published_url ? (
                              <a 
                                href={item.published_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 hover:text-primary text-sm"
                              >
                                {platformInfo.icon}
                                <span className="truncate max-w-[100px]">{platformInfo.label}</span>
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              </a>
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {platformInfo.icon}
                                <span className="truncate max-w-[100px]">{platformInfo.label}</span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.published_at 
                            ? format(new Date(item.published_at), "MMM d, yyyy")
                            : format(new Date(item.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.published_url && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => window.open(item.published_url!, "_blank")}
                                title="View on Site"
                              >
                                 <ExternalLink className="h-4 w-4 text-violet-600" />
                              </Button>
                            )}
                            {item.slug && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleCopyLink(item.slug!)}
                                title="Copy Link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

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
                             className={answer.score >= 80 ? "border-violet-500 text-violet-600" : answer.score >= 60 ? "border-amber-500 text-amber-600" : ""}
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

          {/* Local AEO Tab */}
          <TabsContent value="local" className="mt-6">
            <Card>
              {localLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : localAnswers.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">No Local AEO answers yet</h3>
                  <p className="text-muted-foreground mb-4">Generate local Q&A content to see it here</p>
                  <Button onClick={() => navigate("/local")}>Go to Local AEO</Button>
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
                    {localAnswers.map((answer) => (
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
                            {answer.published_url && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => window.open(answer.published_url!, "_blank")}
                                title="View on Site"
                              >
                                <ExternalLink className="h-4 w-4 text-emerald-600" />
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

          {/* SEO Articles Tab */}
          <TabsContent value="seo" className="mt-6">
            <Card>
              {articlesLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : articles.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">No SEO articles yet</h3>
                  <p className="text-muted-foreground mb-4">Generate articles from your AEO answers</p>
                  <Button onClick={() => navigate("/articles")}>Go to Articles</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Title</TableHead>
                      <TableHead>AEO Score</TableHead>
                      <TableHead>Words</TableHead>
                      <TableHead>Integration</TableHead>
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
                        <TableCell className="text-muted-foreground">
                          {article.word_count || "—"}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const platformInfo = getPlatformInfo(article.published_url || null);
                            if (!platformInfo) return <span className="text-muted-foreground">—</span>;
                            
                            return article.published_url ? (
                              <a 
                                href={article.published_url} 
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
                                title="View on Site"
                              >
                                <ExternalLink className="h-4 w-4 text-emerald-600" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => navigate(`/articles`)}
                              title="View Articles"
                            >
                              <Eye className="h-4 w-4" />
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