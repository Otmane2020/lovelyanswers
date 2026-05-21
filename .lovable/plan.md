
# Meta Ads — Vrai gestionnaire complet (token système enrichi)

On garde `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID` mais on construit l'équivalent fonctionnel de Facebook Ads Manager : hiérarchie complète, ROAS, Conversions API serveur, audiences custom/lookalike, optimisation IA automatique, et triple méthode d'installation du pixel.

## 1. Base de données (migration)

Nouvelles tables :

- `meta_adsets` (existante → enrichir) : `targeting jsonb` (geo, age_min/max, genders, interests[], custom_audiences[], lookalike_audiences[]), `optimization_goal`, `billing_event`, `bid_amount`, `daily_budget`, `start_time/end_time`, métriques (spend, impressions, clicks, conversions, cpa, roas).
- `meta_ads` (existante → enrichir) : `creative jsonb` (image_hash, video_id, title, body, cta_type, link_url), `preview_url`, métriques.
- `meta_creatives` : `id`, `project_id`, `image_hash` ou `video_id`, `media_url` (Supabase Storage), `media_type` (image/video), `title`, `body`, `cta_type`, `link_url`.
- `meta_audiences` : `id`, `project_id`, `audience_id`, `name`, `type` (CUSTOM, LOOKALIKE, WEBSITE), `subtype`, `approximate_count`, `source_audience_id` (pour lookalike), `rule jsonb`.
- `meta_conversions_events` : `id`, `project_id`, `pixel_id`, `event_name` (Purchase, Lead, AddToCart, ViewContent), `event_time`, `event_id`, `user_data jsonb` (hashed email/phone/ip/ua), `custom_data jsonb` (value, currency, content_ids), `sent_at`, `response jsonb`.
- `meta_roas_snapshots` : daily snapshot par campagne/adset (spend, revenue, roas, cpa) pour graphique 30j.
- `meta_optimization_runs` : `id`, `project_id`, `ran_at`, `actions jsonb` (pause/budget changes appliqués), `dry_run bool`.
- `meta_pixels` (existante) : ajouter `gtm_pushed bool`, `lovable_injected bool`.

Storage bucket `meta-creatives` (public) pour images/vidéos uploadées.

## 2. Edge functions

| Function | Rôle |
|---|---|
| `meta-ads-sync` (existante → étendre) | Sync campaigns + adsets + ads + insights par niveau, snapshot ROAS quotidien |
| `meta-adset-create` | POST `/{ad_account}/adsets` avec targeting JSON complet (geo/age/interests/CA/LAL) |
| `meta-ad-create` | Upload créative (image: `/{ad_account}/adimages`, vidéo: `/{ad_account}/advideos`) → crée `adcreative` → crée `ad` |
| `meta-ad-preview` | `GET /{ad_id}/previews?ad_format=DESKTOP_FEED_STANDARD` retourne HTML preview |
| `meta-audience-create` | Custom audience (WEBSITE/CUSTOMER_FILE) via `/{ad_account}/customaudiences` |
| `meta-audience-lookalike` | Lookalike depuis source audience (`/customaudiences` avec `subtype: LOOKALIKE`, `lookalike_spec`) |
| `meta-interest-search` | Autocomplete `/search?type=adinterest&q=` |
| `meta-conversions-api` | POST server-side `/{pixel_id}/events` avec hashing SHA256 (email/phone/ip), supporte event_id pour dédup avec pixel client |
| `meta-ads-optimize` (cron quotidien) | Analyse ROAS/CPA, pause ads avec ROAS<seuil et >100$ dépensés sans conv, réalloue budget des perdants vers gagnants. Mode dry_run/auto. |
| `meta-pixel-gtm-push` | Push tag GTM via API Tag Manager (réutilise GMB OAuth) |
| `meta-pixel-lovable-inject` | Marque le pixel pour injection auto dans `index.html` du projet Lovable |

## 3. UI — `src/views/SuperAdminMetaAds.tsx` (refonte complète)

Onglets enrichis :

- **Overview** : KPIs (Spend, Revenue, ROAS global, CPA moyen, conv), graphique 30j (ligne ROAS + barres spend), top 3 campagnes / bottom 3.
- **Campagnes** : table existante + drill-down → onglet Ad Sets de cette campagne.
- **Ad Sets** : table par campagne + dialog création (geo multi-pays autocomplete, slider âge, recherche d'intérêts debounced via `meta-interest-search`, sélection audiences custom/lookalike, optimization_goal, bid).
- **Ads** : grille de cards avec preview iframe Facebook, upload image/vidéo (drag-drop → bucket `meta-creatives` → hash Meta), formulaire title/body/CTA/URL, toggle status.
- **Audiences** : liste custom/lookalike avec compteur, dialog "Create Custom" (visiteurs site 30/60/90j via pixel) et "Create Lookalike" (source + pays + % 1-10 slider).
- **Pixel & Tracking** : 3 méthodes affichées (snippet copy / "Push to GTM" si GTM connecté / "Install on Lovable site" toggle), badge GA4, **Conversions API tester** (form pour envoyer un test Purchase event).
- **AI Optimizer** : panneau avec "Dry run" / "Apply now", historique des runs (actions appliquées), réglage seuils ROAS min / spend min / lookback days, planificateur cron on/off.
- **Reports** : ROAS par campagne sur 7/30/90j, export CSV.

Composants extraits sous `src/components/admin/meta-ads/` :
`OverviewTab.tsx`, `CampaignsTab.tsx`, `AdSetsTab.tsx`, `AdsTab.tsx`, `AudiencesTab.tsx`, `PixelTab.tsx`, `AIOptimizerTab.tsx`, `ReportsTab.tsx`, dialogs (`CreateAdSetDialog`, `CreateAdDialog`, `CreateAudienceDialog`, `CreateLookalikeDialog`, `TestConversionDialog`).

## 4. Cron & automatisation

- `pg_cron` daily 03:00 UTC → `meta-ads-sync` pour tous les projets avec compte connecté.
- `pg_cron` daily 04:00 UTC → `meta-ads-optimize` en mode `dry_run` par défaut (toggle `auto_apply` dans `meta_optimization_settings`).

## 5. Hors-scope v1

- Multi-comptes par projet (un seul `META_AD_ACCOUNT_ID` global pour l'instant).
- Catalog/DPA (Dynamic Product Ads).
- A/B split testing automatique des créatives.

## Notes techniques

- Tous les budgets/spend en **minor units** (cents) → diviser/multiplier par 100 dans l'UI.
- Conversions API : hasher email/phone en SHA-256 lowercase trim, `action_source: "website"`, et utiliser un `event_id` partagé avec le pixel pour la déduplication.
- Upload image : Meta exige multipart `source=@file`. On envoie depuis l'edge function en `FormData` après lecture du fichier depuis le bucket Supabase.
- Lookalike : `lookalike_spec: { country, ratio: 0.01-0.10, type: "similarity" }`.
- Pixel Lovable injection : ajoute le snippet dans `index.html` au build via un fichier `public/meta-pixel.html` lu par `next.config.mjs` ou via un composant `<MetaPixel projectId={pixel_id} />` monté dans `app/layout.tsx` quand `lovable_managed_pixels` contient une row pour le projet.
- IA optimizer : Gemini 2.5 Flash (déjà en place) recevra les snapshots ROAS 14j + règles + budgets, retournera `{ actions: [{ kind: "pause_ad"|"increase_budget"|"decrease_budget", target_id, amount, reason }] }` via tool calling.

Prêt à implémenter dès validation. La migration et les ~10 edge functions seront ajoutées d'un coup, puis la refonte UI par onglets.
