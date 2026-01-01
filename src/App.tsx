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
import AeoArticles from "./pages/AeoArticles";
import AeoWizard from "./pages/AeoWizard";
import AeoOpportunities from "./pages/AeoOpportunities";
import AeoIntegrations from "./pages/AeoIntegrations";
import AeoSettings from "./pages/AeoSettings";
import Account from "./pages/Account";
import AeoSubscription from "./pages/AeoSubscription";
import AeoPublicAnswer from "./pages/AeoPublicAnswer";
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
            <Route path="/answers" element={<ProtectedRoute><Answers /></ProtectedRoute>} />
            <Route path="/articles" element={<ProtectedRoute><AeoArticles /></ProtectedRoute>} />
            <Route path="/wizard" element={<ProtectedRoute><AeoWizard /></ProtectedRoute>} />
            <Route path="/opportunities" element={<ProtectedRoute><AeoOpportunities /></ProtectedRoute>} />
            <Route path="/integrations" element={<ProtectedRoute><AeoIntegrations /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AeoSettings /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><AeoSubscription /></ProtectedRoute>} />
            <Route path="/engine" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/assistant" element={<ProtectedRoute><AeoWizard /></ProtectedRoute>} />
            <Route path="/answers/:slug" element={<AeoPublicAnswer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
