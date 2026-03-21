

## Problème

Le build Vite se termine avec succès mais le système ne trouve pas le dossier `dist/`. Cela est probablement dû au fait que le build Vite échoue silencieusement à cause d'un conflit avec la configuration Next.js (le `tsconfig.json` principal est configuré pour Next.js avec `"jsx": "preserve"` et le plugin `next`, ce qui peut empêcher Vite de compiler correctement).

## Plan de correction

### Étape 1 : Vérifier que `tsconfig.app.json` existe et est utilisé par Vite
Le fichier `tsconfig.app.json` (dédié à Vite) doit avoir `"jsx": "react-jsx"` pour que Vite puisse compiler le JSX. Il faut s'assurer que `vite.config.ts` le référence si nécessaire.

### Étape 2 : Nettoyer les anciens artefacts de build
Supprimer le dossier `dist-vite/` qui contient des artefacts obsolètes d'une configuration précédente et qui pourrait créer de la confusion.

### Étape 3 : S'assurer que le script `build` produit bien dans `dist/`
- Confirmer que `vite.config.ts` a `outDir: "dist"` (déjà le cas)
- Confirmer que `package.json` a `"build": "vite build"` (déjà le cas)
- Vérifier qu'il n'y a pas de fichier `.gitignore` qui exclut `dist/` du système de fichiers

### Détails techniques

Le `tsconfig.json` principal a `"jsx": "preserve"` (pour Next.js) mais Vite a besoin de `"react-jsx"`. Il faut vérifier `tsconfig.app.json` :

```text
tsconfig.json       → Next.js (jsx: preserve)
tsconfig.app.json   → Vite (jsx: react-jsx) ← vérifié par vite.config.ts
```

Si `tsconfig.app.json` est correct et que `.gitignore` n'exclut pas `dist/`, le build devrait fonctionner. Le dossier `dist-vite/` sera supprimé car il n'est plus utilisé.

