import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown } from "lucide-react";

export default function AeoSubscription() {
  const plans = [
    {
      name: "Free",
      price: "€0",
      period: "/month",
      description: "To get started",
      features: [
        "5 AEO optimizations",
        "2 articles",
        "10 active answers",
      ],
      icon: Zap,
      current: true,
    },
    {
      name: "Pro",
      price: "€29",
      period: "/month",
      description: "For creators",
      features: [
        "50 AEO optimizations",
        "20 articles",
        "100 active answers",
        "Integrations",
      ],
      icon: Sparkles,
      popular: true,
    },
    {
      name: "Business",
      price: "€99",
      period: "/month",
      description: "For teams",
      features: [
        "Unlimited optimizations",
        "Unlimited articles",
        "Unlimited answers",
        "Priority support",
        "API access",
      ],
      icon: Crown,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Choose your plan</h1>
          <p className="text-muted-foreground mt-1">Scale as you grow</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`p-6 relative ${plan.popular ? 'border-primary shadow-lg shadow-primary/20' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Popular
                </Badge>
              )}
              
              <div className="text-center mb-6">
                <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center ${plan.popular ? 'bg-primary' : 'bg-muted'}`}>
                  <plan.icon className={`w-6 h-6 ${plan.popular ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                </div>
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full ${plan.popular ? 'bg-primary text-primary-foreground' : ''}`}
                variant={plan.current ? "outline" : plan.popular ? "default" : "secondary"}
                disabled={plan.current}
              >
                {plan.current ? "Current plan" : "Choose"}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}