const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: false, // Get full page for richer content
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract metadata
    const metadata = data.data?.metadata || {};
    const markdown = data.data?.markdown || '';
    
    // Extract brand name from title or domain
    const title = metadata.title || '';
    let description = metadata.description || '';
    const language = metadata.language || 'en';
    const ogDescription = metadata.ogDescription || '';
    
    // Use longer description if available
    if (ogDescription && ogDescription.length > description.length) {
      description = ogDescription;
    }
    
    // Try to extract brand name from title (usually before | or -)
    let brandName = title.split('|')[0].split('-')[0].split('—')[0].split(':')[0].trim();
    if (!brandName || brandName.length < 2) {
      // Extract from URL
      const urlObj = new URL(formattedUrl);
      brandName = urlObj.hostname.replace('www.', '').split('.')[0];
      brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
    }

    // Helper function to clean markdown artifacts
    const cleanMarkdown = (text: string): string => {
      return text
        // Remove markdown images ![alt](url)
        .replace(/!\[.*?\]\(.*?\)/g, '')
        // Remove markdown links but keep text [text](url) -> text
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        // Remove remaining URLs
        .replace(/https?:\/\/[^\s)]+/g, '')
        // Remove multiple spaces
        .replace(/\s+/g, ' ')
        // Remove special characters at start/end
        .replace(/^[\s,;:.]+|[\s,;:.]+$/g, '')
        .trim();
    };
    
    // Extract richer content from markdown for better description
    const contentPreview = markdown.substring(0, 5000);
    
    // Clean the base description
    let enrichedDescription = cleanMarkdown(description);
    
    // If description is too short, try to enrich it
    if (enrichedDescription.length < 150) {
      // Look for first meaningful paragraph in markdown
      const paragraphs = contentPreview.split(/\n\n+/).filter((p: string) => 
        p.length > 50 && 
        !p.startsWith('#') && 
        !p.startsWith('!') &&
        !p.startsWith('[') &&
        !p.includes('cookie') &&
        !p.includes('newsletter')
      );
      
      if (paragraphs.length > 0) {
        const cleanParagraph = cleanMarkdown(paragraphs[0]);
        if (cleanParagraph.length > enrichedDescription.length) {
          enrichedDescription = cleanParagraph;
        }
      }
    }
    
    // Ensure description doesn't exceed reasonable length
    if (enrichedDescription.length > 500) {
      enrichedDescription = enrichedDescription.substring(0, 497) + '...';
    }
    
    // Extract target audiences using AI for more accurate and contextual results
    let audiences: string[] = [];
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (lovableApiKey) {
      try {
        console.log('Extracting audiences using AI in language:', language);
        
        // Use same language as the content for audiences
        const langInstruction = language === 'fr' 
          ? 'Réponds en FRANÇAIS uniquement.'
          : 'Respond in ENGLISH only.';
        
        const aiPrompt = `You are a marketing expert. Analyze this business description and page content to identify 4-6 very specific and relevant target audiences.

Description: ${enrichedDescription}

Page content excerpt:
${contentPreview.substring(0, 2000)}

${langInstruction}

Return ONLY a JSON array with 4-6 short target audiences (2-4 words max each), specific to the analyzed business.
Good examples: "Shopify store owners", "SEO agencies", "e-commerce marketers", "tech SMBs".
DO NOT use generic terms like "business professionals" or "AI early adopters".

Expected format: ["audience1", "audience2", "audience3", "audience4"]`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'user', content: aiPrompt }
            ],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          console.log('AI response:', content);
          
          // Extract JSON array from response
          const jsonMatch = content.match(/\[[\s\S]*?\]/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsed) && parsed.length > 0) {
                audiences = parsed.slice(0, 6).map((a: string) => a.trim());
                console.log('AI extracted audiences:', audiences);
              }
            } catch (parseError) {
              console.error('Failed to parse AI audiences:', parseError);
            }
          }
        } else {
          console.error('AI request failed:', aiResponse.status);
        }
      } catch (aiError) {
        console.error('AI extraction error:', aiError);
      }
    }
    
    // Fallback if AI didn't return results
    if (audiences.length < 2) {
      console.log('Using fallback audiences');
      audiences = ['professionnels du digital', 'entreprises en croissance', 'marketeurs'];
    }
    
    // ============= COMPETITOR DETECTION (GENERIC & ROBUST) =============
    const ownDomain = new URL(formattedUrl).hostname.replace('www.', '').toLowerCase();
    let competitors: { domain: string; score: number }[] = [];
    
    // Domains to ALWAYS filter out (platforms, social, generic tools)
    const blockedDomains = [
      'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 
      'youtube.com', 'tiktok.com', 'pinterest.com', 'snapchat.com', 'whatsapp.com',
      'shopify.com', 'woocommerce.com', 'bigcommerce.com', 'squarespace.com', 
      'wix.com', 'wordpress.com', 'webflow.com', 'magento.com', 'prestashop.com',
      'paypal.com', 'stripe.com', 'klarna.com', 'afterpay.com',
      'google.com', 'bing.com', 'yahoo.com', 'analytics.google.com',
      'cloudflare.com', 'amazonaws.com', 'cdn.shopify.com',
      'apple.com', 'microsoft.com', 'amazon.com', 'wikipedia.org',
      'ebay.com', 'aliexpress.com', 'alibaba.com',
      // Generic AI tools blacklist
      'jasper.ai', 'copy.ai', 'rytr.me', 'writesonic.com', 'chatgpt.com',
      'openai.com', 'claude.ai', 'anthropic.com', 'perplexity.ai',
      'surferseo.com', 'semrush.com', 'ahrefs.com', 'moz.com'
    ];
    
    const isBlockedDomain = (domain: string): boolean => {
      const lowerDomain = domain.toLowerCase();
      return blockedDomains.some(blocked => 
        lowerDomain === blocked || 
        lowerDomain.endsWith('.' + blocked) ||
        lowerDomain.includes(blocked.split('.')[0])
      );
    };
    
    const dfLogin = Deno.env.get('DATAFORSEO_LOGIN');
    const dfPassword = Deno.env.get('DATAFORSEO_PASSWORD');
    
    if (dfLogin && dfPassword && lovableApiKey) {
      try {
        // STEP 1: Detect vertical and keywords using AI
        console.log('Step 1: Detecting vertical and keywords...');
        
        const verticalPrompt = `Analyze this website and extract its business vertical and 3-5 search keywords that competitors would rank for.

Title: ${title}
Description: ${enrichedDescription}
URL: ${formattedUrl}
Content: ${contentPreview.substring(0, 1500)}

Return ONLY valid JSON:
{
  "vertical": "specific vertical (e.g. Shopify SEO App, SaaS CRM, E-commerce Fashion)",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "signals": ["shopify", "saas", "ecommerce"] // detected platform/tech signals
}`;

        const verticalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: verticalPrompt }],
            temperature: 0.2,
          }),
        });

        let vertical = '';
        let searchKeywords: string[] = [];
        let signals: string[] = [];

        if (verticalResponse.ok) {
          const verticalData = await verticalResponse.json();
          const verticalContent = verticalData.choices?.[0]?.message?.content || '';
          console.log('Vertical detection response:', verticalContent);
          
          const jsonMatch = verticalContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              vertical = parsed.vertical || '';
              searchKeywords = parsed.keywords || [];
              signals = parsed.signals || [];
              console.log('Detected vertical:', vertical, 'Keywords:', searchKeywords, 'Signals:', signals);
            } catch (e) {
              console.error('Failed to parse vertical JSON:', e);
            }
          }
        }

        // STEP 2: Query DataForSEO SERP with detected keywords
        if (searchKeywords.length > 0) {
          console.log('Step 2: Querying DataForSEO SERP with keywords:', searchKeywords.slice(0, 3));
          
          const authString = btoa(`${dfLogin}:${dfPassword}`);
          const locationCode = language === 'fr' ? 2250 : 2840;
          const langCode = language === 'fr' ? 'fr' : 'en';
          
          const serpResponse = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(
              searchKeywords.slice(0, 3).map(k => ({
                keyword: k,
                location_code: locationCode,
                language_code: langCode,
                device: 'desktop',
                depth: 20
              }))
            ),
          });

          const serpData = await serpResponse.json();
          console.log('DataForSEO SERP response status:', serpData.status_code);

          if (serpData.status_code === 20000 && serpData.tasks) {
            const competitorMap = new Map<string, { domain: string; score: number; title: string }>();
            
            // STEP 3: Extract and filter SERP results
            for (const task of serpData.tasks) {
              const items = task?.result?.[0]?.items || [];
              
              for (const item of items) {
                if (item.type !== 'organic') continue;
                
                const domain = (item.domain || '').toLowerCase().replace('www.', '');
                const itemTitle = (item.title || '').toLowerCase();
                const itemDesc = (item.description || '').toLowerCase();
                const itemUrl = (item.url || '').toLowerCase();
                const text = `${itemTitle} ${itemDesc} ${domain} ${itemUrl}`;
                
                // Skip own domain
                if (domain.includes(ownDomain.split('.')[0])) continue;
                
                // Skip blocked domains
                if (isBlockedDomain(domain)) continue;
                
                // STEP 4: Vertical-specific filtering
                let isRelevant = false;
                let score = 0;
                
                // Check if matches detected signals
                for (const signal of signals) {
                  if (text.includes(signal.toLowerCase())) {
                    isRelevant = true;
                    score += 3;
                  }
                }
                
                // Check for keyword matches
                for (const kw of searchKeywords) {
                  const kwLower = kw.toLowerCase();
                  if (text.includes(kwLower)) {
                    score += 2;
                  }
                }
                
                // Vertical-specific boosts
                if (vertical.toLowerCase().includes('shopify')) {
                  if (text.includes('shopify') || itemUrl.includes('apps.shopify.com')) {
                    isRelevant = true;
                    score += 5;
                  }
                }
                if (vertical.toLowerCase().includes('seo')) {
                  if (text.includes('seo') || text.includes('ranking') || text.includes('optimization')) {
                    score += 2;
                  }
                }
                if (vertical.toLowerCase().includes('ecommerce') || vertical.toLowerCase().includes('e-commerce')) {
                  if (text.includes('ecommerce') || text.includes('store') || text.includes('shop')) {
                    score += 2;
                  }
                }
                
                // Position boost (higher ranked = more relevant)
                const position = item.rank_absolute || 20;
                score += Math.max(0, 10 - position);
                
                // Only include if relevant or has decent score
                if (isRelevant || score >= 5) {
                  const existing = competitorMap.get(domain);
                  if (existing) {
                    existing.score += 2; // Boost for appearing multiple times
                  } else {
                    competitorMap.set(domain, { domain, score, title: item.title || domain });
                  }
                }
              }
            }
            
            // STEP 5: Sort by score and get top competitors
            competitors = Array.from(competitorMap.values())
              .sort((a, b) => b.score - a.score)
              .slice(0, 10);
            
            console.log('SERP competitors found:', competitors.map(c => `${c.domain} (score: ${c.score})`));
          }
        }
        
        // Fallback: Try domain competitors API if SERP didn't return enough
        if (competitors.length < 3) {
          console.log('SERP insufficient, trying domain competitors API...');
          
          const authString = btoa(`${dfLogin}:${dfPassword}`);
          const dfResponse = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/competitors_domain/live', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify([{
              target: ownDomain,
              language_code: language === 'fr' ? 'fr' : 'en',
              location_code: language === 'fr' ? 2250 : 2840,
              filters: ["intersections", ">", 5],
              limit: 15
            }]),
          });
          
          const dfData = await dfResponse.json();
          
          if (dfData.status_code === 20000 && dfData.tasks?.[0]?.result?.[0]?.items) {
            const items = dfData.tasks[0].result[0].items;
            console.log('Domain competitors API found:', items.length, 'results');
            
            for (const item of items) {
              if (!item.domain || isBlockedDomain(item.domain)) continue;
              if (item.domain.includes(ownDomain.split('.')[0])) continue;
              
              const exists = competitors.find(c => c.domain === item.domain);
              if (!exists) {
                competitors.push({
                  domain: item.domain,
                  score: item.intersections || 1
                });
              }
            }
          }
        }
        
      } catch (dfError) {
        console.error('Competitor detection error:', dfError);
      }
    } else {
      console.log('DataForSEO or AI credentials not configured');
    }
    
    // Extract just domains, sorted by score
    const uniqueCompetitors = competitors
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(c => c.domain);
    
    console.log('Scrape successful:', { 
      brandName, 
      language, 
      descriptionLength: enrichedDescription.length,
      audiencesFound: audiences.length,
      competitorsFound: uniqueCompetitors.length,
      competitors: uniqueCompetitors
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          brandName,
          description: enrichedDescription,
          language,
          title,
          keywords: metadata.keywords || '',
          markdown: markdown.substring(0, 3000),
          url: formattedUrl,
          audiences: [...new Set(audiences)].slice(0, 6),
          competitors: uniqueCompetitors,
          
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
