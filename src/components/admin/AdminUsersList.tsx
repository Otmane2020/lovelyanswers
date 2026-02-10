import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, LogIn, Search, RefreshCw, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

interface UserWithDetails {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  credits_total: number | null;
  credits_used: number | null;
  project_count: number;
  domains: string[];
}

export function AdminUsersList() {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [loginAsLoading, setLoginAsLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.email?.toLowerCase().includes(q) ||
            u.full_name?.toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // Load profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Load credits
      const { data: credits } = await supabase
        .from("credits")
        .select("user_id, credits_total, credits_used");

      const creditsMap = new Map(
        credits?.map((c) => [c.user_id, { total: c.credits_total, used: c.credits_used }]) || []
      );

      // Load project counts and domains
      const { data: projects } = await supabase
        .from("projects")
        .select("user_id, domain");

      const projectCountMap = new Map<string, number>();
      const domainsMap = new Map<string, string[]>();
      projects?.forEach((p) => {
        projectCountMap.set(p.user_id, (projectCountMap.get(p.user_id) || 0) + 1);
        const domains = domainsMap.get(p.user_id) || [];
        if (p.domain && !domains.includes(p.domain)) domains.push(p.domain);
        domainsMap.set(p.user_id, domains);
      });

      const usersWithDetails: UserWithDetails[] = (profiles || []).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        created_at: p.created_at,
        credits_total: creditsMap.get(p.id)?.total ?? null,
        credits_used: creditsMap.get(p.id)?.used ?? null,
        project_count: projectCountMap.get(p.id) || 0,
        domains: domainsMap.get(p.id) || [],
      }));

      setUsers(usersWithDetails);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginAs = async (email: string) => {
    setLoginAsLoading(email);
    try {
      const { data, error } = await supabase.functions.invoke("admin-login-as", {
        body: { targetEmail: email },
      });

      if (error) throw error;

      if (data?.url) {
        // Open magic link in a new tab
        window.open(data.url, "_blank");
        toast({
          title: "Lien généré",
          description: `Magic link ouvert pour ${email}`,
        });
      } else {
        throw new Error("No URL returned");
      }
    } catch (error) {
      console.error("Error login as:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le lien de connexion",
        variant: "destructive",
      });
    } finally {
      setLoginAsLoading(null);
    }
  };

  const getSubscriptionBadge = (user: UserWithDetails) => {
    if (user.credits_total && user.credits_total >= 99999) {
      return (
        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
          VIP
        </Badge>
      );
    }
    if (user.credits_total && user.credits_total > 0) {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          Actif
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Free
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tous les utilisateurs ({users.length})
            </CardTitle>
            <CardDescription>
              Liste complète des utilisateurs inscrits avec "Login As"
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par email ou nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Domaines</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Crédits</TableHead>
                <TableHead>Projets</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email || "-"}</TableCell>
                  <TableCell>{user.full_name || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.domains.length > 0 ? user.domains.map((d, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                      )) : <span className="text-muted-foreground text-sm">-</span>}
                    </div>
                  </TableCell>
                  <TableCell>{getSubscriptionBadge(user)}</TableCell>
                  <TableCell>
                    {user.credits_total !== null ? (
                      <span className="text-sm">
                        {user.credits_used ?? 0}/{user.credits_total}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{user.project_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.created_at
                      ? format(new Date(user.created_at), "d MMM yyyy", { locale: enUS })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => user.email && handleLoginAs(user.email)}
                      disabled={!user.email || loginAsLoading === user.email}
                    >
                      {loginAsLoading === user.email ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <LogIn className="h-4 w-4 mr-1" />
                          Login As
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {searchQuery ? "Aucun utilisateur trouvé" : "Aucun utilisateur"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
