
Diagnostic rapide:
- Le problème n’est plus l’absence de routeur client: `react-router-dom` est déjà installé et `src/App.tsx` route bien `/auth` et `/onboarding`.
- Les vrais blocages viennent de deux erreurs concrètes dans le code actuel :
  1. `src/views/Auth.tsx` lit `localStorage` pendant le rendu initial (`const savedEmail = localStorage.getItem(...)`). En environnement Next, cela casse le rendu de `/auth` côté serveur et peut donner l’impression que le bouton “Log in” ne fonctionne pas.
  2. `app/onboarding/page.tsx` importe `@/views/Signup` au lieu de `@/views/Onboarding`. Donc “Start Free Audit” envoie vers la mauvaise page dans le runtime Next.
- Il y a aussi un trou de parité preview: `Auth.tsx` et `Signup.tsx` redirigent vers `/wizard`, mais cette route n’existe pas dans `src/App.tsx`. Même si la connexion marche, la preview Vite peut tomber sur une 404 ensuite.

Plan de correction:
1. Rendre `Auth.tsx` compatible navigateur + SSR
   - Déplacer la lecture de `localStorage` dans un `useEffect` ou un init protégé par `typeof window !== "undefined"`.
   - Remplacer `new URLSearchParams()` par le vrai `useSearchParams()` déjà fourni par la couche de navigation.
   - Vérifier que toute logique dépendant de `window`/`localStorage` reste uniquement côté client.

2. Corriger la page `/onboarding` côté Next
   - Modifier `app/onboarding/page.tsx` pour rendre `@/views/Onboarding` au lieu de `@/views/Signup`.
   - Ainsi le bouton “Start Free Audit” ouvrira bien le flow d’audit.

3. Réparer la parité des routes dans la preview
   - Ajouter `/wizard` dans `src/App.tsx` avec `@/views/AeoWizard`.
   - Repasser rapidement les routes d’auth/onboarding pour s’assurer que `app/` et `src/App.tsx` pointent vers les mêmes écrans.

4. Vérification ciblée
   - Depuis la home :
     - “Log in” doit ouvrir `/auth` sans page blanche ni erreur.
     - “Start Free Audit” doit ouvrir le vrai onboarding.
   - Tester aussi l’accès direct à `/auth`, `/onboarding` et `/wizard`.
   - Vérifier desktop + mobile, car les deux versions du header ont ces boutons.

Fichiers à corriger:
- `src/views/Auth.tsx`
- `app/onboarding/page.tsx`
- `src/App.tsx`

Détail technique:
- Le précédent correctif “router Vite” est déjà en place, donc je ne repartirais pas sur `next/link` / `next/navigation`.
- Ici, le bug est surtout un mélange de :
  - rendu SSR non sécurisé (`localStorage` dans le render),
  - mapping de page erroné (`/onboarding` → Signup),
  - route manquante côté preview (`/wizard`).
- En corrigeant ces 3 points, les boutons de la home devraient redevenir fonctionnels dans la preview et dans le runtime principal.
