

## Probleme identifie

`service-client@sweetdeco.com` a bien un abonnement actif (confirme par les logs backend), mais ses 28+ articles restent en statut `locked` avec du contenu vide. C'est un probleme structurel : quand un utilisateur s'inscrit, les articles sont crees en mode "titres seulement" (statut `locked`). Apres le paiement, **aucun mecanisme ne declenche la generation du contenu complet**.

## Solution

Ajouter un mecanisme automatique de deblocage des articles apres le paiement, en deux volets :

### 1. Webhook Stripe : declencher la generation apres paiement

Quand le webhook recoit un evenement `customer.subscription.created` ou `customer.subscription.updated` avec un statut `active`, il recherchera les articles `locked` de l'utilisateur et appellera la fonction `generate-aeo-article` pour chacun (ou une nouvelle fonction batch).

### 2. Frontend : bouton "Generer le contenu" pour les abonnes

Sur le dashboard, quand l'utilisateur est abonne mais a encore des articles `locked`, afficher un bouton "Generer tous les articles" qui lance la generation en batch.

### 3. Correction immediate pour sweetdeco

En attendant le deploiement, mettre a jour directement le statut des articles locks vers `scheduled` et declencher la generation de contenu.

---

## Details techniques

### Modification 1 : `supabase/functions/stripe-webhook/index.ts`

Dans `handleSubscriptionUpdate`, apres la mise a jour des credits, ajouter un appel pour debloquer les articles :

```text
1. Trouver le project actif de l'utilisateur
2. Recuperer tous les articles avec status = 'locked' pour ce projet
3. Pour chaque article, appeler generate-aeo-article ou mettre le statut a 'scheduled'
4. Logger le nombre d'articles debloques
```

### Modification 2 : `src/pages/AeoDashboard.tsx`

Quand `subscribed === true` ET qu'il reste des articles `locked` :
- Afficher un bouton "Generer le contenu complet"
- Au clic, appeler un endpoint qui lance la generation batch
- Afficher une barre de progression

### Modification 3 : Nouvelle fonction `supabase/functions/unlock-articles/index.ts`

Fonction dediee qui :
1. Verifie l'abonnement actif
2. Recupere tous les articles `locked` du projet
3. Pour chaque article, genere le contenu complet via l'IA (OpenRouter/Gemini)
4. Met a jour le statut de `locked` vers `scheduled`
5. Retourne le nombre d'articles traites

### Modification 4 : `supabase/functions/check-subscription/index.ts`

Ajouter un champ `has_locked_content: true/false` dans la reponse pour que le frontend sache s'il faut proposer la generation.

