
Objectif: rétablir le preview immédiatement (erreur HTTP 500 sur toutes les routes).

1) Diagnostic confirmé
- Le preview renvoie 500 sur `/` et `/terms` (pas seulement la landing).
- Le navigateur ne montre pas d’erreur React utile: c’est un crash serveur au rendu initial.
- Le projet n’a que des variables `.env` en `VITE_*` (ex: `VITE_SUPABASE_URL`), alors que le runtime Next lit surtout `NEXT_PUBLIC_*`.
- Les providers globaux (auth/subscription/cart) chargent le client backend dès le boot, donc une variable manquante peut casser tout le rendu.

2) Correctif principal (rapide)
- Fichier à modifier: `next.config.mjs`
- Ajouter un pont d’environnement pour exposer les clés attendues par Next:
  - `NEXT_PUBLIC_SUPABASE_URL: process.env.VITE_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY`
  - (optionnel mais propre) `NEXT_PUBLIC_SUPABASE_PROJECT_ID: process.env.VITE_SUPABASE_PROJECT_ID`
- Cela évite le crash d’initialisation et restaure le rendu serveur.

3) Stabilisation (si nécessaire)
- Si le 500 persiste après le pont env:
  - Isoler temporairement `Providers` dans le layout (chargement client contrôlé) pour confirmer si le crash vient de l’initialisation auth/backend.
  - Puis réactiver progressivement les providers pour identifier précisément le composant fautif.

4) Vérification de fin
- Recharger `/` et `/terms`.
- Vérifier que les requêtes Document passent de `500` à `200`.
- Vérifier qu’on voit bien la landing (plus d’écran gris vide).
- Contrôler console réseau: plus de `PROXY_ERROR status:500`.

Détails techniques
- Cause la plus probable: incompatibilité de nommage des variables d’environnement entre runtime Next et config actuelle (`VITE_*` uniquement).
- Impact: crash global au premier rendu, donc preview entièrement indisponible.
- Risque du correctif: faible (changement de configuration seulement, pas de logique métier).
