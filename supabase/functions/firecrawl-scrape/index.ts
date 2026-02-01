const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Content-based language detection - more reliable than HTML meta tag
function detectLanguageFromContent(content: string, metaLang: string): string {
  const text = content.toLowerCase().substring(0, 3000);
  
  // Common words per language (high frequency, unique to each language)
  const langPatterns: Record<string, string[]> = {
    en: ['the', 'and', 'you', 'for', 'are', 'with', 'your', 'our', 'this', 'that', 'have', 'from', 'they', 'will', 'what'],
    fr: ['les', 'des', 'pour', 'vous', 'avec', 'dans', 'notre', 'votre', 'cette', 'sont', 'nous', 'leurs', 'peut', 'faire', 'tout'],
    de: ['und', 'die', 'der', 'für', 'mit', 'auf', 'ist', 'sie', 'werden', 'haben', 'das', 'auch', 'sind', 'oder', 'eine'],
    es: ['los', 'las', 'para', 'con', 'por', 'del', 'una', 'sus', 'como', 'esta', 'que', 'son', 'más', 'pero', 'todo'],
    it: ['che', 'per', 'non', 'con', 'una', 'sono', 'della', 'questo', 'anche', 'come', 'essere', 'loro', 'tutti', 'dalla'],
    pt: ['que', 'para', 'com', 'uma', 'são', 'mais', 'como', 'pelo', 'pela', 'quando', 'seus', 'esse', 'esta', 'isso'],
  };
  
  const scores: Record<string, number> = {};
  
  for (const [lang, words] of Object.entries(langPatterns)) {
    scores[lang] = words.filter(w => {
      // Match whole words with spaces around them
      const regex = new RegExp(`\\s${w}\\s`, 'gi');
      return regex.test(` ${text} `);
    }).length;
  }
  
  // Find the language with the highest score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  
  // If significant score (>4 words found), use content detection
  if (best && best[1] > 4) {
    console.log('[LANG] Content scores:', scores, '-> detected:', best[0]);
    return best[0];
  }
  
  // Fallback to metadata language
  console.log('[LANG] Low confidence, using meta:', metaLang);
  return metaLang;
}

