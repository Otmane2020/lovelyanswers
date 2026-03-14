"use client";
import { useRouter } from "next/navigation";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubscriptionGateProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function SubscriptionGate({ title, description, children }: SubscriptionGateProps) {
  const { isSubscribed } = useSubscriptionContext();
  const router = useRouter();

  if (isSubscribed) return <>{children}</>;

  return (
    <div className="relative">
      {/* Blurred content preview */}
      <div className="pointer-events-none select-none filter blur-[6px] opacity-60 max-h-[60vh] overflow-hidden">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
        <div className="text-center max-w-sm mx-auto p-8">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Crown className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">{title}</h3>
          <p className="text-muted-foreground text-sm mb-6">{description}</p>
          <Button onClick={() => router.push("/checkout")} size="lg" className="gap-2 w-full">
            <Lock className="h-4 w-4" />
            Upgrade to Unlock
          </Button>
        </div>
      </div>
    </div>
  );
}
