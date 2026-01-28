

# Plan de correction : Récursion infinie RLS sur /blog

## Problème

La page `/blog` renvoie une erreur 500 car les politiques RLS sur les tables `projects` et `answers` se référencent mutuellement, créant une boucle infinie.

**Erreur exacte** : `infinite recursion detected in policy for relation "projects"`

## Solution

Utiliser une **fonction SECURITY DEFINER** pour briser la récursion. Cette fonction s'exécute avec les privilèges de son créateur, évitant ainsi la vérification RLS en cascade.

## Étapes de correction

### 1. Supprimer la politique problématique
Supprimer la politique `"Anyone can view projects with public answers"` sur `projects` qui cause la récursion.

### 2. Créer une fonction SECURITY DEFINER
Créer une fonction qui vérifie si un projet a des réponses publiques, sans déclencher les politiques RLS :

```sql
CREATE OR REPLACE FUNCTION public.project_has_public_answers(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.answers
    WHERE project_id = p_project_id
    AND is_public = true
  )
$$;
```

### 3. Recréer la politique avec la fonction
```sql
CREATE POLICY "Anyone can view projects with public answers" 
ON public.projects 
FOR SELECT 
USING (public.project_has_public_answers(id));
```

## Changements techniques

| Fichier | Action |
|---------|--------|
| Migration SQL | Supprimer ancienne politique, créer fonction, recréer politique |

## Résultat attendu

- La page `/blog` affichera les articles publics de lovelyanswers.com
- Plus d'erreur de récursion infinie
- Les visiteurs anonymes pourront voir les articles publics

