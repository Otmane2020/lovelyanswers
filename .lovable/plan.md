

## Rebranding : LovelyAnswers → AutoPilot Geo

### Scope

1078 occurrences dans 51 fichiers. Voici le mapping :

| Ancien | Nouveau |
|--------|---------|
| `LovelyAnswers` | `AutoPilot Geo` |
| `Lovely Answers` | `AutoPilot Geo` |
| `lovelyanswers.com` | `autopilotgeo.com` |
| `lovelyanswers.io` | `autopilotgeo.com` |
| `lovelyanswers.lovable.app` | `autopilotgeo.com` |
| `app.lovelyanswers.com` | `app.autopilotgeo.com` |
| `support@lovelyanswers.com` | `support@autopilotgeo.com` |
| `support@lovelyanswers.io` | `support@autopilotgeo.com` |
| `LovelyAnswers Ltd` | `AutoPilot Geo Ltd` |

### Fichiers impactés (51 fichiers)

**Frontend pages & components (~30 fichiers)** :
- `index.html` — titre, meta tags, OG, structured data, noscript
- `public/robots.txt` — sitemap URL
- `public/site.webmanifest` — app name
- `src/components/layout/PublicFooter.tsx` — brand, company info, links
- `src/components/blog/ArticleTemplate.tsx` — brand name, URL
- `src/pages/Index.tsx`, `About.tsx`, `Pricing.tsx`, `Terms.tsx`, `Privacy.tsx`, `Auth.tsx`, `Blog.tsx`, `AiSeo.tsx`, `AeoAccount.tsx`, `Onboarding.tsx`, etc.
- `src/components/landing/AIDemoSection.tsx`
- `src/components/admin/ads/*` — brand references in ads config
- `src/components/aeo/*`, `src/components/audit/*`

**Edge functions (~20 fichiers)** :
- `supabase/functions/prerender/index.ts` — brand dans HTML généré
- `supabase/functions/sitemap/index.ts` — URLs domaine
- `supabase/functions/db-email-trigger/index.ts` — FROM_EMAIL, liens
- `supabase/functions/create-checkout/index.ts` — origin fallback
- `supabase/functions/create-cart-checkout/index.ts` — origin fallback
- `supabase/functions/receive-article/index.ts` — public URL
- `supabase/functions/analyze-aeo/index.ts` — HTTP-Referer
- `supabase/functions/send-email/index.ts`, `send-audit-email/index.ts`
- Toutes les fonctions avec des références `lovelyanswers`

**Config** :
- `supabase/config.toml` — si référence au nom

### Approche

Remplacement systématique fichier par fichier avec `line_replace`. Pas de changement de logique — uniquement du renommage de chaînes.

### Note importante

Après le rebranding dans le code, il faudra aussi :
1. Configurer le domaine custom `autopilotgeo.com` dans Lovable (Settings → Domains)
2. Mettre à jour les DNS pour pointer vers `185.158.133.1`
3. Mettre à jour le Cloudflare Worker avec le nouveau domaine

