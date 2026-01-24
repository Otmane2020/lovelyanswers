
# Plan : Amélioration du filtrage Reddit pour la vente/achat de meubles d'occasion

## Problème identifié

Le système Reddit trouve des posts complètement hors-sujet car :
1. **Regex MARKETPLACE_PATTERNS trop large** : matche "achet", "prix", "€" → attrape toute la finance (ETF, BoursoBank, immobilier)
2. **Mots-clés individuels trop courts** : "cher", "trouver" matchent n'importe quoi
3. **Pas de validation sémantique** : un post sur "recherche d'emploi" passe car contient "cherche"

## Solution proposée

### 1. Nouveau système de filtrage par combinaison (AND)

Au lieu de matcher UN mot parmi une liste, exiger une **combinaison** :
- Post doit contenir un terme **objet** (meuble, canapé, table, chaise, lit, armoire, bureau, etc.)
- ET un terme **action/contexte** (vendre, acheter, occasion, seconde main, leboncoin, etc.)

```text
Exemple valide : "Où acheter un canapé d'occasion ?" ✓
  → Contient "canapé" (objet) + "acheter" + "occasion" (action)

Exemple invalide : "Que faire quand on a envie d'acheter" ✗
  → Contient "acheter" mais aucun objet mobilier
```

### 2. Refonte des patterns de filtrage

```text
FURNITURE_OBJECTS (obligatoire pour furniture vertical):
  FR: meuble, canapé, sofa, table, chaise, fauteuil, lit, matelas, 
      armoire, buffet, étagère, bureau, commode, bibliothèque, 
      miroir, tapis, luminaire, dressing, rangement, penderie
  EN: furniture, couch, sofa, table, chair, bed, mattress, 
      dresser, shelf, desk, wardrobe, cabinet, mirror, rug

MARKETPLACE_ACTIONS (contexte requis):
  FR: vendre, acheter, occasion, seconde main, d'occasion, 
      leboncoin, marketplace, annonce, don, troc, récupère
  EN: sell, buy, used, secondhand, marketplace, thrift, flip
```

### 3. Logique de filtrage améliorée

```text
Pour le vertical "furniture" :
  1. Post DOIT contenir au moins 1 terme FURNITURE_OBJECTS
  2. BONUS si contient aussi un terme MARKETPLACE_ACTIONS
  3. Score de pertinence calculé sur cette base

Cela élimine :
  - "ETF Bitcoin" → pas d'objet mobilier ✗
  - "Cherche emploi" → pas d'objet mobilier ✗
  - "Prix BoursoBank" → pas d'objet mobilier ✗
```

### 4. Augmentation du seuil de pertinence

- Passer MIN_RELEVANCE de 25 à **40** pour le vertical furniture
- Exiger un score minimum plus élevé pour éviter les faux positifs

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `supabase/functions/reddit-agent/index.ts` | Refonte de `isPostRelevantToProject` et `MARKETPLACE_PATTERNS` |

## Résultat attendu

Avant : 40+ posts dont ~5 pertinents (matelas, emploi, finance...)
Après : 5-15 posts tous pertinents (meubles d'occasion uniquement)

## Section technique

### Nouvelle fonction de filtrage

```typescript
const FURNITURE_OBJECTS = {
  fr: /meuble|canapé|sofa|table|chaise|fauteuil|lit\b|matelas|armoire|buffet|étagère|bureau|commode|bibliothèque|miroir|tapis|luminaire|dressing|rangement|penderie|placard|tiroir|tabouret|banquette|console|vitrine|secrétaire/i,
  en: /furniture|couch|sofa|table|chair|armchair|bed\b|mattress|wardrobe|dresser|shelf|desk|cabinet|bookshelf|mirror|rug|lamp|closet|drawer|stool|bench|console/i
};

const MARKETPLACE_CONTEXT = {
  fr: /vend|achet|occasion|seconde main|leboncoin|marketplace|annonce|don(ne|s)?|troc|récupèr|débarrass|cherche\s+(un|une)|où (trouver|acheter)/i,
  en: /sell|buy|used|secondhand|marketplace|thrift|flip|giv(e|ing) away|looking for|where to (find|buy)/i
};

function isPostRelevantForFurniture(post, language) {
  const text = `${post.title} ${post.body}`.toLowerCase();
  const objectPattern = language === "fr" ? FURNITURE_OBJECTS.fr : FURNITURE_OBJECTS.en;
  const contextPattern = language === "fr" ? MARKETPLACE_CONTEXT.fr : MARKETPLACE_CONTEXT.en;
  
  // MUST contain a furniture object
  if (!objectPattern.test(text)) {
    return false;
  }
  
  // BONUS if contains marketplace context
  const hasContext = contextPattern.test(text);
  
  return { relevant: true, bonus: hasContext ? 20 : 0 };
}
```

### Modifications du scoring

- `+30` : Contient objet mobilier + contexte marketplace
- `+20` : Question/aide avec objet mobilier
- `+15` : Contient keyword exact du projet
- `-50` : Aucun objet mobilier (rejeter)
