const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fast audience extraction with short prompts (2-3s)
async function extractAudiencesFast(
  description: string,
  content: string,
  language: string,
  apiKey: string
): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s max

    // Use very short content to minimize processing time
    const shortDesc = description.substring(0, 150);
    const shortContent = content.substring(0, 300);
    
    const langInstruction = language === 'fr' ? 'En français.' : 
                            language === 'de' ? 'Auf Deutsch.' :
                            language === 'es' ? 'En español.' : 'In English.';

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
          content: `Extract 4 target audiences for this business. Each audience should be 2-4 words. ${langInstruction}
Business: ${shortDesc}
Site content: ${shortContent}
Return ONLY a valid JSON array with exactly 4 strings: ["audience1", "audience2", "audience3", "audience4"]`
        }],
        temperature: 0.2,
        max_tokens: 150,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('[FAST] AI error:', response.status);
      return [];
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || '';
    
    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const audiences = JSON.parse(jsonMatch[0]);
      if (Array.isArray(audiences) && audiences.length > 0) {
        console.log('[FAST] Extracted audiences:', audiences);
        return audiences.slice(0, 4);
      }
    }
    return [];
  } catch (error) {
    console.error('[FAST] Audience extraction error:', error);
    return [];
  }
}

// Fast language detection based on content analysis
function detectLanguageFromContent(content: string, metaLang: string): string {
  if (!content || content.length < 100) {
    return metaLang || 'en';
  }
  
  const sampleText = content.substring(0, 3000).toLowerCase();
  
  // Common word patterns for each language
  const languagePatterns: Record<string, RegExp[]> = {
    'fr': [/\ble\b/g, /\bla\b/g, /\bles\b/g, /\bde\b/g, /\bdu\b/g, /\bet\b/g, /\bdes\b/g, /\bune\b/g, /\bpour\b/g, /\bvous\b/g, /\bnous\b/g, /\bvotre\b/g, /\bnotre\b/g, /\bsur\b/g, /\bavec\b/g, /\bque\b/g, /\bqui\b/g, /\bdans\b/g, /\bplus\b/g, /\bêtre\b/g],
    'de': [/\bder\b/g, /\bdie\b/g, /\bdas\b/g, /\bund\b/g, /\bist\b/g, /\bein\b/g, /\beine\b/g, /\bfür\b/g, /\bmit\b/g, /\bauf\b/g, /\bden\b/g, /\bdem\b/g, /\bnicht\b/g, /\bsich\b/g, /\bvon\b/g, /\bzu\b/g, /\bauch\b/g, /\bwir\b/g, /\bsie\b/g, /\bihr\b/g],
    'es': [/\bel\b/g, /\bla\b/g, /\blos\b/g, /\blas\b/g, /\bde\b/g, /\bdel\b/g, /\by\b/g, /\bque\b/g, /\ben\b/g, /\bun\b/g, /\buna\b/g, /\bpara\b/g, /\bcon\b/g, /\bpor\b/g, /\bsu\b/g, /\bse\b/g, /\bes\b/g, /\bson\b/g, /\bcomo\b/g, /\bnuestro\b/g],
    'it': [/\bil\b/g, /\bla\b/g, /\bi\b/g, /\ble\b/g, /\bdi\b/g, /\bche\b/g, /\be\b/g, /\bun\b/g, /\buna\b/g, /\bper\b/g, /\bcon\b/g, /\bnon\b/g, /\bè\b/g, /\bsono\b/g, /\bdel\b/g, /\bdella\b/g, /\bdei\b/g, /\bdelle\b/g, /\bsul\b/g, /\bnostro\b/g],
    'pt': [/\bo\b/g, /\ba\b/g, /\bos\b/g, /\bas\b/g, /\bde\b/g, /\bdo\b/g, /\bda\b/g, /\be\b/g, /\bque\b/g, /\bum\b/g, /\buma\b/g, /\bpara\b/g, /\bcom\b/g, /\bpor\b/g, /\bseu\b/g, /\bsua\b/g, /\bé\b/g, /\bsão\b/g, /\bnosso\b/g, /\bnossa\b/g],
    'en': [/\bthe\b/g, /\ba\b/g, /\ban\b/g, /\band\b/g, /\bor\b/g, /\bof\b/g, /\bto\b/g, /\bin\b/g, /\bfor\b/g, /\bwith\b/g, /\bis\b/g, /\bare\b/g, /\byou\b/g, /\byour\b/g, /\bour\b/g, /\bwe\b/g, /\bthis\b/g, /\bthat\b/g, /\bfrom\b/g, /\bby\b/g],
  };
  
  let maxScore = 0;
  let detectedLang = 'en';
  
  for (const [lang, patterns] of Object.entries(languagePatterns)) {
    let score = 0;
    for (const pattern of patterns) {
      const matches = sampleText.match(pattern);
      if (matches) {
        score += matches.length;
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang;
    }
  }
  
  // Only return detected language if we have a reasonable confidence
  if (maxScore < 10) {
    return metaLang || 'en';
  }
  
  return detectedLang;
}

// Fast local description extraction - no AI, instant
function extractDescriptionFast(markdown: string, metaDescription: string, brandName: string): string {
  // Try meta description first if it's clean
  if (metaDescription && metaDescription.length > 30 && metaDescription.length < 400) {
    const cleaned = cleanDescription(metaDescription);
    if (cleaned.length > 30) {
      console.log('[FAST] Using cleaned meta description');
      return cleaned;
    }
  }
  
  // Extract from markdown - find meaningful paragraphs
  if (markdown && markdown.length > 50) {
    // Remove common e-commerce noise
    const noisePatterns = [
      /\d+[,.]?\d*\s*€/g,           // Prices: 249,00 €
      /\d+%\s*(off|de réduction)?/gi, // Discounts
      /(promo|soldes?|sale|discount|ajouter au panier|add to cart)/gi,
      /\bx[234]\b/gi,               // Payment installments x3 x4
      /livraison|garantie|paiement/gi, // Shipping, warranty, payment
      /!\[[^\]]*\]\([^)]+\)/g,      // Markdown images
      /\[([^\]]+)\]\([^)]+\)/g,     // Markdown links -> text only
      /#{1,6}\s*/g,                 // Headers
      /\|[^|]+\|/g,                 // Tables
      /[-*]\s+/g,                   // List markers
    ];
    
    let cleanText = markdown;
    for (const pattern of noisePatterns) {
      cleanText = cleanText.replace(pattern, ' ');
    }
    
    // Split into sentences and filter
    const sentences = cleanText
      .split(/[.!?]+/)
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(s => {
        // Keep sentences that are meaningful
        return s.length > 20 && 
               s.length < 200 &&
               !/^\d+$/.test(s) &&
               !s.toLowerCase().includes('cookie') &&
               !s.toLowerCase().includes('aperçu') &&
               !s.toLowerCase().includes('choix des options');
      });
    
    if (sentences.length > 0) {
      // Take first 2-3 good sentences
      const description = sentences.slice(0, 3).join('. ').trim();
      if (description.length > 30) {
        console.log('[FAST] Extracted from markdown:', description.substring(0, 80));
        return description + '.';
      }
    }
  }
  
  // Ultimate fallback
  return `${brandName} propose des produits et services de qualité.`;
}

