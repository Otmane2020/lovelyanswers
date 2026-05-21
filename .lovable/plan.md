
## Objectif

1. **Synchroniser maintenant** le compte Meta connecté: pull account, pixels existants, campagnes, ad sets, ads, audiences custom — pour que le dashboard se remplisse avec ce qui existe déjà côté Meta.
2. **Refaire le créateur d'Ad** pour qu'il ressemble au vrai Facebook Ads Manager (panneau Edit + Preview live), inspiré des repos cités (basil79/ads-manager, oliverames/meta-mcp-server, corals-advert, fb-billing-bookmarklet).

---

## 1. Sync complet du compte existant

### a) Enrichir `meta-ads-sync` (edge function existante)
- Ajouter pull des **Pixels** depuis `/{adAccountId}/adspixels?fields=id,name,code,last_fired_time` → upsert dans `meta_pixels` (+ générer `code_snippet` automatiquement si manquant).
- Ajouter pull des **Custom Audiences** depuis `/{adAccountId}/customaudiences?fields=id,name,subtype,approximate_count_lower_bound,rule,description` → upsert dans `meta_audiences`.
- Ajouter pull de la **Facebook Page** liée depuis `/{adAccountId}/promote_pages` → stocker `page_id` + `page_name` sur `meta_ad_accounts` (utilisé pour création d'ads).
- Pull **Conversions API access token status** (si pixel a `is_capi_enabled`).
- Pull insights niveau Ad avec **breakdown placement + age** pour Reports.

### b) Bouton "Sync now" déjà présent dans `SuperAdminMetaAds.tsx`
- Étendre le toast pour afficher: `X campaigns • Y adsets • Z ads • P pixels • A audiences`.
- Ajouter un sous-bouton "Sync insights only" (rapide, juste re-pull les métriques 30j sans toucher la structure).

### c) Migration
- Ajouter colonnes manquantes: `meta_ad_accounts.page_id`, `meta_ad_accounts.page_name`, `meta_pixels.is_capi_enabled`, `meta_pixels.last_fired_at`.

---

## 2. Créateur d'Ad type Facebook Ads Manager

Refonte complète de `AdsTab.tsx` + nouveau composant `AdComposer.tsx` (split-screen comme Ads Manager).

### Layout (inspiré basil79/ads-manager + Meta Ads Manager officiel)

```text
┌─────────────────────────────────────────────────────────────┐
│  New Ad — [Ad Set selector ▼]              [Cancel] [Publish]│
├──────────────────────────┬──────────────────────────────────┤
│ LEFT — Edit panel        │ RIGHT — Live Preview              │
│                          │                                   │
│ Identity                 │  [Placement selector ▼]           │
│  • Facebook Page ▼       │   Facebook Feed / Story / Reels   │
│  • Instagram account ▼   │   Instagram Feed / Story / Reels  │
│                          │                                   │
│ Format                   │   ┌─────────────────────┐         │
│  ◉ Single image/video    │   │  [Page] Sponsored   │         │
│  ○ Carousel (2-10 cards) │   │  Primary text...    │         │
│  ○ Collection            │   │  ┌───────────────┐  │         │
│                          │   │  │   MEDIA       │  │         │
│ Media (drag&drop zone)   │   │  │   16:9 / 1:1  │  │         │
│  [Upload / library]      │   │  └───────────────┘  │         │
│                          │   │  Headline           │         │
│ Primary text (5 variants)│   │  Description domain │         │
│ Headline (5 variants)    │   │  [   CTA Button  ]  │         │
│ Description              │   └─────────────────────┘         │
│ Website URL + UTM builder│                                   │
│ Display link             │                                   │
│ CTA ▼                    │                                   │
│ Pixel + events tracked   │                                   │
│ URL parameters           │                                   │
└──────────────────────────┴──────────────────────────────────┘
```

### Composants à créer sous `src/components/admin/meta-ads/composer/`
- `AdComposer.tsx` — shell split-screen, gère form state + submit.
- `IdentitySection.tsx` — sélection Page FB + compte IG (chargés depuis `meta_ad_accounts.page_id` et API `/me/instagram_accounts`).
- `FormatSection.tsx` — toggle Single / Carousel / Collection.
- `MediaUploader.tsx` — drag&drop multi-fichier vers bucket `meta-creatives`, recadrage 1:1 / 4:5 / 9:16 / 16:9 preview, thumbnail grid pour carousel.
- `PrimaryTextSection.tsx` — jusqu'à 5 variantes (Meta Dynamic Creative).
- `HeadlineSection.tsx` — jusqu'à 5 variantes.
- `DestinationSection.tsx` — URL + UTM builder (source/medium/campaign/content) + display link + deep link.
- `CTASection.tsx` — full enum CTA Meta.
- `TrackingSection.tsx` — pixel select + events à tracker (Purchase/Lead/AddToCart/ViewContent).
- `AdPreview.tsx` — composant central qui rend l'aperçu pour 6 placements (Facebook Feed, FB Story, FB Reels, IG Feed, IG Story, IG Reels) avec switcher en haut. Rendu fidèle: avatar Page, nom, "Sponsorisé", texte, média responsive, headline, domaine, bouton CTA.
- `CarouselCardsEditor.tsx` — 2-10 cards (média + headline + description + link par card).

### Edge functions
- **Refactor `meta-ad-create`** pour gérer:
  - Format `single`: existant (image_hash / video_id).
  - Format `carousel`: `link_data.child_attachments[]` avec `image_hash`, `name`, `description`, `link`, `call_to_action` par card.
  - Multi-variantes texte: `asset_feed_spec` (Dynamic Creative).
  - Instagram identity (`instagram_actor_id`).
  - URL tags (`url_tags=utm_source=...`).
- **Nouveau `meta-ad-preview`** qui appelle `/{adAccountId}/generatepreviews?ad_format=DESKTOP_FEED_STANDARD|MOBILE_FEED_STANDARD|INSTAGRAM_STANDARD|INSTAGRAM_STORY|FACEBOOK_STORY_MOBILE|INSTAGRAM_REELS` et renvoie l'iframe HTML pour preview officielle Meta. Fallback: rendu custom React si quota dépassé.
- **Nouveau `meta-ig-accounts-list`** pour lister les comptes Instagram liés à la Page.

### UX details (façon Ads Manager)
- Sauvegarde brouillon auto dans `meta_ads` avec `status='DRAFT'` (table existante).
- Validation inline (longueur texte, ratio image, taille vidéo).
- Compteur caractères primary text (125 reco), headline (40), description (30).
- Upload progress bar.
- Preview se met à jour en live (debounce 400ms) à chaque modif.

---

## 3. Hors scope v1 (à noter)
- Collection format complet avec catalog feed.
- A/B test natif Meta.
- Asset feed avancé (multi-images dynamiques par placement).
- Édition d'une ad existante (v1 = read-only + duplicate).

---

## Notes techniques

- Toutes les fonctions edge restent sur le token système `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID` (pas d'OAuth multi-comptes, conforme à la décision précédente).
- Carousel: limite Meta = 2-10 cards, chaque card requiert image_hash + headline + link.
- `generatepreviews` consomme du quota → cache 5 min la dernière preview par signature de form.
- Bucket `meta-creatives` déjà public, OK pour upload depuis le navigateur.
- UTM builder écrit directement dans `url_tags` (format `utm_source=facebook&utm_medium=cpc&...`).

---

## Livrables fichiers
- `supabase/migrations/<new>.sql` (colonnes page_id, page_name, is_capi_enabled)
- `supabase/functions/meta-ads-sync/index.ts` (enrichi)
- `supabase/functions/meta-ad-create/index.ts` (refonte single + carousel + dynamic creative)
- `supabase/functions/meta-ad-preview/index.ts` (nouveau)
- `supabase/functions/meta-ig-accounts-list/index.ts` (nouveau)
- `src/components/admin/meta-ads/AdsTab.tsx` (utilise AdComposer)
- `src/components/admin/meta-ads/composer/*.tsx` (10 nouveaux composants)
