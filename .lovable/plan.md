
# Correction de l'Onboarding - Thème Clair + Détection CMS + Langues + Concurrents

## Résumé des Problèmes Identifiés

### 1. Thème Onboarding en Mode Sombre
**Problème**: L'onboarding force actuellement le mode dark (`document.documentElement.classList.add("dark")` ligne 112)
**Solution**: Changer pour forcer le mode clair comme le DashboardLayout

### 2. Affichage des Drapeaux
**Problème**: Les drapeaux emoji utilisés (`🇫🇷`, `🇬🇧`, etc.) peuvent ne pas s'afficher correctement sur certains navigateurs/systèmes.
**Solution**: Utiliser des images SVG de drapeaux depuis une CDN fiable comme `flagcdn.com` au lieu des emojis

### 3. Détection de Langue
**Problème**: La langue est bien détectée par le backend (`firecrawl-scrape` retourne `language: "fr"`) mais le frontend ne synchronise pas toujours correctement cette valeur
**Solution**: Améliorer la logique de mise à jour du state dans `analyzeWebsite()` pour s'assurer que la langue détectée est bien utilisée

### 4. Détection CMS Manquante
**Problème**: Le backend ne détecte pas le CMS. Le champ `cms` est toujours vide dans les réponses.
**Solution**: Ajouter une fonction `detectCMSFromContent()` dans `firecrawl-scrape` qui analyse:
- Les patterns dans le HTML/markdown (wp-content, cdn.shopify.com, etc.)
- Les meta tags generator
- Les patterns de cookies/headers

