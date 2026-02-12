import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useShoppingProducts, useShoppingFeeds, useImportFeed, useGenerateAllProductsAI, useDeleteProduct } from "@/hooks/useShoppingProducts";
import { useActiveProject } from "@/hooks/useProjects";
import { ShoppingCart, Upload, Sparkles, Package, ArrowRight, Trash2, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { SubscriptionGate } from "@/components/aeo/SubscriptionGate";

export default function ShoppingDashboard() {
  const { project } = useActiveProject();
  const { data: products = [], isLoading } = useShoppingProducts();
  const { data: feeds = [] } = useShoppingFeeds();
  const importFeed = useImportFeed();
  const generateAll = useGenerateAllProductsAI();
  const deleteProduct = useDeleteProduct();
  const [feedUrl, setFeedUrl] = useState("");

  const handleImport = async () => {
    if (!feedUrl.trim()) {
      toast.error("Please enter a feed URL");
      return;
    }
    try {
      const result = await importFeed.mutateAsync({ feedUrl: feedUrl.trim() });
      toast.success(`${result?.count || 0} products imported successfully!`);
      setFeedUrl("");
    } catch (e: any) {
      toast.error(e.message || "Failed to import feed");
    }
  };

  const handleGenerateAll = async () => {
    try {
      await generateAll.mutateAsync();
      toast.success("AI generation started for all products!");
    } catch (e: any) {
      toast.error(e.message || "Failed to start generation");
    }
  };

  const imported = products.filter(p => p.status === "imported").length;
  const optimized = products.filter(p => p.status === "optimized").length;
  const published = products.filter(p => p.status === "published").length;
  const avgScore = products.length > 0
    ? Math.round(products.filter(p => p.ai_score).reduce((s, p) => s + (p.ai_score || 0), 0) / (products.filter(p => p.ai_score).length || 1))
    : 0;

  return (
    <SubscriptionGate title="Unlock AI Shopping" description="Optimize your product listings for ChatGPT, Gemini, and AI-powered search engines.">
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ShoppingCart className="w-8 h-8" />
          AI Shopping Assistant
        </h1>
        <p className="text-muted-foreground mt-1">Optimize your product listings for AI recommendation engines</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: products.length, icon: Package },
          { label: "Imported", value: imported, icon: Upload },
          { label: "AI Optimized", value: optimized, icon: Sparkles },
          { label: "Avg AI Score", value: avgScore > 0 ? `${avgScore}%` : "—", icon: ShoppingCart },
        ].map((stat, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[hsl(222,47%,11%)] flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Feed Import */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Import Google Shopping Feed
        </h2>
        <div className="flex gap-3">
          <Input
            placeholder="https://example.com/feed.xml or Google Merchant Center Feed URL"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleImport}
            disabled={importFeed.isPending || !feedUrl.trim()}
            className="bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,15%)] text-white"
          >
            {importFeed.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Import Feed
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Supports XML (Google Merchant), RSS, and Atom feed formats</p>
      </Card>

      {/* Generate All CTA */}
      {products.length > 0 && imported > 0 && (
        <Card className="bg-[hsl(222,47%,11%)] border-white/10 p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Generate AI Content for All Products</h3>
              <p className="text-white/60 text-sm">{imported} products ready for AI optimization (Q&A, titles, descriptions, schema)</p>
            </div>
            <Button
              onClick={handleGenerateAll}
              disabled={generateAll.isPending}
              className="bg-white text-[hsl(222,47%,11%)] hover:bg-white/90"
            >
              {generateAll.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate All
            </Button>
          </div>
        </Card>
      )}

      {/* Product List */}
      <div>
        <h2 className="text-xl font-bold mb-4">Products ({products.length})</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products yet</h3>
            <p className="text-muted-foreground mb-4">Import your Google Shopping feed to get started</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {products.map((product) => (
              <Card key={product.id} className="p-4 hover:border-foreground/20 transition-all">
                <div className="flex items-start gap-4">
                  {product.image_url && (
                    <img src={product.image_url} alt={product.title} className="w-16 h-16 rounded-lg object-cover bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold truncate">{product.ai_title || product.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{product.category} {product.brand && `· ${product.brand}`}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {product.ai_score && (
                          <Badge variant="secondary" className="bg-foreground/5 text-foreground/70">{product.ai_score}%</Badge>
                        )}
                        <Badge variant={product.status === "optimized" ? "default" : product.status === "published" ? "default" : "secondary"}>
                          {product.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      {product.price && (
                        <span className="text-sm font-medium">{product.price} {product.currency}</span>
                      )}
                      {product.ai_faq && (
                        <span className="text-xs text-muted-foreground">{Array.isArray(product.ai_faq) ? product.ai_faq.length : 0} Q&A</span>
                      )}
                      {product.product_url && (
                        <a href={product.product_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => deleteProduct.mutate(product.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
    </SubscriptionGate>
  );
}
