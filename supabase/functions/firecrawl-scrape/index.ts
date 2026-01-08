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

    // Start competitors fetch immediately (don't wait for scrape)
    let competitorsPromise: Promise<string[]> | null = null;
    if (dfLogin && dfPassword) {
      competitorsPromise = fetchCompetitorsFast(ownDomain, dfLogin, dfPassword);
    }

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
    const contentPreview = markdown.substring(0, 2000);
    
    // Extract keywords first - they'll be used for AI competitor fallback
    const keywords = lovableApiKey 
      ? await extractKeywordsFast(enrichedDescription, contentPreview, brandName, language, lovableApiKey) 
      : [];
    
    // ============= STEP 3: Audiences + Competitors in PARALLEL =============
    const [audiences, dataForSeoCompetitors] = await Promise.all([
      lovableApiKey ? extractAudiencesFast(enrichedDescription, contentPreview, language, lovableApiKey) : Promise.resolve([]),
      competitorsPromise || Promise.resolve([])
    ]);

    // If DataForSEO returned no competitors, use AI with keywords for better detection
    let competitors = dataForSeoCompetitors;
    if (competitors.length === 0 && lovableApiKey) {
      console.log('[COMPETITORS] DataForSEO returned nothing, using AI fallback with keywords');
      competitors = await detectCompetitorsWithAI(enrichedDescription, contentPreview, brandName, ownDomain, lovableApiKey, keywords);
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

// AI-based competitor detection fallback - uses extracted keywords for better accuracy
async function detectCompetitorsWithAI(
  description: string, 
  content: string, 
  brandName: string, 
  domain: string, 
  apiKey: string,
  keywords: Array<{keyword: string, intent: string}> = []
): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Extract top keywords for the prompt
    const topKeywords = keywords
      .slice(0, 8)
      .map(k => k.keyword)
      .join(', ');

    // Detect business type from content
    const contentLower = (description + ' ' + content).toLowerCase();
    let businessType = 'general';
    let exampleCompetitors = '';
    
    // Location de meubles / Furniture rental
    if (contentLower.includes('location') && (contentLower.includes('meuble') || contentLower.includes('furniture'))) {
      businessType = 'furniture_rental';
      exampleCompetitors = 'For furniture rental in France: leaseplan-furniture.fr, ubicuity.com, semeubler.com, loca-meubles.fr';
    }
    // E-commerce meubles
    else if (contentLower.includes('meuble') || contentLower.includes('furniture') || contentLower.includes('canapé') || contentLower.includes('sofa')) {
      businessType = 'furniture';
      exampleCompetitors = 'For furniture: made.com, westwing.fr, camif.fr, alinea.com, maisondumonde.com';
    }
    // SEO Tools
    else if (contentLower.includes('seo') || contentLower.includes('search engine')) {
      businessType = 'seo_tools';
      exampleCompetitors = 'For SEO tools: semrush.com, ahrefs.com, moz.com, ubersuggest.com';
    }
    // SaaS
    else if (contentLower.includes('saas') || contentLower.includes('software')) {
      businessType = 'saas';
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Use better model for accuracy
        messages: [{
          role: 'user',
          content: `You are a business analyst. Identify 3-5 REAL, EXISTING competitor websites for this business.

Business: ${brandName}
Domain: ${domain}
Description: ${description}
${topKeywords ? `Keywords: ${topKeywords}` : ''}
Business type detected: ${businessType}
${exampleCompetitors ? `\nExamples of real competitors in this space: ${exampleCompetitors}` : ''}

CRITICAL RULES:
1. ONLY return domains that ACTUALLY EXIST and are REAL businesses
2. Competitors MUST offer the EXACT SAME type of service/product
3. For "${brandName}": find companies that do the SAME THING
4. DO NOT invent or guess domain names - only return domains you are CERTAIN exist
5. If unsure, return FEWER competitors rather than fake ones
6. NO social media, NO marketplaces (amazon, ebay), NO website builders

If this is a furniture RENTAL company, return furniture RENTAL competitors (not furniture stores).
If this is a furniture STORE, return furniture STORE competitors.

Return ONLY a valid JSON array of 3-5 real domains:
["real-competitor1.com", "real-competitor2.com", "real-competitor3.com"]

If you cannot find real competitors, return an empty array: []`
        }],
        temperature: 0.1, // Lower temperature for more factual responses
        max_tokens: 200,
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
        // Filter out obvious non-competitors
        const blocked = new Set([
          'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 
          'youtube.com', 'tiktok.com', 'pinterest.com', 'google.com',
          'amazon.com', 'ebay.com', 'wikipedia.org', 'shopify.com',
          'wix.com', 'wordpress.com', 'squarespace.com', 'webflow.com',
          'amazon.fr', 'ebay.fr', 'cdiscount.com', 'leboncoin.fr'
        ]);
        const filtered = parsed.filter((d: string) => {
          if (!d || typeof d !== 'string') return false;
          const lower = d.toLowerCase();
          if (blocked.has(lower)) return false;
          if (lower.includes(domain.split('.')[0])) return false;
          // Filter out obvious fake domains
          if (lower.includes('example') || lower.includes('test')) return false;
          return true;
        });
        console.log('[COMPETITORS] AI detected:', filtered);
        return filtered.slice(0, 5);
      }
    }
    return [];
  } catch (e) {
    console.error('[COMPETITORS AI] Error:', e);
    return [];
  }
}

