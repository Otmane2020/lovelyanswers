
# Correction de la Détection des Concurrents pour vends-le.fr

## Diagnostic des Problèmes

### 1. DataForSEO API non fonctionnelle
Les logs montrent clairement :
```
[COMPETITORS] No results from DataForSEO domain API: You are not authorized...
[COMPETITORS] SERP API error: You are not authorized...
[RELATED-KW] No results: You are not authorized...
```
Les identifiants DataForSEO sont incorrects ou expirés, ce qui force le système à utiliser uniquement le fallback Firecrawl.

### 2. Firecrawl Google Search retourne des médias/blogs
La recherche "alternatives meubles occasion France" retourne :
- `linfodurable.fr` (média écologie) 
- `madmoizelle.com` (magazine lifestyle)
- `debongout-paris.com` (blog déco)

Ces sites ne sont PAS des plateformes de vente d'occasion.

### 3. Le filtre de domaine est insuffisant
Le code actuel (ligne 639) filtre par mot-clé dans le domaine :
```typescript
if (['blog', 'news', 'review', 'compare', 'best', 'top', 'list'].some(w => domainWords.includes(w))) continue;
```
Mais `linfodurable` ne contient aucun de ces mots.

### 4. Le scoring AI ne rejette pas les médias
Bien que `scoreCompetitorSimilarity` devrait scorer "linfodurable" bas (c'est un média, pas une marketplace), il semble qu'il passe quand même avec un score >= 40.

---

## Solutions

### Étape 1 : Ajouter une liste de blocage pour les médias/blogs français connus

Créer une nouvelle liste `BLOCKED_MEDIA_DOMAINS` avec les médias/magazines qui apparaissent dans les SERP mais ne sont pas des concurrents :

```typescript
const BLOCKED_MEDIA_DOMAINS = new Set([
  // Médias français écologie/lifestyle
  'linfodurable.fr', 'madmoizelle.com', 'lepoint.fr', 'lefigaro.fr',
  'lemonde.fr', 'liberation.fr', 'lexpress.fr', '20minutes.fr',
  'huffingtonpost.fr', 'bfmtv.com', 'tf1info.fr', 'francetvinfo.fr',
  // Blogs déco/lifestyle
  'deco.fr', 'cotemaison.fr', 'elle.fr', 'marieclaire.fr',
  'femmeactuelle.fr', 'aufeminin.com', 'journaldesfemmes.fr',
  // Magazine/guide généralistes
  'consoglobe.com', 'radins.com', 'frenchweb.fr', 'maddyness.com',
]);
```

### Étape 2 : Améliorer `isBlockedDomain()` pour inclure les médias

Modifier la fonction pour bloquer automatiquement les médias, peu importe le contexte business :

```typescript
function isBlockedDomain(domain: string, businessContext: string = ''): boolean {
  const lower = domain.toLowerCase();
  
  // ALWAYS block media/news sites regardless of business context
  if (BLOCKED_MEDIA_DOMAINS.has(lower)) {
    console.log('[FILTER] Blocking media/blog site:', lower);
    return true;
  }
  
  // ... reste de la logique
}
```

### Étape 3 : Renforcer le prompt de scoring AI

Modifier `scoreCompetitorSimilarity` pour être plus explicite sur le rejet des médias :

```typescript
Scoring rules:
- 90-100: Same business model AND same niche (direct competitor)
- 70-89: Same business model OR same niche
- 50-69: Related industry but different model
- 30-49: Tangentially related
- 0-29: NOT a competitor (news sites, blogs, magazines, directories, media)

CRITICAL: News sites, magazines, and content portals are NEVER competitors for e-commerce/marketplace businesses. Score them 0-20.
```

### Étape 4 : Baisser le seuil de score minimum à 50

Changer la ligne 384 :
```typescript
// Avant
.filter(c => c.score >= 40)

// Après  
.filter(c => c.score >= 50) // Plus strict pour éliminer les médias
```

### Étape 5 : Vérifier les identifiants DataForSEO

Le problème principal est que DataForSEO ne fonctionne pas. Il faut :
1. Vérifier les secrets `DATAFORSEO_LOGIN` et `DATAFORSEO_PASSWORD`
2. Tester l'API directement pour confirmer que les identifiants sont valides

---

## Résumé des Fichiers à Modifier

| Fichier | Changement |
|---------|------------|
| `supabase/functions/firecrawl-scrape/index.ts` | Ajouter `BLOCKED_MEDIA_DOMAINS` |
| `supabase/functions/firecrawl-scrape/index.ts` | Modifier `isBlockedDomain()` pour bloquer les médias |
| `supabase/functions/firecrawl-scrape/index.ts` | Améliorer le prompt de scoring (ligne 837-855) |
| `supabase/functions/firecrawl-scrape/index.ts` | Changer seuil 40 → 50 (ligne 384) |

---

## Résultat Attendu

**Avant** :
```json
"competitors": ["linfodurable.fr", "lekaba.fr", "leboncoin.fr", "debongout-paris.com"]
```

**Après** :
```json
"competitors": ["leboncoin.fr", "lekaba.fr", "selency.com", "label-emmaus.co"]
```

Les médias sont exclus, seules les vraies plateformes C2C restent.

---

## Section Technique

### Nouvelle constante BLOCKED_MEDIA_DOMAINS
Position : Après `SECOND_HAND_MARKETPLACES` (ligne 774)

### Modification de isBlockedDomain()
Position : Ligne 783-803

### Modification du prompt scoreCompetitorSimilarity
Position : Ligne 837-855

### Modification du seuil de score
Position : Ligne 384
