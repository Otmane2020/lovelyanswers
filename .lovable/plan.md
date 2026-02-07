

# Plan: Ajouter la fonction analyze-aeo + Audit Premium + Cross-sell

## Objectif

1. Creer la edge function `analyze-aeo` (audit detaille avec analyse concurrentielle complete)
2. Ajouter une table `reports` pour stocker les rapports premium
3. Creer une page `/audit-premium` pour afficher les resultats detailles
4. Modifier la page d'accueil pour proposer les 2 options (Free Audit / Premium Audit)
5. Ajouter un CTA cross-sell dans l'email d'audit gratuit
6. Corriger l'analyse des concurrents (utiliser Firecrawl + OpenRouter au lieu de l'approche actuelle)

---

## Etape 1 : Edge Function `analyze-aeo`

Creer `supabase/functions/analyze-aeo/index.ts` base sur le code fourni, avec ces adaptations :
- Remplacer `OPENAI_API_KEY` par `OPENROUTER_API_KEY` (coherence avec le projet)
- Utiliser le modele `google/gemini-2.5-flash` via OpenRouter
- Garder la logique de cache (slug -> reports table)
- Prompt complet avec `competitorLandscape`, `macroAnalysis`, `microAnalysis`, etc.
- Scraping via Firecrawl pour des donnees riches

Ajouter dans `supabase/config.toml` :
```text
[functions.analyze-aeo]
verify_jwt = false
```

---

## Etape 2 : Table `reports` (migration SQL)

Creer la table `reports` pour persister les rapports premium :

```sql
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  slug text NOT NULL UNIQUE,
  company_info jsonb DEFAULT '{}',
  scores jsonb DEFAULT '{}',
  macro_analysis jsonb DEFAULT '{}',
  micro_analysis jsonb DEFAULT '{}',
  recommendations jsonb DEFAULT '{}',
  kpi_tracking jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reports" ON public.reports
  FOR SELECT USING (true);
```

---

## Etape 3 : Page `/audit-premium`

Creer `src/pages/AuditPremium.tsx` qui :
- Accepte une URL en parametre (`?url=...`) ou un ID de rapport (`?id=...`)
- Appelle `analyze-aeo` pour generer le rapport
- Affiche les resultats en sections :
  - **Scores** : global, GSO, AEO, schema, content (score rings)
  - **Infos entreprise** : nom, tagline, KPIs detectes
  - **Analyse concurrentielle** : tableau comparatif avec barres de presence, forces/faiblesses
  - **Tendances marche** : cards avec impact et score
  - **Questions cles** : liste avec volume, difficulte, priorite
  - **Recommandations** : immediate / court terme / long terme
  - CTA pour s'inscrire

Ajouter la route dans `App.tsx`.

---

## Etape 4 : Modifier la page d'accueil (Index.tsx)

Modifier la section hero pour proposer 2 actions :
- Le bouton actuel "Get Started Free" / "Get Free Audit" reste identique
- Ajouter un lien secondaire sous le CTA principal : "Or get a **Premium Audit** with competitor analysis"
- Ce lien redirige vers `/audit-premium?url=...`

---

## Etape 5 : Cross-sell dans l'email d'audit

Modifier `supabase/functions/send-audit-email/index.ts` pour ajouter une section apres les resultats :

```html
<!-- Premium Audit CTA -->
<div style="background: #f8f5ff; border: 2px solid #7c3aed; border-radius: 16px; padding: 24px; text-align: center;">
  <h3>Want to see how you compare to competitors?</h3>
  <p>Get a Premium AEO Audit with competitor landscape, market trends, and strategic recommendations.</p>
  <a href="https://lovelyanswers.lovable.app/audit-premium?url={url}">Get Premium Audit (Free)</a>
</div>
```

---

## Etape 6 : Corriger l'analyse concurrentielle

Le prompt de `analyze-aeo` est deja excellent pour trouver des vrais concurrents (regle "Les concurrents doivent etre des entreprises REELLES du meme secteur"). En utilisant Firecrawl pour scraper le contenu complet + les liens, l'IA dispose de suffisamment de contexte pour identifier les bons concurrents.

Contrairement a `analyze-website` qui utilise un simple fetch HTML et des appels AI minimaux, `analyze-aeo` :
- Scrappe avec Firecrawl (JavaScript rendering, contenu complet)
- Envoie un prompt beaucoup plus detaille avec des regles strictes sur les concurrents
- Demande explicitement 3 concurrents reels + le site analyse
- Inclut les forces et faiblesses de chaque concurrent

---

## Fichiers impactes

| Fichier | Action |
|---------|--------|
| `supabase/functions/analyze-aeo/index.ts` | Nouveau |
| `supabase/config.toml` | Ajouter section analyze-aeo |
| `src/pages/AuditPremium.tsx` | Nouveau |
| `src/App.tsx` | Ajouter route /audit-premium |
| `src/pages/Index.tsx` | Ajouter lien Premium Audit |
| `supabase/functions/send-audit-email/index.ts` | Ajouter CTA cross-sell |
| Migration SQL | Table `reports` |

## Details techniques

- **API** : OpenRouter avec `OPENROUTER_API_KEY` existante + modele `google/gemini-2.5-flash`
- **Scraping** : Firecrawl via `FIRECRAWL_API_KEY` existante
- **Cache** : Les rapports sont caches par slug dans la table `reports` (pas de regeneration pour le meme domaine)
- **Pas d'auth requise** : L'audit premium est public (outil marketing d'acquisition)

