import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Zap, CheckCircle, Tag, Code, Copy, ExternalLink } from "lucide-react";

interface ConversionGoal {
  name: string;
  type: string;
  value: number | null;
  tag: string;
}

interface ConversionsTabProps {
  conversionId: string;
}

export function ConversionsTab({ conversionId }: ConversionsTabProps) {
  const [conversionGoals, setConversionGoals] = useState<ConversionGoal[]>([]);
  const [isGeneratingGoals, setIsGeneratingGoals] = useState(false);

  const handleGenerateConversionGoals = async () => {
    setIsGeneratingGoals(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-google-ads", {
        body: { focus: "conversions" },
      });
      if (error) throw error;
      const goals: ConversionGoal[] = data?.goals || [];
      setConversionGoals(goals);
      if (goals.length === 0) {
        toast({ title: "Aucun objectif généré", description: "Synchronisez d'abord vos campagnes", variant: "destructive" });
      } else {
        toast({ title: `${goals.length} objectif(s) de conversion générés` });
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsGeneratingGoals(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié !" });
  };

  const implementedConversions = [
    { name: "Inscription (Sign Up)", event: "sign_up", page: "/signup", value: "$5", description: "Se déclenche quand un utilisateur crée un compte" },
    { name: "Onboarding terminé", event: "onboarding_complete", page: "/wizard", value: "$10", description: "Se déclenche quand l'utilisateur termine le wizard" },
    { name: "Début de checkout", event: "begin_checkout", page: "/checkout", value: "$29-279", description: "Se déclenche au clic sur 'S'abonner'" },
    { name: "Vue page Pricing", event: "pricing_view", page: "/pricing", value: "$1", description: "Se déclenche à la consultation de la page pricing" },
    { name: "Achat (Purchase)", event: "purchase", page: "Stripe webhook", value: "Dynamic", description: "Se déclenche après paiement réussi via Stripe" },
  ];

  const generateGtagSnippet = (label: string, value?: string) => {
    return `gtag('event', 'conversion', {\n  'send_to': '${conversionId}/${label}',\n  'value': ${value || "1.0"},\n  'currency': 'EUR'\n});`;
  };

  return (
    <div className="space-y-6">
      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">Générer de nouveaux objectifs</h4>
                <p className="text-xs text-muted-foreground mt-1">L'IA analyse vos campagnes et propose des objectifs de conversion adaptés</p>
                <Button onClick={handleGenerateConversionGoals} disabled={isGeneratingGoals} size="sm" className="mt-3">
                  {isGeneratingGoals ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                  Générer les objectifs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <ExternalLink className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">Créer dans Google Ads</h4>
                <p className="text-xs text-muted-foreground mt-1">Ouvrez Google Ads pour créer les conversions correspondantes</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => window.open("https://ads.google.com/aw/conversions/new", "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir Google Ads
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Generated Goals */}
      {conversionGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Objectifs générés par l'IA ({conversionGoals.length})
            </CardTitle>
            <CardDescription>Créez ces conversions dans Google Ads puis copiez le code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversionGoals.map((goal, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{goal.name}</span>
                    <Badge variant="outline" className="text-[10px]">{goal.type}</Badge>
                  </div>
                  {goal.value && <span className="text-sm font-medium">{goal.value}€</span>}
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-medium">Code à intégrer</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs"
                      onClick={() => copyToClipboard(generateGtagSnippet(goal.tag, goal.value?.toString()))}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copier
                    </Button>
                  </div>
                  <pre className="text-xs font-mono overflow-x-auto">
                    {generateGtagSnippet(goal.tag, goal.value?.toString())}
                  </pre>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Implemented Conversions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            Conversions actives sur le site
          </CardTitle>
          <CardDescription>
            Tracking déjà intégré via gtag.js ({conversionId})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {implementedConversions.map((conv, idx) => (
            <div key={idx} className="border rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">{conv.name}</span>
                  <Badge variant="outline" className="text-[10px]">{conv.event}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{conv.description}</p>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span>Page: <code className="bg-muted px-1 rounded">{conv.page}</code></span>
                  <span>Valeur: <strong>{conv.value}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 border-green-200 shrink-0">Actif</Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7"
                  onClick={() => copyToClipboard(generateGtagSnippet(conv.event, conv.value.replace("$", "")))}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Global Tag Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Configuration gtag.js
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute top-2 right-2 h-7"
              onClick={() => copyToClipboard(`gtag('config', '${conversionId}');`)}
            >
              <Copy className="h-3 w-3 mr-1" /> Copier
            </Button>
            <pre className="text-xs font-mono overflow-x-auto">
{`<!-- Installé dans index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${conversionId}"></script>
gtag('config', '${conversionId}');

<!-- Fichier: src/lib/gtag-conversions.ts -->
// Toutes les conversions sont envoyées automatiquement`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
