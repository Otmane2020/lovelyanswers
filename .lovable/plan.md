# Plan — Refonte pricing, funnel & landing (v2)

## 1. Pricing — 3 tiers USD (Starter $49 / Pro $99 / Agency $199)

Création des produits + prix Stripe (mensuel + annuel, devise **USD**) via les Stripe tools :

| Plan | Mensuel | Annuel (équiv./mo) | Sites | Articles/mois |
|---|---|---|---|---|
| Starter | $49 | $39 ($468/an) | 1 | 10 |
| Pro ⭐ | $99 | $79 ($948/an) | 3 | 30 |
| Agency | $199 | $159 ($1908/an) | 10 | illimités |

- `src/lib/stripe-products.ts` réécrit avec les 3 tiers + nouveaux `price_id` Stripe.
- `src/views/Pricing.tsx` → 3 cartes (toggle mensuel/annuel, badge "Le plus populaire" sur Pro), features alignées sur le screenshot.
- Tous les prix affichés en `$` (USD) partout dans l'app (landing, pricing, checkout, billing, AeoSubscription).

## 2. Funnel — Stripe Elements embarqué + trial 3 jours CB requise

**Flow** : Landing → "Démarrer — 3 jours gratuits" → `/checkout?plan=pro&cycle=monthly` → signup (email + password) + Stripe Payment Element inline → trial 3 jours → email J-1 (auto via webhook `trial_will_end`) → débit auto J4 → annulable à tout moment depuis `/billing`.

**Backend** :
- `create-trial-subscription` (nouveau) : crée `customer` + `subscription` avec `trial_period_days: 3`, `payment_behavior: default_incomplete`, retourne `clientSecret` (SetupIntent) pour confirmer la CB sans débit.
- `stripe-webhook` refondu : écoute `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded/failed`, `customer.subscription.trial_will_end` → met à jour la table `subscriptions` + déclenche email.
- Email "trial ending" via **Lovable Emails** (template React Email `trial-ending`, déclenché par webhook).

**Frontend** :
- `bun add @stripe/stripe-js @stripe/react-stripe-js`.
- Nouveau `src/components/checkout/StripePaymentForm.tsx` (basé sur ton snippet, `PaymentElement`).
- `src/views/Checkout.tsx` refondu : signup + Stripe Elements + résumé plan sur une seule page.
- Clé publishable Stripe (`pk_live_...`) en dur dans le code (publique, OK).

## 3. Table `subscriptions` + enforcement limites

Nouvelle table :
```
subscriptions (id, user_id fk profiles, stripe_customer_id, stripe_subscription_id,
  plan ['starter'|'pro'|'agency'], cycle ['monthly'|'annual'],
  status ['trialing'|'active'|'past_due'|'canceled'],
  trial_end, current_period_end, sites_limit, articles_limit,
  cancel_at_period_end, created_at, updated_at)
```
+ RLS (user lit son row, service_role écrit via webhook) + trigger `updated_at`.

- `check-subscription` réécrit : lit depuis cette table, expose `plan`, `sites_limit`, `articles_limit` via `SubscriptionContext`.
- `useProjects` : bloque nouveau projet si `count >= sites_limit` + upsell.
- Génération d'articles : check `articles_limit` mensuel avant exécution.
- UI dashboard : badges "X/Y sites · X/Y articles ce mois".
- **Pas de migration** des anciens utilisateurs $29 (aucun client payant actuellement).

## 4. Landing page — 1 seul angle GEO Engine

`src/views/Index.tsx` réécrit :
- **Hero** : "Tape ton domaine. On te dit si ChatGPT te recommande. Sinon on te fait apparaître en 30 jours." + input domaine + CTA → `/tools/ai-visibility-checker`.
- **How it works** : 3 étapes (Scan → GEO Engine génère → ChatGPT te cite).
- **Stats** : 4.5x AI visibility, 9.7x mentions, +60% trafic — gardés.
- **Pricing teaser** 3 tiers → `/pricing`.
- **Bonus inclus** (section discrète) : AEO Answers, Shopping, Local, Planning.
- **FAQ + Footer**.

## 5. Témoignages & adresse

- **Retirer Mike / Amanda / Ryan** partout : `Index.tsx` (`socialProofPills`), `SocialProofToast`, `TrustedByMarquee`.
- **Remplacer par** :
  - 3 placeholders neutres : "500+ sites actifs", "4.9★ moyenne", "+60% trafic moyen".
  - 1 témoignage fondateur (Option 2) : **"J'ai utilisé AutoPilot GEO sur mes propres projets. Le blog drive maintenant 60 visites organiques/mois depuis Google avec zéro effort manuel." — Ben M., Fondateur, AutoPilot GEO**.
- **Adresse Manchester** : retirée **partout** (`PublicFooter`, `/privacy`, `/terms`, schema.org JSON-LD, `support` page, emails). Remplacée par simple mention **"AutoPilot Geo Ltd"** sans adresse physique. Email de contact `support@autopilotgeo.com` conservé.

## 6. Bonus — Email aux 17 utilisateurs dashboard (cette semaine)

Edge function one-shot `email-active-users-feedback` qui :
- Liste les 17 utilisateurs ayant un projet actif.
- Envoie via Lovable Emails un mail personnalisé : *"Hey — tu as utilisé AutoPilot GEO récemment. Est-ce que t'as eu des résultats, même petits ? J'aimerais mettre ton retour sur le site en échange d'un mois gratuit."*
- Bouton "Répondre" → ouvre mailto:support@autopilotgeo.com.
- Lancée manuellement (pas de cron), traçabilité dans `email_send_log`.

## Détails techniques

- **Stripe API** : `2025-08-27.basil`. Trial sans débit = `mode: 'subscription'` + `trial_period_days: 3` + `payment_settings.save_default_payment_method: 'on_subscription'`.
- **Email J-1** : Stripe envoie `customer.subscription.trial_will_end` ~72h avant la fin du trial. Notre webhook capte cet event et invoque `send-transactional-email` avec template `trial-ending`.
- **Annulation** : `cancel-subscription` existante conservée (`cancel_at_period_end=true`).
- **VIP emails** : logique conservée dans `check-subscription`, retourne désormais `plan: 'agency'` + limites max.
- **Email infra** : utilise Lovable Emails (déjà configuré, prérequis vérifié au moment de l'implémentation).

## Ordre d'exécution

1. Migration DB → table `subscriptions` + RLS.
2. Stripe : créer les 6 prices (3 plans × 2 cycles) en USD.
3. `stripe-products.ts` + `Pricing.tsx` + suppression `$29` partout.
4. Refonte `Checkout.tsx` + `StripePaymentForm.tsx` + `create-trial-subscription`.
5. `stripe-webhook` refondu + email `trial-ending` (scaffold Lovable Emails si besoin).
6. `check-subscription` lit depuis `subscriptions` + enforcement limites.
7. Refonte `Index.tsx` (landing GEO Engine).
8. Cleanup témoignages Mike/Amanda/Ryan + adresse Manchester.
9. Edge function `email-active-users-feedback` (bonus).
