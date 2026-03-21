

## Diagnostic

La page blanche sur autopilotgeo.com est causee par le **cache Cloudflare** (24h) qui sert un ancien fichier HTML alors que les fichiers JS ont change de hash apres chaque deploiement. Le navigateur charge l'ancien `index.html` qui reference des bundles JS qui n'existent plus sur le serveur => 404 sur les assets => page blanche.

Le worker Cloudflare applique `Cache-Control: public, max-age=86400` (24h) sur TOUTES les reponses, y compris le document HTML principal. C'est le coeur du probleme.

## Plan de correction

### 1. Corriger le cache dans le Cloudflare Worker
Differencier le cache entre le document HTML (pas de cache ou cache court) et les assets statiques (cache long). Le fichier HTML doit toujours etre frais pour pointer vers les bons bundles JS.

**Fichier:** `cloudflare-worker/worker.js`

- Pour les requetes qui retournent du HTML (document principal): `Cache-Control: no-cache` ou `max-age=60`
- Pour les assets statiques (.js, .css, images): garder `max-age=86400`

### 2. Purger le cache Cloudflare manuellement
Apres le deploiement du worker, aller dans le dashboard Cloudflare > Caching > Purge Everything pour vider le cache actuel.

### Detail technique

```text
Avant:  TOUTES les reponses → max-age=86400
Apres:  HTML (Content-Type text/html) → no-cache
        Assets (.js, .css, images)    → max-age=86400
```

La logique dans le worker:
- Detecter si la reponse est HTML via le Content-Type header
- Appliquer le bon Cache-Control en fonction

