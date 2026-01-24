
# Plan : Indexation Google via OAuth utilisateur (au lieu de Service Account)

## Problème identifié

Actuellement, l'indexation Google échoue avec l'erreur "Permission denied. Failed to verify the URL ownership" car :

1. Le système utilise un **Service Account** (`lovelyanswers@lovely-answers.iam.gserviceaccount.com`)
2. Ce Service Account n'a pas les permissions "Owner" sur les propriétés GSC de chaque utilisateur
3. Demander à chaque utilisateur d'ajouter ce Service Account comme "Owner" dans GSC n'est pas réaliste pour un produit SaaS

## Solution proposée

Utiliser le **token OAuth de l'utilisateur** (déjà obtenu lors de la connexion GSC) pour appeler l'API d'indexation. Chaque utilisateur indexe donc ses propres URLs avec ses propres permissions.

**Avantage clé** : Si l'utilisateur est déjà propriétaire de son site dans GSC, l'indexation fonctionnera automatiquement sans configuration supplémentaire.

## Changements requis

### 1. Modifier `gsc-test-indexation` (test manuel)

Remplacer la logique Service Account par :
- Récupérer le `google_oauth_token` de l'utilisateur depuis la table `profiles`
- Rafraîchir le token si expiré (via `google_refresh_token`)
- Utiliser ce token pour appeler l'API d'indexation

### 2. Modifier `gsc-request-indexing` (indexation automatique après publication)

Même logique, mais nécessite de :
- Passer le `userId` dans la requête (depuis `cms-publish`)
- Récupérer le token OAuth de cet utilisateur

### 3. Mettre à jour `cms-publish`

Passer le `userId` lors de l'appel à `gsc-request-indexing` pour que la fonction puisse récupérer le bon token OAuth.

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `supabase/functions/gsc-test-indexation/index.ts` | Remplacer Service Account par OAuth utilisateur |
| `supabase/functions/gsc-request-indexing/index.ts` | Remplacer Service Account par OAuth utilisateur + récupérer userId |
| `supabase/functions/cms-publish/index.ts` | Passer userId à gsc-request-indexing |

## Résultat attendu

| Avant | Après |
|-------|-------|
| Erreur "Permission denied" | Indexation réussie si l'utilisateur est Owner de sa propriété GSC |
| Nécessite configuration Service Account par site | Aucune configuration supplémentaire requise |
| Un seul compte technique pour tous | Chaque utilisateur utilise ses propres permissions |

## Section technique

### Nouvelle logique de `gsc-test-indexation`

```typescript
// 1. Authentifier l'utilisateur
const { data: { user }, error: userError } = await supabase.auth.getUser(token);
const userId = user.id;

// 2. Récupérer son token OAuth depuis profiles
const { data: profile } = await supabase
  .from("profiles")
  .select("google_oauth_token, google_refresh_token, google_token_expires_at")
  .eq("id", userId)
  .single();

// 3. Rafraîchir si expiré
let accessToken = profile.google_oauth_token;
if (new Date(profile.google_token_expires_at) < new Date()) {
  accessToken = await refreshGoogleToken(profile.google_refresh_token);
}

// 4. Appeler l'API d'indexation avec ce token
const response = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ url, type: "URL_UPDATED" }),
});
```

### Prérequis utilisateur

Pour que l'indexation fonctionne, l'utilisateur doit :
1. Avoir connecté son compte Google via OAuth (déjà fait si le badge "Connected" est visible)
2. Être **propriétaire** (pas juste "utilisateur") de la propriété GSC correspondante
3. Avoir accepté le scope `indexing` lors de la connexion (déjà inclus dans le flux OAuth)

### Note importante

Si l'utilisateur n'est pas propriétaire de sa propriété GSC, l'API retournera toujours "Permission denied". Mais c'est maintenant une erreur compréhensible ("vous n'êtes pas Owner") au lieu d'un problème de configuration technique.