### 5. Détection des Concurrents Inefficace
**Problème**: Les concurrents retournés ne sont pas pertinents (ex: `linfodurable.fr`, `repost.fashion` pour un site de meubles d'occasion)
**Solution**: Améliorer la logique de détection AI pour être plus spécifique au vertical business

---

## Changements Techniques

### Fichier 1: `src/pages/Onboarding.tsx`

**Modifications:**

1. **Thème Clair** (lignes 110-116):
```typescript
// Force light theme (was dark)
useEffect(() => {
  document.documentElement.classList.remove("dark");
  return () => {
    // No cleanup needed
  };
}, []);
```

2. **Drapeaux avec Images SVG** (lignes 37-68):
Remplacer les emojis par des URLs d'images:
```typescript
const languages = [
  { code: "en", name: "English", flag: "us" },
  { code: "en-uk", name: "English (UK)", flag: "gb" },
  { code: "fr", name: "French", flag: "fr" },
  // ... etc
];

// Dans le JSX (ligne 436):
<img 
  src={`https://flagcdn.com/w40/${lang.flag}.png`}
  alt={lang.name}
  className="w-8 h-5 object-cover rounded-sm"
/>
```

3. **Synchronisation Langue Détectée** (lignes 196-207):
Améliorer la mise à jour pour utiliser la langue détectée immédiatement:
```typescript
// Process fast result first
if (fastResult.status === 'fulfilled' && fastResult.value.data?.success) {
  const fastData = fastResult.value.data.data;
  detectedLanguage = fastData.language || "en";
  description = fastData.description || description;
}

// Override with enriched result if better
if (enrichResult.status === 'fulfilled' && enrichResult.value.data?.success) {
  const enrichData = enrichResult.value.data.data;
  // Keep enriched language if provided
  if (enrichData.language) {
    detectedLanguage = enrichData.language;
  }
  // ... rest
}
```

### Fichier 2: `supabase/functions/firecrawl-scrape/index.ts`

**Ajout de la détection CMS** (nouvelle fonction ~ligne 45):

```typescript
function detectCMSFromContent(html: string, markdown: string): string {
  const content = (html + markdown).toLowerCase();
  
  // WordPress patterns
  if (
    content.includes('/wp-content/') ||
    content.includes('/wp-includes/') ||
    content.includes('wordpress') ||
    content.includes('wp-json')
  ) {
    return 'WordPress';
  }
  
  // Shopify patterns
  if (
    content.includes('cdn.shopify.com') ||
    content.includes('myshopify.com') ||
    content.includes('shopify.shop')
  ) {
    return 'Shopify';
  }
  
  // Wix patterns
  if (
    content.includes('wix.com') ||
    content.includes('wixstatic.com') ||
    content.includes('wixsite.com')
  ) {
    return 'Wix';
  }
  
  // Webflow patterns
  if (
    content.includes('webflow.com') ||
    content.includes('assets.webflow.com')
  ) {
    return 'Webflow';
  }
  
  // Framer patterns
  if (content.includes('framer.website') || content.includes('framer.app')) {
    return 'Framer';
  }
  
  // Squarespace patterns
  if (content.includes('squarespace.com') || content.includes('sqsp.net')) {
    return 'Squarespace';
  }
  
  // Duda patterns
  if (content.includes('duda.co') || content.includes('dudaone.com')) {
    return 'Duda';
  }
  
  // BigCommerce patterns
  if (content.includes('bigcommerce.com') || content.includes('bcapp.dev')) {
    return 'BigCommerce';
  }
  
  // PrestaShop patterns
  if (content.includes('prestashop') || content.includes('presta')) {
    return 'PrestaShop';
  }
  
  // Magento patterns
  if (content.includes('magento') || content.includes('mage/')) {
    return 'Magento';
  }
  
  // WooCommerce (WordPress + WooCommerce)
  if (content.includes('woocommerce') || content.includes('wc-ajax')) {
    return 'WooCommerce';
  }
  
  return ''; // Unknown
}
```

**Intégration dans le flow principal** (lignes 138-150):
```typescript
// After scrape
const markdown = data.data?.markdown || '';
const rawHtml = data.data?.html || data.data?.rawHtml || '';

// Detect CMS from content
const cms = detectCMSFromContent(rawHtml, markdown);
console.log('[SCRAPE] CMS detected:', cms || 'unknown');

// Return with CMS in response
return new Response(
  JSON.stringify({
    success: true,
    data: {
      brandName,
      description: enrichedDescription,
      language,
      audiences,
      competitors,
      keywords,
      cms, // ADD THIS
    },
  }),
  // ...
);
```

**Note**: Pour obtenir le HTML brut, modifier la requête Firecrawl (ligne 117):
```typescript
body: JSON.stringify({
  url: formattedUrl,
  formats: ['markdown', 'html'], // Add 'html' format
  onlyMainContent: false, // Get full HTML for CMS detection
  timeout: 15000,
}),
```

### Fichier 3: `supabase/functions/firecrawl-scrape-fast/index.ts`

Même ajout de détection CMS pour cohérence:
- Ajouter la fonction `detectCMSFromContent()`
- Modifier la requête pour inclure `formats: ['markdown', 'html']`
- Retourner le CMS dans la réponse

---

## Mapping Codes Drapeaux

| Language | Code | Flag Code (flagcdn) |
|----------|------|---------------------|
| English | en | us |
| English (UK) | en-uk | gb |
| French | fr | fr |
| German | de | de |
| Spanish | es | es |
| Chinese | zh | cn |
| Portuguese | pt | pt |
| Brazilian | pt-br | br |
| Japanese | ja | jp |
| Korean | ko | kr |
| Arabic | ar | sa |
| Italian | it | it |
| Dutch | nl | nl |
| Polish | pl | pl |
| Turkish | tr | tr |
| Swedish | sv | se |
| Danish | da | dk |
| Norwegian | no | no |
| Finnish | fi | fi |
| Greek | el | gr |
| Czech | cs | cz |
| Romanian | ro | ro |
| Hungarian | hu | hu |
| Ukrainian | uk | ua |
| Hebrew | he | il |
| Hindi | hi | in |
| Thai | th | th |
| Vietnamese | vi | vn |
| Indonesian | id | id |
| Malay | ms | my |

---

## Résultat Attendu

Après ces modifications:
1. L'onboarding s'affiche en **mode clair** (fond blanc)
2. Les drapeaux s'affichent correctement sur tous les navigateurs via **images SVG flagcdn**
3. La langue est **détectée automatiquement** et pré-sélectionnée dans la grille
4. Le **CMS est détecté** (WordPress, Shopify, Wix, etc.) et affiché dans le rapport
5. Les concurrents sont plus **pertinents** grâce à l'amélioration de la détection AI

---

## Fichiers à Modifier

| Fichier | Changements |
|---------|-------------|
| `src/pages/Onboarding.tsx` | Theme clair, flags SVG, sync langue |
| `supabase/functions/firecrawl-scrape/index.ts` | Ajout détection CMS |
| `supabase/functions/firecrawl-scrape-fast/index.ts` | Ajout détection CMS |
