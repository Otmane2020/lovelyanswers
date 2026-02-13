import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Zap, CheckCircle, Tag, Code, Copy, ExternalLink, Rocket, AlertCircle, ArrowRight } from "lucide-react";

interface ConversionGoal {
  name: string;
  type: string;
  value: number | null;
  tag: string;
}

interface ConversionResult {
  name: string;
  tag: string;
  status: string;
  conversionLabel?: string;
  error?: string;
}

interface ConversionsTabProps {
  conversionId: string;
}

export function ConversionsTab({ conversionId }: ConversionsTabProps) {
  const [conversionGoals, setConversionGoals] = useState<ConversionGoal[]>([]);
  const [isGeneratingGoals, setIsGeneratingGoals] = useState(false);
  const [isCreatingConversions, setIsCreatingConversions] = useState(false);
  const [createdConversions, setCreatedConversions] = useState<ConversionResult[]>([]);

  const handleGenerateConversionGoals = async () => {
    setIsGeneratingGoals(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-google-ads", {
        body: { 
          focus: "conversions",
          businessContext: {
            websiteUrl: "https://lovelyanswers.com",
            brandName: "LovelyAnswers",
            businessDescription: "AI-powered SEO and Answer Engine Optimization (AEO) platform that helps businesses get cited by AI chatbots like ChatGPT, Perplexity, and Gemini.",
            language: "en",
          },
        },
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

  const handleCreateConversionsInGoogleAds = async () => {
    setIsCreatingConversions(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-google-ads-conversions");
      if (error) throw error;
      if (data?.conversions) {
        setCreatedConversions(data.conversions);
        const created = data.conversions.filter((c: ConversionResult) => c.status === "created").length;
        const existing = data.conversions.filter((c: ConversionResult) => c.status === "already_exists").length;
        const errors = data.conversions.filter((c: ConversionResult) => c.status === "error").length;
        toast({
          title: "Conversions synchronisées",
          description: `${created} créée(s), ${existing} existante(s)${errors > 0 ? `, ${errors} erreur(s)` : ""}`,
        });
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsCreatingConversions(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié !" });
  };

  const implementedConversions = [
    { name: "Inscription (Sign Up)", event: "sign_up", page: "/signup", value: "$5", description: "Se déclenche quand un utilisateur crée un compte via Start Free" },
    { name: "Onboarding terminé", event: "onboarding_complete", page: "/wizard", value: "$10", description: "Se déclenche quand l'utilisateur termine le wizard de configuration" },
    { name: "Vue page Pricing", event: "pricing_view", page: "/pricing", value: "$1", description: "Se déclenche à la consultation de la page pricing (après onboarding)" },
    { name: "Début de checkout", event: "begin_checkout", page: "/checkout", value: "$29-279", description: "Se déclenche au clic sur 'S'abonner' depuis la page pricing" },
    { name: "Achat (Purchase)", event: "purchase", page: "Stripe redirect", value: "Dynamique", description: "Se déclenche après paiement réussi — valeur = montant réel Stripe" },
  ];

  const generateGtagSnippet = (label: string, value?: string) => {
    return `gtag('event', 'conversion', {\n  'send_to': '${conversionId}/${label}',\n  'value': ${value || "1.0"},\n  'currency': 'EUR'\n});`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "created":
        return <Badge className="bg-green-100 text-green-800 border-green-200">✓ Créée</Badge>;
      case "already_exists":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Existante</Badge>;
      case "error":
        return <Badge variant="destructive">Erreur</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action principale : Créer les conversions dans Google Ads */}
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base mb-1">Créer les conversions dans Google Ads</h3>
              <p className="text-sm text-muted-foreground mb-1">
                Crée automatiquement les 5 actions de conversion dans votre compte Google Ads via l'API.
                Les labels de conversion seront récupérés pour l'intégration dans le site.
              </p>
              <ul className="text-xs text-muted-foreground mb-3 space-y-0.5">
                <li className="flex items-center gap-1"><ArrowRight className="h-3 w-3" /> Sign Up — Start Free ($5)</li>
                <li className="flex items-center gap-1"><ArrowRight className="h-3 w-3" /> Onboarding Complete ($10)</li>
                <li className="flex items-center gap-1"><ArrowRight className="h-3 w-3" /> Pricing Page View ($1)</li>
                <li className="flex items-center gap-1"><ArrowRight className="h-3 w-3" /> Begin Checkout ($29)</li>
                <li className="flex items-center gap-1"><ArrowRight className="h-3 w-3" /> Purchase (valeur dynamique Stripe)</li>
              </ul>
              <Button 
                onClick={handleCreateConversionsInGoogleAds} 
                disabled={isCreatingConversions}
                className="gap-2"
              >
                {isCreatingConversions ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4" />
                )}
                {isCreatingConversions ? "Création en cours..." : "Créer les 5 conversions dans Google Ads"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résultats de la création */}
      {createdConversions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Résultat de la synchronisation
            </CardTitle>
            <CardDescription>
              Labels de conversion récupérés — copiez-les pour mettre à jour le tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {createdConversions.map((conv, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {conv.status === "error" ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    <span className="font-semibold text-sm">{conv.name}</span>
                    {getStatusBadge(conv.status)}
                  </div>
                </div>
                {conv.conversionLabel && (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase text-muted-foreground font-medium">
                        Conversion Label (send_to)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => copyToClipboard(conv.conversionLabel!)}
                      >
                        <Copy className="h-3 w-3 mr-1" /> Copier
                      </Button>
                    </div>
                    <code className="text-sm font-mono text-primary">{conv.conversionLabel}</code>
                  </div>
                )}
                {conv.conversionLabel && (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase text-muted-foreground font-medium">
                        Code gtag.js
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => copyToClipboard(
                          `gtag('event', 'conversion', {\n  'send_to': '${conv.conversionLabel}',\n  'value': 1.0,\n  'currency': 'USD'\n});`
                        )}
                      >
                        <Copy className="h-3 w-3 mr-1" /> Copier
                      </Button>
                    </div>
                    <pre className="text-xs font-mono overflow-x-auto">
{`gtag('event', 'conversion', {
  'send_to': '${conv.conversionLabel}',
  'value': 1.0,
  'currency': 'USD'
});`}
                    </pre>
                  </div>
                )}
                {conv.error && (
                  <p className="text-xs text-destructive">{conv.error}</p>
                )}
              </div>
            ))}

            {/* Code complet à copier */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold text-sm mb-2">📋 Code complet pour gtag-conversions.ts</h4>
              <div className="bg-muted rounded-lg p-3 relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-7"
                  onClick={() => {
                    const labels = createdConversions
                      .filter(c => c.conversionLabel)
                      .map(c => `  ${c.tag.toUpperCase()}: "${c.conversionLabel}",`)
                      .join("\n");
                    copyToClipboard(`export const CONVERSION_EVENTS = {\n${labels}\n} as const;`);
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copier tout
                </Button>
                <pre className="text-xs font-mono overflow-x-auto">
{`export const CONVERSION_EVENTS = {
${createdConversions
  .filter(c => c.conversionLabel)
  .map(c => `  ${c.tag.toUpperCase()}: "${c.conversionLabel}",`)
  .join("\n")}
} as const;`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions secondaires */}
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
                <h4 className="font-semibold text-sm">Voir dans Google Ads</h4>
                <p className="text-xs text-muted-foreground mt-1">Ouvrez Google Ads pour vérifier vos conversions</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => window.open("https://ads.google.com/aw/conversions", "_blank")}
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
