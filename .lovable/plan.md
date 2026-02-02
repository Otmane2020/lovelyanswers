

# Plan de correction : Bug user.id vs project_id

## Diagnostic du problème

Deux bugs critiques causent l'affectation aléatoire des projets aux utilisateurs :

### Bug 1 : AeoDashboard.tsx - Confusion user.id / project_id
```text
Ligne 48 : .eq('project_id', user.id)
           ↓
project_id = "abc123-..." (UUID du projet)
user.id    = "xyz789-..." (UUID de l'utilisateur)
           ↓
Résultat : 0 réponses ou données d'un autre user
```

### Bug 2 : useProjects.ts - Pas de filtre par utilisateur
```text
SELECT * FROM projects ORDER BY created_at DESC
                   ↓
Retourne TOUS les projets visibles (via RLS "public answers")
                   ↓
useActiveProject() → sélectionne le plus récent GLOBAL
                   ↓
Utilisateur A voit le projet de Utilisateur B
```

## Fichiers à modifier

| Fichier | Ligne(s) | Bug | Correction |
|---------|----------|-----|------------|
| `src/hooks/useProjects.ts` | 31-34 | Pas de filtre user_id | Ajouter `.eq("user_id", user.id)` |
| `src/pages/AeoDashboard.tsx` | 45-48 | user.id utilisé comme project_id | Utiliser `useActiveProject()` |

## Corrections détaillées

### 1. Correction de useProjects.ts

Modifier la requête pour filtrer uniquement les projets de l'utilisateur :

```typescript
// Avant (bugué)
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .order("created_at", { ascending: false });

// Après (corrigé)
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });
```

### 2. Correction de AeoDashboard.tsx

Utiliser le hook `useActiveProject()` pour obtenir le bon projet :

```typescript
// Avant (bugué - ligne 48)
const { data: answers } = await supabase
  .from('answers')
  .select('id, score')
  .eq('project_id', user.id); // ❌ user.id n'est pas un project_id

// Après (corrigé)
import { useActiveProject } from "@/hooks/useProjects";

export default function AeoDashboard() {
  const { project } = useActiveProject();
  // ...
  
  useEffect(() => {
    const fetchAnswersStats = async () => {
      if (!project) return; // Vérifier project, pas user
      
      const { data: answers } = await supabase
        .from('answers')
        .select('id, score')
        .eq('project_id', project.id); // ✅ Utiliser project.id
      // ...
    };
    fetchAnswersStats();
  }, [project]); // Dépendance sur project
```

## Vérifications supplémentaires

Après correction, vérifier que :

1. Chaque utilisateur ne voit QUE ses propres projets
2. Le dashboard affiche les stats du bon projet
3. L'historique montre le bon contenu
4. La génération de contenu fonctionne sur le bon projet

## Impact de la correction

- **Avant** : Le projet "starlinko.app" de l'utilisateur A peut être affiché chez l'utilisateur B
- **Après** : Chaque utilisateur voit uniquement ses propres projets

## Ordre d'exécution

1. Corriger `useProjects.ts` - filtre par user_id
2. Corriger `AeoDashboard.tsx` - utiliser project.id au lieu de user.id
3. Tester avec 2 comptes différents pour valider l'isolation

