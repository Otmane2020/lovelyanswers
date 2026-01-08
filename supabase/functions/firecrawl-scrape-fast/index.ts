const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Extract description from markdown content
function extractDescription(markdown: string, metaDescription: string): string {
  if (!markdown || markdown.length < 50) {
    return metaDescription || '';
  }
  
  // Clean up markdown and get first meaningful paragraph
  const lines = markdown.split('\n').filter(line => {
    const trimmed = line.trim();
    // Skip headers, empty lines, short lines
    if (!trimmed || trimmed.length < 40) return false;
    if (trimmed.startsWith('#')) return false;
    if (trimmed.startsWith('|')) return false; // Table rows
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return false; // List items
    if (trimmed.startsWith('![')) return false; // Images
    return true;
  });
  
  // Get first 2-3 paragraphs for description
  const content = lines.slice(0, 3).join(' ').substring(0, 500);
  
  return content || metaDescription || '';
}

// Extract brand name from URL and content
function extractBrandName(url: string, title: string): string {
  // Try to get from title first
  if (title) {
    // Common patterns: "Brand Name - Tagline" or "Brand Name | Description"
    const separators = [' - ', ' | ', ' – ', ' — ', ': '];
    for (const sep of separators) {
      if (title.includes(sep)) {
        return title.split(sep)[0].trim();
      }
    }
    // If title is short enough, use it as brand name
    if (title.length < 30) {
      return title;
    }
  }
  
  // Fallback to domain
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const domain = urlObj.hostname.replace('www.', '');
    const name = domain.split('.')[0];
    // Capitalize first letter of each word
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

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
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
        'Authorization': `Bearer ${apiKey}`,
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

    // Fast local processing - no AI calls
    const language = detectLanguageFromContent(markdown, metaLanguage);
    const description = extractDescription(markdown, metaDescription);
    const brandName = extractBrandName(formattedUrl, title);

    const totalTime = Date.now() - startTime;
    console.log(`[FAST] Total processing time: ${totalTime}ms`);
    console.log(`[FAST] Detected language: ${language}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          brandName,
          description,
          language,
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
