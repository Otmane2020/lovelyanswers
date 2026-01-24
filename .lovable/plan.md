
Objectif
- Résoudre l’erreur persistante “SERVICE_DISABLED / Web Search Indexing API has not been used… or it is disabled” alors que l’API semble activée, et rendre le diagnostic actionnable (au lieu d’un ping-pong “active / pas active”).

Constat (ce que je vois côté app)
- Les appels à la fonction backend `gsc-test-indexation` échouent avec un 403 `PERMISSION_DENIED` et un détail `reason: SERVICE_DISABLED`.
- Google renvoie explicitement `consumer: "projects/838039541237"` et `service: "indexing.googleapis.com"`.
- Donc, au moment exact de l’appel, Google considère que l’API “Web Search Indexing API” est désactivée (ou non activée pour le “consumer project” utilisé pour la facturation/quota).

Hypothèses probables (dans les cas réels, c’est quasiment toujours l’un de ces points)
1) Ce n’est pas le bon projet Google Cloud
   - Tu vois l’API “Activée” dans un projet, mais le token OAuth utilisé par LovelyAnswers est rattaché à un autre projet (ou à un autre “consumer/quota project”).
   - Le message Google indique 838039541237, mais on doit vérifier côté token quel “OAuth client” est réellement utilisé et quelle “quota project” Google prend en compte.
2) Propagation / état incohérent côté Google
   - Rarement, Google peut afficher “Activé” dans la console mais continuer à renvoyer SERVICE_DISABLED pendant un certain temps (ou après un changement de politiques/organisation).
   - Ici tu dis “déjà activée” et “reconnecté”, donc c’est moins probable, mais encore possible si org policy/billing/etat du projet.
3) Le projet est “activé” mais bloqué par une politique (Organization Policy) ou un état de projet
   - Certaines organisations peuvent bloquer l’usage d’APIs malgré “Enabled”, ou imposer un quota project différent.

Ce qu’on va faire (approche la plus rapide et fiable)
A) Ajouter un “mode diagnostic” côté backend
Créer une nouvelle fonction backend (ex: `gsc-indexing-diagnostics`) qui, pour l’utilisateur connecté :
1. Récupère le token Google stocké (comme on fait déjà).
2. Appelle `https://oauth2.googleapis.com/tokeninfo?access_token=...` pour obtenir :
   - `aud` (client_id), `scope`, `expires_in`
   - Ça permet de confirmer factuellement : “le token a bien le scope indexing” et “il appartient bien à tel OAuth client”.
3. Rejoue un appel Indexing API “test” (même endpoint `urlNotifications:publish`) et retourne :
   - le `status`, `reason`, `consumer project`, `containerInfo`, etc.
4. Si Google renvoie `SERVICE_DISABLED`, tenter une vérification automatique de l’état d’activation côté Google Service Usage :
   - Appel `serviceusage.googleapis.com` pour vérifier si `indexing.googleapis.com` est réellement `ENABLED` pour le projet concerné.
   - Pour ça, on utilisera un jeton obtenu via la clé de compte de service déjà présente dans les secrets (si permissions suffisantes). Si permissions insuffisantes, le diagnostic le dira clairement.

Résultat : au lieu d’un écran “ça marche/ça marche pas”, on saura exactement :
- quel OAuth client est en jeu,
- quel scope est réellement attaché au token,
- quel projet Google est réellement utilisé comme “consumer”,
- si Google Service Usage confirme ENABLED ou non.

B) Améliorer le message d’erreur dans l’UI
Sur la page Intégrations (le bloc “Test indexation”) :
- Afficher un message “lisible” + une section “Détails techniques” repliable :
  - “Google indique que l’API Indexing est désactivée pour le projet: 838039541237”
  - “Scopes du token: …”
  - “Client OAuth (aud): …”
- Ajouter un bouton “Diagnostic avancé” qui appelle `gsc-indexing-diagnostics` et affiche le rapport.
But : quand ça casse, tu as une preuve exploitable immédiatement (et pas juste une capture d’écran de la console Google).

C) Ajouter un retry intelligent (optionnel, mais utile)
Dans `gsc-test-indexation` (et éventuellement `gsc-request-indexing`) :
- Si `SERVICE_DISABLED`, faire 2-3 retries avec backoff (ex: 2s, 5s, 10s) avant de conclure.
- Et si ça persiste : retourner un message clair + proposer “Diagnostic avancé”.
Ça ne résout pas une vraie désactivation, mais évite les faux négatifs si Google est temporairement incohérent.

Ce que je vais vérifier pendant l’implémentation
- Que l’OAuth init (`google-oauth-url`) inclut bien le scope `https://www.googleapis.com/auth/indexing` (c’est déjà le cas).
- Que le token stocké a bien ce scope (via tokeninfo).
- Que la fonction backend utilise bien le token utilisateur (c’est déjà le cas).
- Que l’erreur est bien “API disabled” et pas un autre problème masqué.

Critères de succès
- On obtient un rapport diagnostic qui tranche : “API réellement ENABLED” vs “pas enabled sur le bon projet” vs “bloquée par policy/etat du projet”.
- Si le problème est “mauvais projet”, l’app affichera précisément quel projet activer.
- Si le problème est “policy/etat”, l’app le dira explicitement (et on saura quoi corriger côté Google).
- Une fois corrigé, un test sur `https://www.vends-le.fr/...` renvoie `success: true` et une date `notifyTime`.

Livrables (fichiers qui seront touchés)
- Nouveau : `supabase/functions/gsc-indexing-diagnostics/index.ts` (fonction backend diagnostic)
- Mise à jour UI : `src/pages/AeoIntegrations.tsx` (ou composant associé) pour bouton “Diagnostic avancé” + affichage du rapport
- Optionnel : améliorations sur `supabase/functions/gsc-test-indexation/index.ts` (retry + enrichissement message)

Notes importantes (attentes réalistes)
- Si Google continue de répondre SERVICE_DISABLED, ce n’est pas “un bug de code” : c’est toujours un problème d’activation/permission/policy sur le projet que Google associe à la requête. Le diagnostic est la clé pour éviter les suppositions.
- L’Indexing API est restrictive par nature (elle n’indexe pas “tout” automatiquement). Mais ici on est bloqués avant même d’arriver au cas “ownership”/“type de page” : on doit d’abord résoudre le SERVICE_DISABLED.

Séquence d’exécution
1) Implémenter la fonction backend `gsc-indexing-diagnostics`
2) Ajouter l’affichage “Diagnostic avancé” dans l’UI
3) Tester sur preview + publié, avec une URL vends-le.fr
4) Sur la base du rapport : action corrective (projet à activer / policy / etc.)
