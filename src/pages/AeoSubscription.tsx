import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useSubscription } from "@/hooks/useSubscription";

const features = [
  "30 SEO/LLM optimized articles per month",
  "Articles with citations, internal links and infographics",
  "Automatic quality backlinks ($800+ value)",
  "Technical SEO audit for Google & ChatGPT",
  "Real-time research and expert insights",
  "Automated keyword research & SERP clustering",
  "Reddit agent for brand visibility",
  "WordPress, Webflow, Shopify integrations",
  "JSON-LD schema markup",
  "20+ languages supported",
];

export default function AeoSubscription() {
  const { subscribed, trial, isLoading, startCheckout, openCustomerPortal } = useSubscription();

  const isActive = subscribed || trial;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-2xl mx-auto">
        <div className="text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            {trial ? "Trial Active" : subscribed ? "Active Subscription" : "Limited Time Offer"}
          </Badge>
          <h1 className="text-3xl font-bold">All-in-One Plan</h1>
          <p className="text-muted-foreground mt-2">
            Everything you need to dominate AI search results
          </p>
        </div>

        <Card className={`p-8 relative ${isActive ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-primary shadow-lg shadow-primary/20'}`}>
          {isActive && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white">
              {trial ? "Trial Active" : "Your Plan"}
            </Badge>
          )}
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-primary to-blue-500 shadow-lg">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-2xl text-muted-foreground line-through">$58</span>
              <span className="text-5xl font-bold">$29</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-emerald-600 font-medium mt-2">
              Or $23/month billed annually
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              3-day free trial • Cancel anytime
            </p>
          </div>

          <ul className="space-y-3 mb-8">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {isLoading ? (
            <Button className="w-full" size="lg" disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </Button>
          ) : isActive ? (
            <div className="space-y-3">
              <Button 
                className="w-full" 
                size="lg"
                variant="outline"
                onClick={openCustomerPortal}
              >
                Manage Subscription
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {trial ? "Your trial is active. Subscribe to continue after trial ends." : "Manage billing, cancel, or update payment method."}
              </p>
            </div>
          ) : (
            <Button 
              className="w-full gradient-bg text-primary-foreground shadow-glow" 
              size="lg"
              onClick={startCheckout}
            >
              Start 3-Day Free Trial
            </Button>
          )}
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>We limit monthly admissions to maintain backlink quality and network balance.</p>
          <p className="mt-1">Questions? Contact support@aeorocket.io</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