// CMS detection from HTML content
function detectCMSFromContent(html: string, markdown: string): string {
  const content = (html + ' ' + markdown).toLowerCase();
  
  // WooCommerce (check first - it's WordPress + WooCommerce)
  if (content.includes('woocommerce') || content.includes('wc-ajax') || content.includes('wc-block')) {
    return 'WooCommerce';
  }
  
  // WordPress patterns
  if (
    content.includes('/wp-content/') ||
    content.includes('/wp-includes/') ||
    content.includes('wp-json') ||
    content.includes('wordpress.org') ||
    content.includes('wp-block')
  ) {
    return 'WordPress';
  }
  
  // Shopify patterns
  if (
    content.includes('cdn.shopify.com') ||
    content.includes('myshopify.com') ||
    content.includes('shopify.shop') ||
    content.includes('shopify-section')
  ) {
    return 'Shopify';
  }
  
  // Wix patterns
  if (
    content.includes('wix.com') ||
    content.includes('wixstatic.com') ||
    content.includes('wixsite.com') ||
    content.includes('_wix_browser_')
  ) {
    return 'Wix';
  }
  
  // Webflow patterns
  if (
    content.includes('webflow.com') ||
    content.includes('assets.webflow.com') ||
    content.includes('w-webflow')
  ) {
    return 'Webflow';
  }
  
  // Framer patterns
  if (
    content.includes('framer.website') ||
    content.includes('framer.app') ||
    content.includes('framerusercontent.com')
  ) {
    return 'Framer';
  }
  
  // Squarespace patterns
  if (
    content.includes('squarespace.com') ||
    content.includes('sqsp.net') ||
    content.includes('squarespace-cdn')
  ) {
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
  if (content.includes('prestashop') || content.includes('/modules/ps_')) {
    return 'PrestaShop';
  }
  
  // Magento patterns
  if (content.includes('magento') || content.includes('mage/') || content.includes('varien')) {
    return 'Magento';
  }
  
  // Ghost patterns
  if (content.includes('ghost.org') || content.includes('ghost-portal')) {
    return 'Ghost';
  }
  
  // Drupal patterns
  if (content.includes('drupal.org') || content.includes('/sites/default/files')) {
    return 'Drupal';
  }
  
  // Joomla patterns
  if (content.includes('joomla') || content.includes('/media/com_')) {
    return 'Joomla';
  }
  
  // HubSpot patterns
  if (content.includes('hubspot.com') || content.includes('hs-scripts')) {
    return 'HubSpot';
  }
  
  return ''; // Unknown CMS
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format before processing
    const urlString = String(url).trim();
    
    // Quick validation: URL should be short and look like a domain
    if (urlString.length > 500 || urlString.includes('\n') || urlString.includes('  ')) {
      console.error('Invalid URL format - too long or contains invalid characters:', urlString.substring(0, 100));
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid URL format. Please provide a valid domain like example.com' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for valid URL pattern
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;
    if (!urlPattern.test(urlString)) {
      console.error('URL does not match valid pattern:', urlString.substring(0, 100));
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid URL format. Please provide a valid domain like example.com' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Priority: custom key > connector key
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY_CUSTOM') || Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[SCRAPE] Using API key:', Deno.env.get('FIRECRAWL_API_KEY_CUSTOM') ? 'CUSTOM' : 'CONNECTOR');

    // Format URL
    let formattedUrl = urlString;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const ownDomain = new URL(formattedUrl).hostname.replace('www.', '').toLowerCase();
    console.log('[SCRAPE] Starting fast analysis for:', ownDomain);

    const startTime = Date.now();

    // ============= STEP 1: Scrape + Competitors in PARALLEL =============
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const dfLogin = Deno.env.get('DATAFORSEO_LOGIN');
    const dfPassword = Deno.env.get('DATAFORSEO_PASSWORD');

    // Start all requests in parallel
    const scrapePromise = fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown', 'html'], // Include HTML for CMS detection
        onlyMainContent: false, // Full HTML needed for CMS detection
        timeout: 15000,
      }),
    });

    // Wait for scrape
    const response = await scrapePromise;
    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || 'Scrape failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[SCRAPE] Firecrawl done in', Date.now() - startTime, 'ms');

    // Extract metadata
    const metadata = data.data?.metadata || {};
    const markdown = data.data?.markdown || '';
    const rawHtml = data.data?.html || data.data?.rawHtml || '';
    const title = metadata.title || '';
    let description = metadata.description || metadata.ogDescription || '';
    
    // Detect CMS from HTML content
    const cms = detectCMSFromContent(rawHtml, markdown);
    console.log('[SCRAPE] CMS detected:', cms || 'unknown');
    
    // Detect language from content (more reliable than metadata)
    // Handle metadata.language being either a string or an array
    const rawLang = metadata.language;
    const metaLang = (Array.isArray(rawLang) ? rawLang[0] : rawLang)?.substring?.(0, 2) || 'en';
    const language = detectLanguageFromContent(markdown, metaLang);
    console.log('[SCRAPE] Language: meta=' + metaLang + ', detected=' + language);

    // Extract brand name
    let brandName = title.split('|')[0].split('-')[0].split('—')[0].split(':')[0].trim();
    if (!brandName || brandName.length < 2) {
      brandName = ownDomain.split('.')[0];
      brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
    }

    // Clean description
    const cleanMarkdown = (text: string): string => {
      return text
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/https?:\/\/[^\s)]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    let enrichedDescription = cleanMarkdown(description);
    if (enrichedDescription.length < 100) {
      const paragraphs = markdown.substring(0, 3000).split(/\n\n+/).filter((p: string) => 
        p.length > 50 && !p.startsWith('#') && !p.startsWith('!')
      );
      if (paragraphs.length > 0) {
        enrichedDescription = cleanMarkdown(paragraphs[0]).substring(0, 400);
      }
    }

    // ============= STEP 2: Extract Keywords FIRST (needed for competitor detection) =============
    // Use a sampled context from the whole page (top + middle + bottom) so keywords reflect the full scroll.
    const midStart = Math.max(0, Math.floor(markdown.length / 2) - 1500);
    const midEnd = Math.min(markdown.length, midStart + 3000);

    const contentPreview = [
      markdown.substring(0, 3000),
      markdown.substring(midStart, midEnd),
      markdown.substring(Math.max(0, markdown.length - 3000)),
    ]
      .filter(Boolean)
      .join("\n\n")
      .substring(0, 9000);

    // Extract keywords first - they'll be used for AI competitor fallback
    const keywordsPromise = lovableApiKey
      ? extractKeywordsFast(enrichedDescription, contentPreview, brandName, language, lovableApiKey)
      : Promise.resolve([]);

    // ============= STEP 3: Audiences + Keywords in PARALLEL =============
    const [audiences, keywords] = await Promise.all([
      lovableApiKey ? extractAudiencesFast(enrichedDescription, contentPreview, language, lovableApiKey) : Promise.resolve([]),
      keywordsPromise,
    ]);

    // ============= STEP 4: Competitors detection with multi-source + scoring =============
    let rawCompetitors: string[] = [];
    
    // Get business type EARLY for contextual filtering (pass keywords for better niche detection)
    const businessTypeQuery = lovableApiKey 
      ? await detectBusinessType(enrichedDescription, contentPreview, brandName, language, lovableApiKey, keywords)
      : enrichedDescription;
    
    console.log('[COMPETITORS] Business context for filtering:', businessTypeQuery.substring(0, 100));
    
    // SOURCE 1: DataForSEO Domain Competitors API
    if (dfLogin && dfPassword) {
      rawCompetitors = await fetchCompetitorsFast(ownDomain, dfLogin, dfPassword, language, businessTypeQuery);
      console.log('[COMPETITORS] Source 1 (Domain API):', rawCompetitors.length, 'results');
    }
    
    // SOURCE 2: DataForSEO SERP-based detection (if Source 1 returned < 3)
    if (rawCompetitors.length < 3 && dfLogin && dfPassword && keywords.length > 0) {
      console.log('[COMPETITORS] Trying SERP-based detection...');
      const serpCompetitors = await fetchCompetitorsFromSERP(keywords, ownDomain, dfLogin, dfPassword, language, businessTypeQuery);
      
      // Merge unique domains
      for (const c of serpCompetitors) {
        if (!rawCompetitors.includes(c)) rawCompetitors.push(c);
      }
      console.log('[COMPETITORS] Source 2 (SERP API):', serpCompetitors.length, 'new, total:', rawCompetitors.length);
    }
    
    // SOURCE 3: Related Keywords expansion for niche competitors (always try if we have keywords)
    if (dfLogin && dfPassword && keywords.length > 0 && rawCompetitors.length < 5) {
      console.log('[COMPETITORS] Trying Related Keywords expansion...');
      const nicheCompetitors = await fetchCompetitorsViaRelatedKeywords(keywords, ownDomain, dfLogin, dfPassword, language, businessTypeQuery);
      
      // Merge unique domains
      for (const c of nicheCompetitors) {
        if (!rawCompetitors.includes(c)) rawCompetitors.push(c);
      }
      console.log('[COMPETITORS] Source 3 (Related Keywords):', nicheCompetitors.length, 'new, total:', rawCompetitors.length);
    }
    
    // SOURCE 4: Google Search via Firecrawl (final fallback)
    if (rawCompetitors.length < 3 && apiKey) {
      console.log('[COMPETITORS] Using AI-powered Google Search fallback...');
      const googleCompetitors = await findCompetitorsViaGoogleSearch(enrichedDescription, brandName, ownDomain, language, apiKey, keywords, contentPreview, businessTypeQuery);
      
      // Merge unique domains
      for (const c of googleCompetitors) {
        if (!rawCompetitors.includes(c)) rawCompetitors.push(c);
      }
      console.log('[COMPETITORS] Source 4 (Google Search):', googleCompetitors.length, 'new, total:', rawCompetitors.length);
    }
    
    // SCORING: Score competitors by business similarity
    let competitors: string[] = rawCompetitors.slice(0, 8); // Max 8 for scoring
    
    if (lovableApiKey && competitors.length > 0 && (enrichedDescription || businessTypeQuery)) {
      console.log('[COMPETITORS] Scoring by business similarity...');
      const scoredCompetitors = await scoreCompetitorSimilarity(
        competitors,
        enrichedDescription,
        businessTypeQuery,
        language,
        lovableApiKey
      );
      
      // Filter out low-scoring competitors (< 50) and sort by score descending - stricter to exclude media
      competitors = scoredCompetitors
        .filter(c => c.score >= 50)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4) // Maximum 4 high-quality competitors
        .map(c => c.domain);
      
      console.log('[COMPETITORS] After scoring:', competitors.length, 'high-quality competitors');
    } else {
      competitors = competitors.slice(0, 4); // Maximum 4 competitors
    }

    console.log('[SCRAPE] Total time:', Date.now() - startTime, 'ms');
    console.log('[SCRAPE] Found', audiences.length, 'audiences,', competitors.length, 'competitors,', keywords.length, 'keywords');

    // ============= STEP 5: Generate Q&A + SEO Titles from Competitors =============
    const qaSeo = lovableApiKey && competitors.length >= 2 && keywords.length >= 5
      ? await generateQaAndSeoTitlesFromCompetitors(competitors, keywords, language, lovableApiKey)
      : [];
    
    console.log('[SCRAPE] Generated', qaSeo.length, 'Q&A items');
    console.log('[SCRAPE] Final time:', Date.now() - startTime, 'ms');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          brandName,
          description: enrichedDescription,
          language,
          audiences: audiences.length >= 2 ? audiences : ['business owners', 'professionals', 'decision makers'],
          competitors,
          keywords: keywords.length >= 5 ? keywords : [],
          cms,
          qaSeo,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fast audience extraction with timeout
