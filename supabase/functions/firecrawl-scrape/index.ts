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
    
    // Extract potential competitors from multiple sources
    const competitors: string[] = [];
    
    // 1. Find domains mentioned in content
    const domainMatches: string[] = markdown.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9][-a-z0-9]*\.(?:com|fr|de|es|io|co|net|org|eu|uk))/gi) || [];
    const ownDomain = new URL(formattedUrl).hostname.replace('www.', '').toLowerCase();
    
    const mentionedDomains = [...new Set(domainMatches)]
      .map((d: string) => d.replace(/^(https?:\/\/)?(www\.)?/i, '').toLowerCase())
      .filter((d: string) => !d.includes(ownDomain) && d.length > 4 && d.includes('.'))
      .slice(0, 5);
    
    competitors.push(...mentionedDomains);
    
    // 2. Look for comparison sections, "vs", "alternative to" patterns
    const vsPatterns: string[] = markdown.match(/(?:vs\.?|versus|compared to|alternative to|better than|switch from)\s+([A-Z][a-zA-Z0-9]+)/gi) || [];
    const companyNames = vsPatterns
      .map((p: string) => p.replace(/^(vs\.?|versus|compared to|alternative to|better than|switch from)\s+/i, '').trim())
      .filter((name: string) => name.length > 2 && name.length < 30);
    
    // Convert company names to likely domains
    companyNames.forEach((name: string) => {
      const domain = name.toLowerCase().replace(/\s+/g, '') + '.com';
      if (!competitors.includes(domain) && !domain.includes(ownDomain)) {
        competitors.push(domain);
      }
    });
    
    // 3. Look for integration mentions (often competitors/similar tools)
    const integrationPatterns: string[] = markdown.match(/integr(?:ates?|ation) with\s+([A-Z][a-zA-Z0-9]+(?:,?\s+(?:and\s+)?[A-Z][a-zA-Z0-9]+)*)/gi) || [];
    integrationPatterns.forEach((pattern: string) => {
      const tools = pattern.replace(/integr(?:ates?|ation) with\s+/i, '').split(/,|\s+and\s+/);
      tools.forEach((tool: string) => {
        const cleanTool = tool.trim();
        if (cleanTool.length > 2 && cleanTool.length < 20) {
          const domain = cleanTool.toLowerCase().replace(/\s+/g, '') + '.com';
          if (!competitors.includes(domain) && !domain.includes(ownDomain)) {
            competitors.push(domain);
          }
        }
      });
    });
    
    // 4. Generate industry-relevant competitors based on keywords
    const contentLower = markdown.toLowerCase();
    const industryCompetitors: string[] = [];
    
    if (contentLower.includes('crm') || contentLower.includes('sales')) {
      industryCompetitors.push('hubspot.com', 'salesforce.com', 'pipedrive.com');
    }
    if (contentLower.includes('marketing') || contentLower.includes('email')) {
      industryCompetitors.push('mailchimp.com', 'sendgrid.com', 'klaviyo.com');
    }
    if (contentLower.includes('ecommerce') || contentLower.includes('store') || contentLower.includes('shop')) {
      industryCompetitors.push('shopify.com', 'woocommerce.com', 'bigcommerce.com');
    }
    if (contentLower.includes('analytics') || contentLower.includes('tracking')) {
      industryCompetitors.push('google.com/analytics', 'mixpanel.com', 'amplitude.com');
    }
    if (contentLower.includes('project') || contentLower.includes('task') || contentLower.includes('collaboration')) {
      industryCompetitors.push('asana.com', 'monday.com', 'trello.com');
    }
    if (contentLower.includes('seo') || contentLower.includes('search engine') || contentLower.includes('ranking')) {
      industryCompetitors.push('semrush.com', 'ahrefs.com', 'moz.com');
    }
    if (contentLower.includes('ai') || contentLower.includes('artificial intelligence') || contentLower.includes('chatbot')) {
      industryCompetitors.push('openai.com', 'anthropic.com', 'jasper.ai');
    }
    if (contentLower.includes('design') || contentLower.includes('graphic')) {
      industryCompetitors.push('canva.com', 'figma.com', 'adobe.com');
    }
    
    // Add industry competitors that aren't already in the list
    industryCompetitors.forEach((c: string) => {
      if (!competitors.includes(c) && !c.includes(ownDomain)) {
        competitors.push(c);
      }
    });
    
    // Remove duplicates and limit to 5
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
