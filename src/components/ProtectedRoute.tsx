"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
}

// Routes that don't force a wizard redirect when user has no projects
const ONBOARDING_SAFE_ROUTES = [
  "/wizard", "/onboarding", "/checkout", "/thank-you",
  "/billing", "/subscription", "/auth", "/support",
  "/account", "/settings",
];

export function ProtectedRoute({ children, requireSubscription = true }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { isSubscribed, isTrial, isLoading: subLoading } = useSubscriptionContext();
  const pathname = usePathname();
  const [projectsChecked, setProjectsChecked] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && !subLoading && user) {
      const isOnboardingPage = pathname === "/onboarding";
      if (requireSubscription && !isOnboardingPage && !isSubscribed && !isTrial) {
        router.push("/checkout");
      }
    }
  }, [authLoading, subLoading, user, isSubscribed, isTrial, pathname, requireSubscription, router]);

  // Force /wizard right after login if user has no project yet
  useEffect(() => {
    if (authLoading || !user || projectsChecked) return;

    const isSafe = ONBOARDING_SAFE_ROUTES.some((r) => pathname?.startsWith(r));
    if (isSafe) {
      setProjectsChecked(true);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      setProjectsChecked(true);
      if (!error && (!data || data.length === 0)) {
        router.replace("/wizard");
      }
    })();
  }, [authLoading, user, pathname, projectsChecked, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (requireSubscription && subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking subscription...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
