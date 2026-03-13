"use client";
import { MessageCircle } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const FloatingSupportButton = () => {
  const router = useRouter();
  const pathname = usePathname();

  // Don't show on support page or public pages
  if (pathname === "/support" || pathname === "/" || pathname === "/auth" || pathname === "/wizard") {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => router.push("/support")}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50 bg-primary hover:bg-primary/90"
            size="icon"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Need help? Contact Support</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FloatingSupportButton;