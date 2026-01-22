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

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        formats: ['markdown'],
        onlyMainContent: true, // Faster - main content only
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
    const title = metadata.title || '';
    let description = metadata.description || metadata.ogDescription || '';
    
    // Detect language from content (more reliable than metadata)
    const metaLang = metadata.language?.substring(0, 2) || 'en';
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

    // ============= STEP 4: Competitors detection (uses keywords + language) =============
    let competitors: string[] = [];
    
    // Use DataForSEO with correct location based on detected language
    if (dfLogin && dfPassword) {
      competitors = await fetchCompetitorsFast(ownDomain, dfLogin, dfPassword, language);
    }
    
    // Fallback to SERP-based detection if DataForSEO returned nothing
    if (competitors.length === 0 && dfLogin && dfPassword && keywords.length > 0) {
      console.log('[COMPETITORS] Domain API returned nothing, trying SERP-based detection');
      competitors = await fetchCompetitorsFromSERP(keywords, ownDomain, dfLogin, dfPassword, language);
    }
    
    // Final fallback: Google Search via Firecrawl
    if (competitors.length === 0 && apiKey) {
      console.log('[COMPETITORS] SERP returned nothing, using Google Search fallback');
      competitors = await findCompetitorsViaGoogleSearch(enrichedDescription, brandName, ownDomain, language, apiKey, keywords);
    }

    console.log('[SCRAPE] Total time:', Date.now() - startTime, 'ms');
    console.log('[SCRAPE] Found', audiences.length, 'audiences,', competitors.length, 'competitors,', keywords.length, 'keywords');

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

