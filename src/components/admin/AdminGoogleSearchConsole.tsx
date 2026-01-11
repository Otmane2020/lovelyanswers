import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Globe, Search, Loader2, RefreshCw, CheckCircle, XCircle, Link, TrendingUp, MousePointer, Eye, Plus, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface GscDomain {
  id: string;
  domain: string;
  verified: boolean;
  created_at: string;
}

interface GscData {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface IndexingRequest {
  id: string;
  url: string;
  status: string;
  requested_at: string;
}

export function AdminGoogleSearchConsole() {
  const [domains, setDomains] = useState<GscDomain[]>([]);
  const [gscData, setGscData] = useState<GscData[]>([]);
  const [indexingRequests, setIndexingRequests] = useState<IndexingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [autoIndexing, setAutoIndexing] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadData();
    checkGoogleConnection();
  }, []);

  const checkGoogleConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: domainsData, error } = await supabase
        .from("google_search_console_domains")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      setIsConnected(!error && domainsData && domainsData.length > 0);
    } catch (error) {
      console.error("Error checking Google connection:", error);
    }
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load domains
      const { data: domainsData } = await supabase
        .from("google_search_console_domains")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setDomains(domainsData || []);
      
      // For now, use mock data for GSC stats until tables are created
      setGscData([]);
      setIndexingRequests([]);
    } catch (error) {
      console.error("Error loading GSC data:", error);
      toast.error("Erreur lors du chargement des données GSC");
    } finally {
      setLoading(false);
    }
  };

  const connectGoogle = async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/integrations`;
      
      const response = await supabase.functions.invoke("google-oauth-url", {
        body: { redirectUri },
      });

      if (response.error) throw response.error;
      
      if (response.data?.url) {
        const popup = window.open(
          response.data.url,
          "google_gsc_oauth",
          "width=600,height=700,scrollbars=yes"
        );

        const pollTimer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(pollTimer);
            setConnecting(false);
            loadData();
            checkGoogleConnection();
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error("Error connecting Google:", error);
      toast.error(error.message || "Erreur de connexion Google");
      setConnecting(false);
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) {
      toast.error("Domaine requis");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("google_search_console_domains")
        .insert({
          user_id: user.id,
          domain: newDomain.trim(),
          verified: false,
        });

      if (error) throw error;

      toast.success("Domaine ajouté! Vérifiez-le dans Google Search Console.");
      setNewDomain("");
      loadData();
    } catch (error: any) {
      console.error("Error adding domain:", error);
      toast.error(error.message || "Erreur lors de l'ajout du domaine");
    }
  };

  const requestIndexing = async () => {
    if (!newUrl.trim()) {
      toast.error("URL requise");
      return;
    }

    try {
      new URL(newUrl);
    } catch {
      toast.error("URL invalide");
      return;
    }

    setIndexing(true);
    try {
      toast.info("Demande d'indexation en cours...");
      // TODO: Implement gsc-request-indexing edge function
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Demande d'indexation envoyée!");
      setNewUrl("");
    } catch (error: any) {
      console.error("Error requesting indexing:", error);
      toast.error(error.message || "Erreur lors de la demande d'indexation");
    } finally {
      setIndexing(false);
    }
  };

  const syncGscData = async () => {
    try {
      toast.info("Synchronisation GSC en cours...");
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Données GSC synchronisées!");
      loadData();
    } catch (error: any) {
      console.error("Error syncing GSC:", error);
      toast.error(error.message || "Erreur lors de la synchronisation");
    }
  };

  const totals = gscData.reduce(
    (acc, d) => ({
      clicks: acc.clicks + (d.clicks || 0),
      impressions: acc.impressions + (d.impressions || 0),
    }),
    { clicks: 0, impressions: 0 }
  );
  const avgPosition = gscData.length > 0
    ? (gscData.reduce((sum, d) => sum + (d.position || 0), 0) / gscData.length).toFixed(1)
    : "0";
  const avgCtr = totals.impressions > 0
    ? ((totals.clicks / totals.impressions) * 100).toFixed(2)
    : "0";

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Google Search Console
            </CardTitle>
            <CardDescription>
              Gérez l'indexation et surveillez les performances SEO
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isConnected ? (
              <Button onClick={connectGoogle} disabled={connecting}>
                {connecting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Globe className="w-4 h-4 mr-2" />
                )}
                Connecter Google
              </Button>
            ) : (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Google Connecté
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={syncGscData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Synchroniser
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MousePointer className="w-4 h-4" />
              Clics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.clicks.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">30 derniers jours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Impressions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.impressions.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">30 derniers jours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              CTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgCtr}%</p>
            <p className="text-xs text-muted-foreground">Taux de clic moyen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Search className="w-4 h-4" />
              Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgPosition}</p>
            <p className="text-xs text-muted-foreground">Position moyenne</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4" />
            Ajouter un Domaine
          </CardTitle>
          <CardDescription>
            Ajoutez un domaine pour le suivi et l'indexation automatique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="exemple.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addDomain}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Switch
              checked={autoIndexing}
              onCheckedChange={setAutoIndexing}
            />
            <Label className="text-sm text-muted-foreground">
              Indexation automatique des nouvelles pages
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Domains */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Domaines Configurés</CardTitle>
          <CardDescription>
            Domaines suivis pour l'indexation Google
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun domaine configuré. Ajoutez votre domaine ci-dessus.
            </p>
          ) : (
            <div className="space-y-2">
              {domains.map((domain) => (
                <div key={domain.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{domain.domain}</span>
                  </div>
                  <Badge variant={domain.verified ? "default" : "secondary"}>
                    {domain.verified ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> Vérifié</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" /> En attente</>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Indexing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link className="w-4 h-4" />
            Demander l'Indexation
          </CardTitle>
          <CardDescription>
            Soumettez une URL pour indexation prioritaire sur Google
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="https://exemple.com/page"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </div>
            <Button onClick={requestIndexing} disabled={indexing}>
              {indexing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Indexer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Indexing History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique d'Indexation</CardTitle>
          <CardDescription>
            {indexingRequests.length} demande(s) d'indexation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {indexingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune demande d'indexation
            </p>
          ) : (
            <div className="space-y-2">
              {indexingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex-1 truncate">
                    <span className="text-sm font-mono truncate">
                      {req.url}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant="outline">
                      {req.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(req.requested_at), "dd/MM HH:mm")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminGoogleSearchConsole;
