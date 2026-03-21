"use client";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Sparkles } from "lucide-react";

interface ContentUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContentUpgradeDialog({ open, onOpenChange }: ContentUpgradeDialogProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-center">
        <div className="py-6 space-y-6">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center mx-auto">
            <Crown className="h-8 w-8 text-primary" />
          </div>
           <div className="space-y-2">
             <h3 className="text-xl font-bold">Start appearing in ChatGPT & Google</h3>
             <p className="text-muted-foreground text-sm leading-relaxed">
               Your competitors are already being recommended by AI. Unlock your full content to close the gap.
             </p>
           </div>
           <div className="space-y-3 text-left bg-muted/50 rounded-lg p-4">
             <div className="flex items-center gap-2 text-sm">
               <Sparkles className="h-4 w-4 text-primary shrink-0" />
               <span>Get cited by ChatGPT, Gemini & Perplexity</span>
             </div>
             <div className="flex items-center gap-2 text-sm">
               <Sparkles className="h-4 w-4 text-primary shrink-0" />
               <span>30 AI-optimized articles published monthly</span>
             </div>
             <div className="flex items-center gap-2 text-sm">
               <Sparkles className="h-4 w-4 text-primary shrink-0" />
               <span>Automatic backlinks worth $800+/month</span>
             </div>
             <div className="flex items-center gap-2 text-sm">
               <Sparkles className="h-4 w-4 text-primary shrink-0" />
               <span>Outrank competitors in AI search results</span>
             </div>
           </div>
           <Button
             onClick={() => { onOpenChange(false); router.push("/checkout"); }}
             size="lg"
             className="w-full gap-2"
           >
             <Lock className="h-4 w-4" />
             Start Ranking in ChatGPT — $29/mo
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
