

# Plan de correction - Google Search Console Login

## Diagnostic

Le login Google Search Console a cessé de fonctionner car les fonctions edge OAuth ne sont pas correctement configurées dans `supabase/config.toml`. 

**Fonctions manquantes dans la configuration :**
- `google-oauth-url` - Génère l'URL de connexion Google
- `google-oauth-token` - Échange le code OAuth contre des tokens
- `list-search-console-sites` - Liste les propriétés GSC de l'utilisateur
- `gsc-test-indexation` - Test d'indexation
- `gsc-indexing-diagnostics` - Diagnostic avancé
- `get-search-console-data` - Récupère les données GSC
- `analyze-gsc-anomalies` - Analyse des anomalies

Sans déclaration explicite, ces fonctions utilisent `verify_jwt = true` par défaut, ce qui entre en conflit avec leur gestion interne de l'authentification.

## Solution

### Etape 1 : Mettre à jour `supabase/config.toml`

Ajouter toutes les fonctions Google/GSC manquantes avec `verify_jwt = false` :

```toml
[functions.google-oauth-url]
verify_jwt = false

[functions.google-oauth-token]
verify_jwt = false

[functions.list-search-console-sites]
verify_jwt = false

[functions.get-search-console-data]
verify_jwt = false

[functions.gsc-test-indexation]
verify_jwt = false

[functions.gsc-indexing-diagnostics]
verify_jwt = false

[functions.analyze-gsc-anomalies]
verify_jwt = false
```

### Etape 2 : Redéployer les fonctions edge

Après la mise à jour du config, les fonctions seront automatiquement redéployées avec la bonne configuration.

## Résultat attendu

- Le bouton "Connect Google Search Console" fonctionnera à nouveau
- Le flux OAuth complet (génération URL → callback → échange de token) sera opérationnel
- Les fonctionnalités d'indexation et de diagnostic seront restaurées

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `supabase/config.toml` | Ajouter 7 déclarations de fonctions manquantes |