// Clean a description string
function cleanDescription(text: string): string {
  return text
    .replace(/\d+[,.]?\d*\s*€/g, '')
    .replace(/\d+%/g, '')
    .replace(/(promo|soldes?|sale|discount)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}


// Extract brand name from URL and content
function extractBrandName(url: string, title: string): string {
  // Generic page titles to ignore (in multiple languages)
  const genericTitles = [
    'accueil', 'home', 'homepage', 'inicio', 'startseite', 'pagina inicial',
    'bienvenue', 'welcome', 'willkommen', 'bienvenido', 'bem-vindo',
    'page d\'accueil', 'home page', 'main page'
  ];
  
  // Try to get from title first
  if (title) {
    const titleLower = title.toLowerCase().trim();
    
    // Skip if title is a generic page name
    if (genericTitles.includes(titleLower)) {
      console.log('[FAST] Skipping generic title:', title);
      // Fall through to domain extraction
    } else {
      // Common patterns: "Brand Name - Tagline" or "Brand Name | Description"
      const separators = [' - ', ' | ', ' – ', ' — ', ': '];
      for (const sep of separators) {
        if (title.includes(sep)) {
          const brandPart = title.split(sep)[0].trim();
          // Make sure extracted part is not generic
          if (!genericTitles.includes(brandPart.toLowerCase())) {
            return brandPart;
          }
        }
      }
      // If title is short enough and not generic, use it
      if (title.length < 30 && !genericTitles.includes(titleLower)) {
        return title;
      }
    }
  }
  
  // Fallback to domain - this is the most reliable for brand name
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const domain = urlObj.hostname.replace('www.', '');
    const name = domain.split('.')[0];
    // Capitalize first letter of each word, preserve case for acronyms
    return name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  } catch {
    return 'Your Brand';
  }
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

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('[FAST] Scraping URL:', formattedUrl);
    const startTime = Date.now();

    // Single Firecrawl request - no AI processing
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 15000, // 15 second timeout
      }),
    });

    const data = await response.json();
    const scrapeTime = Date.now() - startTime;
    console.log(`[FAST] Scrape completed in ${scrapeTime}ms`);

    if (!response.ok || !data.success) {
      console.error('[FAST] Firecrawl error:', data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.error || 'Failed to scrape website' 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = data.data?.markdown || '';
    const metadata = data.data?.metadata || {};
    const title = metadata.title || '';
    const metaDescription = metadata.description || '';
    const metaLanguage = metadata.language || '';

    // Fast local processing
    const language = detectLanguageFromContent(markdown, metaLanguage);
    const brandName = extractBrandName(formattedUrl, title);

    // Extract description FAST (no AI) - instant
    const description = extractDescriptionFast(markdown, metaDescription, brandName);
    
    // Extract audiences with AI (only this uses AI now)
    let audiences: string[] = [];
    if (lovableApiKey) {
      console.log('[FAST] Starting audience extraction...');
      const aiStart = Date.now();
      audiences = await extractAudiencesFast(description, markdown, language, lovableApiKey);
      console.log(`[FAST] Audience extraction took ${Date.now() - aiStart}ms`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[FAST] Total processing time: ${totalTime}ms`);
    console.log(`[FAST] Detected language: ${language}, Audiences: ${audiences.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          brandName,
          description,
          language,
          audiences,
          sourceUrl: formattedUrl,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[FAST] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
