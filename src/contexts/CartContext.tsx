"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PRODUCTS, ProductId, BillingCycle, CartItem, getProductPrice, calculateTotal } from "@/lib/stripe-products";

interface CartContextType {
  items: CartItem[];
  billingCycle: BillingCycle;
  total: number;
  monthlyEquivalent: number;
  isLoading: boolean;
  cartId: string | null;
  addProduct: (productId: ProductId) => void;
  removeProduct: (productId: ProductId) => void;
  hasProduct: (productId: ProductId) => boolean;
  setBillingCycle: (cycle: BillingCycle) => void;
  clearCart: () => void;
  syncToDatabase: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Get or create a session ID for non-authenticated users
function getSessionId(): string {
  let sessionId = localStorage.getItem("cart_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("cart_session_id", sessionId);
  }
  return sessionId;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [billingCycle, setBillingCycleState] = useState<BillingCycle>("monthly");
  const [isLoading, setIsLoading] = useState(true);
  const [cartId, setCartId] = useState<string | null>(null);

  // Calculate totals
  const total = calculateTotal(items);
  const monthlyEquivalent = billingCycle === "annual" ? Math.round(total / 12) : total;

  // Load cart from database or localStorage
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true);
      try {
        // Try to load from database first
        const sessionId = getSessionId();
        const cartsQuery = supabase
          .from("carts")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1);

        const { data, error } = await (user?.id
          ? cartsQuery.or(`user_id.eq.${user.id},session_id.eq.${sessionId}`).maybeSingle()
          : cartsQuery.eq("session_id", sessionId).maybeSingle());

        if (data && !error) {
          setCartId(data.id);
          setBillingCycleState(data.billing_cycle as BillingCycle || "monthly");
          
          // Reconstruct items from JSONB
          const savedItems = (data.items as any[]) || [];
          const reconstructedItems: CartItem[] = savedItems
            .filter(item => PRODUCTS[item.productId as ProductId])
            .map(item => {
              const product = PRODUCTS[item.productId as ProductId];
              const price = getProductPrice(item.productId as ProductId, data.billing_cycle as BillingCycle || "monthly");
              return {
                productId: item.productId as ProductId,
                name: product.name,
                priceId: price.id,
                amount: price.amount,
              };
            });
          setItems(reconstructedItems);
        } else {
          // Load from localStorage as fallback
          const savedCart = localStorage.getItem("cart");
          if (savedCart) {
            const parsed = JSON.parse(savedCart);
            if (parsed.items) setItems(parsed.items);
            if (parsed.billingCycle) setBillingCycleState(parsed.billingCycle);
          }
        }
      } catch (error) {
        console.error("Error loading cart:", error);
        // Fallback to localStorage
        const savedCart = localStorage.getItem("cart");
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (parsed.items) setItems(parsed.items);
          if (parsed.billingCycle) setBillingCycleState(parsed.billingCycle);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, [user?.id]);

  // Sync to database
  const syncToDatabase = useCallback(async () => {
    try {
      const sessionId = getSessionId();
      const cartData = {
        user_id: user?.id || null,
        session_id: user?.id ? null : sessionId,
        items: items.map(item => ({ productId: item.productId })),
        total_amount: total,
        billing_cycle: billingCycle,
        status: "active" as const,
        updated_at: new Date().toISOString(),
      };

      if (cartId) {
        // Update existing cart
        await supabase
          .from("carts")
          .update(cartData)
          .eq("id", cartId);
      } else if (items.length > 0) {
        // Create new cart
        const { data } = await supabase
          .from("carts")
          .insert(cartData)
          .select("id")
          .single();
        
        if (data) {
          setCartId(data.id);
        }
      }

      // Also save to localStorage as backup
      localStorage.setItem("cart", JSON.stringify({ items, billingCycle }));
    } catch (error) {
      console.error("Error syncing cart:", error);
      // Always save to localStorage
      localStorage.setItem("cart", JSON.stringify({ items, billingCycle }));
    }
  }, [items, billingCycle, total, cartId, user?.id]);

  // Auto-sync when cart changes
  useEffect(() => {
    if (!isLoading && items.length >= 0) {
      const timeoutId = setTimeout(() => {
        syncToDatabase();
      }, 500); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [items, billingCycle, isLoading, syncToDatabase]);

  const addProduct = useCallback((productId: ProductId) => {
    setItems(prev => {
      if (prev.some(item => item.productId === productId)) return prev;
      
      const product = PRODUCTS[productId];
      const price = getProductPrice(productId, billingCycle);
      
      return [...prev, {
        productId,
        name: product.name,
        priceId: price.id,
        amount: price.amount,
      }];
    });
  }, [billingCycle]);

  const removeProduct = useCallback((productId: ProductId) => {
    setItems(prev => prev.filter(item => item.productId !== productId));
  }, []);

  const hasProduct = useCallback((productId: ProductId) => {
    return items.some(item => item.productId === productId);
  }, [items]);

  const setBillingCycle = useCallback((cycle: BillingCycle) => {
    setBillingCycleState(cycle);
    // Update prices for all items
    setItems(prev => prev.map(item => {
      const price = getProductPrice(item.productId, cycle);
      return {
        ...item,
        priceId: price.id,
        amount: price.amount,
      };
    }));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCartId(null);
    localStorage.removeItem("cart");
  }, []);

  return (
    <CartContext.Provider value={{
      items,
      billingCycle,
      total,
      monthlyEquivalent,
      isLoading,
      cartId,
      addProduct,
      removeProduct,
      hasProduct,
      setBillingCycle,
      clearCart,
      syncToDatabase,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