async function extractAudiencesFast(description: string, content: string, language: string, apiKey: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s max

    const langInstruction = language === 'fr' ? 'Réponds en FRANÇAIS.' : 'Respond in ENGLISH.';
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite', // Fastest model
        messages: [{
          role: 'user',
          content: `Extract 4 specific target audiences for this business. ${langInstruction}
Description: ${description}
Content: ${content.substring(0, 1000)}
Return ONLY a JSON array: ["audience1", "audience2", "audience3", "audience4"]`
        }],
        temperature: 0.2,
        max_tokens: 150,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const match = text.match(/\[[\s\S]*?\]/);
    
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed.slice(0, 5);
    }
    return [];
  } catch (e) {
    console.error('[AUDIENCES] Error:', e);
    return [];
  }
}

// AI-powered business type detection for accurate competitor search
async function detectBusinessType(
  description: string, 
  content: string, 
  brandName: string, 
  language: string, 
  apiKey: string,
  keywords: Array<{keyword: string, intent: string}> = []
): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Extract top keywords to help AI understand the niche better
    const topKeywords = keywords
      .filter(k => k.intent === 'commercial' || k.intent === 'transactional')
      .slice(0, 5)
      .map(k => k.keyword)
      .join(', ');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{
          role: 'user',
          content: `Analyze this business and return a SHORT search query (max 6 words) to find similar competitors.

Business: ${brandName}
Description: ${description}
${topKeywords ? `Top keywords: ${topKeywords}` : ''}
Content sample: ${content.substring(0, 1200)}

Rules:
- USE THE KEYWORDS to understand the exact niche (e.g., "meubles occasion" = used furniture marketplace)
- Identify the EXACT business type (e.g., "marketplace vente meubles occasion" NOT "furniture store")
- Return a query that would find DIRECT TRANSACTIONAL competitors (sites where users can BUY/SELL)
- Language: ${language === 'fr' ? 'FRENCH' : 'ENGLISH'}
- Include "sites" or "plateformes" in the query
- Be SPECIFIC about the business model (marketplace C2C, e-commerce, etc.)
- NEVER include news/media/blog terms

Return ONLY the search query, nothing else. Example: "plateformes vente meubles occasion France"`
        }],
        temperature: 0.1,
        max_tokens: 50,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return '';

    const data = await response.json();
    const query = data.choices?.[0]?.message?.content?.trim() || '';
    console.log('[COMPETITORS] AI detected business query:', query);
    return query;
  } catch (e) {
    console.error('[COMPETITORS] Business type detection error:', e);
    return '';
  }
}

