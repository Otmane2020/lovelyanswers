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
import { ShoppingCart, Upload, Sparkles, Package, Trash2, ExternalLink, Loader2, CalendarDays, Newspaper } from "lucide-react";
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

  return (
    <DashboardLayout>
      <SubscriptionGate title="Unlock AI Shopping" description="Optimize your product listings for ChatGPT, Gemini, and AI-powered search engines.">
        <div className="space-y-5 sm:space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8" />
              AI Shopping
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Optimize products for AI engines</p>
          </div>

          <Tabs defaultValue="products" className="w-full">
            <TabsList className="mb-4 sm:mb-6 w-full sm:w-auto">
              <TabsTrigger value="products" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Products ({products.length})
              </TabsTrigger>
              <TabsTrigger value="aeo" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
                <Newspaper className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                AEO ({aeoProducts.length})
              </TabsTrigger>
            </TabsList>

            {/* ===== PRODUCTS TAB ===== */}
            <TabsContent value="products" className="space-y-4 sm:space-y-6">
              {/* Feed Import */}
              <Card className="p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  Import Feed
                </h2>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Input
                    placeholder="Feed URL (XML, RSS, Atom)"
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleImport}
                    disabled={importFeed.isPending || !feedUrl.trim()}
                    className="bg-foreground hover:bg-foreground/90 text-background w-full sm:w-auto"
                  >
                    {importFeed.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Import
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Google Merchant, RSS, Atom</p>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  { label: "Total", value: products.length, icon: Package },
                  { label: "Imported", value: imported, icon: Upload },
                  { label: "AEO Ready", value: optimized, icon: Sparkles },
                  { label: "Published", value: published, icon: CalendarDays },
                ].map((stat, i) => (
                  <Card key={i} className="p-3 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{stat.value}</p>
                      </div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-foreground/10 flex items-center justify-center">
                        <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
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
                <Card className="p-8 sm:p-12 text-center">
                  <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold mb-2">No products yet</h3>
                  <p className="text-sm text-muted-foreground">Import your feed to get started</p>
                </Card>
              ) : (
                <div className="grid gap-2 sm:gap-3">
                  {products.map((product) => (
                    <Card key={product.id} className="p-3 sm:p-4 hover:border-foreground/20 transition-all">
                      <div className="flex items-center gap-3">
                        {product.image_url && (
                          <img src={product.image_url} alt={product.title} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover bg-muted shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate text-xs sm:text-sm">{product.title}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {product.price && (
                              <span className="text-xs font-medium">{product.price} {product.currency}</span>
                            )}
                            {product.category && (
                              <span className="text-xs text-muted-foreground hidden sm:inline">· {product.category}</span>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">{product.status}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8"
                          onClick={() => deleteProduct.mutate(product.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ===== AEO SHOPPING TAB ===== */}
            <TabsContent value="aeo" className="space-y-4 sm:space-y-6">
              {/* Generate CTA */}
              {products.length > 0 && (
                <GlassCard gradient className="p-4 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold">Generate AEO Content</h3>
                      <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                        {imported > 0 ? `${imported} products ready` : `${products.length} available`} — Q&A, titles & descriptions for AI
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateAll}
                      disabled={generateAll.isPending}
                      className="bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto"
                    >
                      {generateAll.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      Generate All
                    </Button>
                  </div>
                </GlassCard>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  { label: "AEO Articles", value: aeoProducts.length },
                  { label: "Scheduled", value: scheduled },
                  { label: "Published", value: published },
                  { label: "Avg Score", value: aeoProducts.length > 0 ? `${Math.round(aeoProducts.filter(p => p.ai_score).reduce((s, p) => s + (p.ai_score || 0), 0) / (aeoProducts.filter(p => p.ai_score).length || 1))}%` : "—" },
                ].map((stat, i) => (
                  <Card key={i} className="p-3 sm:p-5 text-center">
                    <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </Card>
                ))}
              </div>

              {/* AEO Cards */}
              {aeoProducts.length === 0 ? (
                <Card className="p-8 sm:p-12 text-center">
                  <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold mb-2">No AEO content yet</h3>
                  <p className="text-sm text-muted-foreground">Generate AI content for your products</p>
                </Card>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {aeoProducts.map((product) => {
                    const faqCount = Array.isArray(product.ai_faq) ? product.ai_faq.length : 0;
                    return (
                      <GlassCard
                        key={product.id}
                        hover
                        className="p-3 sm:p-5 cursor-pointer"
                        onClick={() => setViewingProduct(product)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0">
                            <ScoreRing score={product.ai_score || 0} size="sm" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <h3 className="font-semibold text-sm sm:text-base line-clamp-2">{product.ai_title || product.title}</h3>
                            {product.ai_description && (
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 hidden sm:block">{product.ai_description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                              {product.price && <span className="font-medium text-foreground">{product.price} {product.currency}</span>}
                              {product.brand && <><span>·</span><span className="hidden sm:inline">{product.brand}</span></>}
                              {faqCount > 0 && <><span>·</span><span>{faqCount} Q&A</span></>}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant={product.status === "optimized" || product.status === "published" ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                                {product.status}
                              </Badge>
                              {product.scheduled_date && (
                                <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs">
                                  <CalendarDays className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  {new Date(product.scheduled_date).toLocaleDateString()}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {product.image_url && (
                            <img src={product.image_url} alt={product.title} className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover bg-muted shrink-0 hidden sm:block" />
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
          <DialogContent className="max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col mx-2 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="pr-8 line-clamp-2 text-base sm:text-lg">{viewingProduct?.ai_title || viewingProduct?.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 p-1">
              {/* Product header */}
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                {viewingProduct?.image_url && (
                  <img src={viewingProduct.image_url} alt={viewingProduct.title} className="w-full sm:w-24 h-40 sm:h-24 rounded-xl object-cover bg-muted shrink-0" />
                )}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {viewingProduct?.ai_score && <ScoreRing score={viewingProduct.ai_score} size="sm" />}
                    {viewingProduct?.price && <span className="font-semibold text-base sm:text-lg">{viewingProduct.price} {viewingProduct.currency}</span>}
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
                      <ExternalLink className="w-3 h-3" /> View product
                    </a>
                  )}
                </div>
              </div>

              {/* AI Description */}
              {viewingProduct?.ai_description && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">AI Description</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line">{viewingProduct.ai_description}</p>
                </div>
              )}

              {/* FAQ */}
              {viewingProduct?.ai_faq && Array.isArray(viewingProduct.ai_faq) && viewingProduct.ai_faq.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Q&A ({viewingProduct.ai_faq.length})</h4>
                  <div className="space-y-2 sm:space-y-3">
                    {viewingProduct.ai_faq.map((item: any, i: number) => (
                      <div key={i} className="border-b border-border/50 pb-2 sm:pb-3 last:border-0 last:pb-0">
                        <p className="font-medium text-xs sm:text-sm">Q: {item.question}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">A: {item.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schema */}
              {viewingProduct?.ai_schema_markup && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm sm:text-base">Schema (JSON-LD)</h4>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(viewingProduct.ai_schema_markup, null, 2));
                      toast.success("Schema copied!");
                    }}>Copy</Button>
                  </div>
                  <pre className="bg-muted/50 rounded-lg p-3 sm:p-4 text-[10px] sm:text-xs overflow-x-auto max-h-40 sm:max-h-48">
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
