

## Problème identifié

L'application est conçue pour Next.js (routing par fichiers dans `app/`), mais la preview Lovable utilise **Vite** qui n'a **aucun routeur client**. `src/App.tsx` rend uniquement `IndexPage` — il n'y a pas de `react-router-dom` installé, donc quand on clique sur "Log in" (`/auth`) ou "Start Free Audit" (`/onboarding`), la navigation échoue car Vite ne sait pas gérer ces routes.

## Plan de correction

### Étape 1 : Installer react-router-dom
Ajouter `react-router-dom` comme dépendance.

### Étape 2 : Créer un routeur client dans `src/App.tsx`
Remplacer le rendu direct de `IndexPage` par un `BrowserRouter` avec des `Route` pour chaque page :

```text
/           → Index
/auth       → Auth
/signup     → Signup
/onboarding → Signup (Onboarding)
/dashboard  → Dashboard
/pricing    → Pricing
/blog       → Blog
/settings   → AeoSettings
/answers    → Answers
/articles   → AeoArticles
/keywords   → AeoKeywords
/planning   → AeoPlanning
/analytics  → AeoAnalytics
/checkout   → Checkout
/cart       → Cart
/subscription → AeoSubscription
/billing    → AeoBilling
/support    → AeoSupport
/integrations → AeoIntegrations
... (toutes les routes de l'app/ directory)
```

### Étape 3 : Mettre à jour le shim `next/link`
Remplacer les `<a>` par des composants `Link` de `react-router-dom` pour la navigation SPA sans rechargement de page.

### Étape 4 : Mettre à jour le shim `next/navigation`
Remplacer `window.location.href` par `react-router-dom`'s `useNavigate` pour que `router.push()` fonctionne comme une navigation SPA.

### Détails techniques

- Les boutons utilisent `<Link href="/auth">` via le shim `next/link` qui crée des `<a>` tags simples. Avec Vite SPA, cliquer sur `<a href="/auth">` provoque un rechargement complet vers une route que Vite ne connaît pas → page blanche.
- La solution : un vrai routeur React côté client qui intercepte la navigation et rend le bon composant sans rechargement.
- Le shim `next/navigation` (`useRouter`) doit utiliser `useNavigate()` de react-router-dom au lieu de `window.location.href`.
- Le shim `next/link` doit utiliser `<Link>` de react-router-dom au lieu de `<a>`.