// Find competitors via Google Search using Firecrawl - KEYWORD-FIRST approach
// Uses actual transactional keywords like "meubles occasion" for precise results
async function findCompetitorsViaGoogleSearch(
  description: string,
  brandName: string,
  domain: string,
  language: string,
  firecrawlApiKey: string,
  extractedKeywords: Array<{keyword: string, intent: string}> = [],
  contentSample: string = '',
  businessContext: string = ''
): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // PRIORITY 1: Use transactional/commercial keywords DIRECTLY (like "meubles occasion")
    // This simulates what a real user would search on Google
    const transactionalKeywords = extractedKeywords
      .filter(k => k.intent === 'transactional' || k.intent === 'commercial')
      .slice(0, 3)
      .map(k => k.keyword);
    
    let searchQuery = '';
    
    if (transactionalKeywords.length > 0) {
      // Use the BEST keyword directly - no need to add "alternatives" which pollutes results
      // "meubles occasion" finds leboncoin, troc.com, selency directly
      searchQuery = transactionalKeywords[0];
      console.log('[COMPETITORS] Using direct keyword search:', searchQuery);
    } else if (businessContext && businessContext.length > 5 && businessContext.length < 100) {
      // PRIORITY 2: Use AI-detected business context
      searchQuery = businessContext;
      console.log('[COMPETITORS] Using business context:', searchQuery);
    } else {
      // PRIORITY 3: Ultimate fallback with brand
      searchQuery = language === 'fr'
        ? `sites comme ${brandName}`
        : `sites like ${brandName}`;
      console.log('[COMPETITORS] Using brand fallback:', searchQuery);
    }

    // Run multiple searches in parallel for better coverage
    const searchQueries = [searchQuery];
    
    // Add second keyword if available (e.g., "vendre meubles occasion")
    if (transactionalKeywords.length > 1 && transactionalKeywords[1] !== searchQuery) {
      searchQueries.push(transactionalKeywords[1]);
    }
    
    console.log('[COMPETITORS] Search queries:', searchQueries);

    // Execute searches in parallel
    const searchPromises = searchQueries.map(async (query) => {
      const response = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: 12,
          lang: language === 'fr' ? 'fr' : 'en',
          country: language === 'fr' ? 'FR' : 'US',
        }),
        signal: controller.signal,
      });
      
      if (!response.ok) return [];
      const data = await response.json();
      return data.success && data.data ? data.data : [];
    });
    
    const searchResults = await Promise.all(searchPromises);
    const allResults = searchResults.flat();

    clearTimeout(timeout);

    if (allResults.length === 0) {
      console.log('[COMPETITORS] No search results from Firecrawl');
      return [];
    }
    
    console.log('[COMPETITORS] Total search results:', allResults.length);

    const ownDomainBase = domain.split('.')[0].toLowerCase();
    const competitors: string[] = [];
    const seenDomains = new Set<string>();

    for (const result of allResults) {
      try {
        const url = result.url || result.sourceURL || '';
        if (!url) continue;
        
        const urlObj = new URL(url);
        const resultDomain = urlObj.hostname.replace('www.', '').toLowerCase();
        
        // Use global isBlockedDomain with business context for smart filtering
        if (isBlockedDomain(resultDomain, businessContext)) continue;
        
        // Skip own domain
        if (resultDomain.includes(ownDomainBase)) continue;
        
        // Skip already seen
        if (seenDomains.has(resultDomain)) continue;
        
        // Skip generic TLDs that are likely not competitors
        if (resultDomain.endsWith('.gov') || resultDomain.endsWith('.edu') || resultDomain.endsWith('.org')) continue;
        
        // Skip if result domain contains generic words suggesting it's a directory/blog
        const domainWords = resultDomain.split('.')[0].toLowerCase();
        if (['blog', 'news', 'review', 'compare', 'best', 'top', 'list'].some(w => domainWords.includes(w))) continue;
        
        seenDomains.add(resultDomain);
        competitors.push(resultDomain);
        
        if (competitors.length >= 8) break; // Get more candidates for scoring
      } catch {
        // Invalid URL, skip
      }
    }

    console.log('[COMPETITORS] Google search found:', competitors);
    return competitors;

  } catch (e) {
    console.error('[COMPETITORS] Google search error:', e);
    return [];
  }
}

