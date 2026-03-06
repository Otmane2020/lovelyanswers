

## Diagnostic: Pourquoi les sites Lovable manquent de visibilité

L'analyse externe que tu as reçue identifie un vrai problème : **les sites Lovable sont des SPA React** (Single Page Application). Quand Google ou un bot AI crawle la page, il voit uniquement le HTML statique de `index.html` — soit un `<div id="root"></div>` vide. Le contenu est rendu en JavaScript côté client.

**Cependant, le diagnostic est partiellement exagéré :**
- Googlebot exécute JavaScript depuis 2019 et indexe les SPA (avec un délai)
- Ton `index.html` contient déjà des meta tags, structured data, et OG tags correctement configurés
- Tu as un sitemap dynamique et un `robots.txt` complet
- `react-helmet-async` injecte les meta tags par page côté client

**Le vrai problème n'est pas que Google ne voit RIEN — c'est qu'il voit le contenu avec retard et moins de fiabilité qu'un site SSR.**

---

## Plan d'action : Pre-rendering des pages publiques

La solution la plus efficace dans les contraintes Lovable (pas de Next.js, pas de contrôle serveur) est de créer une **edge function de pre-rendering** qui sert du HTML complet aux crawlers.

### 1. Créer une edge function `prerender`

Une edge function qui :
- Détecte les user-agents des bots (Googlebot, GPTBot, ClaudeBot, Bingbot, etc.)
- Pour les pages publiques (`/`, `/blog`, `/blog/:slug`, `/pricing`, `/about`), génère un HTML complet avec le contenu réel tiré de la base de données
- Pour `/blog/:slug` : requête la table `answers` ou `published_articles`, injecte le titre, la description, le contenu, et le structured data directement dans le HTML
- Pour `/` et `/pricing` : sert une version statique HTML avec tout le contenu textuel important

### 2. Alternative plus simple et immédiate : enrichir `index.html` avec un `<noscript>` fallback

Ajouter du contenu HTML visible en `<noscript>` dans `index.html` pour que les crawlers qui n'exécutent pas JS aient quand même du contenu. C'est limité mais gratuit.

### 3. Utiliser un service externe de pre-rendering (Prerender.io)

Si tu as accès au DNS/CDN, configurer Prerender.io pour intercepter les requêtes des bots et servir du HTML pré-rendu. Coût : ~$15/mois.

---

## Recommandation pragmatique

Étant donné les contraintes de Lovable (pas de contrôle serveur, pas de middleware), voici ce qu'on peut faire **maintenant** :

1. **Créer une edge function `get-public-page`** qui retourne le HTML complet d'une page blog pour les crawlers — utilisable comme URL alternative dans le sitemap
2. **Enrichir le sitemap** pour pointer vers ces URLs pre-rendues
3. **Ajouter du contenu `<noscript>`** dans `index.html` avec les mots-clés et liens principaux
4. **Optimiser les meta tags** déjà présents dans `index.html` pour inclure plus de contenu textuel que les crawlers peuvent lire sans JS

### Limitations

- Lovable ne permet pas de contrôler le serveur/CDN, donc on ne peut pas faire de vrai SSR ou middleware de pre-rendering
- La solution la plus robuste reste une migration du blog vers un outil SSR (Ghost, Hashnode, ou Next.js sur un sous-domaine)

Veux-tu que je procède avec les optimisations réalisables dans Lovable (noscript, meta tags enrichis, edge function de pre-rendering pour le blog) ?

