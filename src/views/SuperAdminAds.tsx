"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Shield, LogOut, ArrowLeft, Megaphone, Brain, Key, Target,
  TrendingUp, Lightbulb, Tag, BarChart3, Link2, Settings,
  Zap
} from "lucide-react";
import { GoogleAdsManager } from "@/components/admin/GoogleAdsManager";
import { GoogleAnalyticsPanel } from "@/components/admin/GoogleAnalyticsPanel";
import { GoogleTagManagerPanel } from "@/components/admin/GoogleTagManagerPanel";

const ADMIN_EMAIL = "oben.rockman@gmail.com";

const SuperAdminAds = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === ADMIN_EMAIL) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("[SuperAdminAds] Auth check error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Accès non autorisé</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/superadmin")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Admin
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Megaphone className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Ads Agency Dashboard</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut().then(() => router.push("/auth"))}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main layout with sidebar */}
      <Tabs defaultValue="gads-overview" className="flex min-h-[calc(100vh-57px)]">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r bg-card flex flex-col">
          <TabsList className="flex flex-col items-stretch h-auto bg-transparent p-2 gap-0.5">
            {/* OAuth & Connexions */}
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 font-semibold">
              Connexions
            </p>
            <TabsTrigger value="gads-overview" className="justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Link2 className="h-4 w-4" />
              OAuth & Comptes
            </TabsTrigger>

            <Separator className="my-2" />

            {/* Google Ads */}
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 font-semibold">
              Google Ads
            </p>
            <TabsTrigger value="gads-campaigns" className="justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Megaphone className="h-4 w-4" />
              Campagnes
            </TabsTrigger>
            <TabsTrigger value="gads-audit" className="justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Brain className="h-4 w-4" />
              Audit & Rapport
            </TabsTrigger>
            <TabsTrigger value="gads-keywords" className="justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Key className="h-4 w-4" />
              Mots-clés
            </TabsTrigger>
            <TabsTrigger value="gads-adgroups" className="justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Target className="h-4 w-4" />
              Groupes d'annonces
            </TabsTrigger>
            <TabsTrigger value="gads-roas" className="justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <TrendingUp className="h-4 w-4" />
              ROAS & Budget
            </TabsTrigger>
            <TabsTrigger value="gads-strategy" className="justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Lightbulb className="h-4 w-4" />
              Stratégie IA
            </TabsTrigger>
            <TabsTrigger value="gads-conversions" className="justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Zap className="h-4 w-4" />
              Conversions Ads
            </TabsTrigger>

            <Separator className="my-2" />

            {/* Analytics & Tag Manager */}
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 font-semibold">
              Tracking & Analytics
            </p>
            <TabsTrigger value="ga4" className="justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <BarChart3 className="h-4 w-4" />
              Google Analytics
            </TabsTrigger>
            <TabsTrigger value="gtm" className="justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Tag className="h-4 w-4" />
              Tag Manager
            </TabsTrigger>
            <TabsTrigger value="gtm-conversions" className="justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <Settings className="h-4 w-4" />
              Conversions GTM/GA4
            </TabsTrigger>
          </TabsList>
        </aside>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-6">
          {/* OAuth & Overview */}
          <TabsContent value="gads-overview">
            <GoogleAdsManager activeTab="campaigns" />
          </TabsContent>

          {/* Google Ads tabs */}
          <TabsContent value="gads-campaigns">
            <GoogleAdsManager activeTab="campaigns" />
          </TabsContent>
          <TabsContent value="gads-audit">
            <GoogleAdsManager activeTab="audit" />
          </TabsContent>
          <TabsContent value="gads-keywords">
            <GoogleAdsManager activeTab="keywords-analysis" />
          </TabsContent>
          <TabsContent value="gads-adgroups">
            <GoogleAdsManager activeTab="adgroups-analysis" />
          </TabsContent>
          <TabsContent value="gads-roas">
            <GoogleAdsManager activeTab="roas-analysis" />
          </TabsContent>
          <TabsContent value="gads-strategy">
            <GoogleAdsManager activeTab="strategy-analysis" />
          </TabsContent>
          <TabsContent value="gads-conversions">
            <GoogleAdsManager activeTab="conversions" />
          </TabsContent>

          {/* Analytics & GTM */}
          <TabsContent value="ga4">
            <GoogleAnalyticsPanel />
          </TabsContent>
          <TabsContent value="gtm">
            <GoogleTagManagerPanel />
          </TabsContent>
          <TabsContent value="gtm-conversions">
            <ConversionSetupPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

