## Problème

Après paiement, l'utilisateur voit toujours les cadenas et les limites des 3 plans (Starter / Pro / Agency) ne sont pas respectées. Trois bugs principaux :

1. **Agency = unlimited articles cassé.** `PRICE_MAP.articles = -1` est stocké tel quel et propagé dans `useUsage` : `articlesThisMonth < -1` est toujours faux → blocage permanent.
2. **Cadenas persistent malgré l'abonnement.** Le déblocage (`articles.status='locked'`, `answers.answer='Content locked…'`) est déclenché en *fire-and-forget* dans `check-subscription` ; la requête front retourne avant que l'unlock soit terminé. Et `AeoDashboard` affiche le bloc "Subscribe to unlock" uniquement basé sur `lockedArticles.length > 0`, sans tenir compte de `subscribed`.
3. **Aucune feature flag par plan.** Le code ne distingue pas Starter vs Pro vs Agency au-delà de `sites_limit`/`articles_limit`. Les options listées (priority generation, CMS étendus, Planning unlock, white-label, multi-client, Slack) ne sont gatées nulle part.

## Plan

### 1. Source de vérité unique des plans
- Étendre `src/lib/stripe-products.ts` : ajouter pour chaque plan un objet `features` typé :
  ```
  { prioritySEO, allCms, planningUnlocked, whiteLabel, multiClient, slackSupport, competitorMonitoring }
  ```
- Ajouter `articlesLimit: -1` → exposer un helper `isUnlimited(limit)` et `normalizeLimit(limit) => number|null` (–1 → null).

### 2. Backend — `supabase/functions/check-subscription`
- Réutiliser le même mapping côté Deno (dupliqué actuellement) : conserver `PRICE_MAP` mais ajouter les `features` ; retourner dans la réponse JSON : `plan, cycle, sites_limit, articles_limit (null si illimité), features{}`.
- **Await** `triggerUnlockIfNeeded` (au lieu de fire-and-forget) pour que la première réponse post-paiement renvoie un état déjà débloqué.
- Conserver l'upsert dans `public.subscriptions` (sert de cache RLS-safe pour l'UI).

### 3. Front — contexte & hooks
- `SubscriptionContext` : ajouter `features` au state, normaliser `articles_limit === -1 → null` (= illimité).
- Nouveau hook `usePlanFeatures()` retournant `{ plan, features, sitesLimit, articlesLimit, isUnlimited }`.
- `useUsage` : utiliser la valeur normalisée ; conserver la sémantique `null = unlimited`.

### 4. Gating UI (cadenas)
- `AeoDashboard.tsx` : conditionner tous les blocs "locked / Subscribe to unlock" sur `!subscribed && !trial`. Si abonné, masquer la bannière et déclencher `unlock-articles` une fois (idempotent).
- `AeoGeo.tsx`, `AutoSeo.tsx`, `LocalAnswersTab.tsx`, `AeoPlanning.tsx` : remplacer `if (!isSubscribed)` brut par checks via `usePlanFeatures` selon la feature concernée (ex. Planning unlock = `features.planningUnlocked`, dispo seulement Pro/Agency).
- `SubscriptionGate` reste pour les routes complètement payantes.

### 5. Enforcement des limites
- `useUsage.canCreateProject` déjà OK, mais ajouter le check côté création de projet (wizard + `ProjectSwitcher` "+"): si `!canCreateProject` → toast + redirect `/checkout?plan=pro`.
- `canGenerateArticle` : déjà branché dans `Answers.tsx` ; corriger le message quand `articlesLimit === null` (afficher "Unlimited" au lieu de "?").

### 6. CMS auto-publish gating
- `AeoIntegrations.tsx` : sur Starter, n'autoriser que WordPress + Shopify ; Pro/Agency = tous. Lire `features.allCms`.

### 7. White-label / Multi-client / Slack (Agency)
- Ajouter de simples checks `features.whiteLabel` / `features.multiClient` qui affichent un badge "Agency only" dans les zones concernées (export, sélecteur multi-projets > 3, footer support).

### 8. Migration légère (optionnelle, déjà OK)
- La table `subscriptions` existe déjà avec les bons champs. Pas de migration nécessaire.

## Fichiers touchés

- `src/lib/stripe-products.ts` (ajout features + helpers)
- `src/contexts/SubscriptionContext.tsx` (normalisation + features)
- `src/hooks/useSubscription.ts`, `src/hooks/useUsage.ts`
- `src/hooks/usePlanFeatures.ts` (nouveau)
- `src/views/AeoDashboard.tsx`, `AeoGeo.tsx`, `AutoSeo.tsx`, `AeoPlanning.tsx`, `AeoIntegrations.tsx`, `Answers.tsx`
- `src/components/local/LocalAnswersTab.tsx`, `src/components/layout/ProjectSwitcher.tsx`
- `supabase/functions/check-subscription/index.ts` (await unlock, features payload, -1→null)

## Résultat attendu

- Starter : 1 site, 10 articles/mois, CMS WP+Shopify seulement, planning verrouillé.
- Pro : 3 sites, 30 articles/mois, tous CMS, planning + competitor monitoring.
- Agency : 10 sites, articles illimités (plus de blocage `< -1`), white-label & multi-client visibles.
- Cadenas disparaissent immédiatement après checkout (unlock awaité côté edge function + UI conditionnée sur `subscribed`).
