import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/lib/language";
import { 
  Sparkles, 
  FileText, 
  CheckCircle2,
  ExternalLink,
  Copy
} from "lucide-react";
import { toast } from "sonner";

interface GeneratedArticle {
  id: string;
  title: string;
  content: string;
  meta_description?: string;
  keywords?: string[];
  shopify_url?: string;
}

interface AeoArticleGenerationDialogProps {
  open: boolean;
  onClose: () => void;
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  generatedArticle: GeneratedArticle | null;
  opportunityTitle?: string;
  platformColor: string;
}

const stepLabels: Record<string, { fr: string; en: string }> = {
  analyzing: { fr: "Analyse de la question...", en: "Analyzing question..." },
  structuring: { fr: "Structuration du contenu...", en: "Structuring content..." },
  generating: { fr: "Génération de l'article...", en: "Generating article..." },
  optimizing: { fr: "Optimisation AEO...", en: "AEO optimization..." },
  complete: { fr: "Article prêt !", en: "Article ready!" }
};

export function AeoArticleGenerationDialog({
  open,
  onClose,
  isGenerating,
  progress,
  currentStep,
  generatedArticle,
  opportunityTitle,
  platformColor
}: AeoArticleGenerationDialogProps) {
  const { language } = useTranslation();

  const copyContent = async () => {
    if (!generatedArticle) return;
    await navigator.clipboard.writeText(generatedArticle.content);
    toast.success(language === 'fr' ? "Contenu copié !" : "Content copied!");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="p-1.5 rounded"
              style={{ backgroundColor: platformColor }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            {language === 'fr' ? "Génération d'article AEO" : "AEO Article Generation"}
          </DialogTitle>
        </DialogHeader>

        {opportunityTitle && (
          <p className="text-sm text-muted-foreground">
            "{opportunityTitle}"
          </p>
        )}

        {isGenerating ? (
          <div className="py-8 space-y-6">
            <div className="flex items-center justify-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
                style={{ backgroundColor: `${platformColor}20` }}
              >
                <Sparkles className="h-8 w-8" style={{ color: platformColor }} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                {stepLabels[currentStep]?.[language as 'fr' | 'en'] || currentStep}
              </p>
            </div>
          </div>
        ) : generatedArticle ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                {language === 'fr' ? "Article généré avec succès !" : "Article generated successfully!"}
              </span>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium">{generatedArticle.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-3 mt-1">
                    {generatedArticle.content.slice(0, 200)}...
                  </p>
                </div>
              </div>

              {generatedArticle.meta_description && (
                <p className="text-xs text-muted-foreground border-t pt-2">
                  <strong>Meta:</strong> {generatedArticle.meta_description}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={copyContent} variant="outline" className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                {language === 'fr' ? "Copier" : "Copy"}
              </Button>
              {generatedArticle.shopify_url && (
                <Button 
                  onClick={() => window.open(generatedArticle.shopify_url, '_blank')}
                  className="flex-1"
                  style={{ backgroundColor: platformColor }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {language === 'fr' ? "Voir sur Shopify" : "View on Shopify"}
                </Button>
              )}
              <Button onClick={onClose} variant="secondary">
                {language === 'fr' ? "Fermer" : "Close"}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