// Find competitors via Google Search using Firecrawl + extracted keywords
async function findCompetitorsViaGoogleSearch(
  description: string,
  brandName: string,
  domain: string,
  language: string,
  firecrawlApiKey: string,
  extractedKeywords: Array<{keyword: string, intent: string}> = []
): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // Build search query based on EXTRACTED KEYWORDS + description
    const descWords = description.toLowerCase();
    let searchQuery = '';
    
    // USE EXTRACTED KEYWORDS FIRST - they're the most relevant!
    const keywordTerms = extractedKeywords
      .filter(k => k.intent === 'commercial' || k.intent === 'transactional')
      .slice(0, 3)
      .map(k => k.keyword)
      .join(' ');
    
    // All keywords for fallback
    const allKeywordTerms = extractedKeywords
      .slice(0, 5)
      .map(k => k.keyword)
      .join(' ');
    
    // Extract meaningful words from description as backup
    const meaningfulWords = description
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4)
      .filter(w => !['about', 'their', 'these', 'those', 'which', 'would', 'could', 'should', 'being', 'there', 'where', 'every', 'other'].includes(w.toLowerCase()))
      .slice(0, 3);
    
    // Detect specific business types
    if (descWords.includes('shopify') || descWords.includes('e-commerce') || descWords.includes('ecommerce')) {
      // For Shopify apps/tools - use keywords if available
      if (keywordTerms) {
        searchQuery = `shopify ${keywordTerms} app alternatives`;
      } else if (descWords.includes('new year') || descWords.includes('countdown') || descWords.includes('timer')) {
        searchQuery = 'shopify countdown timer sales app alternatives';
      } else if (descWords.includes('banner') || descWords.includes('promotion')) {
        searchQuery = 'shopify promotional banner apps';
      } else if (descWords.includes('discount') || descWords.includes('sale')) {
        searchQuery = 'shopify sales discount apps best';
      } else {
        searchQuery = `shopify app ${meaningfulWords.join(' ')} alternatives`;
      }
    } else if (descWords.includes('location') && (descWords.includes('meuble') || descWords.includes('furniture'))) {
      searchQuery = language === 'fr' ? 'location meubles entreprise Paris' : 'furniture rental business';
    } else if (descWords.includes('meuble') || descWords.includes('furniture')) {
      searchQuery = language === 'fr' ? 'acheter meubles design en ligne' : 'buy furniture online';
    } else if (descWords.includes('seo') || descWords.includes('référencement') || descWords.includes('search engine')) {
      searchQuery = keywordTerms ? `${keywordTerms} tools` : 'SEO optimization tools alternatives';
    } else if (descWords.includes('ai') || descWords.includes('artificial intelligence')) {
      searchQuery = keywordTerms ? `AI ${keywordTerms} alternatives` : `AI ${meaningfulWords.join(' ')} tools alternatives`;
    } else if (keywordTerms || allKeywordTerms) {
      // USE KEYWORDS for search query!
      searchQuery = `${keywordTerms || allKeywordTerms} alternatives best`;
    } else {
      // Ultimate fallback - brand name + meaningful words
      searchQuery = `${brandName} alternatives ${meaningfulWords.join(' ')}`.trim();
    }
    
    console.log('[COMPETITORS] Using keywords:', extractedKeywords.slice(0, 3).map(k => k.keyword));
    console.log('[COMPETITORS] Google search query:', searchQuery);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 15,
        lang: language === 'fr' ? 'fr' : 'en',
        country: language === 'fr' ? 'FR' : 'US',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('[COMPETITORS] Firecrawl search error:', response.status);
      return [];
    }

    const data = await response.json();
    
    if (!data.success || !data.data) {
      console.log('[COMPETITORS] No search results');
      return [];
    }

    // Extract domains from search results - EXPANDED blocked list
    const blocked = new Set([
      // Social media
      'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 
      'youtube.com', 'tiktok.com', 'pinterest.com', 'x.com',
      // Search engines
      'google.com', 'google.fr', 'bing.com', 'yahoo.com',
      // Marketplaces
      'amazon.com', 'amazon.fr', 'ebay.com', 'ebay.fr', 'etsy.com',
      // Generic platforms
      'shopify.com', 'wix.com', 'wordpress.com', 'squarespace.com', 
      'webflow.com', 'medium.com', 'substack.com', 'notion.so',
      // French marketplaces
      'cdiscount.com', 'leboncoin.fr', 'fnac.com',
      // Review/directory sites
      'trustpilot.com', 'yelp.com', 'tripadvisor.com', 'pagesjaunes.fr',
      'g2.com', 'capterra.com', 'getapp.com', 'softwareadvice.com',
      // Generic tech blogs
      'reddit.com', 'quora.com', 'stackoverflow.com', 'github.com',
      'techcrunch.com', 'producthunt.com', 'crunchbase.com',
      // App stores
      'apps.shopify.com', 'play.google.com', 'apps.apple.com',
      // Generic comparison sites
      'whatagraph.com', 'marketermilk.com', 'technologyadvice.com', 'seo.com',
      // Wikipedia
      'wikipedia.org', 'wikimedia.org',
    ]);

    const ownDomainBase = domain.split('.')[0].toLowerCase();
    const competitors: string[] = [];
    const seenDomains = new Set<string>();

    for (const result of data.data) {
      try {
        const url = result.url || result.sourceURL || '';
        if (!url) continue;
        
        const urlObj = new URL(url);
        const resultDomain = urlObj.hostname.replace('www.', '').toLowerCase();
        
        // Skip blocked domains (also check if it ends with any blocked domain)
        let isBlocked = blocked.has(resultDomain);
        for (const b of blocked) {
          if (resultDomain.endsWith(`.${b}`) || resultDomain === b) {
            isBlocked = true;
            break;
          }
        }
        if (isBlocked) continue;
        
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
        
        if (competitors.length >= 5) break;
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
  // Marketplaces
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
  // French marketplaces
  'cdiscount.com', 'leboncoin.fr', 'fnac.com', 'darty.com',
]);

function isBlockedDomain(domain: string): boolean {
  const lower = domain.toLowerCase();
  if (BLOCKED_DOMAINS.has(lower)) return true;
  for (const blocked of BLOCKED_DOMAINS) {
    if (lower.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

// Fast competitors fetch - with proper location based on language
async function fetchCompetitorsFast(domain: string, login: string, password: string, language: string): Promise<string[]> {
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
        // Skip blocked domains
        if (isBlockedDomain(lower)) return false;
        return true;
      })
      .slice(0, 5);

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
  language: string
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
        // Skip blocked domains
        if (isBlockedDomain(domain)) continue;
        
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
