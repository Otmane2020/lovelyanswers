"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { GenerationProvider } from "@/contexts/GenerationContext";
import { CartProvider } from "@/contexts/CartContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <GenerationProvider>
            <CartProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                {children}
              </TooltipProvider>
            </CartProvider>
          </GenerationProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
}
