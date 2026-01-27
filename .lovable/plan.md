
# Plan de correction - Google Search Console + Local AEO identique à AEO Answers

## Problème 1 : Google Search Console - Connexion OAuth

### Diagnostic
La fonction `google-oauth-url` est configurée correctement dans `config.toml` mais il faut vérifier que les **Redirect URIs** sont bien ajoutés dans Google Cloud Console.

### Solution
1. Vérifier que ces URLs sont dans les "Authorized redirect URIs" de votre projet Google Cloud :
   - `https://lovelyanswers.lovable.app/analytics`
   - `https://lovelyanswers.lovable.app/integrations`
   - `https://lovelyanswers.com/analytics` (si domaine custom)

2. Aucune modification de code n'est nécessaire - la configuration `config.toml` est correcte.

---

## Problème 2 : Local AEO - Alignement complet avec AEO Answers

### Modifications requises

#### Etape 1 : Créer la table `local_answers` pour la persistance
Migration SQL pour stocker les réponses locales générées :

```text
┌─────────────────────────────────────────────────────────────────┐
│                      local_answers                               │
├─────────────────────────────────────────────────────────────────┤
│ id             │ uuid (PK)                                       │
│ project_id     │ uuid (FK projects)                              │
│ business_id    │ text (Google Places ID)                         │
│ business_name  │ text                                            │
│ question       │ text                                            │
│ answer         │ text                                            │
│ score          │ int                                             │
│ is_public      │ boolean                                         │
│ scheduled_date │ date                                            │
│ published_at   │ timestamp                                       │
│ published_url  │ text                                            │
│ slug           │ text (unique)                                   │
│ created_at     │ timestamp                                       │
│ updated_at     │ timestamp                                       │
│ language       │ text                                            │
└─────────────────────────────────────────────────────────────────┘
```

#### Etape 2 : Créer la table `local_businesses` pour sauvegarder le business sélectionné

```text
┌─────────────────────────────────────────────────────────────────┐
│                      local_businesses                            │
├─────────────────────────────────────────────────────────────────┤
│ id             │ uuid (PK)                                       │
│ project_id     │ uuid (FK projects, unique)                      │
│ place_id       │ text (Google Places ID)                         │
│ name           │ text                                            │
│ address        │ text                                            │
│ phone          │ text                                            │
│ website        │ text                                            │
│ rating         │ numeric                                         │
│ review_count   │ int                                             │
│ types          │ text[]                                          │
│ created_at     │ timestamp                                       │
└─────────────────────────────────────────────────────────────────┘
```

#### Etape 3 : Refactoriser `LocalAnswersTab.tsx`
Modifier pour :
- Utiliser le même layout que `Answers.tsx` (ChatGPT logo, header gradient, grille de cards)
- Persister les réponses en DB via `local_answers`
- Afficher le score AEO avec `ScoreRing`
- Ajouter bouton "Generate 30 Q/A (30 days)" avec scheduling
- Respecter la langue du projet (`project.language`)
- Ajouter le bouton "Publish to CMS" connecté à `cms-publish`

#### Etape 4 : Refactoriser `LocalPlanningTab.tsx`
Modifier pour :
- Lire les `local_answers` avec `scheduled_date` de la DB
- Connecter au cron existant `publish-scheduled-answers` pour auto-publication
- Synchroniser avec les paramètres `project_settings` (timezone, auto_publish_enabled)

#### Etape 5 : Créer l'edge function `generate-30-local-answers`
Nouvelle fonction pour générer 30 Q/A locaux sur 30 jours :
- S'appuie sur `generate-local-answer` existant
- Respecte la langue du projet
- Insère les réponses dans `local_answers` avec `scheduled_date`

#### Etape 6 : Modifier `publish-scheduled-answers` (cron existant)
Ajouter la logique pour publier aussi les `local_answers` planifiées.

#### Etape 7 : Mettre à jour `useLocalBusiness.ts`
- Sauvegarder le business sélectionné en DB (`local_businesses`)
- Charger automatiquement le business si déjà configuré pour le projet

---

## Fichiers à modifier/créer

| Fichier | Action |
|---------|--------|
| `supabase/migrations/xxx_local_answers.sql` | Créer les tables local_answers + local_businesses |
| `src/components/local/LocalAnswersTab.tsx` | Refactoriser pour match Answers.tsx |
| `src/components/local/LocalPlanningTab.tsx` | Connecter à la DB + cron |
| `src/hooks/useLocalBusiness.ts` | Persistance business sélectionné |
| `supabase/functions/generate-30-local-answers/index.ts` | Créer (génération 30 jours) |
| `supabase/functions/publish-scheduled-answers/index.ts` | Ajouter support local_answers |
| `supabase/config.toml` | Ajouter generate-30-local-answers |

---

## Notes techniques

### Langue
La génération utilisera `project.language` (ou `generation_settings.language`) pour forcer la langue des réponses locales, comme c'est fait dans `generate-30-days-content`.

### Cron publication
Le cron existant `publish-scheduled-answers` sera étendu pour vérifier aussi `local_answers.scheduled_date <= today AND is_public = false`.

### Interface
Le composant `LocalAnswersTab` héritera du même design que `Answers.tsx` :
- Header avec logo ChatGPT et badge "Rank First!"
- Barre de recherche
- Grille de cartes avec score ring
- Boutons Generate 30 Q/A + New Answer
- Progress bar pendant génération
