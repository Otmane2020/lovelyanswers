
# Plan de Correction : Affichage des Prospects dans SuperAdmin

## Problème Identifié

Les données **existent bien** dans la base (5 prospects confirmés), mais elles ne s'affichent pas dans l'UI SuperAdmin. Après analyse :

### Cause Principale : Race Condition Auth/RLS

1. La vérification admin utilise `getUser()` qui vérifie l'email
2. **MAIS** la RLS sur `admin_prospects` fait un JOIN avec `profiles` via `auth.uid()`
3. Si la session Supabase n'est pas complètement initialisée au moment de la requête, `auth.uid()` retourne `NULL` → la RLS bloque tout

### Problème Secondaire : Logs Console Insuffisants

Les `console.log` actuels ne montrent pas si une erreur RLS silencieuse se produit (retourne `[]` au lieu d'une erreur).

---

## Corrections Proposées

### A. Ajouter un Délai pour Garantir la Session Auth

**Fichier :** `src/pages/SuperAdmin.tsx`

Attendre que la session soit complètement prête avant de charger les données :

```typescript
const checkAdminAuth = async () => {
  try {
    // Attendre que la session soit prête
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log("[SuperAdmin] No active session");
      setIsAuthenticated(false);
      return;
    }
    
    const user = session.user;
    console.log("[SuperAdmin] User authenticated:", user?.email);
    
    if (user?.email === ADMIN_EMAIL) {
      setIsAuthenticated(true);
      // Petit délai pour s'assurer que le token est propagé
      await new Promise(resolve => setTimeout(resolve, 100));
      loadAllData();
    } else {
      setIsAuthenticated(false);
    }
  } catch (error) {
    console.error("Auth check error:", error);
    setIsAuthenticated(false);
  } finally {
    setIsLoading(false);
  }
};
```

### B. Améliorer le Logging pour Debug

**Fichier :** `src/pages/SuperAdmin.tsx`

Ajouter plus de détails dans `loadAdminProspects()` :

```typescript
const loadAdminProspects = async () => {
  try {
    console.log("[SuperAdmin] Loading admin prospects...");
    
    // Vérifier d'abord la session active
    const { data: { session } } = await supabase.auth.getSession();
    console.log("[SuperAdmin] Current session:", { 
      hasSession: !!session, 
      userEmail: session?.user?.email 
    });
    
    const { data, error } = await supabase
      .from("admin_prospects")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("[SuperAdmin] Admin prospects response:", { 
      data, 
      error, 
      count: data?.length,
      firstItem: data?.[0] 
    });
    
    if (error) {
      console.error("[SuperAdmin] Query error:", error);
      throw error;
    }
    
    setAdminProspects((data || []) as AdminProspect[]);
  } catch (error) {
    console.error("[SuperAdmin] Error loading admin prospects:", error);
  }
};
```

### C. Ajouter un Bouton de Rafraîchissement Manuel

Pour faciliter le debug et permettre de recharger les données :

```typescript
// Dans le CardHeader de la section Prospects Manuels
<div className="flex items-center gap-2">
  <Button 
    variant="outline" 
    size="sm"
    onClick={() => loadAdminProspects()}
  >
    <RefreshCw className="h-4 w-4 mr-2" />
    Rafraîchir
  </Button>
  <Dialog...>
```

---

## Résumé des Changements

| Fichier | Modification |
|---------|-------------|
| `src/pages/SuperAdmin.tsx` | Utiliser `getSession()` au lieu de `getUser()`, ajouter délai, améliorer logs, bouton refresh |

**Résultat attendu :**
- Les 5 prospects existants s'afficheront correctement
- Logs détaillés pour identifier tout problème futur
- Bouton de rafraîchissement pour forcer le rechargement