// Panel for GTM/GA4 conversion setup
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function ConversionSetupPanel() {
  const [copied, setCopied] = useState<string | null>(null);

  const conversions = [
    { name: "Sign-up", id: "AW-1880571409", label: "7502250437", event: "sign_up", value: "$5" },
    { name: "Onboarding", id: "AW-1880571409", label: "7502250230", event: "onboarding_complete", value: "$10" },
    { name: "Checkout", id: "AW-1880571409", label: "7502248279", event: "begin_checkout", value: "$29" },
    { name: "Purchase", id: "AW-1880571409", label: "7502219935", event: "purchase", value: "dynamic" },
    { name: "Pricing View", id: "AW-1880571409", label: "7502248288", event: "view_pricing", value: "$1" },
  ];

  const copySnippet = (conv: typeof conversions[0]) => {
    const snippet = `gtag('event', 'conversion', {
  'send_to': '${conv.id}/${conv.label}',
  'value': ${conv.value === "dynamic" ? "amount" : conv.value.replace("$", "")},
  'currency': 'EUR'
});`;
    navigator.clipboard.writeText(snippet);
    setCopied(conv.label);
    toast({ title: "Copié !", description: `Snippet ${conv.name} copié` });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Conversion Setup — GTM & GA4</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configuration et suivi des conversions Google Ads via GTM et GA4
        </p>
      </div>

      {/* Active Conversions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Conversions Actives
          </CardTitle>
          <CardDescription>Toutes les conversions Google Ads configurées avec leurs snippets</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Événement</TableHead>
                <TableHead>Compte</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>GA4 Event</TableHead>
                <TableHead className="text-right">Snippet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversions.map((conv) => (
                <TableRow key={conv.label}>
                  <TableCell className="font-medium">{conv.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{conv.id}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{conv.label}</TableCell>
                  <TableCell>
                    <Badge variant={conv.value === "dynamic" ? "default" : "secondary"} className="text-xs">
                      {conv.value}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{conv.event}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copySnippet(conv)}
                    >
                      {copied === conv.label ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* GTM Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Setup GTM</CardTitle>
          <CardDescription>Étapes pour configurer les conversions dans Google Tag Manager</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge className="mt-0.5 shrink-0">1</Badge>
              <div>
                <p className="font-medium">Créer un tag "Google Ads Conversion Tracking"</p>
                <p className="text-muted-foreground">Renseignez le Conversion ID et le Conversion Label pour chaque événement</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge className="mt-0.5 shrink-0">2</Badge>
              <div>
                <p className="font-medium">Configurer les déclencheurs (Triggers)</p>
                <p className="text-muted-foreground">Custom Event trigger pour chaque événement GA4 (sign_up, purchase, etc.)</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge className="mt-0.5 shrink-0">3</Badge>
              <div>
                <p className="font-medium">Tester avec GTM Preview</p>
                <p className="text-muted-foreground">Vérifiez que les tags se déclenchent correctement dans le mode aperçu GTM</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge className="mt-0.5 shrink-0">4</Badge>
              <div>
                <p className="font-medium">Publier les modifications</p>
                <p className="text-muted-foreground">Créez une nouvelle version du conteneur GTM et publiez</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GA4 Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Setup GA4</CardTitle>
          <CardDescription>Événements personnalisés GA4 liés aux conversions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge className="mt-0.5 shrink-0">1</Badge>
              <div>
                <p className="font-medium">Marquer les événements comme conversions dans GA4</p>
                <p className="text-muted-foreground">Admin → Events → marquez sign_up, purchase, begin_checkout comme conversions</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge className="mt-0.5 shrink-0">2</Badge>
              <div>
                <p className="font-medium">Lier GA4 à Google Ads</p>
                <p className="text-muted-foreground">Admin → Google Ads Linking → Importez les conversions GA4 dans Google Ads</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SuperAdminAds;
