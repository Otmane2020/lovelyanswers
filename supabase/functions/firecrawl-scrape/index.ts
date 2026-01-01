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
        console.log('Extracting audiences using AI...');
        
        const aiPrompt = `Tu es un expert en marketing. Analyse cette description d'entreprise et le contenu de la page pour identifier 4 à 6 audiences cibles très spécifiques et pertinentes.

Description: ${enrichedDescription}

Extrait du contenu de la page:
${contentPreview.substring(0, 2000)}

Retourne UNIQUEMENT un JSON array avec 4 à 6 audiences cibles courtes (2-4 mots max chacune), spécifiques au business analysé. 
Exemples de bons formats: "propriétaires de boutiques Shopify", "agences SEO", "marketeurs e-commerce", "PME tech".
NE PAS utiliser des termes génériques comme "business professionals" ou "AI early adopters".

Format de réponse attendu: ["audience1", "audience2", "audience3", "audience4"]`;

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
    
    // Extract competitors using Data for SEO API
    const ownDomain = new URL(formattedUrl).hostname.replace('www.', '').toLowerCase();
    let competitors: string[] = [];
    
    // Domains to ALWAYS filter out
    const blockedDomains = [
      'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 
      'youtube.com', 'tiktok.com', 'pinterest.com', 'snapchat.com', 'whatsapp.com',
      'shopify.com', 'woocommerce.com', 'bigcommerce.com', 'squarespace.com', 
      'wix.com', 'wordpress.com', 'webflow.com', 'magento.com', 'prestashop.com',
      'paypal.com', 'stripe.com', 'klarna.com', 'afterpay.com',
      'google.com', 'bing.com', 'yahoo.com', 'analytics.google.com',
      'cloudflare.com', 'amazonaws.com', 'cdn.shopify.com', 'account.de',
      'apple.com', 'microsoft.com', 'amazon.com', 'wikipedia.org', 'amazon.fr',
      'ebay.com', 'ebay.fr', 'aliexpress.com', 'alibaba.com'
    ];
    
    const isBlockedDomain = (domain: string): boolean => {
      const lowerDomain = domain.toLowerCase();
      return blockedDomains.some(blocked => lowerDomain.includes(blocked.replace('.com', '').replace('.fr', '')));
    };
    
    // Try Data for SEO API first
    const dfLogin = Deno.env.get('DATAFORSEO_LOGIN');
    const dfPassword = Deno.env.get('DATAFORSEO_PASSWORD');
    
    if (dfLogin && dfPassword) {
      try {
        console.log('Fetching competitors from Data for SEO...');
        
        const authString = btoa(`${dfLogin}:${dfPassword}`);
        
        // Use the competitors API
        const dfResponse = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/competitors_domain/live', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{
            target: ownDomain,
            language_code: language === 'fr' ? 'fr' : 'en',
            location_code: language === 'fr' ? 2250 : 2840, // France or US
            filters: ["intersections", ">", 10],
            limit: 10
          }]),
        });
        
        const dfData = await dfResponse.json();
        console.log('Data for SEO response status:', dfData.status_code);
        
        if (dfData.status_code === 20000 && dfData.tasks?.[0]?.result?.[0]?.items) {
          const items = dfData.tasks[0].result[0].items;
          console.log('Found', items.length, 'potential competitors from Data for SEO');
          
          // Extract competitor domains, sorted by relevance (intersections)
          const seoCompetitors = items
            .filter((item: any) => 
              item.domain && 
              !item.domain.includes(ownDomain.split('.')[0]) &&
              !isBlockedDomain(item.domain)
            )
            .sort((a: any, b: any) => (b.intersections || 0) - (a.intersections || 0))
            .slice(0, 5)
            .map((item: any) => item.domain);
          
          competitors = seoCompetitors;
          console.log('SEO competitors found:', competitors);
        } else {
          console.log('Data for SEO returned no results or error:', dfData.status_message || 'Unknown');
        }
      } catch (dfError) {
        console.error('Data for SEO API error:', dfError);
      }
    } else {
      console.log('Data for SEO credentials not configured, using fallback');
    }
    
    // Use AI to suggest competitors if Data for SEO didn't return enough results
    if (competitors.length < 3 && lovableApiKey) {
      try {
        console.log('Extracting competitors using AI...');
        
        const competitorPrompt = `Tu es un expert en analyse concurrentielle. Analyse cette entreprise et suggère 5 concurrents directs pertinents.

Nom de la marque: ${brandName}
Description: ${enrichedDescription}
URL: ${formattedUrl}

Retourne UNIQUEMENT un JSON array avec 5 domaines de concurrents (format: exemple.com).
Les concurrents doivent être des entreprises réelles dans le même secteur d'activité.
NE PAS inclure de plateformes génériques (shopify, wix, wordpress, etc.).
NE PAS inclure de réseaux sociaux ou marketplaces.

Format attendu: ["concurrent1.com", "concurrent2.com", "concurrent3.com", "concurrent4.com", "concurrent5.com"]`;

        const aiCompResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: competitorPrompt }],
            temperature: 0.3,
          }),
        });

        if (aiCompResponse.ok) {
          const aiCompData = await aiCompResponse.json();
          const compContent = aiCompData.choices?.[0]?.message?.content || '';
          console.log('AI competitors response:', compContent);
          
          const jsonCompMatch = compContent.match(/\[[\s\S]*?\]/);
          if (jsonCompMatch) {
            try {
              const parsedComp = JSON.parse(jsonCompMatch[0]);
              if (Array.isArray(parsedComp) && parsedComp.length > 0) {
                const aiCompetitors = parsedComp
                  .slice(0, 5)
                  .map((c: string) => c.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, ''))
                  .filter((c: string) => !isBlockedDomain(c) && !c.includes(ownDomain.split('.')[0]));
                competitors = [...competitors, ...aiCompetitors];
                console.log('AI extracted competitors:', aiCompetitors);
              }
            } catch (parseError) {
              console.error('Failed to parse AI competitors:', parseError);
            }
          }
        }
      } catch (aiError) {
        console.error('AI competitor extraction error:', aiError);
      }
    }
    
    const uniqueCompetitors = [...new Set(competitors)].slice(0, 5);
    
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
