import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/glass-card";
import { ScoreRing } from "@/components/ui/score-ring";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useShoppingProducts, useShoppingFeeds, useImportFeed, useGenerateAllProductsAI, useDeleteProduct } from "@/hooks/useShoppingProducts";
import { useActiveProject } from "@/hooks/useProjects";
import { ShoppingCart, Upload, Sparkles, Package, Trash2, ExternalLink, Loader2, Eye, CalendarDays, Newspaper } from "lucide-react";
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
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);

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
  const scheduled = products.filter(p => p.scheduled_date).length;
  const published = products.filter(p => p.status === "published").length;
  const aeoProducts = products.filter(p => p.ai_faq || p.ai_title);

  const cleanHtml = (html: string) =>
    html
      .replace(/^[\s\S]*?<body[^>]*>/i, "")
      .replace(/<\/body>[\s\S]*$/i, "")
      .replace(/<!DOCTYPE[^>]*>/i, "")
      .replace(/<\/?html[^>]*>/gi, "")
      .replace(/<head>[\s\S]*?<\/head>/i, "")
      .replace(/<\/?body[^>]*>/gi, "")
      .replace(/```html\s*/gi, "")
      .replace(/```\s*$/gi, "")
      .trim();

  return (
    <DashboardLayout>
      <SubscriptionGate title="Unlock AI Shopping" description="Optimize your product listings for ChatGPT, Gemini, and AI-powered search engines.">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShoppingCart className="w-8 h-8" />
              AI Shopping Assistant
            </h1>
            <p className="text-muted-foreground mt-1">Optimize your product listings for AI recommendation engines</p>
          </div>

          <Tabs defaultValue="products" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="products" className="gap-2">
                <Package className="w-4 h-4" />
                Products ({products.length})
              </TabsTrigger>
              <TabsTrigger value="aeo" className="gap-2">
                <Newspaper className="w-4 h-4" />
                AEO Shopping ({aeoProducts.length})
              </TabsTrigger>
            </TabsList>

            {/* ===== PRODUCTS TAB (Source) ===== */}
            <TabsContent value="products" className="space-y-6">
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
                    className="bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground)/0.9)] text-[hsl(var(--background))]"
                  >
                    {importFeed.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Import Feed
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Supports XML (Google Merchant), RSS, and Atom feed formats</p>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Products", value: products.length, icon: Package },
                  { label: "Imported", value: imported, icon: Upload },
                  { label: "AEO Ready", value: optimized, icon: Sparkles },
                  { label: "Published", value: published, icon: CalendarDays },
                ].map((stat, i) => (
                  <Card key={i} className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-3xl font-bold mt-2">{stat.value}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-foreground/10 flex items-center justify-center">
                        <stat.icon className="w-5 h-5 text-foreground" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Product List */}
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
                <div className="grid gap-3">
                  {products.map((product) => (
                    <Card key={product.id} className="p-4 hover:border-foreground/20 transition-all">
                      <div className="flex items-center gap-4">
                        {product.image_url && (
                          <img src={product.image_url} alt={product.title} className="w-12 h-12 rounded-lg object-cover bg-muted shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate text-sm">{product.title}</h3>
                          <p className="text-xs text-muted-foreground">{product.category} {product.brand && `· ${product.brand}`}</p>
                        </div>
                        {product.price && (
                          <span className="text-sm font-medium shrink-0">{product.price} {product.currency}</span>
                        )}
                        <Badge variant="secondary" className="shrink-0">{product.status}</Badge>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => deleteProduct.mutate(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ===== AEO SHOPPING TAB ===== */}
            <TabsContent value="aeo" className="space-y-6">
              {/* Generate All CTA */}
              {products.length > 0 && (
                <GlassCard gradient className="p-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold">Generate AEO Content for Products</h3>
                      <p className="text-muted-foreground text-sm">{imported > 0 ? `${imported} products ready` : `${products.length} products available`} — AI will create Q&A articles, titles, and descriptions optimized for ChatGPT & Gemini</p>
                    </div>
                    <Button
                      onClick={handleGenerateAll}
                      disabled={generateAll.isPending}
                      className="bg-foreground text-background hover:bg-foreground/90"
                    >
                      {generateAll.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      Generate All AEO
                    </Button>
                  </div>
                </GlassCard>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "AEO Articles", value: aeoProducts.length },
                  { label: "Scheduled", value: scheduled },
                  { label: "Published", value: published },
                  { label: "Avg Score", value: aeoProducts.length > 0 ? `${Math.round(aeoProducts.filter(p => p.ai_score).reduce((s, p) => s + (p.ai_score || 0), 0) / (aeoProducts.filter(p => p.ai_score).length || 1))}%` : "—" },
                ].map((stat, i) => (
                  <Card key={i} className="p-5 text-center">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </Card>
                ))}
              </div>

              {/* AEO Product Cards */}
              {aeoProducts.length === 0 ? (
                <Card className="p-12 text-center">
                  <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No AEO content yet</h3>
                  <p className="text-muted-foreground mb-4">Generate AI content to create optimized Q&A articles for your products</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {aeoProducts.map((product) => {
                    const faqCount = Array.isArray(product.ai_faq) ? product.ai_faq.length : 0;
                    return (
                      <GlassCard
                        key={product.id}
                        hover
                        className="p-4 sm:p-6 cursor-pointer"
                        onClick={() => setViewingProduct(product)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="shrink-0">
                            <ScoreRing score={product.ai_score || 0} size="sm" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <h3 className="font-semibold line-clamp-2">{product.ai_title || product.title}</h3>
                            {product.ai_description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{product.ai_description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {product.price && <span className="font-medium text-foreground">{product.price} {product.currency}</span>}
                              {product.brand && <><span>·</span><span>{product.brand}</span></>}
                              {product.category && <><span>·</span><span>{product.category}</span></>}
                              {faqCount > 0 && <><span>·</span><span>{faqCount} Q&A</span></>}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={product.status === "optimized" ? "default" : product.status === "published" ? "default" : "secondary"}>
                                {product.status}
                              </Badge>
                              {product.scheduled_date && (
                                <Badge variant="outline" className="gap-1">
                                  <CalendarDays className="w-3 h-3" />
                                  {new Date(product.scheduled_date).toLocaleDateString()}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {product.image_url && (
                            <img src={product.image_url} alt={product.title} className="w-16 h-16 rounded-lg object-cover bg-muted shrink-0 hidden sm:block" />
                          )}
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Dialog */}
        <Dialog open={!!viewingProduct} onOpenChange={() => setViewingProduct(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="pr-8 line-clamp-2">{viewingProduct?.ai_title || viewingProduct?.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-6 p-1">
              {/* Product header */}
              <div className="flex items-start gap-4">
                {viewingProduct?.image_url && (
                  <img src={viewingProduct.image_url} alt={viewingProduct.title} className="w-24 h-24 rounded-xl object-cover bg-muted shrink-0" />
                )}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {viewingProduct?.ai_score && <ScoreRing score={viewingProduct.ai_score} size="sm" />}
                    {viewingProduct?.price && <span className="font-semibold text-lg">{viewingProduct.price} {viewingProduct.currency}</span>}
                    <Badge variant="secondary">{viewingProduct?.status}</Badge>
                    {viewingProduct?.scheduled_date && (
                      <Badge variant="outline" className="gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(viewingProduct.scheduled_date).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{viewingProduct?.brand} {viewingProduct?.category && `· ${viewingProduct.category}`}</p>
                  {viewingProduct?.product_url && (
                    <a href={viewingProduct.product_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> View product page
                    </a>
                  )}
                </div>
              </div>

              {/* AI Description */}
              {viewingProduct?.ai_description && (
                <div>
                  <h4 className="font-semibold mb-2">AI Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{viewingProduct.ai_description}</p>
                </div>
              )}

              {/* FAQ */}
              {viewingProduct?.ai_faq && Array.isArray(viewingProduct.ai_faq) && viewingProduct.ai_faq.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Product Q&A ({viewingProduct.ai_faq.length})</h4>
                  <div className="space-y-3">
                    {viewingProduct.ai_faq.map((item: any, i: number) => (
                      <div key={i} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                        <p className="font-medium text-sm">Q: {item.question}</p>
                        <p className="text-sm text-muted-foreground mt-1">A: {item.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schema */}
              {viewingProduct?.ai_schema_markup && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Schema Markup (JSON-LD)</h4>
                    <Button variant="ghost" size="sm" onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(viewingProduct.ai_schema_markup, null, 2));
                      toast.success("Schema copied!");
                    }}>Copy</Button>
                  </div>
                  <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto max-h-48">
                    {JSON.stringify(viewingProduct.ai_schema_markup, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </SubscriptionGate>
    </DashboardLayout>
  );
}
