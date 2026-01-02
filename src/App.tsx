import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Answers from "./pages/Answers";
import AeoAnswers from "./pages/AeoAnswers";
import AeoArticles from "./pages/AeoArticles";
import AeoIntegrations from "./pages/AeoIntegrations";
import AeoAnalytics from "./pages/AeoAnalytics";
import AeoSettings from "./pages/AeoSettings";
import AeoSubscription from "./pages/AeoSubscription";
import AeoBilling from "./pages/AeoBilling";
import AeoPublicAnswer from "./pages/AeoPublicAnswer";
import AeoSeoAudit from "./pages/AeoSeoAudit";
import AeoKeywords from "./pages/AeoKeywords";
import AeoReddit from "./pages/AeoReddit";
import AeoPlanning from "./pages/AeoPlanning";
import Onboarding from "./pages/Onboarding";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/seo-audit" element={<ProtectedRoute><AeoSeoAudit /></ProtectedRoute>} />
            <Route path="/keywords" element={<ProtectedRoute><AeoKeywords /></ProtectedRoute>} />
            <Route path="/articles" element={<ProtectedRoute><AeoArticles /></ProtectedRoute>} />
            <Route path="/answers" element={<ProtectedRoute><Answers /></ProtectedRoute>} />
            <Route path="/aeo-answers" element={<ProtectedRoute><AeoAnswers /></ProtectedRoute>} />
            <Route path="/planning" element={<ProtectedRoute><AeoPlanning /></ProtectedRoute>} />
            <Route path="/reddit" element={<ProtectedRoute><AeoReddit /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><AeoAnalytics /></ProtectedRoute>} />
            <Route path="/integrations" element={<ProtectedRoute><AeoIntegrations /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><AeoSubscription /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute><AeoBilling /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AeoSettings /></ProtectedRoute>} />
            <Route path="/answers/:slug" element={<AeoPublicAnswer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
