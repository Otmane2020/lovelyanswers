# Audit + restauration de la logique métier (onboarding → contexte → génération 30 jours)

## Ce que l'audit a trouvé (vérifié dans le code et la base)

### Tableau des sources

| Source | Existe ? | Fonction(s) | Table | Utilisée aujourd'hui ? | Après correction |
|---|---|---|---|---|---|
| Scraping interne | Oui | `internal-scraper` (regex, 0 écriture DB) | — | Oui, mais résultat jeté (jamais stocké) | Utilisé comme fallback du scraping multi-pages, résultat stocké |
| Scraping Firecrawl | Oui | `firecrawl-scrape`, `firecrawl-scrape-fast` | — (0 écriture DB) | Partiellement (competitors UI, pré-remplissage) | Utilisé par l'orchestrateur, résultat stocké par page |
| Découverte de pages | Oui | `parse-sitemap`, `crawl-site-keywords` | `site_pages` | Oui mais uniquement manuellement (Settings) | Appelé automatiquement à l'onboarding |
| Pages scrapées | Table existe | — | `site_pages` (**0 ligne en base**, aucune colonne contenu) | Non | Remplie par page (+ colonnes contenu / type de page) |
| Analyse métier | Oui | `analyze-website` (IA, 0 écriture DB) | — | Oui (retour uniquement) | Persistée dans `generation_settings` |
| Keywords | Oui | `analyze-competitors` (seul à écrire), `keyword-research` (**n'enregistre rien**), `crawl-site-keywords` | `keywords` (594 lignes, **search_volume = 0 partout**) | Partiellement | Enrichissement DataForSEO réellement persisté |
| DataForSEO | Oui | `analyze-competitors`, `keyword-research`, `analyze-website`, `firecrawl-scrape`, `serp-first` (**jamais appelée**) | `keywords` | Très peu (déclenché seulement par `stripe-webhook`) | Pipeline unique branché sur l'onboarding |
| Competitors | Oui | `analyze-website`, `analyze-competitors` | `projects.competitors`, `generation_settings.competitors` | Oui | Conservé + injecté partout |
| Google Business | Oui | `gmb-oauth-*`, `gmb-fetch-business`, `gmb-publish-post` | `integrations`, `local_businesses` | Oui, mais **le gate Local AEO lit `local_businesses` alors que l'UI lit `integrations`** | Un seul gate cohérent |
| Shopping Feed | Oui | `parse-shopping-feed` | `shopping_feeds.feed_url` | Oui, mais **absent de la page Intégrations** | Exposé dans Intégrations |
| Produits | Oui | `generate-product-ai`, `publish-shopping-products` | `shopping_products` | Oui | Conservé + fallback |
| Description projet | Oui | — | `projects`, `generation_settings` | Oui | Source du contexte central |

### Problèmes principaux confirmés

1. **Le scraping ne laisse aucune trace.** `internal-scraper`, `analyze-website`, `firecrawl-scrape` ne font aucun `insert`. `site_pages` est vide et n'a même pas de colonne de contenu. Toute la richesse métier est perdue après l'onboarding.
2. **DataForSEO est quasiment inactif.** Seul `analyze-competitors` persiste des keywords, et il n'est déclenché que par le webhook Stripe. `keyword-research` appelle DataForSEO puis jette le résultat. `serp-first` n'est appelée nulle part.
3. **Trois calendriers concurrents.** `daily-planning-fill` (piste AEO), `generate-30-gso-contents` (rotation 1 type/jour), `daily-content-rotation` (GEO seul). C'est l'origine de l'alternance non voulue.
4. **La rotation actuelle est bien "1 type par jour"** (`CONTENT_TYPES[dayOffset % 5]`) — contraire à la logique produit demandée.
5. **Keywords / competitors peu présents dans les prompts** : `generate-local-answer` et `generate-product-ai` n'en utilisent aucun ; `generate-articles` reçoit un simple tableau de chaînes.
6. `generate-strategic-articles` est un fichier **vide** (0 octet).

## Ce que je vais faire

### A. Base de données (migration unique, aucune table recréée)
- `site_pages` : ajout de `page_type`, `content`, `headings`, `word_count`, `lang`, `scraped_at`.
- `keywords` : ajout de `cpc`, `serp_domains`, `source` (dataforseo / crawl / ai), `cluster`, `question` pour distinguer les questions des keywords.
- Table `project_context` (1 ligne par projet) : snapshot JSON du contexte métier consolidé + `refreshed_at`.
- Table `content_topics` : sujets déjà traités par type (`geo` / `seo` / `aeo` / `local_aeo` / `shopping`) pour empêcher les doublons entre calendriers.

### B. Scraping multi-pages (réutilisation, aucun nouveau scraper)
Nouvelle fonction d'orchestration `scrape-site-pages` qui **appelle l'existant** :
`parse-sitemap` (découverte) → sinon `crawl-site-keywords`/Firecrawl map → puis `firecrawl-scrape` par page → fallback `internal-scraper`.
Classement automatique des pages (home / about / services / products / category / faq / contact / blog) et écriture **une ligne par page** dans `site_pages` liée au `project_id`.

### C. Contexte central partagé
Module `supabase/functions/_shared/project-context.ts` + fonction `build-project-context` :
business, description, secteur, services, produits, pages scrapées, keywords (sélectionnés), DataForSEO, questions, competitors, Google Business, shopping feed.
Écrit dans `project_context`, lu par **toutes** les fonctions de génération (import partagé, prompts inchangés dans leur spécialisation).

### D. Reconnexion DataForSEO
Un seul pipeline : `keyword-research` devient persistante (écrit volumes, CPC, intents, related keywords, questions et SERP dans `keywords`), `analyze-competitors` reste la source competitors→keywords, `serp-first` est branchée pour les SERP competitors. Appelé depuis l'onboarding après paiement (et conservé dans `stripe-webhook`, sans double exécution grâce au garde existant).

### E. Onboarding orchestrateur
`src/views/Onboarding.tsx` enchaîne, après paiement : création projet → vérif abonnement → `scrape-site-pages` → `analyze-website` (persisté) → `analyze-competitors` → `keyword-research` → `build-project-context` → création du planning 30 jours → génération.
Chaque étape est non bloquante : un échec passe au fallback et l'onboarding continue.

### F. Planning 30 jours — tous les types chaque jour
- `generate-30-gso-contents` : suppression du `CONTENT_TYPES[dayOffset % n]`. Chaque jour planifie **GEO + SEO + AEO + Local AEO (si GMB) + Shopping**.
- La rotation porte sur sujets / angles / keywords / questions / produits / services / competitors, via `content_topics` (anti-doublon par type).
- `daily-content-rotation` est neutralisée (redirigée vers le calendrier unique) ; `daily-planning-fill` ne garde que le rattrapage des jours manquants ; `check-planning-completeness` vérifie les 5 pistes.
- Gate Local AEO unifié : `integrations` (GMB) **ou** `local_businesses`.

### G. Shopping
Architecture conservée (`parse-shopping-feed`, `fill-shopping-planning`, `generate-product-ai`, `publish-shopping-products`). Ajout du champ **Google Shopping Feed URL** dans `src/views/AeoIntegrations.tsx` (lit/écrit `shopping_feeds.feed_url`, bouton Importer). Si feed → import ; si aucun produit → fallback contenu Shopping générique ; Shopping ne bloque jamais la journée.

### H. Fallbacks systématiques
Pas de DataForSEO → keywords existants. Pas de competitors → on continue. Pas de GMB → seul Local AEO est désactivé. Pas de produits → fallback Shopping. Scraping partiel → pages disponibles. Aucune génération n'échoue à cause d'une source manquante.

### I. Rapport final
Rapport livré à la fin : par composant (retrouvé / réutilisé / corrigé / amélioré / créé) + tableau par Edge Function (inputs actuels → nouveaux inputs, tables lues, données utilisées, prompt) + schéma complet du pipeline.

## Détails techniques

- Fonctions **conservées telles quelles** dans leur spécialisation : `generate-geo-content`, `generate-articles`, `generate-aeo-answers`, `generate-aeo-article`, `generate-local-answer`, `generate-product-ai`. Elles reçoivent en plus le contexte partagé + une sélection intelligente de keywords (par intent : transactional pour Shopping/SEO, questions pour AEO, geo-modifiés pour Local).
- Nouvelles fonctions créées : `scrape-site-pages` et `build-project-context` uniquement (orchestrateurs, pas de scraper ni de générateur nouveau).
- `generate-strategic-articles` (fichier vide) : supprimé de la config.
- Tout reste sur les modèles gratuits OpenRouter avec la chaîne de fallback actuelle.