// AI-based keyword extraction for AEO
async function extractKeywordsFast(description: string, content: string, brandName: string, language: string, apiKey: string): Promise<Array<{keyword: string, intent: string}>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const langInstruction = language === 'fr'
      ? 'Génère des mots-clés en FRANÇAIS adaptés au marché francophone.'
      : 'Generate keywords in ENGLISH.';

    // Content is already sampled across the page; keep it reasonably sized for speed.
    const contentForModel = content.substring(0, 5000);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{
          role: 'user',
          content: `Extract 18-22 SEO/AEO keywords for this business. ${langInstruction}

Business: ${brandName}
Description: ${description}
Page content (sampled from top/middle/bottom): ${contentForModel}

Rules:
- Include a mix of:
  - Head terms (1-2 words)
  - Long-tail keywords (3-6 words)
  - Question-based keywords (how/what/why/when)
  - Comparison keywords (vs, alternative, best)
  - Intent keywords (buy, price, review, tutorial)
- Avoid generic words ("home", "welcome", etc.)
- Classify each keyword intent: informational, transactional, navigational, commercial

Return ONLY a JSON array:
[{"keyword":"...","intent":"informational"}, ...]`
        }],
        temperature: 0.4,
        max_tokens: 700,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const match = text.match(/\[[\s\S]*?\]/);

    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        console.log('[KEYWORDS] Extracted:', parsed.length, 'keywords');
        return parsed.slice(0, 22);
      }
    }
    return [];
  } catch (e) {
    console.error('[KEYWORDS] Error:', e);
    return [];
  }
}

// Location codes for DataForSEO based on language
function getLocationCode(language: string): number {
  const locations: Record<string, number> = {
    'fr': 2250,  // France
    'de': 2276,  // Germany
    'es': 2724,  // Spain
    'it': 2380,  // Italy
    'pt': 2076,  // Brazil (Portuguese)
    'en': 2840,  // USA (default for English)
  };
  return locations[language] || 2840;
}

// Blocked domains list - comprehensive
const BLOCKED_DOMAINS = new Set([
  // Social media
  'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 
  'youtube.com', 'tiktok.com', 'pinterest.com', 'x.com',
  // Search engines
  'google.com', 'google.fr', 'google.de', 'bing.com', 'yahoo.com',
  // Marketplaces (only generic ones like Amazon)
  'amazon.com', 'amazon.fr', 'amazon.de', 'ebay.com', 'ebay.fr', 'etsy.com',
  // Generic platforms
  'shopify.com', 'wix.com', 'wordpress.com', 'wordpress.org', 'squarespace.com', 
  'webflow.com', 'medium.com', 'substack.com', 'notion.so', 'canva.com',
  // Review/directory sites
  'trustpilot.com', 'yelp.com', 'tripadvisor.com', 'pagesjaunes.fr',
  'g2.com', 'capterra.com', 'getapp.com', 'softwareadvice.com',
  // Wikipedia
  'wikipedia.org', 'wikimedia.org',
  // Tech sites
  'reddit.com', 'quora.com', 'stackoverflow.com', 'github.com',
  'techcrunch.com', 'producthunt.com', 'crunchbase.com',
  // App stores
  'apps.shopify.com', 'play.google.com', 'apps.apple.com',
  // French retail (NOT second-hand)
  'cdiscount.com', 'fnac.com', 'darty.com',
]);

// Second-hand / C2C marketplaces - these should be ALLOWED for relevant businesses
const SECOND_HAND_MARKETPLACES = new Set([
  'leboncoin.fr', 'vinted.fr', 'vinted.com', 'selency.com', 'videdressing.com',
  'vestiaire-collective.com', 'backmarket.fr', 'backmarket.com', 
  'rebuy.fr', 'momox.fr', 'rakuten.fr', 'label-emmaus.co',
  'paruvendu.fr', 'trocvestiaire.com', 'depop.com',
]);