// AI-based keyword extraction for AEO
async function extractKeywordsFast(description: string, content: string, brandName: string, language: string, apiKey: string): Promise<Array<{keyword: string, intent: string}>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const langInstruction = language === 'fr' 
      ? 'Génère des mots-clés en FRANÇAIS adaptés au marché francophone.'
      : 'Generate keywords in ENGLISH.';

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
          content: `Extract 15-20 SEO/AEO keywords for this business. ${langInstruction}

Business: ${brandName}
Description: ${description}
Content: ${content.substring(0, 1200)}

Rules:
- Include a mix of:
  - Head terms (1-2 words, high volume)
  - Long-tail keywords (3-5 words, specific)
  - Question-based keywords (how, what, why, when)
  - Comparison keywords (vs, alternative, best)
  - Intent keywords (buy, price, review, tutorial)
- Classify each keyword intent: informational, transactional, navigational, commercial

Return ONLY a JSON array:
[{"keyword": "keyword here", "intent": "informational"}, ...]`
        }],
        temperature: 0.4,
        max_tokens: 600,
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
        return parsed.slice(0, 20);
      }
    }
    return [];
  } catch (e) {
    console.error('[KEYWORDS] Error:', e);
    return [];
  }
}

// Fast competitors fetch - single API call only
async function fetchCompetitorsFast(domain: string, login: string, password: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s max

    const auth = btoa(`${login}:${password}`);
    
    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/competitors_domain/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        target: domain,
        location_code: 2840, // US - most data
        language_code: 'en',
        limit: 10,
        filters: ["intersections", ">", 1] // Lowered from 3 to get more results
      }]),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    
    if (data.status_code !== 20000 || !data.tasks?.[0]?.result?.[0]?.items) {
      console.log('[COMPETITORS] No results from DataForSEO');
      return [];
    }

    // Blocked domains filter
    const blocked = new Set([
      'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 
      'youtube.com', 'tiktok.com', 'pinterest.com', 'google.com',
      'amazon.com', 'ebay.com', 'wikipedia.org', 'shopify.com',
      'wix.com', 'wordpress.com', 'squarespace.com', 'webflow.com'
    ]);

    const competitors = data.tasks[0].result[0].items
      .map((item: any) => item.domain)
      .filter((d: string) => {
        if (!d) return false;
        const lower = d.toLowerCase();
        if (lower.includes(domain.split('.')[0])) return false;
        if (blocked.has(lower)) return false;
        return true;
      })
      .slice(0, 5);

    console.log('[COMPETITORS] Found:', competitors);
    return competitors;

  } catch (e) {
    console.error('[COMPETITORS] Error:', e);
    return [];
  }
}
