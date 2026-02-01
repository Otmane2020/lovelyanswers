
# Correction de la Détection des Concurrents pour vends-le.fr

## Problèmes Identifiés

### 1. Leboncoin est dans la liste des domaines bloqués
**Fichier** : `supabase/functions/firecrawl-scrape/index.ts`  
**Ligne** : 787  
**Code actuel** :
```typescript
// French marketplaces
'cdiscount.com', 'leboncoin.fr', 'fnac.com', 'darty.com',
```
**Problème** : Leboncoin est un concurrent DIRECT pour un site de vente d'occasion comme vends-le.fr, mais il est bloqué comme "marketplace généraliste".

### 2. La liste de blocage est trop agressive
Les marketplaces françaises comme Leboncoin, Vinted sont bloquées car elles ont été catégorisées comme "génériques" alors qu'elles sont des concurrents directs pour certains verticaux.

### 3. Le scoring AI ne corrige pas ce problème
Le scoring se fait APRÈS le filtrage, donc les bons concurrents sont déjà éliminés avant d'être évalués.

---

## Solution Proposée

### Étape 1 : Créer une liste de blocage contextuelle
Au lieu d'une liste statique, adapter le blocage selon le type de business détecté.

**Logique** :
```
Si business_type contient "occasion", "seconde main", "vente entre particuliers" :
  → NE PAS bloquer : leboncoin.fr, vinted.fr, videdressing.com, selency.com
  
Sinon (business SaaS, e-commerce classique) :
  → Bloquer les marketplaces génériques
```

### Étape 2 : Modifier la fonction `isBlockedDomain()`
**Avant** (statique) :
```typescript
function isBlockedDomain(domain: string): boolean {
  const lower = domain.toLowerCase();
  if (BLOCKED_DOMAINS.has(lower)) return true;
  // ...
}
```

**Après** (contextuel) :
```typescript
function isBlockedDomain(domain: string, businessContext: string): boolean {
  const lower = domain.toLowerCase();
  
  // Marketplaces seconde main - débloquées si business = occasion
  const secondHandMarketplaces = [
    'leboncoin.fr', 'vinted.fr', 'selency.com', 'videdressing.com',
    'vestiaire-collective.com', 'backmarket.fr'
  ];
  
  // Si le business est "occasion/seconde main", autoriser ces domaines
  const isSecondHandBusiness = /occasion|seconde main|vente entre particuliers|marketplace C2C|vendre.*meubles/i.test(businessContext);
  
  if (isSecondHandBusiness && secondHandMarketplaces.some(m => lower.includes(m))) {
    return false; // Pas bloqué = concurrent valide
  }
  
  // Sinon, logique standard
  if (BLOCKED_DOMAINS.has(lower)) return true;
  // ...
}
```

### Étape 3 : Passer le contexte business au filtrage
Modifier les appels à `isBlockedDomain()` pour inclure `businessType` détecté par l'IA.

**Fichiers à modifier** :
- Ligne 329 : `fetchCompetitorsFast()` → ajouter paramètre `businessContext`
- Ligne 336 : `fetchCompetitorsFromSERP()` → ajouter paramètre `businessContext`
- Ligne 360 : `findCompetitorsViaGoogleSearch()` → déjà a accès à `description`

### Étape 4 : Limiter à 4 concurrents maximum
**Ligne 389** (actuelle) :
```typescript
.slice(0, 5)
```

**Nouvelle valeur** :
```typescript
.slice(0, 4) // Maximum 4 concurrents pertinents
```

---

## Résumé des Modifications

| Fichier | Changement |
|---------|------------|
| `supabase/functions/firecrawl-scrape/index.ts` | Ajouter liste `SECOND_HAND_MARKETPLACES` |
| `supabase/functions/firecrawl-scrape/index.ts` | Modifier `isBlockedDomain()` pour accepter `businessContext` |
| `supabase/functions/firecrawl-scrape/index.ts` | Passer `businessTypeQuery` à toutes les fonctions de filtrage |
| `supabase/functions/firecrawl-scrape/index.ts` | Changer `.slice(0, 5)` → `.slice(0, 4)` |

---

## Résultat Attendu pour vends-le.fr

**Avant** :
```json
"competitors": ["lekaba.fr", "label-emmaus.co", "linfodurable.fr", "debongout-paris.com"]
```

**Après** :
```json
"competitors": ["leboncoin.fr", "vinted.fr", "selency.com", "lekaba.fr"]
```

Concurrents pertinents = plateformes de vente d'occasion C2C/B2C en France.
