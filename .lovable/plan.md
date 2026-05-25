# Pourquoi le calendrier ne suit pas "Daily"

## Diagnostic

Le dropdown "Daily" enregistre bien `publish_frequency = "daily"` dans `project_settings` (AutoPublishSettings.tsx l.108). Mais le calendrier de `AeoPlanning.tsx` n'est **pas** régénéré : il affiche les `scheduled_items` existants à leur `scheduled_date` d'origine (commentaire l.107-109 : "We intentionally do NOT redistribute by liveFrequency").

Conséquence : les contenus ont été créés quand la fréquence était `3x_week` → ils restent calés Lundi/Mercredi/Vendredi. Passer à `daily` ne remplit pas Mardi/Jeudi/Samedi/Dimanche tant que le cron `daily-planning-fill` n'a pas tourné (et même là, il ne fait que **+3 jours/jour** via `maxDaysToFill = 3`).

C'est pour ça que :
- L'UI dit "Daily"
- Le calendrier garde l'ancien pattern 3x/semaine
- Les jours manquants restent vides pendant plusieurs jours

## Correction proposée

**1. Déclencher un refill immédiat quand la fréquence change**

Dans `AutoPublishSettings.handleSave()`, après l'upsert réussi, si `publish_frequency` a changé :
- Invoquer `daily-planning-fill` via `supabase.functions.invoke("daily-planning-fill", { body: { projectId, days: 31, maxDaysToFill: 30 }})`
- Afficher un toast "Replanification en cours…" puis "Calendrier mis à jour" au retour
- Rafraîchir les données du planning (refetch)

**2. Lever le plafond `maxDaysToFill` pour les invocations manuelles**

`daily-planning-fill` accepte déjà `maxDaysToFill` en paramètre (l.190 du fichier). Le cron continue avec 3, mais l'appel manuel depuis l'UI passe 30 pour combler immédiatement.

**3. Garde-fou côté backend**

Dans `daily-planning-fill`, garder le comportement actuel : la fonction respecte déjà `publish_frequency` par projet (l.215-220) et fait `getDate() === 1` pour `monthly`. Aucune modification backend nécessaire.

## Fichiers touchés

- `src/components/planning/AutoPublishSettings.tsx` — détecter changement de `frequency`, invoquer la fonction après save, gérer le toast + callback de refresh
- `src/views/AeoPlanning.tsx` — exposer un callback `onFrequencyChanged` qui refetch les items du planning

## Hors scope

- Pas de suppression des items déjà planifiés sur les anciens jours (ils restent valides)
- Pas de modification du cron `daily-planning-fill` (toujours +3 jours/jour)
- Pas de changement de la logique de filtrage `monthly` (déjà correcte)
