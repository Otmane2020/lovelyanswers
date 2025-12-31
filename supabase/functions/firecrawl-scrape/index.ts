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
    
    // Extract potential target audiences from content
    const audiences: string[] = [];
    const lowerContent = contentPreview.toLowerCase();
    
    // Furniture & Home decor indicators
    if (lowerContent.includes('meuble') || lowerContent.includes('furniture') || lowerContent.includes('mobilier')) {
      audiences.push('furniture buyers', 'home furnishing shoppers');
    }
    if (lowerContent.includes('décor') || lowerContent.includes('decor') || lowerContent.includes('intérieur') || lowerContent.includes('interior')) {
      audiences.push('home decor enthusiasts', 'interior design lovers');
    }
    if (lowerContent.includes('salon') || lowerContent.includes('living room') || lowerContent.includes('canapé') || lowerContent.includes('sofa')) {
      audiences.push('living room renovators', 'comfort seekers');
    }
    if (lowerContent.includes('cuisine') || lowerContent.includes('kitchen') || lowerContent.includes('dining')) {
      audiences.push('kitchen & dining shoppers');
    }
    if (lowerContent.includes('chambre') || lowerContent.includes('bedroom') || lowerContent.includes('lit') || lowerContent.includes('bed')) {
      audiences.push('bedroom furniture shoppers');
    }
    if (lowerContent.includes('bureau') || lowerContent.includes('office') || lowerContent.includes('desk')) {
      audiences.push('home office buyers', 'remote workers');
    }
    
    // B2B indicators
    if (lowerContent.includes('entreprise') || lowerContent.includes('business') || lowerContent.includes('b2b') || lowerContent.includes('professionnel')) {
      audiences.push('businesses', 'professionals');
    }
    if (lowerContent.includes('retailer') || lowerContent.includes('revendeur') || lowerContent.includes('wholesale')) {
      audiences.push('retailers', 'resellers');
    }
    if (lowerContent.includes('interior design') || lowerContent.includes('décorateur') || lowerContent.includes('architect')) {
      audiences.push('interior designers', 'architects');
    }
    if (lowerContent.includes('hotel') || lowerContent.includes('restaurant') || lowerContent.includes('hospitality')) {
      audiences.push('hospitality industry');
    }
    
    // Consumer indicators
    if (lowerContent.includes('homeowner') || lowerContent.includes('particulier') || lowerContent.includes('home') || lowerContent.includes('maison')) {
      audiences.push('homeowners', 'new home buyers');
    }
    if (lowerContent.includes('appartement') || lowerContent.includes('apartment') || lowerContent.includes('studio')) {
      audiences.push('apartment dwellers', 'renters');
    }
    if (lowerContent.includes('livraison') || lowerContent.includes('delivery') || lowerContent.includes('france') || lowerContent.includes('français')) {
      audiences.push('French consumers');
    }
    
    // Tech/SaaS indicators (kept for non-furniture sites)
    if (lowerContent.includes('saas') || lowerContent.includes('software') || lowerContent.includes('api')) {
      audiences.push('tech companies', 'software buyers');
    }
    if (lowerContent.includes('marketing') || lowerContent.includes('agency') || lowerContent.includes('agence')) {
      audiences.push('marketing teams', 'agencies');
    }
    if (lowerContent.includes('ecommerce') || lowerContent.includes('e-commerce') || lowerContent.includes('online store') || lowerContent.includes('boutique')) {
      audiences.push('online shoppers');
    }
    
    // If no specific audiences found, use generic ones
    if (audiences.length < 2) {
      audiences.push('general consumers', 'quality seekers', 'value-conscious buyers');
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
    
    // Fallback to industry-based competitors if Data for SEO didn't return results
    if (competitors.length < 3) {
      console.log('Using fallback industry competitors');
      const contentLower = markdown.toLowerCase();
      const industryCompetitors: string[] = [];
      
      // Furniture & Home Decor industry
      if (contentLower.includes('meuble') || contentLower.includes('furniture') || 
          contentLower.includes('décor') || contentLower.includes('decor') ||
          contentLower.includes('canapé') || contentLower.includes('sofa') ||
          contentLower.includes('table') || contentLower.includes('chaise') ||
          contentLower.includes('intérieur') || contentLower.includes('interior') ||
          contentLower.includes('mobilier') || contentLower.includes('maison')) {
        industryCompetitors.push(
          'maisonsdumonde.com', 'ikea.com', 'conforama.fr', 
          'but.fr', 'alinea.com', 'habitat.fr',
          'laredoute.fr', 'camif.fr', 'made.com'
        );
      }
      
      // SaaS/Software industry
      if (contentLower.includes('saas') || contentLower.includes('software') || contentLower.includes('api')) {
        industryCompetitors.push('hubspot.com', 'salesforce.com', 'zendesk.com');
      }
      
      // Marketing/SEO industry
      if (contentLower.includes('seo') || contentLower.includes('marketing') || contentLower.includes('référencement')) {
        industryCompetitors.push('semrush.com', 'ahrefs.com', 'moz.com', 'sistrix.com');
      }
      
      // Add fallback competitors
      industryCompetitors.forEach((c: string) => {
        if (competitors.length < 5 && !competitors.includes(c) && !c.includes(ownDomain.split('.')[0])) {
          competitors.push(c);
        }
      });
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
