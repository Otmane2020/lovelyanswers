"use client";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Copy, FileText, Calendar } from "lucide-react";
import { useArticles } from "@/hooks/useArticles";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Articles() {
  const { data: articles = [] } = useArticles();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || article.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopyArticle = async (articleId: string) => {
    const { data: article } = await supabase
      .from("articles")
      .select("title, content, html_content")
      .eq("id", articleId)
      .single();
    
    if (article) {
      navigator.clipboard.writeText(article.html_content || article.content || "");
      toast.success("Article HTML copied to clipboard!");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AEO Articles</h1>
            <p className="text-muted-foreground">Long-form content supporting your AEO answers</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search articles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2">
            <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")} className={statusFilter === "all" ? "gradient-bg text-primary-foreground" : ""}>All</Button>
            <Button variant={statusFilter === "published" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("published")} className={statusFilter === "published" ? "gradient-bg text-primary-foreground" : ""}>Published</Button>
            <Button variant={statusFilter === "draft" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("draft")} className={statusFilter === "draft" ? "gradient-bg text-primary-foreground" : ""}>Draft</Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article, index) => (
            <GlassCard key={article.id} hover gradient className="flex flex-col p-6 animate-fade-in" style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <Badge variant={article.status === "published" ? "default" : "secondary"} className={article.status === "published" ? "bg-emerald-500/20 text-emerald-500 border-0" : ""}>{article.status === "published" ? "Published" : "Draft"}</Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{new Date(article.created_at).toLocaleDateString()}</div>
              </div>
              <h3 className="text-lg font-semibold mb-2 line-clamp-2">{article.title}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6"><span>{article.word_count} words</span></div>
              <div className="mt-auto flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-2 flex-1"><Eye className="h-4 w-4" />Preview</Button>
                <Button variant="ghost" size="sm" className="gap-2 flex-1"><Pencil className="h-4 w-4" />Edit</Button>
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleCopyArticle(article.id)}>
                  <Copy className="h-4 w-4" />Copy
                </Button>
              </div>
            </GlassCard>
          ))}

          {filteredArticles.length === 0 && (
            <div className="col-span-full">
              <GlassCard className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted"><FileText className="h-8 w-8 text-muted-foreground" /></div>
                  <div><h3 className="text-lg font-semibold">No articles yet</h3><p className="text-muted-foreground">Articles are generated automatically with your AEO answers</p></div>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
