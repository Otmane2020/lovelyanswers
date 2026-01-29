
# Plan de Correction : Isolation des Intégrations entre Utilisateurs

## Diagnostic

**Problème critique identifié** : L'Edge Function `cms-publish` utilise le Service Role Key pour accéder aux intégrations, ce qui bypass complètement les politiques RLS. Un utilisateur malveillant peut publier sur l'intégration d'un autre utilisateur en devinant ou obtenant un UUID d'intégration.

## Changements Requis

### 1. Edge Function `cms-publish` - Ajouter Vérification d'Appartenance

Modifier la logique pour vérifier que l'intégration appartient bien à un projet de l'utilisateur authentifié :

```text
supabase/functions/cms-publish/index.ts
```

**Avant** (vulnérable) :
```typescript
const { data: integration, error: intError } = await supabase
  .from("integrations")
  .select("*")
  .eq("id", requestData.integrationId)
  .single();
```

**Après** (sécurisé) :
```typescript
// Récupérer l'intégration avec son projet
const { data: integration, error: intError } = await supabase
  .from("integrations")
  .select("*, projects!inner(user_id)")
  .eq("id", requestData.integrationId)
  .single();

if (intError || !integration) {
  throw new Error("Integration not found");
}

// CRITIQUE: Vérifier que l'utilisateur est propriétaire OU que c'est un appel interne
if (!isInternalCall && authenticatedUserId) {
  if (integration.projects.user_id !== authenticatedUserId) {
    console.error(`[cms-publish] SECURITY: User ${authenticatedUserId} tried to access integration owned by ${integration.projects.user_id}`);
    return new Response(
      JSON.stringify({ error: "Access denied - integration belongs to another user" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
```

### 2. Vérification Similaire pour `test-integration`

Inspecter et corriger la fonction `test-integration` avec la même logique.

### 3. Vérification pour `gmb-publish-post`

Appliquer le même pattern de sécurité.

### 4. Audit des Autres Edge Functions

Vérifier toutes les Edge Functions qui accèdent à des ressources utilisateur :
- `publish-scheduled-answers` (cron - OK car utilise project_id)
- Autres fonctions utilisant `integrationId`

## Impact

- **Sécurité** : Empêche la publication croisée entre utilisateurs
- **Logging** : Trace les tentatives d'accès non autorisées
- **Compatibilité** : Les appels internes (cron jobs) continuent de fonctionner

## Tests à Effectuer

1. Créer une intégration avec User A
2. Essayer de publier avec User B en utilisant l'UUID de l'intégration de User A
3. Vérifier que le système retourne une erreur 403
