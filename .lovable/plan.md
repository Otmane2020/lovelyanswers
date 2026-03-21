
Diagnostic probable après lecture du code :

- Le problème “crawl/page noire” semble surtout venir du chemin production/crawler, pas de la home React elle-même.
- La home publique `/` est bien rendue directement par `src/views/Index.tsx` et n’attend pas l’auth pour afficher le hero.
- En revanche, le bridge SEO a 2 défauts concrets :
  1. `cloudflare-worker/worker.js` envoie `?url=...` au prerender, alors que `supabase/functions/prerender/index.ts` attend `?path=...`.
  2. Le worker cache encore le HTML prerender bot en `max-age=86400`, donc les crawlers peuvent recevoir du HTML périmé.
- Il y a aussi une régression de config : `next.config.mjs` contient encore `distDir: "dist"`, alors qu’il faut laisser la sortie standard `.next`.

Plan de correction :

1. Réparer le passage Worker → prerender
   - Mettre à jour `cloudflare-worker/worker.js` pour transmettre `path` correctement au prerender, avec le pathname réel et éventuellement la query string utile.
   - Ajouter une compatibilité défensive dans `supabase/functions/prerender/index.ts` pour accepter aussi `url` et en extraire le path, afin d’éviter les cassures si un ancien worker circule encore.

2. Corriger le cache crawler
   - Remplacer le `Cache-Control: public, max-age=86400` de la branche bot/prerender par un cache HTML non bloquant (`no-cache, no-store, must-revalidate` ou TTL très court).
   - Garder le cache long uniquement pour les assets versionnés.

3. Corriger la config de build
   - Supprimer `distDir: "dist"` de `next.config.mjs` pour revenir au comportement standard.
   - Cela évite les incohérences entre build/deploy et réduit le risque de page noire liée à des bundles mal servis.

4. Durcir le rendu public
   - Vérifier que la landing `/` reste strictement publique et visible même sans session.
   - Ne pas ajouter de blocage auth sur la home.
   - Si besoin, forcer le thème clair dès le shell serveur plutôt que compter uniquement sur `document.documentElement.classList.remove("dark")` après hydration.

5. Vérifications après implémentation
   - Tester `https://autopilotgeo.com/` en visiteur non connecté.
   - Tester avec un user-agent bot/crawler pour confirmer que le prerender renvoie bien la bonne page.
   - Vérifier que `/`, `/pricing`, `/blog` et `/answers/...` servent du HTML cohérent côté crawler.
   - Refaire une purge Cloudflare après le déploiement du worker.

Fichiers à modifier :
- `cloudflare-worker/worker.js`
- `supabase/functions/prerender/index.ts`
- `next.config.mjs`

Détail technique important :
- D’après le code actuel, la home n’est pas le principal suspect.
- Le vrai point fragile est la chaîne :
  `crawler -> Cloudflare Worker -> prerender`
- Tant que `url`/`path` ne correspondent pas et que le HTML bot reste cache 24h, les crawlers peuvent voir une version cassée, obsolète ou incohérente du site, même si la preview locale semble correcte.
