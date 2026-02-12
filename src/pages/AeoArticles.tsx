import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FileText, Search, Eye, Edit, Trash2, Calendar, Plus } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

interface AeoArticle {
  id: string;
  title: string;
  content: string | null;
  status: string | null;
  created_at: string | null;
  word_count: number | null;
}

export default function AeoArticles() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<AeoArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { if (user) fetchArticles(); }, [user]);

  const fetchArticles = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: projects } = await supabase.from('projects').select('id').eq('user_id', user.id).eq('is_active', true).limit(1);
      if (projects && projects.length > 0) {
        const { data, error } = await supabase.from('articles').select('*').eq('project_id', projects[0].id).order('created_at', { ascending: false });
        if (error) throw error;
        setArticles(data || []);
      }
    } catch (error) { console.error('Error fetching articles:', error); }
    finally { setLoading(false); }
  };

  const getStatusColor = (status: string | null) => {
    const colors: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      published: "bg-emerald-500/20 text-emerald-600",
      scheduled: "bg-amber-500/20 text-amber-500",
    };
    return colors[status || 'draft'] || colors.draft;
  };

  const filteredArticles = articles.filter(article => article.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">AEO Articles</h1>
            <p className="text-muted-foreground mt-1">Your articles optimized for AI citation</p>
          </div>
          <Button onClick={() => navigate("/aeo/answers")} className="bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,15%)] text-white">
            <Plus className="w-4 h-4 mr-2" />Create article
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (<Card key={i} className="p-6 animate-pulse"><div className="h-4 bg-muted rounded w-3/4 mb-4" /><div className="h-3 bg-muted rounded w-1/2" /></Card>))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No articles found</h3>
            <p className="text-muted-foreground mb-4">Create your first AI-optimized article</p>
            <Button onClick={() => navigate("/aeo/answers")} className="bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,15%)] text-white">
              <Plus className="w-4 h-4 mr-2" />Create article
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArticles.map((article) => (
              <Card key={article.id} className="p-6 hover:border-foreground/20 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <Badge className={getStatusColor(article.status)}>{article.status || 'draft'}</Badge>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <h3 className="font-semibold mb-2 line-clamp-2">{article.title}</h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4">
                  <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{article.created_at ? format(new Date(article.created_at), 'PP', { locale: enUS }) : '-'}</div>
                  {article.word_count && <div className="flex items-center gap-1"><FileText className="h-3 w-3" />{article.word_count} words</div>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
