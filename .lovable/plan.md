# Harmonisation fréquences + nettoyage `monthly`

## Audit effectué

**Branche `monthly` — OK fonctionnellement.** Le filtre `getDate() === 1` est bien appliqué dans les 3 edge functions avant le test `PUBLISH_DAYS.has(...)` :

- `generate-30-days-content/index.ts:877` — `if (publishFrequency === "monthly") { if (d.getDate() === 1) ... } else if (PUBLISH_DAYS.has(...))`
- `daily-planning-fill/index.ts:348` — `if (publishFrequency === "monthly") { if (targetDate.getDate() !== 1) continue; } else if (!PUBLISH_DAYS.has(...))`
- `check-planning-completeness/index.ts:296` — idem

Donc `monthly` ne publie bien que le 1er du mois. Le `Set([1,2,3,4,5])` retourné par `getPublishDaysSet("monthly")` est **du code mort** (jamais consulté pour monthly) — confusing mais inoffensif. À nettoyer.

**Incohérence UI confirmée** :
- `src/components/planning/AutoPublishSettings.tsx` : 5 valeurs (`3x_week`, `2x_week`, `daily`, `weekly`, `monthly`)
- `src/views/AeoIntegrations.tsx` : 3 valeurs (`daily`, `weekly`, `monthly`) — manque `3x_week` et `2x_week`

Conséquence : un user qui passe par `AeoIntegrations` ne peut pas choisir 3x/sem ni 2x/sem ; et s'il a déjà `3x_week` en base (le défaut), le `<Select>` affiche un libellé vide.

## Changements

### 1. Harmoniser les fréquences dans `AeoIntegrations.tsx`

Aligner la liste sur `AutoPublishSettings.tsx` (mêmes 5 valeurs, même ordre, même libellé recommandé) :

```ts
const frequencies = [
  { value: "3x_week", label: "3x/week (recommended)" },
  { value: "2x_week", label: "2x/week" },
  { value: "daily",   label: "Daily" },
  { value: "weekly",  label: "Weekly (Mon)" },
  { value: "monthly", label: "Monthly (1st)" },
];
```

### 2. Nettoyer le helper `monthly` dans les 3 edge functions

Remplacer `case "monthly": return new Set([1,2,3,4,5]);` par `case "monthly": return new Set();` (set vide) et mettre à jour le commentaire. Sémantique : pour `monthly`, le check `PUBLISH_DAYS.has(...)` n'est jamais atteint (la branche `if (frequency === "monthly")` court-circuite). Le set vide rend l'intention explicite et évite de croire qu'on publie lun-ven.

Fichiers : `generate-30-days-content/index.ts`, `daily-planning-fill/index.ts`, `check-planning-completeness/index.ts`.

### 3. Aucun changement DB

Les 20 projets existants sont en `daily` — non impacté.

## Validation

- Sélectionner `3x_week` puis `2x_week` dans la page Integrations → la valeur persiste et s'affiche correctement après reload.
- Trigger manuel de `daily-planning-fill` sur un projet en `monthly` (sandbox) → confirme qu'aucun slot n'est créé sauf si on est le 1er.
- Logs edge function : `frequency=monthly → days=` (set vide attendu après nettoyage).

## Hors scope

- Pas de migration DB.
- Pas de changement du comportement de `monthly` (déjà correct).
- Pas de touche aux 3 crons eux-mêmes (`pg_cron`).
