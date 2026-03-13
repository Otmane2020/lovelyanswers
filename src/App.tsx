import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { GenerationProvider } from "@/contexts/GenerationContext";
import { CartProvider } from "@/contexts/CartContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import FloatingSupportButton from "@/components/FloatingSupportButton";
import { VisitorTracker } from "@/components/VisitorTracker";
import { ScrollToTop } from "@/components/ScrollToTop";

// --- Lazy-loaded pages (code splitting — target bundle <200KB per route) ---
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Answers = lazy(() => import("./pages/Answers"));
const AutoSeo = lazy(() => import("./pages/AutoSeo"));
const AeoArticles = lazy(() => import("./pages/AeoArticles"));
const AeoIntegrations = lazy(() => import("./pages/AeoIntegrations"));
const AeoAnalytics = lazy(() => import("./pages/AeoAnalytics"));
const AeoSettings = lazy(() => import("./pages/AeoSettings"));
const AeoSubscription = lazy(() => import("./pages/AeoSubscription"));
const AeoBilling = lazy(() => import("./pages/AeoBilling"));
const AeoSupport = lazy(() => import("./pages/AeoSupport"));
const AeoPublicAnswer = lazy(() => import("./pages/AeoPublicAnswer"));
const AeoSeoAudit = lazy(() => import("./pages/AeoSeoAudit"));
const AeoLocal = lazy(() => import("./pages/AeoLocal"));
const AeoKeywords = lazy(() => import("./pages/AeoKeywords"));
const AeoReddit = lazy(() => import("./pages/AeoReddit"));
const AeoPlanning = lazy(() => import("./pages/AeoPlanning"));
const AeoWizard = lazy(() => import("./pages/AeoWizard"));
const AeoHistory = lazy(() => import("./pages/AeoHistory"));
const AeoGeo = lazy(() => import("./pages/AeoGeo"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Checkout = lazy(() => import("./pages/Checkout"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const Cart = lazy(() => import("./pages/Cart"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const About = lazy(() => import("./pages/About"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const SuperAdminAds = lazy(() => import("./pages/SuperAdminAds"));
const Blog = lazy(() => import("./pages/Blog"));
const LocalAeoArticle = lazy(() => import("./pages/LocalAeoArticle"));
const AuditPremium = lazy(() => import("./pages/AuditPremium"));
const AiSeo = lazy(() => import("./pages/AiSeo"));
const ShoppingDashboard = lazy(() => import("./pages/ShoppingDashboard"));
const ShoppingProduct = lazy(() => import("./pages/ShoppingProduct"));
const ShoppingPlanning = lazy(() => import("./pages/ShoppingPlanning"));
const AiShoppingAssistant = lazy(() => import("./pages/AiShoppingAssistant"));
const GoogleTagManager = lazy(() => import("./pages/GoogleTagManager"));
const GoogleAnalyticsPage = lazy(() => import("./pages/GoogleAnalyticsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AiVisibilityChecker = lazy(() => import("./pages/tools/AiVisibilityChecker"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <GenerationProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <VisitorTracker />
                <ScrollToTop />
                <FloatingSupportButton />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/ai-seo" element={<AiSeo />} />
                    <Route path="/audit-premium" element={<AuditPremium />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/checkout" element={<ProtectedRoute requireSubscription={false}><Checkout /></ProtectedRoute>} />
                    <Route path="/thank-you" element={<ProtectedRoute requireSubscription={false}><ThankYou /></ProtectedRoute>} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/onboarding" element={<Signup />} />
                    <Route path="/wizard" element={<ProtectedRoute requireSubscription={false}><AeoWizard /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute requireSubscription={false}><Dashboard /></ProtectedRoute>} />
                    <Route path="/seo-audit" element={<ProtectedRoute requireSubscription={false}><AeoSeoAudit /></ProtectedRoute>} />
                    <Route path="/keywords" element={<ProtectedRoute requireSubscription={false}><AeoKeywords /></ProtectedRoute>} />
                    <Route path="/articles" element={<ProtectedRoute requireSubscription={false}><AeoArticles /></ProtectedRoute>} />
                    <Route path="/answers" element={<ProtectedRoute requireSubscription={false}><Answers /></ProtectedRoute>} />
                    <Route path="/autoseo" element={<ProtectedRoute requireSubscription={false}><AutoSeo /></ProtectedRoute>} />
                    <Route path="/geo" element={<ProtectedRoute requireSubscription={false}><AeoGeo /></ProtectedRoute>} />
                    <Route path="/planning" element={<ProtectedRoute requireSubscription={false}><AeoPlanning /></ProtectedRoute>} />
                    <Route path="/reddit" element={<ProtectedRoute requireSubscription={false}><AeoReddit /></ProtectedRoute>} />
                    <Route path="/local" element={<ProtectedRoute requireSubscription={false}><AeoLocal /></ProtectedRoute>} />
                    <Route path="/history" element={<ProtectedRoute requireSubscription={false}><AeoHistory /></ProtectedRoute>} />
                    <Route path="/analytics" element={<ProtectedRoute requireSubscription={false}><AeoAnalytics /></ProtectedRoute>} />
                    <Route path="/google-tag-manager" element={<ProtectedRoute requireSubscription={false}><GoogleTagManager /></ProtectedRoute>} />
                    <Route path="/google-analytics" element={<ProtectedRoute requireSubscription={false}><GoogleAnalyticsPage /></ProtectedRoute>} />
                    <Route path="/integrations" element={<ProtectedRoute requireSubscription={false}><AeoIntegrations /></ProtectedRoute>} />
                    <Route path="/subscription" element={<ProtectedRoute requireSubscription={false}><AeoSubscription /></ProtectedRoute>} />
                    <Route path="/billing" element={<ProtectedRoute requireSubscription={false}><AeoBilling /></ProtectedRoute>} />
                    <Route path="/support" element={<ProtectedRoute requireSubscription={false}><AeoSupport /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute requireSubscription={false}><AeoSettings /></ProtectedRoute>} />
                    <Route path="/superadmin" element={<SuperAdmin />} />
                    <Route path="/superadmin/ads" element={<SuperAdminAds />} />
                    <Route path="/answers/:slug" element={<AeoPublicAnswer />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<AeoPublicAnswer />} />
                    <Route path="/localAEO" element={<LocalAeoArticle />} />
                    <Route path="/ai-shopping-assistant" element={<AiShoppingAssistant />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/shopping" element={<ProtectedRoute requireSubscription={false}><ShoppingDashboard /></ProtectedRoute>} />
                    <Route path="/shopping/product/:productId" element={<ProtectedRoute requireSubscription={false}><ShoppingProduct /></ProtectedRoute>} />
                    <Route path="/shopping/planning" element={<ProtectedRoute requireSubscription={false}><ShoppingPlanning /></ProtectedRoute>} />
                    <Route path="/tools/ai-visibility-checker" element={<AiVisibilityChecker />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </CartProvider>
        </GenerationProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
