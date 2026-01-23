// Stripe Product and Price IDs for the cart system
export const PRODUCTS = {
  aeo: {
    id: "aeo",
    name: "AEO Answers",
    description: "Réponses optimisées pour ChatGPT, Gemini, Claude",
    features: [
      "Réponses AI-optimisées illimitées",
      "Analyse multi-plateformes (ChatGPT, Gemini, Claude)",
      "Score de citation en temps réel",
      "Suggestions d'amélioration automatiques",
      "Export et publication directe",
    ],
    prices: {
      monthly: { 
        id: "price_1SsmqiEfti9t9nN9eDpXOiMg", 
        amount: 2900,
        display: "29€",
      },
      annual: { 
        id: "price_1SsmqmEfti9t9nN9z10qG5m3", 
        amount: 27900,
        display: "279€",
        savings: "69€",
      },
    }
  },
  autoseo: {
    id: "autoseo",
    name: "Auto SEO",
    description: "Articles SEO auto-générés + planning éditorial",
    features: [
      "Articles SEO générés automatiquement",
      "Planning éditorial 30 jours",
      "Publication automatique vers CMS",
      "Optimisation mots-clés intégrée",
      "Audit SEO technique",
    ],
    prices: {
      monthly: { 
        id: "price_1SsmqjEfti9t9nN9XMZbyaO1", 
        amount: 2900,
        display: "29€",
      },
      annual: { 
        id: "price_1SsmqoEfti9t9nN9HMPK2MFG", 
        amount: 27900,
        display: "279€",
        savings: "69€",
      },
    }
  }
} as const;

export type ProductId = keyof typeof PRODUCTS;
export type BillingCycle = "monthly" | "annual";

export interface CartItem {
  productId: ProductId;
  name: string;
  priceId: string;
  amount: number;
}

export function getProductPrice(productId: ProductId, cycle: BillingCycle) {
  return PRODUCTS[productId].prices[cycle];
}

export function formatPrice(amountInCents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(amountInCents / 100);
}

export function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export function getMonthlyEquivalent(amount: number, cycle: BillingCycle): number {
  return cycle === "annual" ? Math.round(amount / 12) : amount;
}
