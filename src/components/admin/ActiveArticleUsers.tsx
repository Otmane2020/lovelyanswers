import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, RefreshCw, Loader2, Globe, ExternalLink } from "lucide-react";

interface ActiveArticleUser {
  email: string;
  domain: string;
  website_url: string;
  project_name: string;
  article_count: number;
  published_count: number;
}

export function ActiveArticleUsers() {
  const [users, setUsers] = useState<ActiveArticleUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get profiles
      const { data: profiles } = await supabase.from("profiles").select("id, email");
      const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      // Get projects
      const { data: projects } = await supabase.from("projects").select("id, user_id, domain, website_url, name");

      // Get article counts per project
      const { data: articles } = await supabase.from("articles").select("project_id, status");

      // Aggregate
      const projectArticles = new Map<string, { total: number; published: number }>();
      articles?.forEach(a => {
        const curr = projectArticles.get(a.project_id) || { total: 0, published: 0 };
        curr.total++;
        if (a.status === "published") curr.published++;
        projectArticles.set(a.project_id, curr);
      });

      const result: ActiveArticleUser[] = [];
      projects?.forEach(pr => {
        const counts = projectArticles.get(pr.id);
        if (!counts || counts.total === 0) return;
        result.push({
          email: profileMap.get(pr.user_id) || "-",
          domain: pr.domain || "-",
          website_url: pr.website_url || "",
          project_name: pr.name || "-",
          article_count: counts.total,
          published_count: counts.published,
        });
      });

      result.sort((a, b) => b.article_count - a.article_count);
      setUsers(result);
    } catch (error) {
      console.error("Error loading active article users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Utilisateurs actifs - Articles ({users.length})
            </CardTitle>
            <CardDescription>
              Utilisateurs qui génèrent et publient des articles
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Projet</TableHead>
                <TableHead>Domaine</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead>Publiés</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.project_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <span>{u.domain}</span>
                      {u.website_url && (
                        <a href={u.website_url.startsWith("http") ? u.website_url : `https://${u.website_url}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.article_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={u.published_count > 0 ? "bg-green-500/10 text-green-500 border-green-500/20" : ""} variant="outline">
                      {u.published_count}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucun utilisateur avec des articles
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
