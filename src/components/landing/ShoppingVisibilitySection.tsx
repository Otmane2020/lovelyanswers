import { motion } from "framer-motion";
import { ShoppingBag, Star, MessageSquare } from "lucide-react";
import { GoogleLogo } from "@/components/icons/ChatGPTLogo";

export function ShoppingVisibilitySection() {
  return (
    <section className="py-16 md:py-24 bg-[#f8f9fb] relative overflow-hidden">
      <div className="container px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary font-medium mb-4">
            <ShoppingBag className="h-3.5 w-3.5" />
            #1 AI Shopping Platform Visibility
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-[hsl(222,47%,11%)]">
            Your Products, Everywhere{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
              AI Recommends
            </span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Dominate Google Shopping, Rich Results, Discover feeds, and AI conversations — all on autopilot.
          </p>
        </motion.div>

        {/* 3 Phone Mockups + ChatGPT */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
          
          {/* Phone 1: Rich Results */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0 }}
          >
            <PhoneMockup label="Rich Results">
              <div className="flex items-center gap-1.5 mb-3 px-1">
                <GoogleLogo className="h-4 w-4" />
                <span className="text-[10px] md:text-xs text-muted-foreground">canapé velours vert</span>
              </div>
              {/* Product card */}
              <div className="rounded-lg border border-border/60 bg-background p-2 mb-2">
                <div className="w-full h-20 md:h-28 rounded-md bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center mb-2">
                  <span className="text-2xl md:text-3xl">🛋️</span>
                </div>
                <p className="text-[10px] md:text-xs font-medium text-primary truncate">Canapé Velours Vert...</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex">
                    {[1,2,3,4].map(i => <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />)}
                    <Star className="h-2.5 w-2.5 fill-amber-400/50 text-amber-400/50" />
                  </div>
                  <span className="text-[8px] text-muted-foreground">(127)</span>
                </div>
                <p className="text-xs md:text-sm font-bold text-emerald-600 mt-1">€899,00</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-muted/30 p-2 flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-100 to-orange-50 flex items-center justify-center text-sm">🪑</div>
                <div>
                  <p className="text-[10px] font-medium text-foreground/70">Fauteuil Scandinave</p>
                  <p className="text-[10px] font-bold text-emerald-600">€349,00</p>
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
              <div className="flex items-center gap-1.5 mb-3 px-1">
                <GoogleLogo className="h-4 w-4" />
                <span className="text-xs md:text-sm font-semibold text-foreground">Shopping</span>
              </div>
              {/* Main product */}
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-2 mb-3">
                <div className="w-full h-24 md:h-32 rounded-md bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center mb-2">
                  <span className="text-3xl md:text-4xl">👟</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-semibold text-foreground">Nike Air Max 90</p>
                    <p className="text-[10px] text-muted-foreground">Nike Store</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex">
                      {[1,2,3,4].map(i => <Star key={i} className="h-2 w-2 fill-amber-400 text-amber-400" />)}
                    </div>
                    <span className="text-[8px] text-muted-foreground">2.3k</span>
                  </div>
                </div>
                <p className="text-sm md:text-base font-bold text-red-500 mt-1">€149,99</p>
              </div>
              {/* Smaller products */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/40 bg-muted/30 p-1.5">
                  <div className="w-full h-10 md:h-14 rounded bg-gradient-to-br from-yellow-100 to-amber-50 flex items-center justify-center mb-1">
                    <span className="text-lg">👞</span>
                  </div>
                  <p className="text-[10px] font-bold text-emerald-600">€89,00</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/30 p-1.5">
                  <div className="w-full h-10 md:h-14 rounded bg-gradient-to-br from-purple-100 to-pink-50 flex items-center justify-center mb-1">
                    <span className="text-lg">👟</span>
                  </div>
                  <p className="text-[10px] font-bold text-emerald-600">€129,00</p>
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
              <div className="flex items-center gap-1.5 mb-3 px-1">
                <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">D</span>
                </div>
                <span className="text-xs md:text-sm font-semibold text-foreground">Discover</span>
              </div>
              {/* Featured article */}
              <div className="rounded-lg border border-border/60 bg-background overflow-hidden mb-2">
                <div className="w-full h-20 md:h-28 bg-gradient-to-br from-stone-200 to-stone-100 flex items-center justify-center">
                  <span className="text-3xl">💺</span>
                </div>
                <div className="p-2">
                  <p className="text-[10px] md:text-xs font-semibold text-foreground leading-tight">Trending luxury watches 2024</p>
                  <p className="text-[8px] md:text-[10px] text-muted-foreground mt-0.5">Fashion Magazine</p>
                </div>
              </div>
              {/* Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/40 bg-muted/30 overflow-hidden">
                  <div className="w-full h-10 md:h-14 bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center">
                    <span className="text-sm">🏠</span>
                  </div>
                  <p className="text-[8px] p-1 truncate">Déco...</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/30 overflow-hidden">
                  <div className="w-full h-10 md:h-14 bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center">
                    <span className="text-sm">🎨</span>
                  </div>
                  <p className="text-[8px] p-1 truncate">Design...</p>
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
              <div className="flex items-center gap-1.5 mb-3 px-1">
                <div className="w-5 h-5 rounded-full bg-[#10a37f] flex items-center justify-center">
                  <MessageSquare className="h-2.5 w-2.5 text-white" />
                </div>
                <span className="text-xs md:text-sm font-semibold text-foreground">ChatGPT</span>
              </div>
              
              {/* User message */}
              <div className="flex justify-end mb-2">
                <div className="max-w-[85%] px-2.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-[10px] md:text-xs">
                  Best running shoes under €150?
                </div>
              </div>
              
              {/* AI response with product */}
              <div className="flex justify-start">
                <div className="max-w-[92%] px-2.5 py-2 rounded-xl bg-muted/70 border border-border text-[10px] md:text-xs text-foreground">
                  <p className="mb-2">I recommend the <span className="font-bold text-primary">Nike Air Max 90</span> — great comfort and style.</p>
                  {/* Product card inside chat */}
                  <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-md bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">👟</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold truncate">Nike Air Max 90</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="flex">
                            {[1,2,3,4,5].map(i => <Star key={i} className="h-2 w-2 fill-amber-400 text-amber-400" />)}
                          </div>
                        </div>
                        <p className="text-[10px] font-bold text-emerald-600 mt-0.5">€149,99</p>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="text-[8px] text-primary font-medium">🔗 your-store.com</span>
                      <span className="text-[8px] text-muted-foreground">• In stock</span>
                    </div>
                  </div>
                  <p className="mt-2 text-[9px] text-muted-foreground">Available at <span className="text-primary font-medium">your-store.com</span> with free shipping.</p>
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
    <div className="flex flex-col items-center gap-2">
      <div className={`w-full rounded-[1.2rem] md:rounded-[1.5rem] border-2 md:border-[3px] p-1 md:p-1.5 shadow-xl ${
        highlight ? "border-primary/40 bg-white shadow-primary/10" :
        accent ? "border-emerald-400/40 bg-white shadow-emerald-500/10" :
        "border-border/50 bg-white"
      }`}>
        {/* Notch */}
        <div className="flex justify-center mb-1">
          <div className="w-12 md:w-16 h-3 md:h-4 bg-muted/60 rounded-full" />
        </div>
        {/* Content */}
        <div className="bg-background rounded-xl md:rounded-2xl p-2 md:p-3 min-h-[200px] md:min-h-[300px]">
          {children}
        </div>
      </div>
      <span className={`text-xs md:text-sm font-semibold ${
        highlight ? "text-primary" : accent ? "text-emerald-600" : "text-muted-foreground"
      }`}>{label}</span>
    </div>
  );
}