// BLOCKED: Media, news, magazines, blogs that appear in SERP but are NOT competitors
const BLOCKED_MEDIA_DOMAINS = new Set([
  // Médias français écologie/lifestyle
  'linfodurable.fr', 'madmoizelle.com', 'lepoint.fr', 'lefigaro.fr',
  'lemonde.fr', 'liberation.fr', 'lexpress.fr', '20minutes.fr',
  'huffingtonpost.fr', 'bfmtv.com', 'tf1info.fr', 'francetvinfo.fr',
  'rtl.fr', 'europe1.fr', 'rmc.bfmtv.com', 'leparisien.fr',
  // Blogs déco/lifestyle
  'deco.fr', 'cotemaison.fr', 'elle.fr', 'marieclaire.fr',
  'femmeactuelle.fr', 'aufeminin.com', 'journaldesfemmes.fr',
  'maison-travaux.fr', 'maisonapart.com', 'houzz.fr',
  // Magazine/guide généralistes
  'consoglobe.com', 'radins.com', 'frenchweb.fr', 'maddyness.com',
  'debongout-paris.com', 'neonmag.fr', 'konbini.com', 'melty.fr',
  // English media
  'forbes.com', 'businessinsider.com', 'techcrunch.com', 'theguardian.com',
  'nytimes.com', 'washingtonpost.com', 'bbc.com', 'cnn.com',
]);

// Detect if the business context indicates a second-hand / C2C marketplace
function isSecondHandBusiness(businessContext: string): boolean {
  if (!businessContext) return false;
  const lowerContext = businessContext.toLowerCase();
  return /occasion|seconde.?main|vente.?entre.?particuliers|marketplace.?c2c|vendre.*(meubles|objets|vêtements)|achat.?revente|brocante|dépôt.?vente|reconditionné|second.?hand|resale|peer.?to.?peer|used.?items|classifieds|preloved/i.test(lowerContext);
}

function isBlockedDomain(domain: string, businessContext: string = ''): boolean {
  const lower = domain.toLowerCase();
  
  // ALWAYS block media/news sites regardless of business context
  if (BLOCKED_MEDIA_DOMAINS.has(lower)) {
    console.log('[FILTER] Blocking media/blog site:', lower);
    return true;
  }
  
  // If it's a second-hand marketplace AND the business is in second-hand vertical, ALLOW it
  if (SECOND_HAND_MARKETPLACES.has(lower) && isSecondHandBusiness(businessContext)) {
    console.log('[FILTER] Allowing second-hand marketplace for this vertical:', lower);
    return false; // NOT blocked = valid competitor
  }
  
  // If it's a second-hand marketplace but business is NOT second-hand, block it
  if (SECOND_HAND_MARKETPLACES.has(lower)) {
    return true;
  }
  
  // Standard blocking logic
  if (BLOCKED_DOMAINS.has(lower)) return true;
  for (const blocked of BLOCKED_DOMAINS) {
    if (lower.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

// ============= BUSINESS SIMILARITY SCORING =============
// Score competitors by how similar their business type is to ours
interface CompetitorWithScore {
  domain: string;
  score: number;
  intersections?: number;
  avgPosition?: number;
}

async function scoreCompetitorSimilarity(
  competitors: string[],
  businessDescription: string,
  businessType: string,
  language: string,
  apiKey: string
): Promise<CompetitorWithScore[]> {
  if (!competitors.length || !apiKey) return competitors.map(d => ({ domain: d, score: 50 }));
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const langInstruction = language === 'fr' ? 'Réponds en JSON.' : 'Respond in JSON.';
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{
          role: 'user',
          content: `Score each competitor by business similarity (0-100). ${langInstruction}

Our business: ${businessDescription.substring(0, 500)}
Business type/niche: ${businessType}

Competitors to score:
${competitors.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Scoring rules:
- 90-100: Same business model AND same niche (direct competitor)
- 70-89: Same business model OR same niche  
- 50-69: Related industry but different model
- 30-49: Tangentially related
- 0-29: NOT a competitor (news sites, blogs, magazines, directories, media portals)

CRITICAL: News sites, magazines, content portals, and media outlets are NEVER competitors for e-commerce/marketplace businesses. Score them 0-20 maximum. Examples: linfodurable.fr, madmoizelle.com, 20minutes.fr = score 0-15.

Return ONLY JSON array: [{"domain":"...","score":85,"reason":"..."}]`
        }],
        temperature: 0.1,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return competitors.map(d => ({ domain: d, score: 50 }));

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const match = text.match(/\[[\s\S]*?\]/);

    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        console.log('[SCORING] AI similarity scores:', parsed.map((p: any) => `${p.domain}:${p.score}`).join(', '));
        return parsed.map((p: any) => ({
          domain: p.domain,
          score: typeof p.score === 'number' ? p.score : 50,
        }));
      }
    }
    
    return competitors.map(d => ({ domain: d, score: 50 }));
  } catch (e) {
    console.error('[SCORING] Error:', e);
    return competitors.map(d => ({ domain: d, score: 50 }));
  }
}

