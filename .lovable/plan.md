## Diagnostic ranki.ai

Deux bugs confirmés sur le projet `ranki.ai` :

### Bug 1 — Le réglage `daily` est ignoré
- DB : `project_settings.publish_frequency = 'daily'`, `auto_publish_enabled = true`
- Réalité : `planning_days` contient ~28 entrées sur 2 mois → cadence Lun/Mer/Ven, pas daily
- Cause : **les générateurs hardcodent Mon/Wed/Fri** et ne lisent jamais `publish_frequency` :
  - `supabase/functions/generate-30-days-content/index.ts:850` → `const PUBLISH_DAYS = new Set([1, 3, 5]);`
  - `supabase/functions/daily-planning-fill/index.ts:271` → idem
  - `check-planning-completeness` : pareil
- Conséquence : les crons tournent bien (les logs `generate-30-days` sont récents), mais ils sautent les jours hors Lun/Mer/Ven même quand l'utilisateur a choisi `daily`.

### Bug 2 — Le calendrier n'affiche que AEO
- Pour ce projet, en DB : **0 local, 0 shopping, mais 84 entrées `geo_contents` planifiées**
- Le calendrier ne consomme que `planning_days` / `answers` (AEO) et ignore `geo_contents`
- Conséquence visuelle : "il n'y a que de l'AEO" alors que le GEO Engine en a généré beaucoup

---

## Plan d'action

### 1. Rendre les générateurs sensibles à `publish_frequency`

Ajouter un helper partagé qui transforme `publish_frequency` en liste de jours valides :

```text
daily     → [0,1,2,3,4,5,6]
3x_week   → [1,3,5]          (par défaut, recommandé)
2x_week   → [2,4]
weekly    → [1]
monthly   → [1] + 1× / mois
```

Patcher les 3 edge functions pour lire le réglage avant de fixer `PUBLISH_DAYS` :
- `generate-30-days-content/index.ts` (charger `project_settings.publish_frequency` au début, puis construire `PUBLISH_DAYS` dynamiquement)
- `daily-planning-fill/index.ts` (idem, par projet, dans la boucle)
- `check-planning-completeness/index.ts` (utiliser la même règle pour ne pas signaler des jours "manquants" qui ne devraient pas exister)

### 2. Backfill du planning existant pour ranki.ai

Une fois le code corrigé, déclencher manuellement `generate-30-days-content` avec `overwrite=false` pour combler les jours manquants entre aujourd'hui et J+30 selon la fréquence `daily`.

### 3. Afficher le GEO dans le calendrier

Côté front (`src/views/AeoPlanning.tsx` + composants calendrier), fusionner trois sources pour chaque date :
- AEO : `planning_days` / `answers`
- GEO : `geo_contents` (84 actuellement non rendus)
- Local : `local_answers`
- Shopping : `shopping_planning`

Avec un badge / couleur par type (AEO, GEO, Local, Shopping) pour que l'utilisateur voie tout en un coup d'œil. Aucune logique métier nouvelle, juste de la lecture + affichage.

### 4. Validation

- Vérifier en DB que pour `daily` on a 30 entrées sur 30 jours
- Vérifier que le calendrier ranki.ai affiche les 84 GEO + les AEO
- Vérifier que les autres projets en `3x_week` gardent bien Lun/Mer/Ven (pas de régression)

---

## Note sur les crons

Les crons (`daily-planning-fill` à 06:00, `check-planning-completeness` toutes les 6h, `publish-scheduled-answers` toutes les heures, `publish-geo-content` à 02:00) **tournent** — les logs récents le prouvent. Le problème n'est pas qu'ils ne s'exécutent pas, c'est qu'ils appliquent une règle Lun/Mer/Ven en dur. Le point 1 résout ça.