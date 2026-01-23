import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Shield, Clock, ArrowRight, Loader2, X, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { PRODUCTS, formatPrice, ProductId } from "@/lib/stripe-products";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Cart() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    items, 
    billingCycle, 
    total, 
    monthlyEquivalent,
    addProduct, 
    removeProduct, 
    hasProduct, 
    setBillingCycle,
    cartId,
  } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Veuillez vous connecter pour continuer");
      navigate("/auth?redirect=/cart");
      return;
    }

    if (items.length === 0) {
      toast.error("Votre panier est vide");
      return;
    }

    setIsCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-cart-checkout", {
        body: {
          items: items.map(item => ({
            priceId: item.priceId,
            quantity: 1,
          })),
          cartId,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Erreur lors du paiement. Veuillez réessayer.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const toggleProduct = (productId: ProductId) => {
    if (hasProduct(productId)) {
      removeProduct(productId);
    } else {
      addProduct(productId);
    }
  };

  const savings = billingCycle === "annual" ? 
    items.reduce((sum, item) => {
      const monthly = PRODUCTS[item.productId].prices.monthly.amount * 12;
      const annual = PRODUCTS[item.productId].prices.annual.amount;
      return sum + (monthly - annual);
    }, 0) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate("/")}
          >
            <AnimatedLogo size="sm" />
            <span className="font-bold text-lg">
              Lovely<span className="text-primary">Answers</span>
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Votre panier</h1>
          <p className="text-muted-foreground">
            Choisissez les modules adaptés à vos besoins
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Product Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* AEO Answers */}
            <Card 
              className={`p-6 cursor-pointer transition-all border-2 ${
                hasProduct("aeo") 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => toggleProduct("aeo")}
            >
              <div className="flex items-start gap-4">
                <Checkbox 
                  checked={hasProduct("aeo")} 
                  className="mt-1"
                  onCheckedChange={() => toggleProduct("aeo")}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{PRODUCTS.aeo.name}</h3>
                      <Badge variant="secondary" className="text-xs">Populaire</Badge>
                    </div>
                    <span className="font-bold text-xl">
                      {billingCycle === "monthly" ? "29€" : "23,25€"}
                      <span className="text-sm font-normal text-muted-foreground">/mois</span>
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    {PRODUCTS.aeo.description}
                  </p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {PRODUCTS.aeo.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            {/* Auto SEO */}
            <Card 
              className={`p-6 cursor-pointer transition-all border-2 relative ${
                hasProduct("autoseo") 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => toggleProduct("autoseo")}
            >
              {!hasProduct("autoseo") && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1">
                    <Sparkles className="h-3 w-3" />
                    Recommandé
                  </Badge>
                </div>
              )}
              <div className="flex items-start gap-4">
                <Checkbox 
                  checked={hasProduct("autoseo")} 
                  className="mt-1"
                  onCheckedChange={() => toggleProduct("autoseo")}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{PRODUCTS.autoseo.name}</h3>
                      <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Nouveau</Badge>
                    </div>
                    <span className="font-bold text-xl">
                      {billingCycle === "monthly" ? "29€" : "23,25€"}
                      <span className="text-sm font-normal text-muted-foreground">/mois</span>
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    {PRODUCTS.autoseo.description}
                  </p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {PRODUCTS.autoseo.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            {/* Social Proof */}
            <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-violet-500 border-2 border-background flex items-center justify-center text-white text-xs font-medium"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">83% des utilisateurs</strong> choisissent les 2 modules
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h3 className="font-semibold text-lg mb-4">Résumé</h3>

              {/* Billing Toggle */}
              <div className="bg-muted rounded-lg p-1 flex mb-6">
                <button
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    billingCycle === "monthly" 
                      ? "bg-background shadow-sm" 
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setBillingCycle("monthly")}
                >
                  Mensuel
                </button>
                <button
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all relative ${
                    billingCycle === "annual" 
                      ? "bg-background shadow-sm" 
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setBillingCycle("annual")}
                >
                  Annuel
                  <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-1.5 py-0">
                    -20%
                  </Badge>
                </button>
              </div>

              {/* Items */}
              <div className="space-y-3 mb-4">
                {items.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Sélectionnez au moins un module
                  </p>
                ) : (
                  items.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span>{formatPrice(item.amount)}</span>
                    </div>
                  ))
                )}
              </div>

              {savings > 0 && (
                <div className="flex justify-between text-sm text-green-600 mb-2">
                  <span className="flex items-center gap-1">
                    <Gift className="h-4 w-4" />
                    Économie annuelle
                  </span>
                  <span>-{formatPrice(savings)}</span>
                </div>
              )}

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <div className="text-right">
                    <span className="text-xl">{formatPrice(total)}</span>
                    <span className="text-sm text-muted-foreground">
                      /{billingCycle === "monthly" ? "mois" : "an"}
                    </span>
                  </div>
                </div>
                {billingCycle === "annual" && items.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right mt-1">
                    soit {formatPrice(monthlyEquivalent)}/mois
                  </p>
                )}
              </div>

              {/* Trial Badge */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  <strong>3 jours d'essai gratuit</strong> inclus
                </span>
              </div>

              {/* CTA */}
              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={handleCheckout}
                disabled={items.length === 0 || isCheckingOut}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirection...
                  </>
                ) : (
                  <>
                    Continuer
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Paiement sécurisé
                </span>
                <span>Annulation facile</span>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