// ============= RELATED KEYWORDS DATAFORSEO =============
// Discover niche competitors via related keywords expansion
async function fetchCompetitorsViaRelatedKeywords(
  keywords: Array<{keyword: string, intent: string}>,
  ownDomain: string,
  login: string,
  password: string,
  language: string,
  businessContext: string = ''
): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const auth = btoa(`${login}:${password}`);
    const locationCode = getLocationCode(language);
    const languageCode = language === 'fr' ? 'fr' : language === 'de' ? 'de' : language === 'es' ? 'es' : 'en';
    
    // Use top keywords for related expansion
    const seedKeyword = keywords
      .filter(k => k.intent === 'commercial' || k.intent === 'transactional')
      .slice(0, 1)
      .map(k => k.keyword)[0] || keywords[0]?.keyword;
    
    if (!seedKeyword) {
      console.log('[RELATED-KW] No seed keyword available');
      return [];
    }
    
    console.log('[RELATED-KW] Fetching related keywords for:', seedKeyword);
    
    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        keyword: seedKeyword,
        location_code: locationCode,
        language_code: languageCode,
        depth: 2,
        limit: 30,
      }]),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    
    if (data.status_code !== 20000 || !data.tasks?.[0]?.result?.[0]?.items) {
      console.log('[RELATED-KW] No results:', data.status_message || 'empty');
      return [];
    }

    // Extract related keywords
    const relatedKeywords = data.tasks[0].result[0].items
      .filter((item: any) => item.keyword_data?.keyword)
      .map((item: any) => item.keyword_data.keyword)
      .slice(0, 5);
    
    if (relatedKeywords.length === 0) {
      console.log('[RELATED-KW] No related keywords found');
      return [];
    }
    
    console.log('[RELATED-KW] Found related keywords:', relatedKeywords);
    
    // Now query SERP for these related keywords to find niche competitors
    const serpResponse = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/regular', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(relatedKeywords.slice(0, 3).map((kw: string) => ({
        keyword: kw,
        location_code: locationCode,
        language_code: languageCode,
        depth: 15,
      }))),
    });

    const serpData = await serpResponse.json();
    
    if (serpData.status_code !== 20000 || !serpData.tasks) {
      console.log('[RELATED-KW] SERP error:', serpData.status_message || 'empty');
      return [];
    }

    const ownDomainBase = ownDomain.split('.')[0].toLowerCase();
    const domainCounts = new Map<string, number>();
    
    // Aggregate domains from SERP results
    for (const task of serpData.tasks) {
      if (!task.result?.[0]?.items) continue;
      
      for (const item of task.result[0].items) {
        if (item.type !== 'organic') continue;
        
        const domain = item.domain?.toLowerCase();
        if (!domain) continue;
        if (domain.includes(ownDomainBase) || ownDomainBase.includes(domain.split('.')[0])) continue;
        if (isBlockedDomain(domain, businessContext)) continue;
        
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
      }
    }
    
    // Return domains that appear in multiple keyword SERPs (more likely to be niche competitors)
    const competitors = [...domainCounts.entries()]
      .filter(([_, count]) => count >= 2) // Appears in at least 2 keyword SERPs
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain]) => domain);
    
    console.log('[RELATED-KW] Niche competitors found:', competitors);
    return competitors;

  } catch (e) {
    console.error('[RELATED-KW] Error:', e);
    return [];
  }
}

// Fast competitors fetch - with proper location based on language
async function fetchCompetitorsFast(domain: string, login: string, password: string, language: string, businessContext: string = ''): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const auth = btoa(`${login}:${password}`);
    const locationCode = getLocationCode(language);
    const languageCode = language === 'fr' ? 'fr' : language === 'de' ? 'de' : language === 'es' ? 'es' : 'en';
    
    console.log('[COMPETITORS] Using DataForSEO with location:', locationCode, 'language:', languageCode);
    
    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/competitors_domain/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        target: domain,
        location_code: locationCode,
        language_code: languageCode,
        limit: 20, // Get more to filter
        filters: ["intersections", ">", 0] // Any intersection counts
      }]),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    
    if (data.status_code !== 20000 || !data.tasks?.[0]?.result?.[0]?.items) {
      console.log('[COMPETITORS] No results from DataForSEO domain API:', data.status_message || 'empty');
      return [];
    }

    const ownDomainBase = domain.split('.')[0].toLowerCase();
    
    const competitors = data.tasks[0].result[0].items
      .map((item: any) => item.domain)
      .filter((d: string) => {
        if (!d) return false;
        const lower = d.toLowerCase();
        // Skip own domain
        if (lower.includes(ownDomainBase) || ownDomainBase.includes(lower.split('.')[0])) return false;
        // Skip blocked domains (with business context for smart filtering)
        if (isBlockedDomain(lower, businessContext)) return false;
        return true;
      })
      .slice(0, 6);

    console.log('[COMPETITORS] Domain API found:', competitors);
    return competitors;

  } catch (e) {
    console.error('[COMPETITORS] Domain API error:', e);
    return [];
  }
}

