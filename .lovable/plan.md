

# Plan de Correction : Détection de Langue et Performance Onboarding

## Problèmes Identifiés

### 1. Détection de Langue Incorrecte (Portugais au lieu de Français)

**Cause racine :** Les algorithmes de détection dans les deux edge functions (`firecrawl-scrape-fast` et `firecrawl-scrape`) ont des conflits entre français et portugais car certains mots sont communs aux deux langues :
- `"para"` existe en portugais ET est un faux positif en français dans les URLs
- `"com"` est dans les patterns portugais mais apparaît partout dans les URLs
- Les mots courts comme `"de"`, `"que"` sont trop communs

**Solution :** Renforcer les patterns français avec des mots **exclusivement français** (accents, contractions typiques) et ajouter un **système de bonus/malus** pour éviter les faux positifs.

### 2. Transition Étape 1 → 2 trop lente (2 minutes)

**Cause racine :** Le hook `useOnboardingSession.detectLanguage()` appelle `firecrawl-scrape-fast` qui :
1. Fait un scrape complet (15s max timeout) 
2. Extrait les audiences via AI (2.5s supplémentaires)
3. Tout ça **BLOQUE** la transition vers step 2

Le problème c'est que cette détection devrait prendre ~3-5 secondes max, pas 2 minutes. Les 2 minutes suggèrent un **timeout** ou une **requête qui reste en attente**.

---

## Corrections Proposées

### A. Améliorer la Détection de Langue (Français vs Portugais)

**Fichier :** `supabase/functions/firecrawl-scrape-fast/index.ts`

Modifications à la fonction `detectLanguageFromContent()` :

1. **Ajouter des mots exclusivement français avec accents** :
   - `été`, `être`, `même`, `très`, `où`, `déjà`, `après`, `jusqu'à`
   - Contractions : `c'est`, `l'`, `d'`, `n'est`, `qu'il`

2. **Réduire les faux positifs portugais** :
   - Retirer `"para"`, `"com"` qui sont trop ambigus
   - Ajouter des mots portugais plus spécifiques : `"você"`, `"não"`, `"está"`, `"nosso"`, `"também"`

3. **Système de pondération** :
   - Mots avec accents français = poids x2
   - Contractions françaises (`c'est`, `l'un`) = poids x3

**Fichier :** `supabase/functions/firecrawl-scrape/index.ts`

Même logique améliorée dans `detectLanguageFromContent()`.

### B. Optimiser la Performance de la Détection

**Fichier :** `supabase/functions/firecrawl-scrape-fast/index.ts`

1. **Réduire le timeout** de 15s à 8s pour le scrape initial
2. **Supprimer l'extraction d'audiences** de cette fonction (non utilisée pour step 1→2, c'est le scrape enrichi qui s'en occupe)
3. **Ajouter un fallback immédiat** si le scrape prend trop longtemps

**Fichier :** `src/hooks/useOnboardingSession.ts`

1. **Ajouter un timeout côté client** de 5 secondes pour `detectLanguage()`
2. Si timeout, retourner `null` et laisser l'utilisateur choisir manuellement

---

## Détails Techniques

### A1. Nouveaux patterns français (firecrawl-scrape-fast)

```typescript
// French - avec accents et contractions (plus fiables)
'fr': [
  // Mots courants avec frontières
  /\ble\b/g, /\bla\b/g, /\bles\b/g, /\bdu\b/g, /\bet\b/g, /\bdes\b/g, /\bune\b/g, 
  /\bpour\b/g, /\bvous\b/g, /\bnous\b/g, /\bvotre\b/g, /\bnotre\b/g, /\bsur\b/g, 
  /\bavec\b/g, /\bdans\b/g, /\bplus\b/g,
  // Mots exclusivement français (score x2)
  /\bcette\b/g, /\bces\b/g, /\baux\b/g, /\bchez\b/g, /\bsont\b/g, /\baussi\b/g, 
  /\btrès\b/g, /\bcomme\b/g, /\btout\b/g, /\btoute\b/g, /\bfaire\b/g,
  // Accents français (poids élevé - score x3)
  /\bêtre\b/g, /\bété\b/g, /\boù\b/g, /\bdéjà\b/g, /\baprès\b/g, /\bmême\b/g,
  // Contractions françaises (très fiables - score x3)
  /\bc'est\b/g, /\bqu'il\b/g, /\bqu'elle\b/g, /\bn'est\b/g, /\bj'ai\b/g, /\bl'un\b/g,
],

// Portuguese - mots plus spécifiques
'pt': [
  /\bsão\b/g, /\bnão\b/g, /\bvocê\b/g, /\bestá\b/g, /\bnosso\b/g, /\bnossa\b/g, 
  /\btambém\b/g, /\bmuito\b/g, /\baquí\b/g, /\bpelo\b/g, /\bpela\b/g, 
  /\besse\b/g, /\bessa\b/g, /\bisso\b/g, /\bquando\b/g, /\bseus\b/g,
],
```

### A2. Système de scoring pondéré

```typescript
for (const [lang, patterns] of Object.entries(languagePatterns)) {
  let score = 0;
  for (const pattern of patterns) {
    const matches = sampleText.match(pattern);
    if (matches) {
      // Bonus pour les mots avec accents ou contractions
      const isAccented = pattern.source.includes('é') || pattern.source.includes('è') 
                      || pattern.source.includes('ê') || pattern.source.includes('à');
      const isContraction = pattern.source.includes("'");
      
      const weight = isContraction ? 3 : (isAccented ? 2 : 1);
      score += matches.length * weight;
    }
  }
  
  if (score > maxScore) {
    maxScore = score;
    detectedLang = lang;
  }
}
```

### B1. Timeout côté client (useOnboardingSession.ts)

```typescript
const detectLanguage = useCallback(async (url: string): Promise<string | null> => {
  if (!url) return null;
  
  setIsDetectingLanguage(true);
  
  // Timeout de 5 secondes max
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const { data: res, error } = await supabase.functions.invoke('firecrawl-scrape-fast', {
      body: { url },
    });

    clearTimeout(timeoutId);

    if (error || !res?.success) {
      setIsDetectingLanguage(false);
      return null;
    }

    const detected = res.data?.language;
    // ...
  } catch {
    clearTimeout(timeoutId);
    // Silent fail - user can choose manually
  }
  
  setIsDetectingLanguage(false);
  return null;
}, []);
```

### B2. Simplifier firecrawl-scrape-fast (supprimer audiences)

La fonction actuelle fait :
1. Scrape (nécessaire) ✓
2. Détection CMS (utile) ✓
3. Détection langue (nécessaire) ✓
4. **Extraction audiences via AI** ← **À SUPPRIMER** (ralentit de 2-3s)

Les audiences seront extraites par `firecrawl-scrape` en parallèle pendant l'étape d'analyse.

---

## Résumé des Changements

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/firecrawl-scrape-fast/index.ts` | Améliorer patterns FR/PT, retirer extraction audiences, réduire timeout |
| `supabase/functions/firecrawl-scrape/index.ts` | Améliorer patterns FR/PT (même logique) |
| `src/hooks/useOnboardingSession.ts` | Ajouter timeout 5s côté client |

**Résultat attendu :**
- Détection français correcte pour canapedeluxe.com
- Transition étape 1→2 en **3-5 secondes** max au lieu de 2 minutes
- Fallback gracieux si timeout → l'utilisateur choisit manuellement

