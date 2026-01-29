

# Correction de la connexion Google Search Console

## Problème identifié

L'application envoie des URIs de redirection différentes de celles configurées dans Google Cloud Console.

| L'application envoie | Google Cloud Console a |
|---------------------|------------------------|
| `https://lovelyanswers.com/analytics` | `https://lovelyanswers.com/analytics/v1/callback` |
| `https://lovelyanswers.com/integrations` | `https://lovelyanswers.com/settings/v1/callback` |

Google OAuth exige une correspondance **exacte** - même un caractère différent provoque l'erreur `redirect_uri_mismatch`.

## Solution

### Ajouter ces 4 URIs dans Google Cloud Console

Dans la console Google Cloud (Credentials → OAuth 2.0 Client IDs → Authorized redirect URIs) :

```text
https://lovelyanswers.com/analytics
https://lovelyanswers.com/integrations
https://lovelyanswers.lovable.app/analytics
https://lovelyanswers.lovable.app/integrations
```

### URIs existantes à conserver

Les URIs `/v1/callback` sont utilisées pour l'authentification Supabase (connexion utilisateur), ne les supprimez pas.

### Temps de propagation

Google indique que les changements peuvent prendre de 5 minutes à quelques heures pour prendre effet. Dans la pratique, c'est généralement immédiat (moins de 1 minute).

## Pas de modification de code nécessaire

Le code est correct. Il envoie les bonnes URIs (`/analytics` et `/integrations`). Le problème est uniquement dans la configuration Google Cloud Console.

