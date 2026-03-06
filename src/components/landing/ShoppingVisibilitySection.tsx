import { motion } from "framer-motion";
import { ShoppingBag, Star, MessageSquare, Search, Tag, Compass, Sparkles } from "lucide-react";
import { GoogleLogo } from "@/components/icons/ChatGPTLogo";

export function ShoppingVisibilitySection() {
  return (
    <section className="py-12 md:py-24 bg-[#f8f9fb] relative overflow-hidden">
      <div className="container px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs md:text-sm text-primary font-medium mb-3 md:mb-4">
            <ShoppingBag className="h-3 w-3 md:h-3.5 md:w-3.5" />
            #1 AI Shopping Platform Visibility
          </div>
          <h2 className="text-2xl md:text-5xl font-extrabold tracking-tight mb-3 md:mb-4 text-foreground">
            Your Products, Everywhere{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
              AI Recommends
            </span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">
            Dominate Google Shopping, Rich Results, Discover feeds, and AI conversations — all on autopilot.
          </p>
        </motion.div>

        {/* Mobile: 2x2 grid, Desktop: 4 columns */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 max-w-6xl mx-auto">
          
          {/* Phone 1: Rich Results */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0 }}
          >
            <PhoneMockup label="Rich Results">
              <div className="flex items-center gap-1.5 mb-2 md:mb-3 px-1">
                <GoogleLogo className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="text-[9px] md:text-xs text-muted-foreground truncate">green velvet sofa</span>
              </div>
              {/* Product card */}
              <div className="rounded-lg border border-border/60 bg-background p-1.5 md:p-2 mb-1.5 md:mb-2">
                <div className="w-full h-14 md:h-28 rounded-md bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center mb-1.5 md:mb-2">
                  <ShoppingBag className="h-6 w-6 md:h-8 md:w-8 text-emerald-500" />
                </div>
                <p className="text-[9px] md:text-xs font-medium text-primary truncate">Green Velvet Sofa...</p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <div className="flex">
                    {[1,2,3,4].map(i => <Star key={i} className="h-2 w-2 md:h-2.5 md:w-2.5 fill-amber-400 text-amber-400" />)}
                    <Star className="h-2 w-2 md:h-2.5 md:w-2.5 fill-amber-400/50 text-amber-400/50" />
                  </div>
                  <span className="text-[7px] md:text-[8px] text-muted-foreground">(127)</span>
                </div>
                <p className="text-[10px] md:text-sm font-bold text-emerald-600 mt-0.5 md:mt-1">$899.00</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-muted/30 p-1.5 md:p-2 flex items-center gap-1.5 md:gap-2">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-gradient-to-br from-amber-100 to-orange-50 flex items-center justify-center flex-shrink-0">
                  <Tag className="h-3 w-3 md:h-4 md:w-4 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] md:text-[10px] font-medium text-foreground/70 truncate">Scandinavian Chair</p>
                  <p className="text-[8px] md:text-[10px] font-bold text-emerald-600">$349.00</p>
                </div>
              </div>
            </PhoneMockup>
          </motion.div>

          {/* Phone 2: Google Shopping */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <PhoneMockup label="Google Shopping" highlight>
              <div className="flex items-center gap-1.5 mb-2 md:mb-3 px-1">
                <GoogleLogo className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="text-[10px] md:text-sm font-semibold text-foreground">Shopping</span>
              </div>
              {/* Main product */}
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-1.5 md:p-2 mb-2 md:mb-3">
                <div className="w-full h-16 md:h-32 rounded-md bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center mb-1.5 md:mb-2">
                  <Sparkles className="h-7 w-7 md:h-10 md:w-10 text-red-400" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-sm font-semibold text-foreground truncate">Nike Air Max 90</p>
                    <p className="text-[8px] md:text-[10px] text-muted-foreground">Nike Store</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <div className="flex">
                      {[1,2,3,4].map(i => <Star key={i} className="h-1.5 w-1.5 md:h-2 md:w-2 fill-amber-400 text-amber-400" />)}
                    </div>
                    <span className="text-[7px] md:text-[8px] text-muted-foreground">2.3k</span>
                  </div>
                </div>
                <p className="text-xs md:text-base font-bold text-red-500 mt-0.5 md:mt-1">$149.99</p>
              </div>
              {/* Smaller products */}
              <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                <div className="rounded-lg border border-border/40 bg-muted/30 p-1 md:p-1.5">
                  <div className="w-full h-8 md:h-14 rounded bg-gradient-to-br from-yellow-100 to-amber-50 flex items-center justify-center mb-0.5 md:mb-1">
                    <Tag className="h-3.5 w-3.5 md:h-5 md:w-5 text-amber-500" />
                  </div>
                  <p className="text-[8px] md:text-[10px] font-bold text-emerald-600">$89.00</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/30 p-1 md:p-1.5">
                  <div className="w-full h-8 md:h-14 rounded bg-gradient-to-br from-purple-100 to-pink-50 flex items-center justify-center mb-0.5 md:mb-1">
                    <Sparkles className="h-3.5 w-3.5 md:h-5 md:w-5 text-purple-400" />
                  </div>
                  <p className="text-[8px] md:text-[10px] font-bold text-emerald-600">$129.00</p>
                </div>
              </div>
            </PhoneMockup>
          </motion.div>

          {/* Phone 3: Discover */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <PhoneMockup label="Discover">
              <div className="flex items-center gap-1.5 mb-2 md:mb-3 px-1">
                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-violet-500 flex items-center justify-center">
                  <Compass className="h-2.5 w-2.5 md:h-3 md:w-3 text-white" />
                </div>
                <span className="text-[10px] md:text-sm font-semibold text-foreground">Discover</span>
              </div>
              {/* Featured article */}
              <div className="rounded-lg border border-border/60 bg-background overflow-hidden mb-1.5 md:mb-2">
                <div className="w-full h-14 md:h-28 bg-gradient-to-br from-stone-200 to-stone-100 flex items-center justify-center">
                  <Search className="h-6 w-6 md:h-8 md:w-8 text-stone-400" />
                </div>
                <div className="p-1.5 md:p-2">
                  <p className="text-[9px] md:text-xs font-semibold text-foreground leading-tight">Trending luxury watches 2025</p>
                  <p className="text-[7px] md:text-[10px] text-muted-foreground mt-0.5">Fashion Magazine</p>
                </div>
              </div>
              {/* Grid */}
              <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                <div className="rounded-lg border border-border/40 bg-muted/30 overflow-hidden">
                  <div className="w-full h-8 md:h-14 bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center">
                    <ShoppingBag className="h-3 w-3 md:h-4 md:w-4 text-teal-500" />
                  </div>
                  <p className="text-[7px] md:text-[8px] p-1 truncate">Home Decor...</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/30 overflow-hidden">
                  <div className="w-full h-8 md:h-14 bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-slate-400" />
                  </div>
                  <p className="text-[7px] md:text-[8px] p-1 truncate">Design...</p>
                </div>
              </div>
            </PhoneMockup>
          </motion.div>

          {/* Phone 4: ChatGPT Product Recommendation */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <PhoneMockup label="AI Chat" accent>
              <div className="flex items-center gap-1.5 mb-2 md:mb-3 px-1">
                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-[#10a37f] flex items-center justify-center">
                  <MessageSquare className="h-2 w-2 md:h-2.5 md:w-2.5 text-white" />
                </div>
                <span className="text-[10px] md:text-sm font-semibold text-foreground">ChatGPT</span>
              </div>
              
              {/* User message */}
              <div className="flex justify-end mb-1.5 md:mb-2">
                <div className="max-w-[85%] px-2 py-1 md:px-2.5 md:py-1.5 rounded-xl bg-primary text-primary-foreground text-[9px] md:text-xs">
                  Best running shoes under $150?
                </div>
              </div>
              
              {/* AI response with product */}
              <div className="flex justify-start">
                <div className="max-w-[92%] px-2 py-1.5 md:px-2.5 md:py-2 rounded-xl bg-muted/70 border border-border text-[9px] md:text-xs text-foreground">
                  <p className="mb-1.5 md:mb-2">I recommend the <span className="font-bold text-primary">Nike Air Max 90</span> — great comfort and style.</p>
                  {/* Product card inside chat */}
                  <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-1.5 md:p-2">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <div className="w-8 h-8 md:w-12 md:h-12 rounded-md bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-red-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] md:text-[10px] font-semibold truncate">Nike Air Max 90</p>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <div className="flex">
                            {[1,2,3,4,5].map(i => <Star key={i} className="h-1.5 w-1.5 md:h-2 md:w-2 fill-amber-400 text-amber-400" />)}
                          </div>
                        </div>
                        <p className="text-[9px] md:text-[10px] font-bold text-emerald-600 mt-0.5">$149.99</p>
                      </div>
                    </div>
                    <div className="mt-1 md:mt-1.5 flex items-center gap-1">
                      <span className="text-[7px] md:text-[8px] text-primary font-medium">🔗 your-store.com</span>
                      <span className="text-[7px] md:text-[8px] text-muted-foreground">• In stock</span>
                    </div>
                  </div>
                  <p className="mt-1.5 md:mt-2 text-[8px] md:text-[9px] text-muted-foreground">Available at <span className="text-primary font-medium">your-store.com</span> with free shipping.</p>
                </div>
              </div>
            </PhoneMockup>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PhoneMockup({ children, label, highlight, accent }: { children: React.ReactNode; label: string; highlight?: boolean; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 md:gap-2">
      <div className={`w-full rounded-[1rem] md:rounded-[1.5rem] border-2 md:border-[3px] p-1 md:p-1.5 shadow-lg md:shadow-xl ${
        highlight ? "border-primary/40 bg-white shadow-primary/10" :
        accent ? "border-emerald-400/40 bg-white shadow-emerald-500/10" :
        "border-border/50 bg-white"
      }`}>
        {/* Notch */}
        <div className="flex justify-center mb-0.5 md:mb-1">
          <div className="w-10 md:w-16 h-2.5 md:h-4 bg-muted/60 rounded-full" />
        </div>
        {/* Content */}
        <div className="bg-background rounded-lg md:rounded-2xl p-1.5 md:p-3 min-h-[180px] md:min-h-[300px]">
          {children}
        </div>
      </div>
      <span className={`text-[10px] md:text-sm font-semibold ${
        highlight ? "text-primary" : accent ? "text-emerald-600" : "text-muted-foreground"
      }`}>{label}</span>
    </div>
  );
}
