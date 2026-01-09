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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreHorizontal,
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
  const { data: answers = [], isLoading: answersLoading } = useAnswers();
  const { data: articles = [], isLoading: articlesLoading } = useArticles();
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

  const getPlatformIcon = (url: string | null) => {
    if (!url) return null;
    
    const urlLower = url.toLowerCase();
    if (urlLower.includes("wordpress") || urlLower.includes("wp-")) {
      return <img src={platformLogos.wordpress} alt="WordPress" className="h-5 w-5" />;
    }
    if (urlLower.includes("shopify") || urlLower.includes("myshopify")) {
      return <img src={platformLogos.shopify} alt="Shopify" className="h-5 w-5" />;
    }
    if (urlLower.includes("wix")) {
      return <img src={platformLogos.wix} alt="Wix" className="h-5 w-5" />;
    }
    return <Globe className="h-4 w-4 text-muted-foreground" />;
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
                      <TableHead>Date</TableHead>
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
                          {answer.published_url ? (
                            <a 
                              href={answer.published_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 hover:text-primary"
                            >
                              {getPlatformIcon(answer.published_url)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(answer.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/answers/${answer.id}/edit`)} className="flex items-center gap-2">
                                <Pencil className="h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              {answer.is_public && (
                                <DropdownMenuItem onClick={() => window.open(`/answers/${answer.slug}`, "_blank")} className="flex items-center gap-2">
                                  <Eye className="h-4 w-4" />
                                  <span>View Public</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleCopyLink(answer.slug)} className="flex items-center gap-2">
                                <Copy className="h-4 w-4" />
                                <span>Copy Link</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handlePublish(answer.id)}
                                disabled={publishingId === answer.id}
                                className="flex items-center gap-2"
                              >
                                {publishingId === answer.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                                <span>Publish to CMS</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/articles/${article.id}`)} className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                <span>View</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/articles/${article.id}/edit`)} className="flex items-center gap-2">
                                <Pencil className="h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="flex items-center gap-2">
                                <Send className="h-4 w-4" />
                                <span>Publish</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
