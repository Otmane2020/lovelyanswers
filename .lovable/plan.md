
# Plan : Amélioration du filtrage Reddit — ✅ IMPLÉMENTÉ

## Résumé des changements

Le système de filtrage Reddit a été entièrement refondu pour le vertical "furniture" (meubles d'occasion).

### Nouveaux patterns de filtrage

**FURNITURE_OBJECTS** (obligatoire) :
- FR: meuble, canapé, sofa, table, chaise, fauteuil, lit, matelas, armoire, buffet, étagère, bureau, commode, bibliothèque, miroir, tapis, luminaire, dressing, rangement, penderie, placard, tiroir, tabouret, banquette, console, vitrine, secrétaire...
- EN: furniture, couch, sofa, table, chair, bed, mattress, wardrobe, dresser, shelf, desk, cabinet, bookshelf, mirror, rug, lamp...

**MARKETPLACE_CONTEXT** (bonus) :
- FR: vendre, acheter, occasion, seconde main, leboncoin, marketplace, troc, récup, brocante, vide-grenier, ikea, conforama...
- EN: sell, buy, used, secondhand, marketplace, thrift, craigslist, facebook marketplace, ikea, wayfair...

### Logique de filtrage

1. **Détection automatique du vertical** via `detectVertical()`
2. **Furniture vertical** : Post DOIT contenir un terme `FURNITURE_OBJECTS`
   - Si pas d'objet mobilier → rejeté immédiatement
   - +25 points si objet mobilier présent
   - +20 points bonus si contexte marketplace
3. **Seuil de pertinence** : 40 pour furniture (vs 25 pour autres)

### Résultat attendu

- ❌ "Cherche emploi" → rejeté (pas d'objet mobilier)
- ❌ "ETF Bitcoin prix" → rejeté (pas d'objet mobilier)
- ❌ "Que faire quand on veut acheter" → rejeté (pas d'objet mobilier)
- ✅ "Où acheter un canapé d'occasion" → accepté (canapé + occasion)
- ✅ "Conseil matelas" → accepté (matelas)
- ✅ "Meuble TV pas cher" → accepté (meuble + pas cher)

## Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `supabase/functions/reddit-agent/index.ts` | Ajout FURNITURE_OBJECTS, MARKETPLACE_CONTEXT, isPostRelevantForFurniture(), mise à jour scoring |

