# Restauration de la logique métier — onboarding backend, contexte central, planning 30 jours

## Audit (vérifié dans le code et la base)

### Tableau des sources

| Source | Existe ? | Fonction(s) | Table | Utilisée aujourd'hui ? | Après correction |
|---|---|---|---|---|---|
| Scraping interne | Oui | `internal-scraper` (regex, 0 écriture DB) | — | Oui, résultat jeté | Fallback du scraping multi-pages, résultat stocké |
| Scraping Firecrawl | Oui | `firecrawl-scrape`, `firecrawl-scrape-fast` | — (0 écriture DB) | Partiellement | Appelé par l'orchestrateur, stocké par page |
| Découverte de pages | Oui | `parse-sitemap`, `crawl-site-keywords` | `site_pages` | Manuellement (Settings) | Automatique dans l'orchestrateur |
| Pages scrapées | Table existe | — | `site_pages` (**0 ligne**, pas de colonne contenu) | Non | Pages **stratégiques** uniquement, upsert |
| Analyse métier | Oui | `analyze-website` (IA, 0 écriture DB) | — | Oui (retour seulement) | Persistée dans `generation_settings` |
| Keywords | Oui | `analyze-competitors` (seul à écrire), `keyword-research` (**n'enregistre rien**), `crawl-site-keywords` | `keywords` (594 lignes, **search_volume = 0 partout**) | Partiellement | Enrichissement DataForSEO persisté |
| DataForSEO | Oui | `analyze-competitors`, `keyword-research`, `analyze-website`, `firecrawl-scrape`, `serp-first` (**jamais appelée**) | `keywords` | Très peu (via `stripe-webhook`) | Pipeline unique, appels limités aux keywords prioritaires |
| Competitors | Oui | `analyze-website`, `analyze-competitors` | `projects.competitors`, `generation_settings.competitors` | Oui | Conservé + injecté partout |
| Google Business | Oui | `gmb-oauth-*`, `gmb-fetch-business`, `gmb-publish-post` | `integrations`, `local_businesses` | Oui, mais **gate Local AEO sur `local_businesses` alors que l'UI lit `integrations`** | Gate unifié |
| Shopping Feed | Oui | `parse-shopping-feed` | `shopping_feeds.feed_url` | Oui mais **absent de la page Intégrations** | Exposé dans Intégrations |
| Produits | Oui | `generate-product-ai`, `publish-shopping-products` | `shopping_products` | Oui | Chaîne conservée intacte |
| Description projet | Oui | — | `projects`, `generation_settings` | Oui | Source du contexte |

### Problèmes confirmés
1. Le scraping ne laisse **aucune trace** en base ; `site_pages` est vide et n'a pas de colonne contenu.
2. DataForSEO quasi inactif : `keyword-research` appelle l'API puis jette le résultat ; `serp-first` n'est jamais appelée.
3. **Trois calendriers concurrents** : `daily-planning-fill` (AEO), `generate-30-gso-contents` (1 type/jour), `daily-content-rotation` (GEO).
4. Rotation actuelle `CONTENT_TYPES[dayOffset % 5]` = 1 seul type par jour — contraire à la logique produit.
5. `generate-local-answer` et `generate-product-ai` n'utilisent **ni keywords ni competitors**.
6. `generate-strategic-articles` est un fichier **vide (0 octet)**.
7. Séparation planning/génération **déjà existante** et réutilisable : `generate-30-days-content` accepte `titlesOnly: true` (crée les slots sans générer le contenu) — c'est le mécanisme historique à réutiliser.

## Architecture corrigée

### 1. Orchestrateur backend (le frontend ne pilote plus rien)
Aucune fonction d'orchestration onboarding n'existe aujourd'hui → création d'**une seule** fonction `onboarding-pipeline` (orchestrateur pur : elle n'embarque ni scraper ni générateur, elle appelle l'existant).

Le frontend (`Onboarding.tsx`, `AeoWizard.tsx`) se limite à : créer/récupérer le projet → appeler `onboarding-pipeline` → poller le statut et afficher la progression.

**Idempotence** : chaque étape vérifie son résultat en base avant de s'exécuter (pages < 24h → skip scraping ; keywords déjà enrichis → skip DataForSEO ; competitors présents → skip ; planning déjà créé pour la période → skip ; contenus existants → skip). Un verrou `onboarding_status` + `onboarding_updated_at` empêche deux exécutions concurrentes.

### 2. État d'onboarding (réutilisation des colonnes existantes)
Existant : `projects.needs_onboarding`, `generation_settings.onboarding_completed` — conservés, pas de doublon.
Ajout sur `projects` : `onboarding_status` (pending / scraping / analysing_business / researching_keywords / analysing_competitors / building_context / planning / generating / completed / partial / failed), `onboarding_progress` (0-100), `onboarding_last_error`, `onboarding_updated_at`.
Le frontend affiche les libellés correspondants ("Analyse du site…", "Recherche des mots-clés…", …).

### 3. Generation readiness (non bloquant ≠ on ignore)
Obligatoire : projet + (`brand_name` ou `domain`) + description/activité + **au moins une source de contexte réelle** (contenu scrapé OU analyse `analyze-website` OU description saisie par l'utilisateur).
Facultatif (fallback silencieux) : DataForSEO, competitors, GMB, shopping.
Si le minimum n'est pas atteint : **aucune génération**, statut `partial` ou `failed`, message clair côté UI, retry automatique par le cron de rattrapage.

### 4. `project_context` = cache, jamais source de vérité
Snapshot consolidé pour les générations, avec `context_version` et `refreshed_at`. Sources de vérité inchangées (`projects`, `site_pages`, `keywords`, `local_businesses`, `shopping_products`, `shopping_feeds`, `generation_settings`).
Refresh déclenché par : nouveau scraping, nouveaux keywords, nouveaux competitors, connexion GMB, nouveau feed Shopping, modification de l'activité, ou snapshot périmé (> 7 jours). Si le snapshot est absent/périmé, le builder relit les sources.

### 5. `site_pages` — pages stratégiques uniquement
Ajout des colonnes `page_type`, `normalized_url`, `content`, `headings`, `word_count`, `lang`, `scraped_at`.
Sélection priorisée : home, about, services, catégories, produits importants, FAQ, contact, puis quelques pages éditoriales (plafond configurable, ~25-40 pages). **Upsert** sur `(project_id, normalized_url)`, jamais d'insert aveugle.

### 6. DataForSEO — enrichissement contrôlé
`keyword-research` devient persistante : volumes, CPC, intent, related keywords, questions → `keywords`.
SERP / competitors uniquement sur les **keywords prioritaires** (top N par volume × pertinence). Résultats conservés en base et réutilisés ; pas de ré-appel si les données sont fraîches.

### 7. `content_topics` — anti-duplication réelle
Colonnes : `project_id`, `content_type`, `topic`, `primary_keyword`, `angle`, `topic_fingerprint` (hash normalisé : minuscules, stop-words retirés, tokens triés), `scheduled_date`, `content_id`, `status`.
Avant planification : rejet si fingerprint identique ou chevauchement de tokens élevé sur une fenêtre récente — pas de simple comparaison de titres.

### 8. Planning ≠ génération
- **Planification immédiate** des 30 jours × 5 types (GEO, SEO, AEO, Local AEO si disponible, Shopping) via le mode `titlesOnly` historique : sujets, angles, keywords et dates créés d'un coup, sans appel IA lourd.
- **Génération progressive** par batch contrôlé (cron quotidien + rattrapage), avec une avance garantie de plusieurs jours pour que l'utilisateur ait toujours ses contenus à temps.

### 9. Robustesse des modèles gratuits
Sur tout le pipeline : retry, chaîne de fallback OpenRouter (max 3 modèles), timeout, parsing robuste, détection de sortie vide. Un échec ou une sortie vide ne marque **jamais** un contenu comme généré ; l'élément repasse en file de retry avec log.

### 10-11. Les fonctions de génération lisent réellement le contexte, prompts spécialisés
`generate-geo-content`, `generate-articles`, `generate-aeo-answers`, `generate-aeo-article`, `generate-local-answer`, `generate-product-ai` reçoivent et **impriment explicitement** dans leur prompt les blocs : BUSINESS CONTEXT, WEBSITE CONTEXT, TARGET KEYWORDS, SEARCH INTENT, COMPETITOR INSIGHTS, QUESTIONS, LOCATION (si pertinent), PRODUCT DATA (si pertinent).
Sélection différenciée : GEO (entités, factuel, citations) · SEO (intent, primary/secondary keywords, H1/H2/H3, meta, maillage) · AEO (question précise, réponse directe extractible) · Local AEO (question + localisation réelle + services + données GMB) · Shopping (produit, catégorie, caractéristiques, bénéfices, intent transactionnel). Les prompts restent distincts, seul le contexte est partagé.

### 12. Shopping — chaîne intacte
`shopping_feeds` → `parse-shopping-feed` → `shopping_products` → `generate-product-ai` → `shopping_planning` → publication. `shopping_planning` **n'est pas** remplacé par le planning éditorial ; les deux sont coordonnés par date. Ajout du champ Google Shopping Feed URL dans `AeoIntegrations.tsx`. Sans produit : fallback contenu Shopping éditorial / guide d'achat.

### 13. Architecture cron finale
- **A. Prépare les 30 jours** : `onboarding-pipeline` (initial) + `check-planning-completeness` (maintien de l'avance).
- **B. Génère les contenus manquants** : `daily-planning-fill` (batch quotidien, tous types).
- **C. Maintient 30 jours d'avance** : `check-planning-completeness`.
- **D. Publie** : `publish-scheduled-answers`, `publish-geo-content`, `publish-shopping-products`, `cms-publish`.
- **E. Retry** : file de retry portée par le statut des slots, relancée par `daily-planning-fill`.
`daily-content-rotation` sera neutralisé **uniquement après vérification** qu'aucune autre fonctionnalité ne l'utilise. `generate-30-gso-contents` est conservé comme planificateur (rotation par sujet, plus par type).

### 14. Tests obligatoires
Création d'un projet test avec un vrai domaine, exécution complète du pipeline, puis vérification : pages trouvées / stockées, business détecté, services, competitors, keywords, volumes DataForSEO, questions, `project_context`, 30 jours de planning. Puis une génération réelle par type (GEO, SEO, AEO, Local AEO si possible, Shopping) avec, pour chacune : INPUT CONTEXT, KEYWORD CIBLE, ANGLE, OUTPUT, TABLE D'ÉCRITURE.

### 15. Compte rendu final
Fonctionnalités retrouvées / réutilisées, bugs corrigés, orchestration créée, tables et colonnes modifiées, edge functions modifiées, crons conservés et désactivés, résultat de l'onboarding réel et des générations test, plus le schéma final du pipeline.

## Détails techniques

- **Migration unique** : colonnes `projects` (statut onboarding), colonnes `site_pages`, colonnes `keywords` (`cpc`, `serp_domains`, `source`, `cluster`, `is_question`), tables `project_context` et `content_topics` (avec GRANT + RLS scopées au propriétaire du projet).
- **Nouvelles fonctions** : `onboarding-pipeline` (orchestrateur idempotent) et `scrape-site-pages` (orchestrateur de scraping réutilisant `parse-sitemap` / `firecrawl-scrape` / `internal-scraper`). Aucun nouveau scraper ni générateur.
- **Module partagé** : `supabase/functions/_shared/project-context.ts` (build + read du snapshot, sélection de keywords par type).
- `generate-strategic-articles` (fichier vide) retiré de la config.
- Modèles OpenRouter gratuits et chaîne de fallback actuelle inchangés.