// NEW: Fetch competitors from SERP based on keywords
async function fetchCompetitorsFromSERP(
  keywords: Array<{keyword: string, intent: string}>,
  ownDomain: string,
  login: string,
  password: string,
  language: string,
  businessContext: string = ''
): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const auth = btoa(`${login}:${password}`);
    const locationCode = getLocationCode(language);
    const languageCode = language === 'fr' ? 'fr' : language === 'de' ? 'de' : language === 'es' ? 'es' : 'en';
    
    // Use the top commercial/transactional keywords for SERP analysis
    const topKeywords = keywords
      .filter(k => k.intent === 'commercial' || k.intent === 'transactional')
      .slice(0, 3)
      .map(k => k.keyword);
    
    if (topKeywords.length === 0) {
      // Fallback to any keywords
      topKeywords.push(...keywords.slice(0, 3).map(k => k.keyword));
    }
    
    if (topKeywords.length === 0) {
      console.log('[COMPETITORS] No keywords for SERP analysis');
      return [];
    }
    
    console.log('[COMPETITORS] SERP analysis with keywords:', topKeywords);
    
    // Query SERP for each keyword
    const tasks = topKeywords.map(keyword => ({
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      depth: 20, // Top 20 results
    }));
    
    const response = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/regular', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tasks),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    
    if (data.status_code !== 20000 || !data.tasks) {
      console.log('[COMPETITORS] SERP API error:', data.status_message || 'empty');
      return [];
    }

    const ownDomainBase = ownDomain.split('.')[0].toLowerCase();
    const domainScores = new Map<string, number>();
    
    // Aggregate domains from all SERP results
    for (const task of data.tasks) {
      if (!task.result?.[0]?.items) continue;
      
      for (const item of task.result[0].items) {
        if (item.type !== 'organic') continue;
        
        const domain = item.domain?.toLowerCase();
        if (!domain) continue;
        
        // Skip own domain
        if (domain.includes(ownDomainBase) || ownDomainBase.includes(domain.split('.')[0])) continue;
        // Skip blocked domains (with business context for smart filtering)
        if (isBlockedDomain(domain, businessContext)) continue;
        
        // Score by position (higher position = higher score)
        const position = item.rank_group || 20;
        const score = Math.max(0, 21 - position); // Position 1 = 20 points, Position 20 = 1 point
        domainScores.set(domain, (domainScores.get(domain) || 0) + score);
      }
    }
    
    // Sort by score and return top competitors
    const competitors = [...domainScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain]) => domain);
    
    console.log('[COMPETITORS] SERP found:', competitors);
    return competitors;

  } catch (e) {
    console.error('[COMPETITORS] SERP API error:', e);
    return [];
  }
}

// ============= AEO Q&A + SEO TITLES GENERATION =============
// Generate Q&A and SEO titles based on competitor consensus
async function generateQaAndSeoTitlesFromCompetitors(
  competitors: string[],
  keywords: Array<{ keyword: string; intent: string }>,
  language: string,
  apiKey: string
): Promise<Array<{
  question: string;
  shortAnswer: string;
  answer: string;
  seoTitle: string;
  intent: string;
}>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const langInstruction =
      language === 'fr'
        ? 'Réponds en FRANÇAIS.'
        : 'Respond in ENGLISH.';

    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: `You are an AEO & SEO content expert.

Goal:
Generate Q&A and SEO titles based on competitor consensus.

Competitors:
${competitors.map((c) => `- ${c}`).join('\n')}

Target keywords:
${keywords.map((k) => `- ${k.keyword} (${k.intent})`).join('\n')}

Rules:
- Identify questions answered by multiple competitors
- Rewrite them as CLEAR, neutral questions
- Provide:
  - Short direct answer (1–2 sentences)
  - Expanded answer (4–6 lines)
  - SEO title (≤ 60 characters)
- No marketing fluff
- High citability for AI answers (ChatGPT / Gemini)

${langInstruction}

Return ONLY JSON array:
[
  {
    "question": "...",
    "shortAnswer": "...",
    "answer": "...",
    "seoTitle": "...",
    "intent": "informational | commercial"
  }
]`,
            },
          ],
          temperature: 0.2,
          max_tokens: 1200,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('[AEO-QA] API error:', response.status);
      return [];
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const match = text.match(/\[[\s\S]*?\]/);

    if (!match) {
      console.log('[AEO-QA] No JSON array found in response');
      return [];
    }

    const parsed = JSON.parse(match[0]);
    const results = Array.isArray(parsed) ? parsed.slice(0, 8) : [];
    console.log('[AEO-QA] Generated', results.length, 'Q&A items');
    return results;
  } catch (e) {
    console.error('[AEO-QA] Error:', e);
    return [];
  }
}
