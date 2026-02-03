import { useState, useEffect } from "react";
import { FileText, Plus, Search, Calendar, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Article {
  id: string;
  title: string;
  status: string;
  word_count: number;
  aeo_score: number | null;
  created_at: string;
  scheduled_date: string | null;
}

export default function AutoSeo() {
  const navigate = useNavigate();
  const { project } = useActiveProject();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!project?.id) return;

    const fetchArticles = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("articles")
          .select("id, title, status, word_count, aeo_score, created_at, scheduled_date")
          .eq("project_id", project.id)
          .order("scheduled_date", { ascending: true });

        if (error) throw error;
        
        // Sort: today's articles first, then by scheduled_date ascending
        const today = new Date().toISOString().split('T')[0];
        const sortedData = (data || []).sort((a, b) => {
          const dateA = a.scheduled_date?.split('T')[0] || '';
          const dateB = b.scheduled_date?.split('T')[0] || '';
          
          if (dateA === today && dateB !== today) return -1;
          if (dateB === today && dateA !== today) return 1;
          
          return dateA.localeCompare(dateB);
        });
        setArticles(sortedData);
      } catch (error) {
        console.error("Error fetching articles:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticles();
  }, [project?.id]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      generating: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      scheduled: "Scheduled",
      published: "Published",
      generating: "Generating",
    };
    return (
      <Badge className={styles[status] || styles.draft}>
        {labels[status] || status}
      </Badge>
    );
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || article.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: articles.length,
    published: articles.filter(a => a.status === "published").length,
    scheduled: articles.filter(a => a.status === "scheduled").length,
    avgScore: articles.filter(a => a.aeo_score).length > 0
      ? Math.round(articles.filter(a => a.aeo_score).reduce((sum, a) => sum + (a.aeo_score || 0), 0) / articles.filter(a => a.aeo_score).length)
      : 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Auto SEO</h1>
            <p className="text-muted-foreground">
              SEO articles auto-generated from your AEO answers
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/planning")}>
              <Calendar className="h-4 w-4 mr-2" />
              Planning
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Articles</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.published}</div>
            <div className="text-sm text-muted-foreground">Published</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary/70">{stats.scheduled}</div>
            <div className="text-sm text-muted-foreground">Scheduled</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.avgScore}%</div>
            <div className="text-sm text-muted-foreground">Avg Score</div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Articles List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No articles</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? "No articles match your search"
                : "Start by generating AEO answers, then transform them into SEO articles"}
            </p>
            <Button onClick={() => navigate("/answers")}>
              View AEO Answers
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredArticles.map((article) => (
              <Card key={article.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(article.status)}
                      {article.aeo_score && (
                        <Badge variant="outline" className="text-xs">
                          Score: {article.aeo_score}%
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium truncate">{article.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{article.word_count || 0} words</span>
                      <span>
                        {format(new Date(article.created_at), "MMM d, yyyy")}
                      </span>
                      {article.scheduled_date && (
                        <span className="flex items-center gap-1 text-primary">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(article.scheduled_date), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
