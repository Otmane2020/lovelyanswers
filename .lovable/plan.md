## Problème

Après un sign-up Google, les nouveaux utilisateurs sont créés correctement en base (vérifié : 3 nouveaux users Google créés aujourd'hui), mais **rien ne se passe à l'écran** — ils ne sont pas redirigés vers `/wizard` (aucun n'a de projet).

## Cause racine

Race condition entre 3 mécanismes auth concurrents :

1. `AuthContext` fait `handleOAuthCallback()` qui appelle `supabase.auth.setSession(...)` async, puis efface le hash `#access_token=...` de l'URL.
2. `AuthContext` setup `onAuthStateChange` listener qui set `user`.
3. `Auth.tsx` setup SON PROPRE `onAuthStateChange` listener en plus.
4. Le `useEffect` de redirection dans `Auth.tsx` dépend de `user` du context.

Avec Next.js + Vite dual-mode, `router.replace("/wizard")` peut être appelé avant que la session ne soit propagée, ou l'effect ne re-run pas toujours après que `user` arrive. Résultat : l'utilisateur reste bloqué sur `/auth` avec un écran qui ne bouge pas.

De plus, sur `/signup`, le useEffect de redirect (Signup.tsx ligne 39-47) n'écoute QUE `user` mais pas l'event `SIGNED_IN` directement — si Google redirige vers `/auth` (le `redirect_uri` configuré), l'utilisateur arrive sur `/auth` pas sur `/signup`, donc le code de redirect de Signup ne tourne jamais. Mais Auth.tsx a la même race.

## Plan de fix

### 1. Centraliser le redirect post-OAuth dans `AuthContext.tsx`

Détecter `event === "SIGNED_IN"` avec un provider OAuth, et déclencher directement la logique de redirect (check projects → `/wizard` ou `/dashboard`) sans dépendre de `useEffect` dans les composants pages.

### 2. Utiliser `window.location.replace()` au lieu de `router.replace()` pour le redirect post-OAuth

Le routing Next.js `router.replace` est unreliable dans le contexte preview Vite + après hash-cleanup. Un `window.location.replace("/wizard")` garantit la navigation.

### 3. Ajouter un fallback dans `Auth.tsx` et `Signup.tsx`

Si un user est détecté sur ces pages, forcer un check projet et rediriger via `window.location` (plus robuste que `router.replace`).

### 4. Logs de diagnostic temporaires

Ajouter des `console.log` clairs aux étapes clés (`OAuth callback received`, `Session set`, `Projects checked`, `Redirecting to X`) pour confirmer la chaîne en production si le problème persiste.

## Fichiers à modifier

- `src/contexts/AuthContext.tsx` — centraliser logique post-OAuth
- `src/views/Auth.tsx` — fallback redirect via `window.location`
- `src/views/Signup.tsx` — même fallback

## Détails techniques

```text
Google OAuth flow actuel:
  /signup → click Google
  → oauth.lovable.app → Google → /auth#access_token=...
  → AuthContext.handleOAuthCallback() setSession (async)
  → onAuthStateChange fires SIGNED_IN
  → Auth.tsx useEffect on [user] runs
  → check projects (RLS = auth.uid() = user_id)
  → router.replace("/wizard")  ← unreliable

Flow corrigé:
  ... même début ...
  → AuthContext detects SIGNED_IN + new OAuth user
  → check projects directement dans AuthContext
  → window.location.replace("/wizard") ← reliable
```

Aucun changement DB requis. Aucune migration.
