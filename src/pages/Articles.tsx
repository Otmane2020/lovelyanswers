import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Download,
  ExternalLink,
  FileText,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Article {
  id: string;
  title: string;
  linkedAnswer: string;
  status: "draft" | "published";
  createdAt: string;
  wordCount: number;
}

const mockArticles: Article[] = [
  {
    id: "1",
    title: "Complete Guide to Birthday Cake Delivery Times",
    linkedAnswer: "What is the best delivery time for birthday cakes?",
    status: "published",
    createdAt: "2024-01-15",
    wordCount: 1250,
  },
  {
    id: "2",
    title: "How to Order Custom Cakes: A Timeline Guide",
    linkedAnswer: "How far in advance should I order a custom cake?",
    status: "published",
    createdAt: "2024-01-12",
    wordCount: 980,
  },
  {
    id: "3",
    title: "Wedding Cake Flavors: Finding Your Perfect Match",
    linkedAnswer: "What flavors are most popular for wedding cakes?",
    status: "draft",
    createdAt: "2024-01-10",
    wordCount: 1500,
  },
];

export default function Articles() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");

  const filteredArticles = mockArticles.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || article.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AEO Articles</h1>
            <p className="text-muted-foreground">
              Long-form content supporting your AEO answers
            </p>
          </div>
          <Button className="gap-2 gradient-bg text-primary-foreground shadow-glow-sm">
            <Plus className="h-4 w-4" />
            Generate Article
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className={statusFilter === "all" ? "gradient-bg text-primary-foreground" : ""}
            >
              All
            </Button>
            <Button
              variant={statusFilter === "published" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("published")}
              className={statusFilter === "published" ? "gradient-bg text-primary-foreground" : ""}
            >
              Published
            </Button>
            <Button
              variant={statusFilter === "draft" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("draft")}
              className={statusFilter === "draft" ? "gradient-bg text-primary-foreground" : ""}
            >
              Draft
            </Button>
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article, index) => (
            <GlassCard
              key={article.id}
              hover
              gradient
              className="flex flex-col p-6 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <Badge
                  variant={article.status === "published" ? "default" : "secondary"}
                  className={article.status === "published" 
                    ? "bg-emerald-500/20 text-emerald-500 border-0" 
                    : ""
                  }
                >
                  {article.status === "published" ? "Published" : "Draft"}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {article.createdAt}
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                {article.title}
              </h3>

              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Linked to: </span>
                <span className="text-foreground truncate">{article.linkedAnswer}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <span>{article.wordCount} words</span>
              </div>

              <div className="mt-auto flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-2 flex-1">
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 flex-1">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      Export as Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      Export as HTML
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                      Publish to Shopify
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </GlassCard>
          ))}

          {filteredArticles.length === 0 && (
            <div className="col-span-full">
              <GlassCard className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No articles found</h3>
                    <p className="text-muted-foreground">
                      Generate an article from your AEO answers
                    </p>
                  </div>
                  <Button className="gap-2 gradient-bg text-primary-foreground">
                    <Plus className="h-4 w-4" />
                    Generate Article
                  </Button>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
