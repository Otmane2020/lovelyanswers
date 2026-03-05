import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Sparkles } from "lucide-react";

interface ContentUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContentUpgradeDialog({ open, onOpenChange }: ContentUpgradeDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-center">
        <div className="py-6 space-y-6">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center mx-auto">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Upgrade to view full content</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Unlock all your AI-generated content, full articles, answers, and GEO optimizations with a premium plan.
            </p>
          </div>
          <div className="space-y-3 text-left bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>30 SEO articles auto-generated</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>30 AEO answers optimized for AI</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>GEO content for brand visibility</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>Auto-publish to your CMS</span>
            </div>
          </div>
          <Button
            onClick={() => { onOpenChange(false); navigate("/checkout"); }}
            size="lg"
            className="w-full gap-2"
          >
            <Lock className="h-4 w-4" />
            Upgrade Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
